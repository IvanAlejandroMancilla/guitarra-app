/**
 * Coordinador del mezclador: traduce eventos de la UI a la cadena de audio y a la biblioteca de presets.
 * - Escucha `'ui:presetEfx'`, `'ui:bloqueEfx'`, `'ui:gestionPresetEfx'`, `'ui:archivoIr'` y `'cfg:cambio'` (solo `idPresetEfx`).
 * - Emite `'efx:presets'`, `'efx:presetActivo'`, `'efx:cadena'`, `'efx:irs'`, `'efx:irCargado'`, `'efx:exportacion'`,
 *   `'efx:importacion'` y `'cor:error'` (origen `'efx'`).
 * - Persiste el preset elegido con `editor.actualizarConfig({ idPresetEfx })`. Id desconocido → `EFX_ID_PRESET_DEF`.
 */
import type { IEfxBloques, IEfxPreset, TEfxIdBloque } from '../core/cor_efectos';
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IEfxIrResumen, IUiArchivoElegido, TUiBloqueEfxEditado, TUiGestionPresetEfx } from '../core/cor_eventos';
import { EFX_DUR_MAX_IR_SEG, EFX_ID_PRESET_DEF, EFX_NOMBRE_EXPORTACION, EFX_PREFIJO_FABRICA, EFX_MAX_PRESETS_USUARIO } from './efx_constantes';
import { efx_validarArchivoIr } from './efx_esquema';
import { efx_exportarPresets, efx_importarPresets } from './efx_exportador';
import { EFX_BLOQUES_DEF } from './efx_presetsFabrica';
import type { IEfxAlmacenIr, IEfxBiblioteca, IEfxCadena } from './efx_tipos';

const obtenerMsj = (err: unknown, msjDef: string): string => (err instanceof Error && err.message !== '' ? err.message : msjDef);

const crearIdIr = (): string => {
  const cripto = globalThis.crypto as Crypto | undefined;
  return cripto !== undefined && typeof cripto.randomUUID === 'function'
    ? cripto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const fijarEstadoBloque = <TId extends TEfxIdBloque>(bloques: IEfxBloques, id: TId, estado: IEfxBloques[TId]): void => {
  bloques[id] = estado;
};

export class EfxControlador {
  readonly #bus: ICorBus;
  readonly #editor: ICorEditorConfig;
  readonly #cadena: IEfxCadena;
  readonly #biblioteca: IEfxBiblioteca;
  readonly #almacenIr: IEfxAlmacenIr;
  readonly #ctx: BaseAudioContext;
  #cancelaciones: (() => void)[] = [];
  #preset: IEfxPreset = { id: EFX_ID_PRESET_DEF, nombre: '', bloques: structuredClone(EFX_BLOQUES_DEF) };
  #esModificado = false;
  /** IR decodificados en esta sesión (por id). */
  readonly #bufsIr = new Map<string, AudioBuffer>();
  /** IR en memoria si IndexedDB falla (para que la lista no los pierda en esta sesión). */
  readonly #irsSesion = new Map<string, IEfxIrResumen>();
  /** Id del IR que debe quedar aplicado: evita que una carga lenta pise a una posterior. */
  #idIrPedido: string | null = null;

  constructor(
    bus: ICorBus,
    editor: ICorEditorConfig,
    cadena: IEfxCadena,
    biblioteca: IEfxBiblioteca,
    almacenIr: IEfxAlmacenIr,
    ctx: BaseAudioContext,
  ) {
    this.#bus = bus;
    this.#editor = editor;
    this.#cadena = cadena;
    this.#biblioteca = biblioteca;
    this.#almacenIr = almacenIr;
    this.#ctx = ctx;
  }

  esActivo(): boolean {
    return this.#cancelaciones.length > 0;
  }

  async iniciar(): Promise<void> {
    if (this.esActivo()) return;
    this.#cancelaciones = [
      this.#bus.suscribir('ui:presetEfx', (elegido) => this.#elegirPreset(elegido.id)),
      this.#bus.suscribir('ui:bloqueEfx', (editado) => this.#editarBloque(editado)),
      this.#bus.suscribir('ui:gestionPresetEfx', (gestion) => this.#gestionarPreset(gestion)),
      this.#bus.suscribir('ui:archivoIr', (elegido) => void this.#cargarArchivoIr(elegido)),
      this.#bus.suscribir('cfg:cambio', (cambio) => {
        if (cambio.claves.includes('idPresetEfx') && cambio.cfg.idPresetEfx !== this.#preset.id) this.#elegirPreset(cambio.cfg.idPresetEfx);
      }),
    ];
    this.#emitirPresets();
    this.#elegirPreset(this.#editor.obtenerConfig().idPresetEfx);
    await this.#emitirIrs();
  }

  detener(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
  }

  // ---------- presets ----------

  readonly #elegirPreset = (id: string): void => {
    const preset = this.#biblioteca.obtenerPreset(id) ?? this.#biblioteca.obtenerPreset(EFX_ID_PRESET_DEF);
    this.#activarPreset(preset ?? { id: EFX_ID_PRESET_DEF, nombre: 'Neutro', bloques: structuredClone(EFX_BLOQUES_DEF) });
  };

  /** Aplica a la cadena, emite `'efx:presetActivo'` y lo persiste en la configuración. */
  readonly #activarPreset = (preset: IEfxPreset): void => {
    this.#preset = preset;
    this.#esModificado = false;
    this.#cadena.fijarBloques(preset.bloques);
    void this.#aplicarIrDelGabinete();
    this.#emitirPresetActivo();
    if (this.#editor.obtenerConfig().idPresetEfx !== preset.id) this.#editor.actualizarConfig({ idPresetEfx: preset.id });
  };

  readonly #editarBloque = (editado: TUiBloqueEfxEditado): void => {
    const estado = structuredClone(editado.estado);
    fijarEstadoBloque(this.#preset.bloques, editado.idBloque, estado);
    this.#cadena.fijarBloque(editado.idBloque, estado);
    if (editado.idBloque === 'cab') void this.#aplicarIrDelGabinete();
    this.#esModificado = true;
    this.#emitirCadena(editado.idBloque);
  };

  readonly #gestionarPreset = (gestion: TUiGestionPresetEfx): void => {
    switch (gestion.accion) {
      case 'guardar':
        this.#guardar();
        return;
      case 'guardarComo':
        this.#guardarComo(gestion.nombre);
        return;
      case 'renombrar':
        this.#renombrar(gestion.id, gestion.nombre);
        return;
      case 'borrar':
        this.#borrar(gestion.id);
        return;
      case 'exportar':
        this.#exportar();
        return;
      case 'importar':
        this.#importar(gestion.texto);
        return;
    }
  };

  readonly #guardar = (): void => {
    if (this.#preset.id.startsWith(EFX_PREFIJO_FABRICA)) {
      this.#emitirError('Los presets de fábrica no se pueden modificar. Usa "Guardar como" para crear uno propio.');
      return;
    }
    const guardado = this.#biblioteca.guardarPreset(this.#preset.id, this.#preset.bloques);
    if (guardado === null) {
      this.#emitirError('No se encontró el preset a guardar. Usa "Guardar como".');
      return;
    }
    this.#preset = guardado;
    this.#esModificado = false;
    this.#emitirPresetActivo();
  };

  readonly #guardarComo = (nombre: string): void => {
    let nuevo: IEfxPreset;
    try {
      nuevo = this.#biblioteca.guardarPresetComo(nombre, this.#preset.bloques);
    } catch (err) {
      this.#emitirError(obtenerMsj(err, 'No se pudo guardar el preset.'));
      return;
    }
    this.#emitirPresets();
    this.#activarPreset(nuevo);
  };

  readonly #renombrar = (id: string, nombre: string): void => {
    if (id.startsWith(EFX_PREFIJO_FABRICA)) {
      this.#emitirError('Los presets de fábrica no se pueden renombrar. Usa "Guardar como" para crear uno propio.');
      return;
    }
    if (nombre.trim() === '') {
      this.#emitirError('Escribe un nombre para el preset.');
      return;
    }
    if (!this.#biblioteca.renombrarPreset(id, nombre)) {
      this.#emitirError('No se encontró el preset a renombrar.');
      return;
    }
    this.#emitirPresets();
    if (id === this.#preset.id) {
      const renombrado = this.#biblioteca.obtenerPreset(id);
      if (renombrado !== null) this.#preset.nombre = renombrado.nombre;
      this.#emitirPresetActivo();
    }
  };

  readonly #borrar = (id: string): void => {
    if (id.startsWith(EFX_PREFIJO_FABRICA)) {
      this.#emitirError('Los presets de fábrica no se pueden borrar.');
      return;
    }
    if (!this.#biblioteca.borrarPreset(id)) {
      this.#emitirError('No se encontró el preset a borrar.');
      return;
    }
    this.#emitirPresets();
    if (id === this.#preset.id) this.#elegirPreset(EFX_ID_PRESET_DEF);
  };

  readonly #exportar = (): void => {
    const presets = this.#biblioteca.exportarPresets();
    if (presets.length === 0) {
      this.#emitirError('No hay presets propios para exportar. Crea uno con "Guardar como".');
      return;
    }
    this.#bus.emitir('efx:exportacion', { texto: efx_exportarPresets(presets), nombreArchivo: EFX_NOMBRE_EXPORTACION });
  };

  readonly #importar = (texto: string): void => {
    const resultado = efx_importarPresets(texto);
    if (!resultado.esValido) {
      this.#bus.emitir('efx:importacion', { cantImportados: 0, errores: resultado.errores });
      return;
    }
    const cantImportados = this.#biblioteca.importarPresets(resultado.valor);
    const errores =
      cantImportados < resultado.valor.length
        ? [`Se alcanzó el máximo de ${EFX_MAX_PRESETS_USUARIO} presets propios: ${resultado.valor.length - cantImportados} no se importaron.`]
        : [];
    this.#emitirPresets();
    this.#emitirPresetActivo();
    this.#bus.emitir('efx:importacion', { cantImportados, errores });
  };

  // ---------- IR ----------

  readonly #cargarArchivoIr = async (elegido: IUiArchivoElegido): Promise<void> => {
    const { archivo } = elegido;
    const validacion = efx_validarArchivoIr(archivo.name, archivo.size);
    if (!validacion.esValido) {
      this.#emitirError(validacion.errores.join(' '));
      return;
    }
    let bufArchivo: ArrayBuffer;
    let bufAudio: AudioBuffer;
    try {
      bufArchivo = await archivo.arrayBuffer();
      // decodeAudioData separa (detach) el ArrayBuffer que recibe: se le pasa una copia para guardar el original.
      bufAudio = await this.#ctx.decodeAudioData(bufArchivo.slice(0));
    } catch (err) {
      console.error('[efx] Error al decodificar el IR:', err);
      this.#emitirError(`No se pudo leer "${archivo.name}" como audio. Usa un archivo .wav válido.`);
      return;
    }
    if (bufAudio.duration > EFX_DUR_MAX_IR_SEG) {
      this.#emitirError(`El IR dura ${bufAudio.duration.toFixed(1)} s; el máximo es ${EFX_DUR_MAX_IR_SEG} s.`);
      return;
    }
    const resumen: IEfxIrResumen = { id: crearIdIr(), nombre: validacion.valor, durSeg: bufAudio.duration, fechaMs: Date.now() };
    this.#bufsIr.set(resumen.id, bufAudio);
    try {
      await this.#almacenIr.guardarIr({ ...resumen, buf: bufArchivo });
    } catch (err) {
      this.#irsSesion.set(resumen.id, resumen);
      this.#emitirError(obtenerMsj(err, 'No se pudo guardar el IR en el navegador; se usará solo en esta sesión.'));
    }
    const cab = { ...this.#preset.bloques.cab, esActivo: true, modelo: 'ir' as const, idIr: resumen.id };
    this.#preset.bloques.cab = cab;
    this.#cadena.fijarBloque('cab', cab);
    this.#idIrPedido = resumen.id;
    this.#cadena.fijarIr(bufAudio);
    this.#esModificado = true;
    this.#bus.emitir('efx:irCargado', { ir: resumen });
    await this.#emitirIrs();
    this.#emitirCadena('cab');
  };

  /** Si el gabinete usa un IR, lo busca (memoria → IndexedDB), lo decodifica y lo pasa a la cadena. */
  readonly #aplicarIrDelGabinete = async (): Promise<void> => {
    const { modelo, idIr } = this.#preset.bloques.cab;
    if (modelo !== 'ir' || idIr === null) {
      this.#idIrPedido = null;
      this.#cadena.fijarIr(null);
      return;
    }
    if (idIr === this.#idIrPedido) return;
    this.#idIrPedido = idIr;
    const enMemoria = this.#bufsIr.get(idIr);
    if (enMemoria !== undefined) {
      this.#cadena.fijarIr(enMemoria);
      return;
    }
    this.#cadena.fijarIr(null);
    try {
      const ir = await this.#almacenIr.cargarIr(idIr);
      if (ir === null) throw new Error('No se encontró el IR guardado; se usa el gabinete simulado.');
      const bufAudio = await this.#ctx.decodeAudioData(ir.buf.slice(0));
      this.#bufsIr.set(idIr, bufAudio);
      if (this.#idIrPedido === idIr) this.#cadena.fijarIr(bufAudio);
    } catch (err) {
      console.error('[efx] Error al cargar el IR guardado:', err);
      if (this.#idIrPedido === idIr) this.#emitirError(obtenerMsj(err, 'No se pudo cargar el IR guardado; se usa el gabinete simulado.'));
    }
  };

  // ---------- emisiones ----------

  readonly #emitirPresets = (): void => {
    this.#bus.emitir('efx:presets', { presets: this.#biblioteca.listarPresets() });
  };

  readonly #emitirPresetActivo = (): void => {
    this.#bus.emitir('efx:presetActivo', { preset: structuredClone(this.#preset), esModificado: this.#esModificado });
  };

  readonly #emitirCadena = (idBloque: TEfxIdBloque): void => {
    this.#bus.emitir('efx:cadena', {
      idPreset: this.#preset.id,
      idBloque,
      bloques: structuredClone(this.#preset.bloques),
      esModificado: this.#esModificado,
    });
  };

  readonly #emitirIrs = async (): Promise<void> => {
    let irs: IEfxIrResumen[] = [];
    try {
      irs = await this.#almacenIr.listarIrs();
    } catch (err) {
      console.error('[efx] Error al listar los IR:', err);
      if (this.#irsSesion.size === 0) this.#emitirError(obtenerMsj(err, 'No se pudo leer la lista de IR guardados.'));
    }
    const ids = new Set(irs.map((ir) => ir.id));
    const deSesion = [...this.#irsSesion.values()].filter((ir) => !ids.has(ir.id));
    this.#bus.emitir('efx:irs', { irs: [...deSesion, ...irs] });
  };

  readonly #emitirError = (msj: string): void => {
    this.#bus.emitir('cor:error', { origen: 'efx', msj });
  };
}

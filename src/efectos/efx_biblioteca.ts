/**
 * Biblioteca de presets: los de fábrica (solo lectura) + los del usuario (persistidos con `IEfxAlmacenPresets`).
 * Todo lo que entra y sale se copia (structuredClone): nadie puede modificar el estado interno por referencia.
 * Los nombres se hacen únicos agregando " (2)", " (3)"…
 */
import type { IEfxBloques, IEfxPreset } from '../core/cor_efectos';
import type { IEfxResumenPreset } from '../core/cor_eventos';
import { EFX_LARGO_MAX_NOMBRE, EFX_MAX_PRESETS_USUARIO, EFX_PREFIJO_FABRICA, EFX_PREFIJO_USUARIO } from './efx_constantes';
import type { IEfxAlmacenPresets, IEfxBiblioteca } from './efx_tipos';

const EFX_NOMBRE_DEF = 'Mi preset';

const crearIdUsuario = (): string => {
  const cripto = globalThis.crypto as Crypto | undefined;
  const sufijo =
    cripto !== undefined && typeof cripto.randomUUID === 'function'
      ? cripto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${EFX_PREFIJO_USUARIO}${sufijo}`;
};

const acotarNombre = (nombre: string): string => {
  const limpio = nombre.trim().slice(0, EFX_LARGO_MAX_NOMBRE).trim();
  return limpio === '' ? EFX_NOMBRE_DEF : limpio;
};

const crearResumen = (preset: IEfxPreset, esFabrica: boolean): IEfxResumenPreset => ({ id: preset.id, nombre: preset.nombre, esFabrica });

export class EfxBiblioteca implements IEfxBiblioteca {
  readonly #almacen: IEfxAlmacenPresets;
  readonly #fabrica: readonly IEfxPreset[];
  #usuario: IEfxPreset[];

  constructor(almacen: IEfxAlmacenPresets, presetsFabrica: readonly IEfxPreset[]) {
    this.#almacen = almacen;
    this.#fabrica = presetsFabrica.map((preset) => structuredClone(preset));
    this.#usuario = [];
    // Repara ids ausentes, ajenos o repetidos de lo guardado.
    let esReparado = false;
    for (const preset of almacen.cargar().slice(0, EFX_MAX_PRESETS_USUARIO)) {
      if (!preset.id.startsWith(EFX_PREFIJO_USUARIO) || this.#buscar(preset.id) !== null) {
        preset.id = crearIdUsuario();
        esReparado = true;
      }
      this.#usuario.push(preset);
    }
    if (esReparado) this.#guardar();
  }

  listarPresets(): IEfxResumenPreset[] {
    return [...this.#fabrica.map((preset) => crearResumen(preset, true)), ...this.#usuario.map((preset) => crearResumen(preset, false))];
  }

  obtenerPreset(id: string): IEfxPreset | null {
    const preset = this.#buscar(id);
    return preset === null ? null : structuredClone(preset);
  }

  guardarPreset(id: string, bloques: Readonly<IEfxBloques>): IEfxPreset | null {
    const preset = this.#buscarUsuario(id);
    if (preset === null) return null;
    preset.bloques = structuredClone(bloques);
    this.#guardar();
    return structuredClone(preset);
  }

  /** Lanza un `Error` (mensaje en español) si se alcanzó `EFX_MAX_PRESETS_USUARIO`. */
  guardarPresetComo(nombre: string, bloques: Readonly<IEfxBloques>): IEfxPreset {
    if (this.#usuario.length >= EFX_MAX_PRESETS_USUARIO) {
      throw new Error(`Ya tienes ${EFX_MAX_PRESETS_USUARIO} presets propios; borra alguno para guardar uno nuevo.`);
    }
    const preset: IEfxPreset = { id: crearIdUsuario(), nombre: this.#crearNombreUnico(nombre, null), bloques: structuredClone(bloques) };
    this.#usuario.push(preset);
    this.#guardar();
    return structuredClone(preset);
  }

  renombrarPreset(id: string, nombre: string): boolean {
    const preset = this.#buscarUsuario(id);
    if (preset === null || nombre.trim() === '') return false;
    preset.nombre = this.#crearNombreUnico(nombre, id);
    this.#guardar();
    return true;
  }

  borrarPreset(id: string): boolean {
    const idx = this.#usuario.findIndex((preset) => preset.id === id);
    if (idx < 0) return false;
    this.#usuario.splice(idx, 1);
    this.#guardar();
    return true;
  }

  /** Agrega copias como presets del usuario (id nuevo si falta o choca). Respeta `EFX_MAX_PRESETS_USUARIO`. */
  importarPresets(presets: readonly IEfxPreset[]): number {
    let cant = 0;
    for (const preset of presets) {
      if (this.#usuario.length >= EFX_MAX_PRESETS_USUARIO) break;
      const esIdUtil = preset.id.startsWith(EFX_PREFIJO_USUARIO) && this.#buscar(preset.id) === null;
      this.#usuario.push({
        id: esIdUtil ? preset.id : crearIdUsuario(),
        nombre: this.#crearNombreUnico(preset.nombre, null),
        bloques: structuredClone(preset.bloques),
      });
      cant++;
    }
    if (cant > 0) this.#guardar();
    return cant;
  }

  exportarPresets(): IEfxPreset[] {
    return this.#usuario.map((preset) => structuredClone(preset));
  }

  readonly #buscar = (id: string): IEfxPreset | null =>
    (id.startsWith(EFX_PREFIJO_FABRICA) ? this.#fabrica : this.#usuario).find((preset) => preset.id === id) ?? null;

  readonly #buscarUsuario = (id: string): IEfxPreset | null => this.#usuario.find((preset) => preset.id === id) ?? null;

  /** Nombre acotado y sin repetir (ignora el preset `idPropio`, para renombrar sin chocar consigo mismo). */
  readonly #crearNombreUnico = (nombre: string, idPropio: string | null): string => {
    const base = acotarNombre(nombre);
    const usados = new Set(
      [...this.#fabrica, ...this.#usuario].filter((preset) => preset.id !== idPropio).map((preset) => preset.nombre.toLowerCase()),
    );
    if (!usados.has(base.toLowerCase())) return base;
    for (let num = 2; ; num++) {
      const sufijo = ` (${num})`;
      const candidato = `${base.slice(0, EFX_LARGO_MAX_NOMBRE - sufijo.length).trim()}${sufijo}`;
      if (!usados.has(candidato.toLowerCase())) return candidato;
    }
  };

  readonly #guardar = (): void => {
    this.#almacen.guardar(this.#usuario);
  };
}

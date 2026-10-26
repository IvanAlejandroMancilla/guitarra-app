/**
 * Lista de presets del mezclador (fábrica y usuario) con su gestión:
 * elegir → `'ui:presetEfx'`; guardar, guardar como, renombrar, borrar, exportar, importar → `'ui:gestionPresetEfx'`.
 * La lógica (persistencia, validación) vive en efx; aquí solo se muestra y se pide.
 */
import type { ICorBus } from '../core/cor_contratos';
import type { IEfxImportacion, IEfxResumenPreset, TUiGestionPresetEfx } from '../core/cor_eventos';
import { ui_descargarTexto, ui_elegirArchivo } from './ui_archivos';
import { ui_crearBoton } from './ui_boton';
import { ui_crearElemento, ui_vaciarElemento } from './ui_dom';

/** Igual a `EFX_LARGO_MAX_NOMBRE` (ui no importa efx; efx vuelve a validar). */
const UI_LARGO_MAX_NOMBRE_PRESET = 40;
/** Los archivos de presets reales pesan unos pocos KB. */
const UI_TAM_MAX_ARCHIVO_PRESETS = 1024 * 1024;

/** Diálogo modal para escribir un nombre. Resuelve con el nombre (sin espacios sobrantes) o `null` si se cancela. */
const mostrarDialogoNombre = (titulo: string, textoAceptar: string, nombreIni: string): Promise<string | null> =>
  new Promise((resolver) => {
    const dialogo = ui_crearElemento('dialog', 'ui-dialogo');
    const formulario = ui_crearElemento('form', 'ui-dialogo__cuerpo');
    formulario.method = 'dialog';
    const etiqueta = ui_crearElemento('label', 'ui-campo__etiqueta');
    const entrada = ui_crearElemento('input', 'ui-campo__entradaTexto');
    entrada.type = 'text';
    entrada.required = true;
    entrada.maxLength = UI_LARGO_MAX_NOMBRE_PRESET;
    entrada.value = nombreIni;
    entrada.autocomplete = 'off';
    etiqueta.append(ui_crearElemento('span', 'ui-campo__texto', 'Nombre del preset'), entrada);
    const acciones = ui_crearElemento('div', 'ui-dialogo__acciones');
    const cancelar = ui_crearBoton({ texto: 'Cancelar', alPulsar: () => dialogo.close('') });
    const aceptar = ui_crearElemento('button', ['ui-boton', 'ui-boton--primario'], textoAceptar);
    aceptar.type = 'submit';
    aceptar.value = 'aceptar';
    acciones.append(cancelar, aceptar);
    formulario.append(etiqueta, acciones);
    dialogo.append(ui_crearElemento('h2', 'ui-dialogo__titulo', titulo), formulario);
    dialogo.addEventListener('close', () => {
      const nombre = entrada.value.trim();
      dialogo.remove();
      resolver(dialogo.returnValue === 'aceptar' && nombre !== '' ? nombre : null);
    });
    document.body.append(dialogo);
    dialogo.showModal();
    entrada.select();
  });

/** Diálogo modal de confirmación. */
const mostrarDialogoConfirmacion = (titulo: string, msj: string, textoAceptar: string): Promise<boolean> =>
  new Promise((resolver) => {
    const dialogo = ui_crearElemento('dialog', 'ui-dialogo');
    const formulario = ui_crearElemento('form', 'ui-dialogo__cuerpo');
    formulario.method = 'dialog';
    const acciones = ui_crearElemento('div', 'ui-dialogo__acciones');
    const cancelar = ui_crearElemento('button', ['ui-boton', 'ui-boton--secundario'], 'Cancelar');
    cancelar.value = 'cancelar';
    const aceptar = ui_crearElemento('button', ['ui-boton', 'ui-boton--peligro'], textoAceptar);
    aceptar.value = 'aceptar';
    acciones.append(cancelar, aceptar);
    formulario.append(ui_crearElemento('p', [], msj), acciones);
    dialogo.append(ui_crearElemento('h2', 'ui-dialogo__titulo', titulo), formulario);
    dialogo.addEventListener('close', () => {
      dialogo.remove();
      resolver(dialogo.returnValue === 'aceptar');
    });
    document.body.append(dialogo);
    dialogo.showModal();
    cancelar.focus();
  });

export class UiListaPresets {
  readonly elem: HTMLElement;
  #bus: ICorBus;
  #presets: readonly IEfxResumenPreset[] = [];
  #idActivo: string | null = null;
  #nombreActivo = '';
  #esModificado = false;
  #listaFabrica: HTMLElement;
  #listaUsuario: HTMLElement;
  #estado: HTMLElement;
  #msj: HTMLElement;
  #botones: Readonly<Record<'guardar' | 'guardarComo' | 'renombrar' | 'borrar', HTMLButtonElement>>;
  #desuscripciones: (() => void)[];

  constructor(bus: ICorBus) {
    this.#bus = bus;
    this.elem = ui_crearElemento('section', 'ui-presets');
    this.elem.setAttribute('aria-label', 'Presets');

    this.#estado = ui_crearElemento('p', 'ui-presets__estado');
    this.#estado.setAttribute('aria-live', 'polite');
    this.#listaFabrica = ui_crearElemento('ul', 'ui-presets__lista');
    this.#listaFabrica.setAttribute('aria-label', 'Presets de fábrica');
    this.#listaUsuario = ui_crearElemento('ul', 'ui-presets__lista');
    this.#listaUsuario.setAttribute('aria-label', 'Mis presets');
    this.#msj = ui_crearElemento('div', 'ui-presets__msj');
    this.#msj.setAttribute('role', 'status');

    this.#botones = {
      guardar: ui_crearBoton({
        texto: 'Guardar',
        variante: 'primario',
        titulo: 'Sobrescribe el preset activo con los cambios',
        alPulsar: () => {
          this.#emitirGestion({ accion: 'guardar' });
        },
      }),
      guardarComo: ui_crearBoton({
        texto: 'Guardar como…',
        alPulsar: () => {
          void mostrarDialogoNombre('Guardar como preset nuevo', 'Guardar', this.#nombreActivo).then((nombre) => {
            if (nombre !== null) this.#emitirGestion({ accion: 'guardarComo', nombre });
          });
        },
      }),
      renombrar: ui_crearBoton({
        texto: 'Renombrar…',
        alPulsar: () => {
          const id = this.#idActivo;
          if (id === null) return;
          void mostrarDialogoNombre('Renombrar preset', 'Renombrar', this.#nombreActivo).then((nombre) => {
            if (nombre !== null) this.#emitirGestion({ accion: 'renombrar', id, nombre });
          });
        },
      }),
      borrar: ui_crearBoton({
        texto: 'Borrar',
        variante: 'peligro',
        alPulsar: () => {
          const id = this.#idActivo;
          if (id === null) return;
          void mostrarDialogoConfirmacion('Borrar preset', `¿Borrar "${this.#nombreActivo}"? No se puede deshacer.`, 'Borrar').then((esConfirmado) => {
            if (esConfirmado) this.#emitirGestion({ accion: 'borrar', id });
          });
        },
      }),
    };
    const exportar = ui_crearBoton({
      texto: 'Exportar',
      titulo: 'Descarga tus presets como archivo JSON',
      alPulsar: () => {
        this.#emitirGestion({ accion: 'exportar' });
      },
    });
    const importar = ui_crearBoton({
      texto: 'Importar…',
      titulo: 'Agrega presets desde un archivo JSON exportado',
      alPulsar: () => {
        void this.#importar();
      },
    });

    const acciones = ui_crearElemento('div', 'ui-presets__acciones');
    acciones.append(this.#botones.guardar, this.#botones.guardarComo, this.#botones.renombrar, this.#botones.borrar);
    const archivo = ui_crearElemento('div', 'ui-presets__acciones');
    archivo.append(exportar, importar);
    const listas = ui_crearElemento('div', 'ui-presets__listas');
    listas.append(
      ui_crearElemento('h3', 'ui-presets__grupo', 'De fábrica'),
      this.#listaFabrica,
      ui_crearElemento('h3', 'ui-presets__grupo', 'Mis presets'),
      this.#listaUsuario,
    );
    this.elem.append(ui_crearElemento('h2', 'ui-panel__titulo', 'Presets'), this.#estado, listas, acciones, archivo, this.#msj);

    this.#presets = bus.obtenerUltimo('efx:presets')?.presets ?? [];
    const activo = bus.obtenerUltimo('efx:presetActivo');
    if (activo !== undefined) {
      this.#idActivo = activo.preset.id;
      this.#nombreActivo = activo.preset.nombre;
      this.#esModificado = activo.esModificado;
    }
    this.#mostrar();

    this.#desuscripciones = [
      bus.suscribir('efx:presets', (lista) => {
        this.#presets = lista.presets;
        this.#mostrar();
      }),
      bus.suscribir('efx:presetActivo', (presetActivo) => {
        this.#idActivo = presetActivo.preset.id;
        this.#nombreActivo = presetActivo.preset.nombre;
        this.#esModificado = presetActivo.esModificado;
        this.#mostrar();
      }),
      bus.suscribir('efx:cadena', (cadena) => {
        if (cadena.idPreset !== this.#idActivo && this.#idActivo !== null) return;
        this.#esModificado = cadena.esModificado;
        this.#mostrar();
      }),
      bus.suscribir('efx:exportacion', (exportacion) => {
        ui_descargarTexto(exportacion.texto, exportacion.nombreArchivo, 'application/json');
        this.#mostrarMsj(['Presets exportados.'], false);
      }),
      bus.suscribir('efx:importacion', (importacion) => {
        this.#mostrarImportacion(importacion);
      }),
    ];
  }

  liberar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
  }

  #emitirGestion(gestion: TUiGestionPresetEfx): void {
    this.#mostrarMsj([], false);
    this.#bus.emitir('ui:gestionPresetEfx', gestion);
  }

  async #importar(): Promise<void> {
    const archivo = await ui_elegirArchivo('.json,application/json');
    if (archivo === null) return;
    if (archivo.size > UI_TAM_MAX_ARCHIVO_PRESETS) {
      this.#mostrarMsj(['El archivo es demasiado grande para ser un archivo de presets.'], true);
      return;
    }
    try {
      this.#emitirGestion({ accion: 'importar', texto: await archivo.text() });
    } catch (err) {
      console.error('[ui] No se pudo leer el archivo de presets:', err);
      this.#mostrarMsj(['No se pudo leer el archivo.'], true);
    }
  }

  #mostrar(): void {
    const activo = this.#presets.find((preset) => preset.id === this.#idActivo);
    const esFabrica = activo?.esFabrica ?? true;
    this.#llenarLista(this.#listaFabrica, this.#presets.filter((preset) => preset.esFabrica), 'Cargando presets…');
    this.#llenarLista(
      this.#listaUsuario,
      this.#presets.filter((preset) => !preset.esFabrica),
      'Todavía no guardaste presets. Ajusta el sonido y usa "Guardar como…".',
    );
    this.#estado.replaceChildren();
    if (activo !== undefined || this.#idActivo !== null) {
      this.#estado.append(ui_crearElemento('span', 'ui-presets__activo', activo?.nombre ?? this.#nombreActivo));
    }
    if (this.#esModificado) this.#estado.append(ui_crearElemento('span', 'ui-presets__modificado', 'Cambios sin guardar'));
    this.elem.classList.toggle('ui-presets--modificado', this.#esModificado);

    this.#botones.guardar.disabled = esFabrica || !this.#esModificado;
    this.#botones.guardar.title = esFabrica
      ? 'Los presets de fábrica no se sobrescriben: usa "Guardar como…"'
      : 'Sobrescribe el preset activo con los cambios';
    this.#botones.guardarComo.disabled = this.#idActivo === null;
    this.#botones.renombrar.disabled = esFabrica;
    this.#botones.borrar.disabled = esFabrica;
  }

  #llenarLista(lista: HTMLElement, presets: readonly IEfxResumenPreset[], textoVacio: string): void {
    ui_vaciarElemento(lista);
    if (presets.length === 0) {
      lista.append(ui_crearElemento('li', 'ui-presets__vacio', textoVacio));
      return;
    }
    for (const preset of presets) {
      const esActivo = preset.id === this.#idActivo;
      const boton = ui_crearBoton({
        texto: preset.nombre,
        variante: 'fantasma',
        alPulsar: () => {
          if (preset.id === this.#idActivo && !this.#esModificado) return;
          this.#bus.emitir('ui:presetEfx', { id: preset.id });
        },
      });
      boton.classList.add('ui-presets__preset');
      if (esActivo) {
        boton.setAttribute('aria-current', 'true');
        if (this.#esModificado) {
          boton.append(ui_crearElemento('span', 'ui-presets__marcaModificado', ' (modificado)'));
          boton.title = 'Vuelve a elegirlo para descartar los cambios';
        }
      }
      const item = ui_crearElemento('li');
      item.append(boton);
      lista.append(item);
    }
  }

  #mostrarImportacion(importacion: IEfxImportacion): void {
    const lineas =
      importacion.cantImportados === 0
        ? ['No se importó ningún preset.']
        : [importacion.cantImportados === 1 ? 'Se importó 1 preset.' : `Se importaron ${importacion.cantImportados} presets.`];
    this.#mostrarMsj([...lineas, ...importacion.errores], importacion.errores.length > 0 || importacion.cantImportados === 0);
  }

  #mostrarMsj(lineas: readonly string[], esError: boolean): void {
    ui_vaciarElemento(this.#msj);
    this.#msj.classList.toggle('ui-presets__msj--error', esError);
    const [primera, ...resto] = lineas;
    if (primera === undefined) return;
    this.#msj.append(ui_crearElemento('p', [], primera));
    if (resto.length > 0) {
      const lista = ui_crearElemento('ul');
      for (const linea of resto) lista.append(ui_crearElemento('li', [], linea));
      this.#msj.append(lista);
    }
  }
}

/** Atajos de teclado del transporte. Solo actúan en la pantalla de práctica. */
import type { ICorBus } from '../core/cor_contratos';
import type { IUiPantallaSolicitada } from '../core/cor_eventos';
import type { IUiAtajo } from './ui_tipos';

export const UI_ATAJOS: readonly IUiAtajo[] = Object.freeze([
  { teclas: [' '], etiquetaTecla: 'Espacio', accion: 'alternar', descripcion: 'Reproducir / pausar', esRepetible: false },
  { teclas: ['r'], etiquetaTecla: 'R', accion: 'reiniciar', descripcion: 'Reiniciar el ejercicio', esRepetible: false },
  { teclas: ['+', '='], etiquetaTecla: '+', accion: 'subirBpm', descripcion: 'Subir el BPM', esRepetible: true },
  { teclas: ['-', '_'], etiquetaTecla: '−', accion: 'bajarBpm', descripcion: 'Bajar el BPM', esRepetible: true },
  { teclas: ['l'], etiquetaTecla: 'L', accion: 'alternarLoop', descripcion: 'Activar / desactivar el loop', esRepetible: false },
]);

/** Elementos donde se escribe texto: ahí ninguna tecla es atajo. */
const UI_SELECTOR_EDICION = 'textarea, select, [contenteditable=""], [contenteditable="true"]';
/** Elementos que el Espacio ya activa de forma nativa (botones, casillas, enlaces). */
const UI_SELECTOR_ACTIVABLE = 'button, input, a[href], summary, [role="switch"], [role="button"]';
const UI_TIPOS_INPUT_SIN_TEXTO = ['range', 'checkbox', 'radio', 'button', 'submit', 'reset', 'color', 'file'];

const validarDestinoEdicion = (destino: Element): boolean => {
  if (destino.closest(UI_SELECTOR_EDICION) !== null) return true;
  return destino instanceof HTMLInputElement && !UI_TIPOS_INPUT_SIN_TEXTO.includes(destino.type);
};

const buscarAtajo = (tecla: string): IUiAtajo | undefined => {
  const teclaNorm = tecla.toLowerCase();
  return UI_ATAJOS.find((atajo) => atajo.teclas.includes(teclaNorm));
};

/** Traduce teclas a `'ui:transporte'`. Activo solo mientras la última `'ui:pantalla'` sea `'practica'`. */
export class UiAtajos {
  #bus: ICorBus;
  #objetivo: Window;
  #esPractica = false;
  #desuscribir: (() => void) | null = null;

  constructor(bus: ICorBus, objetivo: Window) {
    this.#bus = bus;
    this.#objetivo = objetivo;
  }

  iniciar(): void {
    if (this.#desuscribir !== null) return;
    this.#esPractica = this.#bus.obtenerUltimo('ui:pantalla')?.pantalla === 'practica';
    const quitarPantalla = this.#bus.suscribir('ui:pantalla', this.#alCambiarPantalla);
    this.#objetivo.addEventListener('keydown', this.#alPulsarTecla);
    this.#desuscribir = () => {
      quitarPantalla();
      this.#objetivo.removeEventListener('keydown', this.#alPulsarTecla);
    };
  }

  detener(): void {
    this.#desuscribir?.();
    this.#desuscribir = null;
  }

  #alCambiarPantalla = (solicitud: IUiPantallaSolicitada): void => {
    this.#esPractica = solicitud.pantalla === 'practica';
  };

  #alPulsarTecla = (evento: KeyboardEvent): void => {
    if (!this.#esPractica || evento.ctrlKey || evento.metaKey || evento.altKey || evento.isComposing) return;
    const destino = evento.target;
    const atajo = buscarAtajo(evento.key);
    if (atajo === undefined) return;
    if (destino instanceof Element) {
      if (validarDestinoEdicion(destino) || destino.closest('dialog[open]') !== null) return;
      if (evento.key === ' ' && destino.closest(UI_SELECTOR_ACTIVABLE) !== null) return;
    }
    evento.preventDefault();
    if (evento.repeat && !atajo.esRepetible) return;
    this.#bus.emitir('ui:transporte', { accion: atajo.accion });
  };
}

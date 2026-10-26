import { ui_crearElemento } from './ui_dom';
import type { IUiOpcionesInterruptor } from './ui_tipos';

/** Interruptor encendido/apagado: checkbox nativo con `role="switch"` (Espacio lo alterna). */
export class UiInterruptor {
  readonly elem: HTMLElement;
  #casilla: HTMLInputElement;

  constructor(opc: IUiOpcionesInterruptor) {
    this.elem = ui_crearElemento('label', 'ui-interruptor');
    this.#casilla = ui_crearElemento('input', 'ui-interruptor__casilla');
    this.#casilla.type = 'checkbox';
    this.#casilla.setAttribute('role', 'switch');
    const pista = ui_crearElemento('span', 'ui-interruptor__pista');
    pista.setAttribute('aria-hidden', 'true');
    const textos = ui_crearElemento('span', 'ui-interruptor__textos');
    textos.append(ui_crearElemento('span', 'ui-interruptor__texto', opc.etiqueta));
    if (opc.descripcion !== undefined) {
      textos.append(ui_crearElemento('span', 'ui-interruptor__descripcion', opc.descripcion));
    }
    this.elem.append(this.#casilla, pista, textos);

    this.#casilla.addEventListener('change', () => {
      opc.alCambiar(this.#casilla.checked);
    });
    this.fijarEstado(opc.esActivo);
  }

  /** Actualiza el control sin llamar a `alCambiar`. */
  fijarEstado(esActivo: boolean): void {
    this.#casilla.checked = esActivo;
  }
}

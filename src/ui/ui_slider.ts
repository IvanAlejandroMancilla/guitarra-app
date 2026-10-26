import { ui_crearElemento } from './ui_dom';
import type { IUiOpcionesSlider } from './ui_tipos';

/** Control deslizante accesible (`input type="range"` con etiqueta asociada y valor legible). */
export class UiSlider {
  readonly elem: HTMLElement;
  #entrada: HTMLInputElement;
  #salida: HTMLOutputElement;
  #opc: IUiOpcionesSlider;

  constructor(opc: IUiOpcionesSlider) {
    this.#opc = opc;
    this.elem = ui_crearElemento('div', 'ui-slider');
    const etiqueta = ui_crearElemento('label', 'ui-slider__etiqueta');
    const texto = ui_crearElemento('span', 'ui-slider__texto', opc.etiqueta);
    this.#entrada = ui_crearElemento('input', 'ui-slider__entrada');
    this.#entrada.type = 'range';
    this.#entrada.min = String(opc.min);
    this.#entrada.max = String(opc.max);
    this.#entrada.step = String(opc.paso);
    // El valor ya se anuncia con aria-valuetext; la salida visible se oculta al lector de pantalla.
    this.#salida = ui_crearElemento('output', 'ui-slider__valor');
    this.#salida.setAttribute('aria-hidden', 'true');
    etiqueta.append(texto, this.#entrada);
    this.elem.append(etiqueta, this.#salida);

    this.#entrada.addEventListener('input', () => {
      const valor = this.#entrada.valueAsNumber;
      this.#mostrarValor(valor);
      opc.alCambiar(valor);
    });
    this.fijarValor(opc.valor);
  }

  /** Actualiza el control sin llamar a `alCambiar`. */
  fijarValor(valor: number): void {
    if (this.#entrada.valueAsNumber !== valor) this.#entrada.value = String(valor);
    this.#mostrarValor(valor);
  }

  #mostrarValor(valor: number): void {
    const texto = this.#formatear(valor);
    this.#salida.textContent = texto;
    this.#entrada.setAttribute('aria-valuetext', texto);
  }

  #formatear(valor: number): string {
    if (this.#opc.formatear !== undefined) return this.#opc.formatear(valor);
    return this.#opc.unidad === undefined ? String(valor) : `${valor} ${this.#opc.unidad}`;
  }
}

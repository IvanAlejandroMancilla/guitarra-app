import { ui_crearElemento, ui_vaciarElemento } from './ui_dom';
import type { IUiOpcion, IUiOpcionesSelector } from './ui_tipos';

/** Lista desplegable nativa (`select`) con etiqueta asociada. Admite valores de cualquier tipo. */
export class UiSelector<TValor> {
  readonly elem: HTMLElement;
  #lista: HTMLSelectElement;
  #opciones: readonly IUiOpcion<TValor>[] = [];

  constructor(opc: IUiOpcionesSelector<TValor>) {
    this.elem = ui_crearElemento('div', 'ui-campo');
    const etiqueta = ui_crearElemento('label', 'ui-campo__etiqueta');
    const texto = ui_crearElemento('span', 'ui-campo__texto', opc.etiqueta);
    this.#lista = ui_crearElemento('select', 'ui-campo__selector');
    etiqueta.append(texto, this.#lista);
    this.elem.append(etiqueta);

    this.#lista.addEventListener('change', () => {
      // option.value guarda el índice; así el selector funciona con valores no textuales.
      const opcion = this.#opciones[Number(this.#lista.value)];
      if (opcion !== undefined) opc.alCambiar(opcion.valor);
    });
    this.fijarOpciones(opc.opciones, opc.valor);
  }

  /** Selecciona `valor` sin llamar a `alCambiar`. Si no está entre las opciones, no hace nada. */
  fijarValor(valor: TValor): void {
    const idx = this.#opciones.findIndex((opcion) => Object.is(opcion.valor, valor));
    if (idx >= 0) this.#lista.value = String(idx);
  }

  /** Reemplaza las opciones. Conserva la selección actual si sigue existiendo (o usa `valor`). */
  fijarOpciones(opciones: readonly IUiOpcion<TValor>[], valor?: TValor): void {
    const valorAct = this.#opciones[Number(this.#lista.value)]?.valor;
    this.#opciones = opciones;
    ui_vaciarElemento(this.#lista);
    opciones.forEach((opcion, idx) => {
      const elemOpcion = ui_crearElemento('option', [], opcion.etiqueta);
      elemOpcion.value = String(idx);
      this.#lista.append(elemOpcion);
    });
    if (valor !== undefined) this.fijarValor(valor);
    else if (valorAct !== undefined) this.fijarValor(valorAct);
  }
}

/** Selector de la pista de Guitar Pro que toca el usuario. Visible solo con una canción cargada. */
import type { ICorBus } from '../core/cor_contratos';
import type { IGprCargado, IGprPista } from '../core/cor_eventos';
import { ui_crearElemento } from './ui_dom';
import { UiSelector } from './ui_selector';
import type { IUiOpcion } from './ui_tipos';

const crearOpciones = (pistas: readonly IGprPista[]): IUiOpcion<number>[] =>
  pistas
    .filter((pista) => !pista.esPercusion)
    .map((pista) => ({
      valor: pista.idx,
      etiqueta: `${pista.idx + 1}. ${pista.nombre === '' ? 'Sin nombre' : pista.nombre}${pista.esGuitarra ? ' (guitarra)' : ''}`,
    }));

export class UiPanelPistas {
  readonly elem: HTMLElement;
  #selector: UiSelector<number>;

  constructor(bus: ICorBus) {
    this.elem = ui_crearElemento('div', 'ui-panelPistas');
    this.elem.hidden = true;
    this.#selector = new UiSelector<number>({
      etiqueta: 'Pista a tocar',
      opciones: [],
      valor: 0,
      alCambiar: (idxPst) => {
        bus.emitir('ui:pistaGp', { idxPst });
      },
    });
    this.elem.append(this.#selector.elem);

    const mostrarCargado = (cargado: IGprCargado): void => {
      this.#selector.fijarOpciones(crearOpciones(cargado.pistas), cargado.idxPstGuitarra);
      this.elem.hidden = false;
    };
    const cargado = bus.obtenerUltimo('gpr:cargado');
    if (cargado !== undefined) mostrarCargado(cargado);
    bus.suscribir('gpr:cargado', mostrarCargado);
    bus.suscribir('gpr:pistaConvertida', (convertida) => {
      this.#selector.fijarValor(convertida.idxPst);
    });
    bus.suscribir('ejr:cargado', (cargadoEj) => {
      this.elem.hidden = cargadoEj.origen !== 'gpr';
    });
  }
}

/** Marcador en vivo (puntaje, racha, multiplicador, precisión) y resumen al terminar. */
import type { ICorBus } from '../core/cor_contratos';
import type { IEjrMarcador, IEjrResultado, IEjrResumen } from '../core/cor_eventos';
import { ui_crearBoton } from './ui_boton';
import { ui_crearElemento, ui_vaciarElemento } from './ui_dom';

const UI_MARCADOR_VACIO: Readonly<IEjrMarcador> = Object.freeze({
  ptj: 0,
  racha: 0,
  rachaMax: 0,
  aciertos: 0,
  fallos: 0,
  multiplicador: 1,
});

const UI_DUR_DESTELLO_MS = 250;

const formatearPrecision = (marcador: Readonly<IEjrMarcador>): string => {
  const total = marcador.aciertos + marcador.fallos;
  return total === 0 ? '—' : `${Math.round((marcador.aciertos / total) * 100)} %`;
};

const formatearDur = (durMs: number): string => {
  const totalSeg = Math.max(0, Math.round(durMs / 1000));
  const min = Math.floor(totalSeg / 60);
  return `${min}:${String(totalSeg - min * 60).padStart(2, '0')}`;
};

const crearDato = (etiqueta: string): { elem: HTMLElement; valor: HTMLElement } => {
  const elem = ui_crearElemento('div', 'ui-marcador__dato');
  const valor = ui_crearElemento('span', 'ui-marcador__valor', '0');
  elem.append(ui_crearElemento('span', 'ui-marcador__etiqueta', etiqueta), valor);
  return { elem, valor };
};

export class UiMarcador {
  readonly elem: HTMLElement;
  #ptj: HTMLElement;
  #racha: HTMLElement;
  #mult: HTMLElement;
  #precision: HTMLElement;
  #resumen: HTMLElement;
  #idxTemporizador: ReturnType<typeof setTimeout> | null = null;

  constructor(bus: ICorBus) {
    this.elem = ui_crearElemento('aside', 'ui-marcador');
    this.elem.setAttribute('aria-label', 'Marcador');
    const datos = ui_crearElemento('div', 'ui-marcador__datos');
    const ptj = crearDato('Puntaje');
    ptj.elem.classList.add('ui-marcador__dato--ptj');
    const racha = crearDato('Racha');
    const mult = crearDato('Multiplicador');
    const precision = crearDato('Precisión');
    this.#ptj = ptj.valor;
    this.#racha = racha.valor;
    this.#mult = mult.valor;
    this.#precision = precision.valor;
    datos.append(ptj.elem, racha.elem, mult.elem, precision.elem);
    this.#resumen = ui_crearElemento('div', 'ui-marcador__resumen');
    this.#resumen.setAttribute('role', 'status');
    this.#resumen.hidden = true;
    this.elem.append(datos, this.#resumen);
    this.#mostrarMarcador(UI_MARCADOR_VACIO);

    bus.suscribir('ejr:cargado', () => {
      this.#mostrarMarcador(UI_MARCADOR_VACIO);
      this.#ocultarResumen();
    });
    bus.suscribir('tmp:detencion', () => {
      this.#ocultarResumen();
    });
    bus.suscribir('ejr:acierto', (resultado) => {
      this.#mostrarResultado(resultado, true);
    });
    bus.suscribir('ejr:fallo', (resultado) => {
      this.#mostrarResultado(resultado, false);
    });
    bus.suscribir('ejr:fin', (resumen) => {
      this.#mostrarResumen(resumen, () => {
        bus.emitir('ui:transporte', { accion: 'reiniciar' });
      });
    });
  }

  #mostrarResultado(resultado: IEjrResultado, esAcierto: boolean): void {
    this.#mostrarMarcador(resultado.marcador);
    this.elem.classList.remove('ui-marcador--acierto', 'ui-marcador--fallo');
    this.elem.classList.add(esAcierto ? 'ui-marcador--acierto' : 'ui-marcador--fallo');
    if (this.#idxTemporizador !== null) clearTimeout(this.#idxTemporizador);
    this.#idxTemporizador = setTimeout(() => {
      this.elem.classList.remove('ui-marcador--acierto', 'ui-marcador--fallo');
      this.#idxTemporizador = null;
    }, UI_DUR_DESTELLO_MS);
  }

  #mostrarMarcador(marcador: Readonly<IEjrMarcador>): void {
    this.#ptj.textContent = marcador.ptj.toLocaleString('es');
    this.#racha.textContent = String(marcador.racha);
    this.#mult.textContent = `×${marcador.multiplicador}`;
    this.#precision.textContent = formatearPrecision(marcador);
  }

  #mostrarResumen(resumen: IEjrResumen, alRepetir: () => void): void {
    const marcador = resumen.marcador;
    ui_vaciarElemento(this.#resumen);
    const lista = ui_crearElemento('dl', 'ui-marcador__lista');
    const filas: readonly [string, string][] = [
      ['Puntaje', marcador.ptj.toLocaleString('es')],
      ['Precisión', `${Math.round(resumen.precision * 100)} %`],
      ['Racha máxima', String(marcador.rachaMax)],
      ['Aciertos', String(marcador.aciertos)],
      ['Fallos', String(marcador.fallos)],
      ['Duración', formatearDur(resumen.durMs)],
    ];
    for (const [etiqueta, valor] of filas) {
      lista.append(ui_crearElemento('dt', [], etiqueta), ui_crearElemento('dd', [], valor));
    }
    const botones = ui_crearElemento('div', 'ui-marcador__botones');
    botones.append(
      ui_crearBoton({ texto: 'Repetir', variante: 'primario', alPulsar: alRepetir }),
      ui_crearBoton({ texto: 'Cerrar', alPulsar: () => this.#ocultarResumen() }),
    );
    this.#resumen.append(
      ui_crearElemento('h2', 'ui-marcador__tituloResumen', '¡Ejercicio terminado!'),
      ui_crearElemento('p', 'ui-marcador__nombreEj', resumen.titulo),
      lista,
      botones,
    );
    this.#resumen.hidden = false;
  }

  #ocultarResumen(): void {
    this.#resumen.hidden = true;
    ui_vaciarElemento(this.#resumen);
  }
}

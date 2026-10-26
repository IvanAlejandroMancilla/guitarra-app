/**
 * Medidor de coincidencia en vivo: qué tan cerca está lo que suena de la nota esperada.
 * Arco con el porcentaje grande (verde / amarillo / rojo), nota esperada vs. detectada y aguja de cents.
 */
import type { ICorBus, ICorFuenteConfig } from '../core/cor_contratos';
import type { IEjrCoincidencia } from '../core/cor_eventos';
import { cor_obtenerEtiquetaNota } from '../core/cor_notas';
import type { INota, TCfgNotacion } from '../core/tipos';
import { ui_crearElemento } from './ui_dom';

/** Umbrales de color del porcentaje. */
const UI_PCT_VERDE = 80;
const UI_PCT_AMARILLO = 50;
/** Desvío (cents) considerado afinado para el texto de estado. */
const UI_CENTS_AFINADO = 5;
/** Rango visible de la aguja de cents (±). */
const UI_CENTS_ESCALA = 50;

const UI_ESPACIO_NOMBRES_SVG = 'http://www.w3.org/2000/svg';
/** Geometría del arco (viewBox 0 0 120 70): semicírculo de radio 50 centrado en (60, 60). */
const UI_RUTA_ARCO = 'M 10 60 A 50 50 0 0 1 110 60';

type TUiNivelCoincidencia = 'alto' | 'medio' | 'bajo' | 'inactivo';

const obtenerNivel = (coincidencia: IEjrCoincidencia | null): TUiNivelCoincidencia => {
  if (coincidencia === null || coincidencia.esSilencio || coincidencia.idxNota < 0) return 'inactivo';
  if (coincidencia.pct >= UI_PCT_VERDE) return 'alto';
  return coincidencia.pct >= UI_PCT_AMARILLO ? 'medio' : 'bajo';
};

const formatearCents = (cents: number): string => {
  const redondeado = Math.round(cents);
  return `${redondeado > 0 ? '+' : ''}${redondeado} cents`;
};

const obtenerTextoEstado = (coincidencia: IEjrCoincidencia | null): string => {
  if (coincidencia === null || coincidencia.idxNota < 0) return 'Esperando una nota…';
  if (coincidencia.esSilencio) return 'Toca la nota';
  if (!coincidencia.esNotaCorrecta) return 'Otra nota';
  if (Math.abs(coincidencia.cents) <= UI_CENTS_AFINADO) return '¡Afinada!';
  return coincidencia.cents > 0 ? `Un poco alta (${formatearCents(coincidencia.cents)})` : `Un poco baja (${formatearCents(coincidencia.cents)})`;
};

const crearSvg = <TEtiqueta extends keyof SVGElementTagNameMap>(etiqueta: TEtiqueta, atributos: Readonly<Record<string, string>>): SVGElementTagNameMap[TEtiqueta] => {
  const elem = document.createElementNS(UI_ESPACIO_NOMBRES_SVG, etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) elem.setAttribute(nombre, valor);
  return elem;
};

export class UiMedidorCoincidencia {
  readonly elem: HTMLElement;
  #arco: SVGPathElement;
  #valor: HTMLElement;
  #barra: HTMLElement;
  #aguja: HTMLElement;
  #esperada: HTMLElement;
  #detectada: HTMLElement;
  #estado: HTMLElement;
  #notaEsperada: INota | null = null;
  #notacion: TCfgNotacion;
  #ultima: IEjrCoincidencia | null = null;

  /** PROPUESTO: `fuenteCfg` opcional para mostrar la notación guardada desde el inicio (sin él se usa latina hasta el primer `'cfg:cambio'`). */
  constructor(bus: ICorBus, fuenteCfg?: ICorFuenteConfig) {
    this.#notacion = fuenteCfg?.obtenerConfig().notacion ?? bus.obtenerUltimo('cfg:cambio')?.cfg.notacion ?? 'latina';
    this.elem = ui_crearElemento('section', 'ui-medidor ui-medidor--inactivo');
    this.elem.setAttribute('aria-label', 'Coincidencia con la nota esperada');

    const titulo = ui_crearElemento('h2', 'ui-medidor__titulo', 'Coincidencia');
    const indicador = ui_crearElemento('div', 'ui-medidor__indicador');
    const svg = crearSvg('svg', { viewBox: '0 0 120 70', class: 'ui-medidor__arco', 'aria-hidden': 'true', focusable: 'false' });
    svg.append(
      crearSvg('path', { d: UI_RUTA_ARCO, class: 'ui-medidor__arcoFondo', pathLength: '100' }),
      crearSvg('path', { d: UI_RUTA_ARCO, class: 'ui-medidor__arcoValor', pathLength: '100' }),
    );
    const arco = svg.lastElementChild;
    if (!(arco instanceof SVGPathElement)) throw new Error('No se pudo crear el arco del medidor.');
    this.#arco = arco;
    this.#valor = ui_crearElemento('span', 'ui-medidor__valor', '—');
    indicador.append(svg, this.#valor);

    // Barra accesible (role="meter") con el mismo porcentaje del arco.
    const barraFondo = ui_crearElemento('div', 'ui-medidor__barraFondo');
    barraFondo.setAttribute('role', 'meter');
    barraFondo.setAttribute('aria-label', 'Coincidencia');
    barraFondo.setAttribute('aria-valuemin', '0');
    barraFondo.setAttribute('aria-valuemax', '100');
    barraFondo.setAttribute('aria-valuenow', '0');
    this.#barra = ui_crearElemento('div', 'ui-medidor__barra');
    barraFondo.append(this.#barra);

    const escala = ui_crearElemento('div', 'ui-medidor__cents');
    escala.setAttribute('aria-hidden', 'true');
    this.#aguja = ui_crearElemento('span', 'ui-medidor__aguja');
    escala.append(
      ui_crearElemento('span', 'ui-medidor__centsEtiqueta', `−${UI_CENTS_ESCALA}`),
      ui_crearElemento('span', 'ui-medidor__centro'),
      this.#aguja,
      ui_crearElemento('span', 'ui-medidor__centsEtiqueta ui-medidor__centsEtiqueta--der', `+${UI_CENTS_ESCALA}`),
    );

    const notas = ui_crearElemento('dl', 'ui-medidor__notas');
    this.#esperada = ui_crearElemento('dd', 'ui-medidor__nota', '—');
    this.#detectada = ui_crearElemento('dd', 'ui-medidor__nota', '—');
    notas.append(
      ui_crearElemento('dt', 'ui-medidor__etiqueta', 'Esperada'),
      this.#esperada,
      ui_crearElemento('dt', 'ui-medidor__etiqueta', 'Suena'),
      this.#detectada,
    );
    this.#estado = ui_crearElemento('p', 'ui-medidor__estado', 'Esperando una nota…');

    this.elem.append(titulo, indicador, barraFondo, escala, notas, this.#estado);
    this.#mostrar(null);

    bus.suscribir('ejr:coincidencia', (coincidencia) => {
      this.#mostrar(coincidencia);
    });
    bus.suscribir('ejr:esperada', ({ nota }) => {
      this.#notaEsperada = nota;
      this.#mostrarEsperada();
    });
    const reiniciar = (): void => {
      this.#mostrar(null);
    };
    bus.suscribir('ejr:cargado', () => {
      this.#notaEsperada = null;
      this.#mostrarEsperada();
      reiniciar();
    });
    bus.suscribir('tmp:detencion', reiniciar);
    bus.suscribir('cfg:cambio', (cambio) => {
      if (!cambio.claves.includes('notacion')) return;
      this.#notacion = cambio.cfg.notacion;
      this.#mostrarEsperada();
      this.#mostrar(this.#ultima);
    });
  }

  #mostrarEsperada(): void {
    const nota = this.#notaEsperada;
    this.#esperada.textContent = nota === null ? '—' : cor_obtenerEtiquetaNota(nota.nombre, nota.oct, this.#notacion);
  }

  #mostrar(coincidencia: IEjrCoincidencia | null): void {
    this.#ultima = coincidencia;
    const nivel = obtenerNivel(coincidencia);
    const pct = coincidencia === null || nivel === 'inactivo' ? 0 : Math.round(Math.min(100, Math.max(0, coincidencia.pct)));
    this.elem.classList.remove('ui-medidor--alto', 'ui-medidor--medio', 'ui-medidor--bajo', 'ui-medidor--inactivo');
    this.elem.classList.add(`ui-medidor--${nivel}`);
    this.#arco.style.strokeDasharray = `${pct} 100`;
    this.#barra.style.transform = `scaleX(${pct / 100})`;
    this.#valor.textContent = nivel === 'inactivo' ? '—' : `${pct} %`;
    const barraFondo = this.#barra.parentElement;
    if (barraFondo !== null) {
      barraFondo.setAttribute('aria-valuenow', String(pct));
      barraFondo.setAttribute('aria-valuetext', nivel === 'inactivo' ? 'Sin nota' : `${pct} %`);
    }

    const detectada = coincidencia?.detectada ?? null;
    const esConSonido = coincidencia !== null && !coincidencia.esSilencio && detectada !== null;
    this.#detectada.textContent = esConSonido ? `${cor_obtenerEtiquetaNota(detectada.nombre, detectada.oct, this.#notacion)} · ${formatearCents(coincidencia.cents)}` : '—';
    const cents = esConSonido ? Math.max(-UI_CENTS_ESCALA, Math.min(UI_CENTS_ESCALA, coincidencia.cents)) : 0;
    this.#aguja.style.left = `${50 + (cents / UI_CENTS_ESCALA) * 50}%`;
    this.#aguja.hidden = !esConSonido;
    this.#estado.textContent = obtenerTextoEstado(coincidencia);
  }
}

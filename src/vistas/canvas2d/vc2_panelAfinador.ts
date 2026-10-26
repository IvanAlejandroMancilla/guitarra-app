/** Panel del afinador: aguja grande de cents (−50..+50), nota, cuerda objetivo e indicaciones. */
import type { ICorCuadro } from '../../core/cor_contratos';
import { COR_COLORES_CUERDA, COR_COLOR_ACIERTO } from '../../core/cor_colores';
import type { IAfnLectura } from '../../core/cor_eventos';
import { COR_CANT_CUERDAS, cor_frecANota, cor_obtenerEtiquetaNota } from '../../core/cor_notas';
import type { TCfgNotacion } from '../../core/tipos';
import type { IVc2Capa, IVc2Geometria } from './vc2_tipos';

/** Rango visible de la aguja (±cents); replica el rango del afinador sin importar `afn`. */
const VC2_RANGO_CENTS = 50;
/** Ancho (±cents) de la zona verde dibujada en el dial. */
const VC2_ZONA_AFINADA_CENTS = 5;
const VC2_COLOR_DESAFINADO = '#ffb02e';
const VC2_COLOR_REPOSO = '#5b6478';

const formatearCents = (cents: number): string => {
  const redondeo = Math.round(cents);
  return `${redondeo > 0 ? '+' : ''}${redondeo} cents`;
};

export class Vc2PanelAfinador implements IVc2Capa {
  #lectura: IAfnLectura | null = null;
  #notacion: TCfgNotacion = 'latina';
  /** Ángulo visual de la aguja (radianes, 0 = vertical), animado hacia el objetivo. */
  #anguloAct = 0;

  fijarLectura(lectura: IAfnLectura | null): void {
    this.#lectura = lectura;
  }

  fijarNotacion(notacion: TCfgNotacion): void {
    this.#notacion = notacion;
  }

  dibujar(ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void {
    const lectura = this.#lectura;
    const { anchoPx, yGolpePx } = geo;
    const radio = Math.max(40, Math.min(anchoPx * 0.38, yGolpePx * 0.45));
    const centroX = anchoPx / 2;
    const centroY = yGolpePx * 0.18 + radio;
    const anguloMax = (Math.PI / 180) * 70;

    const centsAcotados = lectura === null ? 0 : Math.max(-VC2_RANGO_CENTS, Math.min(VC2_RANGO_CENTS, lectura.centsCuerda));
    const anguloObjetivo = (centsAcotados / VC2_RANGO_CENTS) * anguloMax;
    this.#anguloAct += (anguloObjetivo - this.#anguloAct) * Math.min(1, cuadro.deltaMs / 90);
    const color = lectura === null ? VC2_COLOR_REPOSO : lectura.esAfinado ? COR_COLOR_ACIERTO : VC2_COLOR_DESAFINADO;

    // Fondo del dial.
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(6, radio * 0.06);
    ctx.strokeStyle = '#1a2133';
    ctx.beginPath();
    ctx.arc(centroX, centroY, radio, -Math.PI / 2 - anguloMax, -Math.PI / 2 + anguloMax);
    ctx.stroke();
    // Zona afinada.
    const anguloZona = (VC2_ZONA_AFINADA_CENTS / VC2_RANGO_CENTS) * anguloMax;
    ctx.strokeStyle = COR_COLOR_ACIERTO;
    ctx.globalAlpha = lectura?.esAfinado === true ? 1 : 0.45;
    ctx.beginPath();
    ctx.arc(centroX, centroY, radio, -Math.PI / 2 - anguloZona, -Math.PI / 2 + anguloZona);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';

    // Marcas cada 10 cents.
    ctx.fillStyle = '#8c97b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.round(Math.max(11, radio * 0.07))}px system-ui, sans-serif`;
    for (let cents = -VC2_RANGO_CENTS; cents <= VC2_RANGO_CENTS; cents += 10) {
      const angulo = (cents / VC2_RANGO_CENTS) * anguloMax - Math.PI / 2;
      const esMayor = cents % 50 === 0;
      const largo = esMayor ? radio * 0.12 : radio * 0.07;
      const interior = radio - ctx.lineWidth - largo - 4;
      ctx.strokeStyle = esMayor ? '#c6cfe2' : '#5d6880';
      ctx.lineWidth = esMayor ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(centroX + Math.cos(angulo) * interior, centroY + Math.sin(angulo) * interior);
      ctx.lineTo(centroX + Math.cos(angulo) * (interior + largo), centroY + Math.sin(angulo) * (interior + largo));
      ctx.stroke();
      if (esMayor) {
        const texto = cents === 0 ? '0' : cents > 0 ? `+${cents}` : String(cents);
        ctx.fillText(texto, centroX + Math.cos(angulo) * (interior - radio * 0.1), centroY + Math.sin(angulo) * (interior - radio * 0.1));
      }
    }

    // Aguja.
    const angulo = this.#anguloAct - Math.PI / 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(4, radio * 0.035);
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth *= 3;
    ctx.beginPath();
    ctx.moveTo(centroX, centroY);
    ctx.lineTo(centroX + Math.cos(angulo) * radio * 0.92, centroY + Math.sin(angulo) * radio * 0.92);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth /= 3;
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centroX, centroY, radio * 0.07, 0, Math.PI * 2);
    ctx.fill();

    this.#dibujarTextos(ctx, lectura, color, centroX, centroY, radio, geo);
  }

  readonly #dibujarTextos = (
    ctx: CanvasRenderingContext2D,
    lectura: IAfnLectura | null,
    color: string,
    centroX: number,
    centroY: number,
    radio: number,
    geo: IVc2Geometria,
  ): void => {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const tamNombre = Math.round(Math.max(36, radio * 0.42));
    const yNombre = centroY - radio * 0.3;
    if (lectura === null) {
      ctx.fillStyle = '#c9d3e6';
      ctx.font = `600 ${Math.round(Math.max(18, radio * 0.13))}px system-ui, sans-serif`;
      ctx.fillText('Toca una cuerda al aire', centroX, yNombre);
      ctx.fillStyle = '#7d879c';
      ctx.font = `400 ${Math.round(Math.max(13, radio * 0.08))}px system-ui, sans-serif`;
      ctx.fillText('El afinador detecta la cuerda más cercana', centroX, yNombre + radio * 0.16);
    } else {
      const nombre = cor_obtenerEtiquetaNota(lectura.nombre, undefined, this.#notacion);
      ctx.fillStyle = color;
      ctx.font = `800 ${tamNombre}px system-ui, sans-serif`;
      ctx.fillText(nombre, centroX, yNombre);
      const anchoNombre = ctx.measureText(nombre).width;
      ctx.font = `700 ${Math.round(tamNombre * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(String(lectura.oct), centroX + anchoNombre / 2 + 4, yNombre);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#c9d3e6';
      ctx.font = `600 ${Math.round(Math.max(15, radio * 0.1))}px system-ui, sans-serif`;
      ctx.fillText(formatearCents(lectura.centsCuerda), centroX, centroY + radio * 0.28);
      ctx.font = `700 ${Math.round(Math.max(16, radio * 0.11))}px system-ui, sans-serif`;
      ctx.fillStyle = color;
      const indicacion = lectura.esAfinado
        ? '¡Afinada!'
        : lectura.centsCuerda < 0
          ? 'Grave: tensa la cuerda'
          : 'Aguda: afloja la cuerda';
      ctx.fillText(indicacion, centroX, centroY + radio * 0.46);
    }

    // Cuerdas: la objetivo resaltada con su color.
    const yCuerdas = Math.min(geo.yGolpePx - 20, centroY + radio * 0.72);
    const separacion = Math.min(radio * 0.32, geo.anchoPx / 8);
    const curObjetivo = lectura?.curCercana ?? 0;
    ctx.font = `700 ${Math.round(Math.max(13, separacion * 0.32))}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    for (let cur = COR_CANT_CUERDAS; cur >= 1; cur--) {
      const xPx = centroX + (COR_CANT_CUERDAS - cur - (COR_CANT_CUERDAS - 1) / 2) * separacion;
      const esObjetivo = cur === curObjetivo;
      const colorCuerda = COR_COLORES_CUERDA[cur - 1] ?? '#ffffff';
      ctx.globalAlpha = esObjetivo ? 1 : 0.35;
      ctx.fillStyle = esObjetivo ? colorCuerda : '#20283b';
      ctx.beginPath();
      ctx.arc(xPx, yCuerdas, separacion * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colorCuerda;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = esObjetivo ? '#0a0d16' : '#c9d3e6';
      ctx.fillText(String(cur), xPx, yCuerdas + 1);
    }
    ctx.globalAlpha = 1;
    if (lectura !== null) {
      const ref = cor_frecANota(lectura.frecRefHz);
      ctx.fillStyle = '#8c97b0';
      ctx.font = `500 ${Math.round(Math.max(12, radio * 0.075))}px system-ui, sans-serif`;
      ctx.textBaseline = 'alphabetic';
      const texto = `Cuerda ${lectura.curCercana} · ${cor_obtenerEtiquetaNota(ref.nombre, ref.oct, this.#notacion)} · ${lectura.frecHz.toFixed(1)} Hz (objetivo ${lectura.frecRefHz.toFixed(1)} Hz)`;
      ctx.fillText(texto, centroX, yCuerdas + separacion * 0.75);
    }
  };
}

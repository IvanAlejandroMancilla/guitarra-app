/** Notas que caen por su carril: color de la cuerda, traste dentro y nombre encima. */
import type { ICorCuadro } from '../../core/cor_contratos';
import { COR_COLORES_CUERDA, COR_COLOR_FALLO } from '../../core/cor_colores';
import { cor_obtenerEtiquetaNota } from '../../core/cor_notas';
import type { IEjercicio, INota, TCfgNotacion } from '../../core/tipos';
import { VC2_RADIO_NOTA_PX } from './vc2_constantes';
import { vc2_calcularXCarril, vc2_calcularYNota } from './vc2_geometria';
import type { IVc2Capa, IVc2Geometria } from './vc2_tipos';

const VC2_ESTADO_PENDIENTE = 0;
const VC2_ESTADO_ACIERTO = 1;
const VC2_ESTADO_FALLO = 2;
/** Color de las notas sin cuerda asignada (valen en cualquier cuerda). */
const VC2_COLOR_SIN_CUERDA = '#dfe6f5';
/** Duración mínima (pulsos) para dibujar la cola de sostenido. */
const VC2_DUR_MIN_COLA = 1.5;

export class Vc2Notas implements IVc2Capa {
  #notas: readonly INota[] = [];
  #estados = new Uint8Array(0);
  #notacion: TCfgNotacion = 'latina';

  /** Carga las notas y reinicia los resultados. */
  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    this.#estados = new Uint8Array(ej.notas.length);
  }

  marcarResultado(idxNota: number, esAcierto: boolean): void {
    if (idxNota < 0 || idxNota >= this.#estados.length) return;
    this.#estados[idxNota] = esAcierto ? VC2_ESTADO_ACIERTO : VC2_ESTADO_FALLO;
  }

  fijarNotacion(notacion: TCfgNotacion): void {
    this.#notacion = notacion;
  }

  dibujar(ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void {
    if (this.#notas.length === 0) return;
    const pos = cuadro.posPulsos;
    const tiempoMin = pos - (geo.altoPx - geo.yGolpePx) / geo.pxPorPulso - 1;
    const tiempoMax = pos + geo.yGolpePx / geo.pxPorPulso + 1;
    const radio = VC2_RADIO_NOTA_PX * Math.min(Math.max(geo.anchoCarrilPx / 70, 0.7), 1.4);

    // De la más lejana a la más cercana: las próximas quedan encima.
    for (let idx = this.#notas.length - 1; idx >= 0; idx--) {
      const nota = this.#notas[idx];
      if (nota === undefined) continue;
      const fin = nota.tiempo + (nota.dur ?? 0);
      if (nota.tiempo > tiempoMax || fin < tiempoMin) continue;
      const estado = this.#estados[idx] ?? VC2_ESTADO_PENDIENTE;
      if (estado === VC2_ESTADO_ACIERTO) continue;
      this.#dibujarNota(ctx, nota, estado, pos, geo, radio);
    }
    ctx.globalAlpha = 1;
  }

  readonly #dibujarNota = (
    ctx: CanvasRenderingContext2D,
    nota: INota,
    estado: number,
    pos: number,
    geo: IVc2Geometria,
    radio: number,
  ): void => {
    const xPx = vc2_calcularXCarril(nota.cur, geo);
    const yPx = vc2_calcularYNota(nota.tiempo, pos, geo);
    const tieneCuerda = nota.cur !== undefined && nota.cur >= 1 && nota.cur <= COR_COLORES_CUERDA.length;
    const color = estado === VC2_ESTADO_FALLO ? '#4a5060' : tieneCuerda ? (COR_COLORES_CUERDA[(nota.cur ?? 1) - 1] ?? VC2_COLOR_SIN_CUERDA) : VC2_COLOR_SIN_CUERDA;
    const anchoGema = tieneCuerda ? Math.min(geo.anchoCarrilPx * 0.82, radio * 3.6) : geo.anchoCarrilPx * 2.2;
    const altoGema = radio * 2;

    // Aparece suave arriba y se desvanece tras pasar la línea.
    const alfaEntrada = Math.min(1, Math.max(0, (yPx + altoGema) / (geo.yGolpePx * 0.3)));
    const alfaSalida = yPx > geo.yGolpePx ? Math.max(0, 1 - (yPx - geo.yGolpePx) / (geo.altoPx - geo.yGolpePx)) : 1;
    const alfa = alfaEntrada * alfaSalida * (estado === VC2_ESTADO_FALLO ? 0.6 : 1);
    if (alfa <= 0.01) return;

    // Cola de sostenido.
    if (nota.dur !== undefined && nota.dur >= VC2_DUR_MIN_COLA && estado !== VC2_ESTADO_FALLO) {
      const yFin = vc2_calcularYNota(nota.tiempo + nota.dur, pos, geo);
      ctx.globalAlpha = alfa * 0.35;
      ctx.fillStyle = color;
      ctx.fillRect(xPx - anchoGema * 0.18, yFin, anchoGema * 0.36, Math.max(0, yPx - yFin));
    }

    // Halo al acercarse a la línea de golpe.
    const distRel = Math.abs(yPx - geo.yGolpePx) / geo.pxPorPulso;
    if (estado === VC2_ESTADO_PENDIENTE && distRel < 0.6) {
      ctx.globalAlpha = alfa * 0.35 * (1 - distRel / 0.6);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(xPx - anchoGema / 2 - 6, yPx - altoGema / 2 - 6, anchoGema + 12, altoGema + 12, radio + 6);
      ctx.fill();
    }

    ctx.globalAlpha = alfa;
    ctx.beginPath();
    ctx.roundRect(xPx - anchoGema / 2, yPx - altoGema / 2, anchoGema, altoGema, radio);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = estado === VC2_ESTADO_FALLO ? COR_COLOR_FALLO : 'rgba(255, 255, 255, 0.85)';
    ctx.stroke();
    // Brillo superior.
    ctx.globalAlpha = alfa * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(xPx - anchoGema / 2 + 3, yPx - altoGema / 2 + 2, anchoGema - 6, altoGema * 0.38, radio * 0.6);
    ctx.fill();

    ctx.globalAlpha = alfa;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (nota.trs !== undefined) {
      ctx.font = `800 ${Math.round(radio * 1.2)}px system-ui, sans-serif`;
      ctx.fillStyle = '#0a0d16';
      ctx.fillText(String(nota.trs), xPx, yPx + 1);
    }
    // Dedo sugerido (1 índice … 4 meñique) en una insignia pequeña junto a la gema; el 0 (al aire) ya lo dice el traste.
    if (nota.dedo !== undefined && nota.dedo > 0) {
      const radioDedo = Math.max(6, radio * 0.5);
      const xDedo = xPx + anchoGema / 2 + radioDedo * 0.6;
      const yDedo = yPx + altoGema / 2 - radioDedo * 0.4;
      ctx.beginPath();
      ctx.arc(xDedo, yDedo, radioDedo, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0d16';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.font = `800 ${Math.round(radioDedo * 1.25)}px system-ui, sans-serif`;
      ctx.fillStyle = '#e6ecf8';
      ctx.fillText(String(nota.dedo), xDedo, yDedo + 1);
    }
    ctx.font = `600 ${Math.round(Math.max(11, radio * 0.8))}px system-ui, sans-serif`;
    ctx.fillStyle = '#d8e1f2';
    ctx.textBaseline = 'bottom';
    const etiqueta = cor_obtenerEtiquetaNota(nota.nombre, nota.oct, this.#notacion);
    ctx.fillText(tieneCuerda || nota.trs !== undefined ? etiqueta : `${etiqueta} (cualquier cuerda)`, xPx, yPx - altoGema / 2 - 3);
  };
}

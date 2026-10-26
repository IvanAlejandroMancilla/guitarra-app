/** Fondo, autopista, cuerdas y líneas de pulso/compás. */
import type { ICorCuadro } from '../../core/cor_contratos';
import { COR_COLORES_CUERDA } from '../../core/cor_colores';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { vc2_calcularXCarril, vc2_calcularYNota } from './vc2_geometria';
import type { IVc2Capa, IVc2Geometria } from './vc2_tipos';

export class Vc2Carriles implements IVc2Capa {
  #pulsosPorCompas = 4;

  fijarPulsosPorCompas(cant: number): void {
    this.#pulsosPorCompas = Math.max(1, Math.round(cant));
  }

  dibujar(ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void {
    const { anchoPx, altoPx, yGolpePx, anchoCarrilPx } = geo;
    const fondo = ctx.createLinearGradient(0, 0, 0, altoPx);
    fondo.addColorStop(0, '#020308');
    fondo.addColorStop(0.6, '#070b16');
    fondo.addColorStop(1, '#04060c');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, anchoPx, altoPx);

    const anchoAutopista = anchoCarrilPx * COR_CANT_CUERDAS;
    const izquierda = (anchoPx - anchoAutopista) / 2;
    const autopista = ctx.createLinearGradient(0, 0, 0, yGolpePx);
    autopista.addColorStop(0, 'rgba(18, 26, 48, 0)');
    autopista.addColorStop(1, 'rgba(26, 38, 70, 0.85)');
    ctx.fillStyle = autopista;
    ctx.fillRect(izquierda, 0, anchoAutopista, yGolpePx);
    ctx.fillStyle = 'rgba(14, 20, 36, 0.9)';
    ctx.fillRect(izquierda, yGolpePx, anchoAutopista, altoPx - yGolpePx);

    // Bordes de la autopista.
    ctx.fillStyle = 'rgba(120, 150, 210, 0.35)';
    ctx.fillRect(izquierda - 2, 0, 2, altoPx);
    ctx.fillRect(izquierda + anchoAutopista, 0, 2, altoPx);

    // Líneas de pulso (finas) y compás (marcadas).
    const pos = cuadro.posPulsos;
    const pulsoMin = Math.ceil(pos - (altoPx - yGolpePx) / geo.pxPorPulso);
    const pulsoMax = Math.floor(pos + yGolpePx / geo.pxPorPulso);
    for (let pulso = Math.max(pulsoMin, 0); pulso <= pulsoMax; pulso++) {
      const yPx = vc2_calcularYNota(pulso, pos, geo);
      const esCompas = pulso % this.#pulsosPorCompas === 0;
      ctx.globalAlpha = Math.min(1, Math.max(0, yPx / (yGolpePx * 0.5))) * (esCompas ? 0.5 : 0.18);
      ctx.fillStyle = esCompas ? '#9fb6ff' : '#6b7fae';
      ctx.fillRect(izquierda, yPx - (esCompas ? 1 : 0.5), anchoAutopista, esCompas ? 2 : 1);
    }
    ctx.globalAlpha = 1;

    // Separadores de carril y cuerdas.
    for (let cur = 1; cur <= COR_CANT_CUERDAS; cur++) {
      const xPx = vc2_calcularXCarril(cur, geo);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(xPx - anchoCarrilPx / 2, 0, 1, altoPx);
      const color = COR_COLORES_CUERDA[cur - 1] ?? '#ffffff';
      const grosor = 1 + (cur - 1) * 0.35;
      const cuerda = ctx.createLinearGradient(0, 0, 0, yGolpePx);
      cuerda.addColorStop(0, 'rgba(0, 0, 0, 0)');
      cuerda.addColorStop(1, color);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = cuerda;
      ctx.fillRect(xPx - grosor / 2, 0, grosor, yGolpePx);
      ctx.globalAlpha = 1;
    }
  }
}

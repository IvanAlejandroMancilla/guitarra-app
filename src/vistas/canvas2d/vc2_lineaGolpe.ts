/** Línea de golpe con resplandor que late con el pulso y aros objetivo por cuerda. */
import type { ICorCuadro } from '../../core/cor_contratos';
import { COR_COLORES_CUERDA } from '../../core/cor_colores';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { VC2_RADIO_NOTA_PX } from './vc2_constantes';
import { vc2_calcularXCarril } from './vc2_geometria';
import type { IVc2Capa, IVc2Geometria } from './vc2_tipos';

export class Vc2LineaGolpe implements IVc2Capa {
  dibujar(ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void {
    const { yGolpePx, anchoCarrilPx, anchoPx } = geo;
    const anchoAutopista = anchoCarrilPx * COR_CANT_CUERDAS;
    const izquierda = (anchoPx - anchoAutopista) / 2;
    const fraccion = cuadro.posPulsos - Math.floor(cuadro.posPulsos);
    const latido = cuadro.posPulsos > 0 ? Math.pow(1 - fraccion, 3) : 0;

    const halo = ctx.createLinearGradient(0, yGolpePx - 14, 0, yGolpePx + 14);
    halo.addColorStop(0, 'rgba(140, 180, 255, 0)');
    halo.addColorStop(0.5, `rgba(170, 205, 255, ${0.25 + 0.35 * latido})`);
    halo.addColorStop(1, 'rgba(140, 180, 255, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(izquierda, yGolpePx - 14, anchoAutopista, 28);
    ctx.fillStyle = '#e9f1ff';
    ctx.fillRect(izquierda, yGolpePx - 1.5, anchoAutopista, 3);

    const radio = VC2_RADIO_NOTA_PX * Math.min(Math.max(anchoCarrilPx / 70, 0.7), 1.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 ${Math.round(radio * 0.75)}px system-ui, sans-serif`;
    for (let cur = 1; cur <= COR_CANT_CUERDAS; cur++) {
      const xPx = vc2_calcularXCarril(cur, geo);
      const color = COR_COLORES_CUERDA[cur - 1] ?? '#ffffff';
      ctx.globalAlpha = 0.18 + 0.12 * latido;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(xPx, yGolpePx, radio, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#c8d4ee';
      ctx.fillText(String(cur), xPx, yGolpePx + radio + 4);
    }
    ctx.globalAlpha = 1;
  }
}

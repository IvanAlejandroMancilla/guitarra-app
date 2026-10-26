/** Capa del diagrama del mástil: diapasón, trastes, cejuela, cuerdas de color, marcas de posición y números de traste. */
import { COR_COLORES_CUERDA } from '../../core/cor_colores';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { vc2_calcularXTrasteMastil, vc2_calcularYCuerdaMastil } from './vc2_geometriaMastil';
import type { IVc2CapaMastil, IVc2GeoMastil } from './vc2_tipos';

/** Trastes con marca de posición (incrustación); el 12 lleva doble. */
const VC2_TRASTES_CON_MARCA_MASTIL: readonly number[] = [3, 5, 7, 9, 12];
const VC2_TRS_MARCA_DOBLE = 12;
/** Color de los trastes y de los detalles del diagrama. */
const VC2_COLOR_DIAGRAMA = '#2b3656';
const VC2_COLOR_FONDO_MASTIL = '#090d18';
const VC2_COLOR_CEJUELA = '#d9e1f2';
const VC2_COLOR_INCRUSTACION = 'rgba(160, 180, 230, 0.16)';
const VC2_COLOR_NUMERO = '#5d6888';
const VC2_COLOR_NUMERO_MARCADO = '#aab6d6';

export class Vc2DiagramaMastil implements IVc2CapaMastil {
  dibujar(ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil): void {
    const yArriba = vc2_calcularYCuerdaMastil(COR_CANT_CUERDAS, geo);
    const yAbajo = vc2_calcularYCuerdaMastil(1, geo);
    const medio = geo.anchoTrastePx / 2;
    const tieneAire = geo.trsMin === 0;
    // Borde del diapasón: después de la columna "al aire" si se ve; si no, desde la primera columna.
    const trsPrimeraCasilla = tieneAire ? 1 : geo.trsMin;
    const xIni = vc2_calcularXTrasteMastil(trsPrimeraCasilla, geo) - (geo.esZurdo ? -medio : medio);
    const xFin = vc2_calcularXTrasteMastil(geo.trsMax, geo) + (geo.esZurdo ? -medio : medio);
    const xIzq = Math.min(xIni, xFin);
    const xDer = Math.max(xIni, xFin);
    const sobrante = geo.separacionCuerdasPx * 0.28;

    // Diapasón con un brillo neón muy suave en los bordes.
    const degradado = ctx.createLinearGradient(0, yArriba - sobrante, 0, yAbajo + sobrante);
    degradado.addColorStop(0, '#0d1426');
    degradado.addColorStop(0.5, VC2_COLOR_FONDO_MASTIL);
    degradado.addColorStop(1, '#0d1426');
    ctx.fillStyle = degradado;
    ctx.fillRect(xIzq, yArriba - sobrante, xDer - xIzq, yAbajo - yArriba + 2 * sobrante);
    ctx.strokeStyle = 'rgba(80, 140, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(xIzq + 0.5, yArriba - sobrante + 0.5, xDer - xIzq - 1, yAbajo - yArriba + 2 * sobrante - 1);

    this.#dibujarIncrustaciones(ctx, geo, yArriba, yAbajo);

    // Trastes (borde derecho de cada casilla, en orden diestro).
    ctx.strokeStyle = VC2_COLOR_DIAGRAMA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let trs = trsPrimeraCasilla; trs <= geo.trsMax; trs++) {
      const xBorde = vc2_calcularXTrasteMastil(trs, geo) + (geo.esZurdo ? -medio : medio);
      ctx.moveTo(xBorde, yArriba - sobrante);
      ctx.lineTo(xBorde, yAbajo + sobrante);
    }
    ctx.stroke();

    // Cejuela (o borde de inicio si el rango empieza más arriba).
    ctx.strokeStyle = tieneAire ? VC2_COLOR_CEJUELA : VC2_COLOR_DIAGRAMA;
    ctx.lineWidth = tieneAire ? 5 : 2;
    ctx.beginPath();
    ctx.moveTo(xIni, yArriba - sobrante);
    ctx.lineTo(xIni, yAbajo + sobrante);
    ctx.stroke();

    this.#dibujarCuerdas(ctx, geo);
    this.#dibujarNumeros(ctx, geo, yAbajo + sobrante);
  }

  readonly #dibujarIncrustaciones = (ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil, yArriba: number, yAbajo: number): void => {
    const radio = Math.max(2, Math.min(geo.separacionCuerdasPx, geo.anchoTrastePx) * 0.18);
    ctx.fillStyle = VC2_COLOR_INCRUSTACION;
    for (const trs of VC2_TRASTES_CON_MARCA_MASTIL) {
      if (trs < geo.trsMin || trs > geo.trsMax || trs === 0) continue;
      const x = vc2_calcularXTrasteMastil(trs, geo);
      const centrosY =
        trs === VC2_TRS_MARCA_DOBLE
          ? [yArriba + geo.separacionCuerdasPx * 1.5, yAbajo - geo.separacionCuerdasPx * 1.5]
          : [(yArriba + yAbajo) / 2];
      for (const y of centrosY) {
        ctx.beginPath();
        ctx.arc(x, y, radio, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  readonly #dibujarCuerdas = (ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil): void => {
    // Las cuerdas cruzan todo el ancho útil, también la zona "al aire".
    const xDesde = geo.margenIzqPx;
    const xHasta = geo.anchoPx - geo.margenIzqPx;
    for (let cur = 1; cur <= COR_CANT_CUERDAS; cur++) {
      const y = vc2_calcularYCuerdaMastil(cur, geo);
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = COR_COLORES_CUERDA[cur - 1] ?? VC2_COLOR_CEJUELA;
      ctx.lineWidth = 1 + (cur - 1) * 0.35;
      ctx.beginPath();
      ctx.moveTo(xDesde, y);
      ctx.lineTo(xHasta, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  readonly #dibujarNumeros = (ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil, yBase: number): void => {
    const tam = Math.round(Math.max(9, Math.min(13, geo.margenSupPx * 0.55, geo.anchoTrastePx * 0.4)));
    const y = yBase + (geo.altoPx - yBase) / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let trs = geo.trsMin; trs <= geo.trsMax; trs++) {
      const esMarcado = VC2_TRASTES_CON_MARCA_MASTIL.includes(trs);
      ctx.font = `${esMarcado ? 700 : 500} ${tam}px system-ui, sans-serif`;
      ctx.fillStyle = esMarcado ? VC2_COLOR_NUMERO_MARCADO : VC2_COLOR_NUMERO;
      ctx.fillText(String(trs), vc2_calcularXTrasteMastil(trs, geo), y);
    }
  };
}

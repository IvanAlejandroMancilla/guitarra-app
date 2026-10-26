/**
 * Geometría del diagrama del mástil (franja baja de la pantalla de práctica). Funciones puras.
 * Cuerdas horizontales: 6.ª (Mi grave) arriba, 1.ª abajo, igual que la vista Rocksmith.
 * Trastes en columnas de izquierda a derecha (zurdo: de derecha a izquierda).
 */
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { VC2_TRS_MAX_MASTIL } from './vc2_constantes';
import type { IVc2GeoMastil, IVc2RangoMastil } from './vc2_tipos';

/** Último traste del mástil. */
const VC2_TRS_TOPE_MASTIL = 24;
const VC2_MARGEN_SUP_MIN_PX = 14;
const VC2_MARGEN_SUP_MAX_PX = 26;
const VC2_MARGEN_SUP_REL = 0.14;
const VC2_MARGEN_IZQ_MIN_PX = 10;
const VC2_MARGEN_IZQ_MAX_PX = 28;
const VC2_MARGEN_IZQ_REL = 0.02;

const acotar = (valor: number, min: number, max: number): number => Math.min(max, Math.max(min, valor));

/**
 * Rango visible: 0..`VC2_TRS_MAX_MASTIL` si todos los trastes caben; si no, la zona necesaria
 * (hasta el traste más agudo, con al menos `VC2_TRS_MAX_MASTIL` + 1 columnas, sin pasar de 0..24).
 * Ignora valores no enteros o negativos.
 */
export function vc2_calcularRangoMastil(trsNotas: readonly number[]): IVc2RangoMastil {
  let min = Infinity;
  let max = -Infinity;
  for (const trs of trsNotas) {
    if (!Number.isInteger(trs) || trs < 0) continue;
    min = Math.min(min, trs);
    max = Math.max(max, trs);
  }
  if (max <= VC2_TRS_MAX_MASTIL) return { trsMin: 0, trsMax: VC2_TRS_MAX_MASTIL };
  const trsMax = Math.min(VC2_TRS_TOPE_MASTIL, max);
  const trsMin = Math.max(0, Math.min(min, trsMax - VC2_TRS_MAX_MASTIL));
  return { trsMin, trsMax };
}

export function vc2_calcularGeoMastil(anchoPx: number, altoPx: number, rango: IVc2RangoMastil, esZurdo: boolean): IVc2GeoMastil {
  const ancho = Math.max(anchoPx, 1);
  const alto = Math.max(altoPx, 1);
  const trsMin = Math.max(0, Math.min(rango.trsMin, rango.trsMax));
  const trsMax = Math.max(trsMin, rango.trsMax);
  const margenSupPx = acotar(alto * VC2_MARGEN_SUP_REL, VC2_MARGEN_SUP_MIN_PX, VC2_MARGEN_SUP_MAX_PX);
  const margenIzqPx = acotar(ancho * VC2_MARGEN_IZQ_REL, VC2_MARGEN_IZQ_MIN_PX, VC2_MARGEN_IZQ_MAX_PX);
  const cantColumnas = trsMax - trsMin + 1;
  return {
    anchoPx: ancho,
    altoPx: alto,
    margenIzqPx,
    margenSupPx,
    anchoTrastePx: Math.max(1, (ancho - 2 * margenIzqPx) / cantColumnas),
    separacionCuerdasPx: Math.max(1, (alto - 2 * margenSupPx) / (COR_CANT_CUERDAS - 1)),
    trsMin,
    trsMax,
    esZurdo,
  };
}

/** X del centro de la casilla del traste `trs`; el 0 (al aire) es la columna antes de la cejuela. */
export function vc2_calcularXTrasteMastil(trs: number, geo: IVc2GeoMastil): number {
  const xDiestro = geo.margenIzqPx + (trs - geo.trsMin + 0.5) * geo.anchoTrastePx;
  return geo.esZurdo ? geo.anchoPx - xDiestro : xDiestro;
}

/** Y de la cuerda `cur` (1–6): la 6.ª arriba, la 1.ª abajo. */
export function vc2_calcularYCuerdaMastil(cur: number, geo: IVc2GeoMastil): number {
  return geo.margenSupPx + (COR_CANT_CUERDAS - cur) * geo.separacionCuerdasPx;
}

/**
 * Geometría de la autopista 2D. Funciones puras.
 * Carriles verticales, uno por cuerda: diestro = cuerda 6 (Mi grave) a la izquierda;
 * zurdo = invertido. Las notas bajan hacia la línea de golpe.
 */
import type { ICorOpcionesVista } from '../../core/cor_contratos';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { VC2_PULSOS_VISIBLES, VC2_Y_GOLPE_REL } from './vc2_constantes';
import type { IVc2Geometria } from './vc2_tipos';

const VC2_ANCHO_CARRIL_MAX_PX = 120;
const VC2_FRACCION_ANCHO_AUTOPISTA = 0.88;

export function vc2_calcularGeometria(anchoPx: number, altoPx: number, opc: ICorOpcionesVista): IVc2Geometria {
  const ancho = Math.max(anchoPx, 1);
  const alto = Math.max(altoPx, 1);
  const yGolpePx = alto * VC2_Y_GOLPE_REL;
  const velocidad = opc.velocidadAutopista > 0 ? opc.velocidadAutopista : 1;
  return {
    anchoPx: ancho,
    altoPx: alto,
    yGolpePx,
    pxPorPulso: (yGolpePx * velocidad) / VC2_PULSOS_VISIBLES,
    anchoCarrilPx: Math.min((ancho * VC2_FRACCION_ANCHO_AUTOPISTA) / COR_CANT_CUERDAS, VC2_ANCHO_CARRIL_MAX_PX),
    esZurdo: opc.esZurdo,
  };
}

/** X del centro del carril de la cuerda `cur` (1–6). Sin cuerda (o inválida): centro de la autopista. */
export function vc2_calcularXCarril(cur: number | undefined, geo: IVc2Geometria): number {
  const centro = geo.anchoPx / 2;
  if (cur === undefined || !Number.isInteger(cur) || cur < 1 || cur > COR_CANT_CUERDAS) return centro;
  const idxCarril = geo.esZurdo ? cur - 1 : COR_CANT_CUERDAS - cur;
  const izquierda = centro - (COR_CANT_CUERDAS * geo.anchoCarrilPx) / 2;
  return izquierda + (idxCarril + 0.5) * geo.anchoCarrilPx;
}

/** Y de una nota: en la línea de golpe cuando `tiempoPulsos` = `posPulsos`; las futuras quedan arriba. */
export function vc2_calcularYNota(tiempoPulsos: number, posPulsos: number, geo: IVc2Geometria): number {
  return geo.yGolpePx - (tiempoPulsos - posPulsos) * geo.pxPorPulso;
}

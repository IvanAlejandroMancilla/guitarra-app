/** Digitación automática por cajas. Función pura. */
import { COR_DEDO_AIRE, COR_DEDO_MAX } from '../core/cor_digitacion';
import type { IAfinacion } from '../core/tipos';
import { ESC_ANCHO_CAJA, ESC_TRS_MAX } from './esc_constantes';
import type { IEscPosicion } from './esc_tipos';

/**
 * Dedo para tocar `trs` en una caja que empieza en `trsMin` (un dedo por traste):
 * traste 0 → 0 (al aire); si no, `trs − max(trsMin, 1) + 1` acotado a 1..4
 * (los estiramientos fuera de la caja usan el índice o el meñique).
 */
export function esc_calcularDedo(trs: number, trsMin: number): number {
  if (trs === 0) return COR_DEDO_AIRE;
  const dedo = trs - Math.max(trsMin, 1) + 1;
  return Math.min(COR_DEDO_MAX, Math.max(1, dedo));
}

/**
 * Cuerda, traste y dedo para cada MIDI (ascendente) dentro de la caja
 * [trsInicial, trsInicial + ESC_ANCHO_CAJA − 1]. Recorre las cuerdas de grave a aguda
 * sin volver a una más grave: cada nota va en la cuerda más grave (desde la actual)
 * que la tenga dentro de la caja. Si ninguna la tiene, usa la posición más cercana a la
 * caja (estiramiento o cambio de posición). Lanza `RangeError` si una nota no existe
 * en el mástil (0..ESC_TRS_MAX).
 */
export function esc_calcularDigitacion(midis: readonly number[], afin: IAfinacion, trsInicial: number): IEscPosicion[] {
  const cantCuerdas = afin.midiCuerdas.length;
  const trsMin = Math.max(0, Math.round(trsInicial));
  const trsMax = trsMin + ESC_ANCHO_CAJA - 1;
  const posiciones: IEscPosicion[] = [];
  let curAct = cantCuerdas;

  for (const midi of midis) {
    let elegida: IEscPosicion | null = null;
    for (let cur = curAct; cur >= 1 && elegida === null; cur--) {
      const trs = midi - (afin.midiCuerdas[cur - 1] ?? Number.NaN);
      if (trs >= trsMin && trs <= trsMax) elegida = { cur, trs, dedo: esc_calcularDedo(trs, trsMin) };
    }
    if (elegida === null) {
      let distMejor = Infinity;
      for (let cur = cantCuerdas; cur >= 1; cur--) {
        const trs = midi - (afin.midiCuerdas[cur - 1] ?? Number.NaN);
        if (!(trs >= 0 && trs <= ESC_TRS_MAX)) continue;
        // Penaliza volver a una cuerda más grave para mantener el recorrido ascendente.
        const dist = Math.max(trsMin - trs, trs - trsMax, 0) + (cur > curAct ? ESC_ANCHO_CAJA : 0);
        if (dist < distMejor) {
          distMejor = dist;
          elegida = { cur, trs, dedo: esc_calcularDedo(trs, trsMin) };
        }
      }
    }
    if (elegida === null) throw new RangeError(`La nota MIDI ${midi} no se puede tocar en la afinación "${afin.nombre}".`);
    posiciones.push(elegida);
    curAct = Math.min(curAct, elegida.cur);
  }
  return posiciones;
}

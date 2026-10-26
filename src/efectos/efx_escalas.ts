/** Conversión de parámetros normalizados (0..1) a rangos físicos. Funciones puras. */

const acotarRel = (rel: number): number => (Number.isFinite(rel) ? Math.min(1, Math.max(0, rel)) : 0);

/** `rel` (0..1, se acota) → `min + rel·(max − min)`. */
export function efx_convertirRelALineal(rel: number, min: number, max: number): number {
  return min + acotarRel(rel) * (max - min);
}

/**
 * `rel` (0..1, se acota) → `min·(max/min)^rel` (para frecuencias, tiempos y ganancias).
 * Si `min` o `max` no son positivos, cae a la escala lineal.
 */
export function efx_convertirRelAExponencial(rel: number, min: number, max: number): number {
  if (!(min > 0) || !(max > 0)) return efx_convertirRelALineal(rel, min, max);
  return min * Math.pow(max / min, acotarRel(rel));
}

/** dB → ganancia lineal (0 dB = 1). */
export function efx_convertirDbAGan(db: number): number {
  return Math.pow(10, db / 20);
}

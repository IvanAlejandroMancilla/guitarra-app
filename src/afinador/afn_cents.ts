/** Cálculos de cents. Funciones puras. */

/** Desvío en cents de `frecHz` respecto de `frecRefHz` (negativo = más grave). */
export function afn_calcularCents(frecHz: number, frecRefHz: number): number {
  if (!(frecHz > 0) || !(frecRefHz > 0)) throw new RangeError(`Frecuencias inválidas: ${frecHz}, ${frecRefHz}`);
  return 1200 * Math.log2(frecHz / frecRefHz);
}

/** `true` si |cents| ≤ `tolCents`. */
export function afn_validarAfinado(cents: number, tolCents: number): boolean {
  return Math.abs(cents) <= tolCents;
}

/** Suavizado exponencial: `factor` = peso de la lectura nueva (0..1). */
export function afn_suavizarCents(centsAnt: number, centsNuevo: number, factor: number): number {
  const factorAcotado = Math.min(Math.max(factor, 0), 1);
  return centsAnt + factorAcotado * (centsNuevo - centsAnt);
}

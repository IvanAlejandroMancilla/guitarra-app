/** Cálculo del porcentaje de coincidencia entre lo que suena y la nota esperada. Funciones puras. */

/** Desvío en cents (valor absoluto) con el que la coincidencia de una nota correcta llega a 0 %. */
export const EJR_CENTS_COINCIDENCIA_CERO = 50;

/**
 * 0..100. Si la nota no es la correcta: 0. Si lo es: 100 × (1 − |cents| / `EJR_CENTS_COINCIDENCIA_CERO`),
 * acotado a 0..100. `cents` no finito cuenta como 0 %.
 */
export function ejr_calcularPctCoincidencia(cents: number, esNotaCorrecta: boolean): number {
  if (!esNotaCorrecta || !Number.isFinite(cents)) return 0;
  const pct = 100 * (1 - Math.abs(cents) / EJR_CENTS_COINCIDENCIA_CERO);
  return Math.min(100, Math.max(0, pct));
}

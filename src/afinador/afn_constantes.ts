/** Constantes del afinador (contrato: docs/firmas-aprobadas.md §4). */

/** Desvío máximo (±cents) para considerar una cuerda afinada. */
export const AFN_TOL_CENTS = 5;
/** Rango visible de la aguja (±cents). */
export const AFN_RANGO_CENTS = 50;
/** Peso de la lectura nueva en el suavizado exponencial (0..1). */
export const AFN_FACTOR_SUAVIZADO = 0.3;

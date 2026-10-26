/** Digitación de la mano izquierda: 0 = al aire, 1 índice, 2 medio, 3 anular, 4 meñique. Funciones puras. */

export const COR_DEDO_AIRE = 0;
export const COR_DEDO_MAX = 4;

/** `true` si `valor` es un dedo válido: entero entre `COR_DEDO_AIRE` y `COR_DEDO_MAX`. */
export function cor_validarDedo(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= COR_DEDO_AIRE && valor <= COR_DEDO_MAX;
}

/** Selección de pistas. Funciones puras sobre `IGprPista` (no conocen alphaTab). */
import type { IGprPista } from '../core/cor_eventos';

/**
 * Índice de la pista que el usuario toca por defecto:
 * 1) la primera guitarra (`esGuitarra`); 2) si no hay, la primera pista con cuerdas que no sea percusión;
 * 3) si no hay, la primera que no sea percusión; 4) si no hay, la primera. `-1` si la lista está vacía.
 * Devuelve `IGprPista.idx` (índice en la partitura), no la posición en el arreglo.
 */
export function gpr_elegirPistaGuitarra(pistas: readonly IGprPista[]): number {
  const elegida =
    pistas.find((pista) => pista.esGuitarra) ??
    pistas.find((pista) => !pista.esPercusion && pista.cantCuerdas > 0) ??
    pistas.find((pista) => !pista.esPercusion) ??
    pistas[0];
  return elegida === undefined ? -1 : elegida.idx;
}

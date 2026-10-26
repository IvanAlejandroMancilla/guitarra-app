/** Filtros de frame. Funciones puras. */

/** `true` si la frecuencia es finita, > 0 y está dentro de [minHz, maxHz]. */
export function det_validarRango(frecHz: number, minHz: number, maxHz: number): boolean {
  return Number.isFinite(frecHz) && frecHz > 0 && frecHz >= minHz && frecHz <= maxHz;
}

/** `true` si la claridad alcanza el mínimo. */
export function det_validarClaridad(claridad: number, claridadMin: number): boolean {
  return Number.isFinite(claridad) && claridad >= claridadMin;
}

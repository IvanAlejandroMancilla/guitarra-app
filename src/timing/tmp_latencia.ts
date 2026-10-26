/** Compensación de latencia. Función pura. */

/** Posición real de un evento que llega `latMs` tarde: `posMs − latMs`. */
export function tmp_compensarLatencia(posMs: number, latMs: number): number {
  return posMs - latMs;
}

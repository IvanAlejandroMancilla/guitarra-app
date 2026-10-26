/** Generador pseudoaleatorio determinista (mulberry32). Puro: misma semilla → misma secuencia. */

/** Devuelve una función que produce valores en [0, 1). */
export function efx_crearAleatorio(semilla: number): () => number {
  let estado = Math.trunc(Number.isFinite(semilla) ? semilla : 0) >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

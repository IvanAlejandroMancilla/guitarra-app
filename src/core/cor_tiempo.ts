/** Conversión pulsos ↔ ms. `bpm` debe ser el efectivo (bpm × velocidad) y mayor que 0. */

const COR_MS_POR_MINUTO = 60000;

const validarBpm = (bpm: number): void => {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new RangeError(`BPM inválido: ${bpm}`);
};

export function cor_convertirPulsosAMs(pulsos: number, bpm: number): number {
  validarBpm(bpm);
  return (pulsos * COR_MS_POR_MINUTO) / bpm;
}

export function cor_convertirMsAPulsos(ms: number, bpm: number): number {
  validarBpm(bpm);
  return (ms * bpm) / COR_MS_POR_MINUTO;
}

/** Cálculo de niveles de señal. Funciones puras. */
import { AUD_DB_MIN } from './aud_constantes';

/** Valor cuadrático medio (RMS) lineal de las muestras (0 si no hay muestras). */
export function aud_calcularRms(buf: ArrayLike<number>): number {
  if (buf.length === 0) return 0;
  let suma = 0;
  for (let i = 0; i < buf.length; i++) {
    const muestra = buf[i] ?? 0;
    suma += muestra * muestra;
  }
  return Math.sqrt(suma / buf.length);
}

/** Pico absoluto de las muestras (0 si no hay muestras). */
export function aud_calcularPico(buf: ArrayLike<number>): number {
  let pico = 0;
  for (let i = 0; i < buf.length; i++) {
    const absoluto = Math.abs(buf[i] ?? 0);
    if (absoluto > pico) pico = absoluto;
  }
  return pico;
}

/** Amplitud lineal → dBFS, acotado a [`AUD_DB_MIN`, 0]. */
export function aud_convertirADb(amp: number): number {
  if (!(amp > 0)) return AUD_DB_MIN;
  const db = 20 * Math.log10(amp);
  return Math.min(0, Math.max(AUD_DB_MIN, db));
}

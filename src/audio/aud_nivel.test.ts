import { describe, expect, it } from 'vitest';
import { AUD_DB_MIN } from './aud_constantes';
import { aud_calcularPico, aud_calcularRms, aud_convertirADb } from './aud_nivel';

const crearSeno = (cant: number, amp: number): Float32Array => {
  const buf = new Float32Array(cant);
  for (let i = 0; i < cant; i++) buf[i] = amp * Math.sin((2 * Math.PI * i) / 64);
  return buf;
};

describe('aud_nivel', () => {
  it('RMS de un seno es amp/√2', () => {
    expect(aud_calcularRms(crearSeno(6400, 0.5))).toBeCloseTo(0.5 / Math.SQRT2, 4);
  });

  it('RMS de silencio y de buffer vacío es 0', () => {
    expect(aud_calcularRms(new Float32Array(128))).toBe(0);
    expect(aud_calcularRms([])).toBe(0);
  });

  it('pico toma el valor absoluto máximo', () => {
    expect(aud_calcularPico([0.1, -0.8, 0.3])).toBeCloseTo(0.8);
    expect(aud_calcularPico([])).toBe(0);
  });

  it('convierte amplitud a dBFS y acota', () => {
    expect(aud_convertirADb(1)).toBeCloseTo(0);
    expect(aud_convertirADb(0.1)).toBeCloseTo(-20);
    expect(aud_convertirADb(0)).toBe(AUD_DB_MIN);
    expect(aud_convertirADb(1e-9)).toBe(AUD_DB_MIN);
    expect(aud_convertirADb(2)).toBe(0);
  });
});

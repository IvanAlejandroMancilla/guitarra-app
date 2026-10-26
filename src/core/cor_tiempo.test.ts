import { describe, expect, it } from 'vitest';
import { cor_convertirMsAPulsos, cor_convertirPulsosAMs } from './cor_tiempo';

describe('cor_tiempo', () => {
  it('convierte pulsos a ms', () => {
    expect(cor_convertirPulsosAMs(1, 60)).toBe(1000);
    expect(cor_convertirPulsosAMs(4, 120)).toBe(2000);
    expect(cor_convertirPulsosAMs(0, 80)).toBe(0);
    expect(cor_convertirPulsosAMs(1, 80)).toBeCloseTo(750, 10);
  });

  it('convierte ms a pulsos', () => {
    expect(cor_convertirMsAPulsos(1000, 60)).toBe(1);
    expect(cor_convertirMsAPulsos(500, 120)).toBe(1);
  });

  it('es reversible', () => {
    const pulsos = 13.37;
    expect(cor_convertirMsAPulsos(cor_convertirPulsosAMs(pulsos, 97), 97)).toBeCloseTo(pulsos, 10);
  });

  it('rechaza BPM no positivos', () => {
    expect(() => cor_convertirPulsosAMs(1, 0)).toThrow(RangeError);
    expect(() => cor_convertirMsAPulsos(1, -10)).toThrow(RangeError);
    expect(() => cor_convertirMsAPulsos(1, Number.NaN)).toThrow(RangeError);
  });
});

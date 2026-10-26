import { describe, expect, it } from 'vitest';
import { afn_calcularCents, afn_suavizarCents, afn_validarAfinado } from './afn_cents';

describe('afn_cents', () => {
  it('calcula cents entre dos frecuencias', () => {
    expect(afn_calcularCents(440, 440)).toBeCloseTo(0);
    expect(afn_calcularCents(880, 440)).toBeCloseTo(1200);
    expect(afn_calcularCents(220, 440)).toBeCloseTo(-1200);
    expect(afn_calcularCents(440 * Math.pow(2, 10 / 1200), 440)).toBeCloseTo(10);
  });

  it('lanza con frecuencias inválidas', () => {
    expect(() => afn_calcularCents(0, 440)).toThrow(RangeError);
    expect(() => afn_calcularCents(440, -1)).toThrow(RangeError);
  });

  it('valida afinado con tolerancia inclusiva', () => {
    expect(afn_validarAfinado(4.9, 5)).toBe(true);
    expect(afn_validarAfinado(-5, 5)).toBe(true);
    expect(afn_validarAfinado(5.1, 5)).toBe(false);
  });

  it('suaviza exponencialmente y acota el factor', () => {
    expect(afn_suavizarCents(0, 10, 0.3)).toBeCloseTo(3);
    expect(afn_suavizarCents(10, 10, 0.3)).toBeCloseTo(10);
    expect(afn_suavizarCents(0, 10, 2)).toBeCloseTo(10);
    expect(afn_suavizarCents(0, 10, -1)).toBeCloseTo(0);
  });
});

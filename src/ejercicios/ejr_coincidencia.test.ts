import { describe, expect, it } from 'vitest';
import { EJR_CENTS_COINCIDENCIA_CERO, ejr_calcularPctCoincidencia } from './ejr_coincidencia';

describe('ejr_calcularPctCoincidencia', () => {
  it('100 % con la nota correcta y afinada', () => {
    expect(ejr_calcularPctCoincidencia(0, true)).toBe(100);
  });

  it('baja linealmente con |cents|, simétrico', () => {
    expect(ejr_calcularPctCoincidencia(EJR_CENTS_COINCIDENCIA_CERO / 2, true)).toBeCloseTo(50);
    expect(ejr_calcularPctCoincidencia(-EJR_CENTS_COINCIDENCIA_CERO / 2, true)).toBeCloseTo(50);
    expect(ejr_calcularPctCoincidencia(10, true)).toBeCloseTo(80);
  });

  it('0 % en el límite y más allá (acotado)', () => {
    expect(ejr_calcularPctCoincidencia(EJR_CENTS_COINCIDENCIA_CERO, true)).toBe(0);
    expect(ejr_calcularPctCoincidencia(-80, true)).toBe(0);
  });

  it('0 % si es otra nota, aunque esté afinada', () => {
    expect(ejr_calcularPctCoincidencia(0, false)).toBe(0);
  });

  it('cents no finitos: 0 %', () => {
    expect(ejr_calcularPctCoincidencia(Number.NaN, true)).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { efx_convertirDbAGan, efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';

describe('efx_escalas', () => {
  it('mapea lineal y acota rel a 0..1', () => {
    expect(efx_convertirRelALineal(0, -12, 12)).toBe(-12);
    expect(efx_convertirRelALineal(0.5, -12, 12)).toBe(0);
    expect(efx_convertirRelALineal(1, -12, 12)).toBe(12);
    expect(efx_convertirRelALineal(2, 0, 10)).toBe(10);
    expect(efx_convertirRelALineal(-1, 0, 10)).toBe(0);
    expect(efx_convertirRelALineal(Number.NaN, 0, 10)).toBe(0);
  });

  it('mapea exponencial (media geométrica en 0.5)', () => {
    expect(efx_convertirRelAExponencial(0, 20, 20000)).toBeCloseTo(20);
    expect(efx_convertirRelAExponencial(0.5, 20, 20000)).toBeCloseTo(Math.sqrt(20 * 20000));
    expect(efx_convertirRelAExponencial(1, 20, 20000)).toBeCloseTo(20000);
  });

  it('cae a lineal si el rango no es positivo', () => {
    expect(efx_convertirRelAExponencial(0.5, 0, 10)).toBe(5);
  });

  it('convierte dB a ganancia', () => {
    expect(efx_convertirDbAGan(0)).toBe(1);
    expect(efx_convertirDbAGan(20)).toBeCloseTo(10);
    expect(efx_convertirDbAGan(-6)).toBeCloseTo(0.501, 3);
  });
});

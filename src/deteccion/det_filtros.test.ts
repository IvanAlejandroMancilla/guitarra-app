import { describe, expect, it } from 'vitest';
import { DET_FREC_MAX_HZ, DET_FREC_MIN_HZ } from './det_constantes';
import { det_validarClaridad, det_validarRango } from './det_filtros';

describe('det_filtros', () => {
  it('acepta frecuencias dentro del rango Si1–Mi6', () => {
    expect(det_validarRango(82.41, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ)).toBe(true);
    expect(det_validarRango(440, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ)).toBe(true);
    expect(det_validarRango(1318.51, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ)).toBe(true);
  });

  it('rechaza fuera de rango, cero, negativos y no finitos', () => {
    expect(det_validarRango(55, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ)).toBe(false);
    expect(det_validarRango(2000, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ)).toBe(false);
    expect(det_validarRango(0, 0, DET_FREC_MAX_HZ)).toBe(false);
    expect(det_validarRango(-100, -200, DET_FREC_MAX_HZ)).toBe(false);
    expect(det_validarRango(Number.NaN, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ)).toBe(false);
  });

  it('valida la claridad contra el mínimo (inclusive)', () => {
    expect(det_validarClaridad(0.95, 0.9)).toBe(true);
    expect(det_validarClaridad(0.9, 0.9)).toBe(true);
    expect(det_validarClaridad(0.89, 0.9)).toBe(false);
    expect(det_validarClaridad(Number.NaN, 0.9)).toBe(false);
  });
});

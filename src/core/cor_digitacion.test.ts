import { describe, expect, it } from 'vitest';
import { COR_DEDO_AIRE, COR_DEDO_MAX, cor_validarDedo } from './cor_digitacion';

describe('cor_digitacion', () => {
  it('acepta enteros de 0 a 4', () => {
    for (let dedo = COR_DEDO_AIRE; dedo <= COR_DEDO_MAX; dedo++) expect(cor_validarDedo(dedo)).toBe(true);
  });

  it('rechaza fuera de rango, decimales y no números', () => {
    for (const valor of [-1, 5, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1', null, undefined, {}]) {
      expect(cor_validarDedo(valor)).toBe(false);
    }
  });
});

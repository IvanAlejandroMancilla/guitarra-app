import { describe, expect, it } from 'vitest';
import { cor_validarRegistro } from './cor_validacion';

describe('cor_validarRegistro', () => {
  it('acepta objetos', () => {
    expect(cor_validarRegistro({})).toBe(true);
    expect(cor_validarRegistro({ bpm: 80 })).toBe(true);
  });

  it('rechaza null, arrays y primitivos', () => {
    for (const valor of [null, undefined, [], [1], 'texto', 5, true]) {
      expect(cor_validarRegistro(valor)).toBe(false);
    }
  });
});

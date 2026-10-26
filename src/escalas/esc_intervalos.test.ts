import { describe, expect, it } from 'vitest';
import { ESC_INTERVALOS, esc_calcularMidisEscala } from './esc_intervalos';

describe('esc_intervalos', () => {
  it('cada escala empieza en 0 y es ascendente dentro de la octava', () => {
    for (const intervalos of Object.values(ESC_INTERVALOS)) {
      expect(intervalos[0]).toBe(0);
      for (let i = 1; i < intervalos.length; i++) expect(intervalos[i]).toBeGreaterThan(intervalos[i - 1] ?? Infinity);
      expect(intervalos[intervalos.length - 1]).toBeLessThan(12);
    }
  });

  it('Do mayor desde Do3: 8 notas con la tónica final', () => {
    expect(esc_calcularMidisEscala('Do', 'mayor', 3, 1)).toEqual([48, 50, 52, 53, 55, 57, 59, 60]);
  });

  it('La pentatónica menor desde La2, dos octavas', () => {
    expect(esc_calcularMidisEscala('La', 'pentatonicaMenor', 2, 2)).toEqual([45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69]);
  });

  it('Mi menor natural y Sol pentatónica mayor', () => {
    expect(esc_calcularMidisEscala('Mi', 'menorNatural', 2, 1)).toEqual([40, 42, 43, 45, 47, 48, 50, 52]);
    expect(esc_calcularMidisEscala('Sol', 'pentatonicaMayor', 2, 1)).toEqual([43, 45, 47, 50, 52, 55]);
  });
});

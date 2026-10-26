import { describe, expect, it } from 'vitest';
import type { IAfinacion } from '../core/tipos';
import { esc_calcularDedo, esc_calcularDigitacion } from './esc_digitacion';
import { esc_calcularMidisEscala } from './esc_intervalos';

const afinEstandar: IAfinacion = { id: 'estandar', nombre: 'Estándar', midiCuerdas: [64, 59, 55, 50, 45, 40] };

describe('esc_calcularDigitacion', () => {
  it('Do mayor en primera posición (caja 0–3)', () => {
    const midis = esc_calcularMidisEscala('Do', 'mayor', 3, 1);
    expect(esc_calcularDigitacion(midis, afinEstandar, 0)).toEqual([
      { cur: 5, trs: 3, dedo: 3 },
      { cur: 4, trs: 0, dedo: 0 },
      { cur: 4, trs: 2, dedo: 2 },
      { cur: 4, trs: 3, dedo: 3 },
      { cur: 3, trs: 0, dedo: 0 },
      { cur: 3, trs: 2, dedo: 2 },
      { cur: 2, trs: 0, dedo: 0 },
      { cur: 2, trs: 1, dedo: 1 },
    ]);
  });

  it('La pentatónica menor, posición 1 en el traste 5 (dos octavas)', () => {
    const midis = esc_calcularMidisEscala('La', 'pentatonicaMenor', 2, 2);
    expect(esc_calcularDigitacion(midis, afinEstandar, 5)).toEqual([
      { cur: 6, trs: 5, dedo: 1 },
      { cur: 6, trs: 8, dedo: 4 },
      { cur: 5, trs: 5, dedo: 1 },
      { cur: 5, trs: 7, dedo: 3 },
      { cur: 4, trs: 5, dedo: 1 },
      { cur: 4, trs: 7, dedo: 3 },
      { cur: 3, trs: 5, dedo: 1 },
      { cur: 3, trs: 7, dedo: 3 },
      { cur: 2, trs: 5, dedo: 1 },
      { cur: 2, trs: 8, dedo: 4 },
      { cur: 1, trs: 5, dedo: 1 },
    ]);
  });

  it('cada posición produce exactamente el MIDI pedido', () => {
    const midis = esc_calcularMidisEscala('Sol', 'mayor', 2, 2);
    const posiciones = esc_calcularDigitacion(midis, afinEstandar, 2);
    posiciones.forEach((pos, idx) => {
      expect((afinEstandar.midiCuerdas[pos.cur - 1] ?? 0) + pos.trs).toBe(midis[idx]);
    });
  });

  it('las cuerdas nunca vuelven a una más grave al subir', () => {
    const midis = esc_calcularMidisEscala('Mi', 'menorNatural', 2, 2);
    const posiciones = esc_calcularDigitacion(midis, afinEstandar, 0);
    for (let i = 1; i < posiciones.length; i++) expect(posiciones[i]?.cur).toBeLessThanOrEqual(posiciones[i - 1]?.cur ?? 0);
  });

  it('lanza RangeError si la nota no existe en el mástil', () => {
    expect(() => esc_calcularDigitacion([30], afinEstandar, 0)).toThrow(RangeError);
  });
});

describe('esc_calcularDedo', () => {
  it('traste 0: al aire (0)', () => {
    expect(esc_calcularDedo(0, 0)).toBe(0);
    expect(esc_calcularDedo(0, 5)).toBe(0);
  });

  it('un dedo por traste desde el inicio de la caja', () => {
    expect([1, 2, 3, 4].map((trs) => esc_calcularDedo(trs, 0))).toEqual([1, 2, 3, 4]);
    expect([1, 2, 3, 4].map((trs) => esc_calcularDedo(trs, 1))).toEqual([1, 2, 3, 4]);
    expect([5, 6, 7, 8].map((trs) => esc_calcularDedo(trs, 5))).toEqual([1, 2, 3, 4]);
  });

  it('estiramientos fuera de la caja: acotado a 1..4', () => {
    expect(esc_calcularDedo(4, 5)).toBe(1);
    expect(esc_calcularDedo(10, 5)).toBe(4);
  });
});

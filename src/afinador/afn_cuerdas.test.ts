import { describe, expect, it } from 'vitest';
import { cor_midiAFrec } from '../core/cor_notas';
import { AFN_AFINACIONES, afn_obtenerAfinacion } from './afn_afinaciones';
import { afn_obtenerCuerdaCercana } from './afn_cuerdas';

describe('afn_cuerdas', () => {
  const estandar = AFN_AFINACIONES.estandar;

  it('encuentra cada cuerda al aire de la afinación estándar', () => {
    estandar.midiCuerdas.forEach((midi, idx) => {
      const cuerda = afn_obtenerCuerdaCercana(cor_midiAFrec(midi), estandar, 440);
      expect(cuerda.cur).toBe(idx + 1);
      expect(cuerda.midi).toBe(midi);
      expect(cuerda.cents).toBeCloseTo(0);
    });
  });

  it('informa el desvío con signo (Mi grave 10 cents abajo)', () => {
    const frec = cor_midiAFrec(40 - 0.1);
    const cuerda = afn_obtenerCuerdaCercana(frec, estandar, 440);
    expect(cuerda.cur).toBe(6);
    expect(cuerda.cents).toBeCloseTo(-10);
  });

  it('en Drop D la sexta cuerda es Re2', () => {
    const cuerda = afn_obtenerCuerdaCercana(cor_midiAFrec(38), AFN_AFINACIONES.dropD, 440);
    expect(cuerda.cur).toBe(6);
    expect(cuerda.frecRefHz).toBeCloseTo(73.42, 1);
  });

  it('usa la frecuencia de referencia La4 configurada', () => {
    const cuerda = afn_obtenerCuerdaCercana(442, estandar, 442);
    expect(cuerda.cur).toBe(1);
    expect(cuerda.frecRefHz).toBeCloseTo(cor_midiAFrec(64, 442));
  });

  it('afinaciones del catálogo: 6 cuerdas, de aguda a grave', () => {
    for (const afin of Object.values(AFN_AFINACIONES)) {
      expect(afin.midiCuerdas).toHaveLength(6);
      expect(afin.midiCuerdas[0]).toBeGreaterThan(afin.midiCuerdas[5] ?? Infinity);
    }
    expect(afn_obtenerAfinacion('medioTonoAbajo').midiCuerdas[5]).toBe(39);
  });
});

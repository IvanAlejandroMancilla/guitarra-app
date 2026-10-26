import { describe, expect, it } from 'vitest';
import {
  COR_NOMBRES_ANGLO,
  COR_NOMBRES_NOTA,
  cor_calcularMidiCuerda,
  cor_calcularNotaCuerda,
  cor_convertirAAnglo,
  cor_convertirALatina,
  cor_convertirTextoANota,
  cor_frecAMidi,
  cor_frecANota,
  cor_listarPosicionesNota,
  cor_midiAFrec,
  cor_midiANota,
  cor_notaAFrec,
  cor_notaAMidi,
  cor_obtenerEtiquetaNota,
} from './cor_notas';
import type { IAfinacion } from './tipos';

const afinEstandar: IAfinacion = { id: 'estandar', nombre: 'Estándar', midiCuerdas: [64, 59, 55, 50, 45, 40] };

describe('cor_notas', () => {
  it('tiene 12 nombres alineados en ambas notaciones', () => {
    expect(COR_NOMBRES_NOTA).toHaveLength(12);
    expect(COR_NOMBRES_ANGLO).toHaveLength(12);
  });

  it('convierte frecuencia ↔ MIDI con A4 = 440', () => {
    expect(cor_frecAMidi(440)).toBeCloseTo(69, 10);
    expect(cor_midiAFrec(69)).toBeCloseTo(440, 10);
    expect(cor_midiAFrec(60)).toBeCloseTo(261.6256, 3);
    expect(cor_midiAFrec(40)).toBeCloseTo(82.4069, 3);
  });

  it('respeta un A4 configurable', () => {
    expect(cor_frecAMidi(432, 432)).toBeCloseTo(69, 10);
    expect(cor_midiAFrec(69, 442)).toBeCloseTo(442, 10);
  });

  it('MIDI → nota con octava científica', () => {
    expect(cor_midiANota(60)).toEqual({ nombre: 'Do', oct: 4, midi: 60 });
    expect(cor_midiANota(69)).toEqual({ nombre: 'La', oct: 4, midi: 69 });
    expect(cor_midiANota(40)).toEqual({ nombre: 'Mi', oct: 2, midi: 40 });
    expect(cor_midiANota(59)).toEqual({ nombre: 'Si', oct: 3, midi: 59 });
    expect(cor_midiANota(61.4)).toEqual({ nombre: 'Do#', oct: 4, midi: 61 });
  });

  it('nota → MIDI y frecuencia', () => {
    expect(cor_notaAMidi('Do', 4)).toBe(60);
    expect(cor_notaAMidi('Mi', 2)).toBe(40);
    expect(cor_notaAMidi('Mi', 6)).toBe(88);
    expect(cor_notaAFrec('La', 4)).toBeCloseTo(440, 10);
    expect(cor_notaAFrec('La', 4, 444)).toBeCloseTo(444, 10);
  });

  it('frecuencia → nota con cents', () => {
    const nota = cor_frecANota(445);
    expect(nota.nombre).toBe('La');
    expect(nota.oct).toBe(4);
    expect(nota.frecHz).toBe(445);
    expect(nota.cents).toBeCloseTo(19.56, 1);
    const grave = cor_frecANota(82.0);
    expect(grave.nombre).toBe('Mi');
    expect(grave.oct).toBe(2);
    expect(grave.cents).toBeLessThan(0);
  });

  it('frecuencia inválida → RangeError', () => {
    expect(() => cor_frecANota(0)).toThrow(RangeError);
    expect(() => cor_frecANota(-5)).toThrow(RangeError);
    expect(() => cor_frecANota(Number.NaN)).toThrow(RangeError);
    expect(() => cor_frecANota(440, 0)).toThrow(RangeError);
  });

  it('ida y vuelta para todos los MIDI de E2 a E6', () => {
    for (let midi = 40; midi <= 88; midi++) {
      const nota = cor_frecANota(cor_midiAFrec(midi));
      expect(nota.midi).toBe(midi);
      expect(Math.abs(nota.cents)).toBeLessThan(1e-6);
      const altura = cor_midiANota(midi);
      expect(cor_notaAMidi(altura.nombre, altura.oct)).toBe(midi);
    }
  });

  it('convierte entre notaciones', () => {
    expect(cor_convertirAAnglo('Do')).toBe('C');
    expect(cor_convertirAAnglo('Sol#')).toBe('G#');
    expect(cor_convertirALatina('B')).toBe('Si');
    expect(cor_convertirALatina('F#')).toBe('Fa#');
  });

  it('interpreta texto libre', () => {
    expect(cor_convertirTextoANota('do')).toBe('Do');
    expect(cor_convertirTextoANota(' SOL# ')).toBe('Sol#');
    expect(cor_convertirTextoANota('Reb')).toBe('Do#');
    expect(cor_convertirTextoANota('Mi#')).toBe('Fa');
    expect(cor_convertirTextoANota('Dob')).toBe('Si');
    expect(cor_convertirTextoANota('C#')).toBe('Do#');
    expect(cor_convertirTextoANota('Bb')).toBe('La#');
    expect(cor_convertirTextoANota('b')).toBe('Si');
    expect(cor_convertirTextoANota('Fa♯')).toBe('Fa#');
    expect(cor_convertirTextoANota('Si♭')).toBe('La#');
    expect(cor_convertirTextoANota('H')).toBeNull();
    expect(cor_convertirTextoANota('')).toBeNull();
    expect(cor_convertirTextoANota('Do4')).toBeNull();
  });

  it('calcula notas por cuerda y traste (cuerda 1 = Mi agudo)', () => {
    expect(cor_calcularMidiCuerda(1, 0, afinEstandar)).toBe(64);
    expect(cor_calcularMidiCuerda(6, 0, afinEstandar)).toBe(40);
    expect(cor_calcularMidiCuerda(5, 3, afinEstandar)).toBe(48);
    expect(cor_calcularNotaCuerda(5, 3, afinEstandar)).toEqual({ nombre: 'Do', oct: 3, midi: 48 });
    expect(() => cor_calcularMidiCuerda(0, 0, afinEstandar)).toThrow(RangeError);
    expect(() => cor_calcularMidiCuerda(7, 0, afinEstandar)).toThrow(RangeError);
    expect(() => cor_calcularMidiCuerda(1.5, 0, afinEstandar)).toThrow(RangeError);
    expect(() => cor_calcularMidiCuerda(1, -1, afinEstandar)).toThrow(RangeError);
    expect(() => cor_calcularNotaCuerda(7, 0, afinEstandar)).toThrow(RangeError);
  });

  it('arma etiquetas según la notación', () => {
    expect(cor_obtenerEtiquetaNota('Do#', 4, 'latina')).toBe('Do#4');
    expect(cor_obtenerEtiquetaNota('Do#', 4, 'anglosajona')).toBe('C#4');
    expect(cor_obtenerEtiquetaNota('Re', undefined, 'latina')).toBe('Re');
  });
  it('lista las posiciones de una nota en el mástil (cuerda 6 → 1, traste ascendente)', () => {
    expect(cor_listarPosicionesNota('Mi', afinEstandar, 0, 12)).toEqual([
      { cur: 6, trs: 0 },
      { cur: 6, trs: 12 },
      { cur: 5, trs: 7 },
      { cur: 4, trs: 2 },
      { cur: 3, trs: 9 },
      { cur: 2, trs: 5 },
      { cur: 1, trs: 0 },
      { cur: 1, trs: 12 },
    ]);
    expect(cor_listarPosicionesNota('Do', afinEstandar, 0, 3)).toEqual([
      { cur: 5, trs: 3 },
      { cur: 2, trs: 1 },
    ]);
    expect(cor_listarPosicionesNota('La', afinEstandar, 1, 5)).toEqual([
      { cur: 6, trs: 5 },
      { cur: 3, trs: 2 },
      { cur: 1, trs: 5 },
    ]);
    expect(cor_listarPosicionesNota('Re', afinEstandar, 5, 4)).toEqual([]);
  });
});

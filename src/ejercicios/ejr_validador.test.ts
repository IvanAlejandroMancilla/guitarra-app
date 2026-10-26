import { describe, expect, it } from 'vitest';
import type { ICorAltura, INota } from '../core/tipos';
import { ejr_obtenerModo, ejr_validarIntento, ejr_validarNota, ejr_validarTiempo } from './ejr_validador';

const esperada: INota = { nombre: 'Do', oct: 3, tiempo: 0 };
const do3: ICorAltura = { nombre: 'Do', oct: 3, midi: 48 };
const do4: ICorAltura = { nombre: 'Do', oct: 4, midi: 60 };
const re3: ICorAltura = { nombre: 'Re', oct: 3, midi: 50 };

describe('ejr_validador', () => {
  it('modo efectivo: la configuración manda salvo "ejercicio"', () => {
    expect(ejr_obtenerModo('ejercicio', 'estricto')).toBe('estricto');
    expect(ejr_obtenerModo('flexible', 'estricto')).toBe('flexible');
    expect(ejr_obtenerModo('estricto', 'flexible')).toBe('estricto');
  });

  it('estricto exige octava; flexible solo nombre', () => {
    expect(ejr_validarNota(esperada, do3, 'estricto')).toBe(true);
    expect(ejr_validarNota(esperada, do4, 'estricto')).toBe(false);
    expect(ejr_validarNota(esperada, do4, 'flexible')).toBe(true);
    expect(ejr_validarNota(esperada, re3, 'flexible')).toBe(false);
  });

  it('ventana de tiempo inclusiva', () => {
    expect(ejr_validarTiempo(100, 100)).toBe(true);
    expect(ejr_validarTiempo(-100, 100)).toBe(true);
    expect(ejr_validarTiempo(100.1, 100)).toBe(false);
  });

  it('motivos del intento', () => {
    expect(ejr_validarIntento(esperada, do3, 20, 'estricto', 100)).toEqual({ esAcierto: true, motivo: null });
    expect(ejr_validarIntento(esperada, re3, 0, 'estricto', 100)).toEqual({ esAcierto: false, motivo: 'nota' });
    expect(ejr_validarIntento(esperada, do4, 0, 'estricto', 100)).toEqual({ esAcierto: false, motivo: 'octava' });
    expect(ejr_validarIntento(esperada, do4, 0, 'flexible', 100).esAcierto).toBe(true);
    expect(ejr_validarIntento(esperada, do3, -150, 'estricto', 100)).toEqual({ esAcierto: false, motivo: 'temprano' });
    expect(ejr_validarIntento(esperada, do3, 150, 'estricto', 100)).toEqual({ esAcierto: false, motivo: 'tarde' });
  });
});

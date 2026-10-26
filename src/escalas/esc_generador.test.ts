import { describe, expect, it } from 'vitest';
import { cor_calcularNotaCuerda } from '../core/cor_notas';
import type { IAfinacion } from '../core/tipos';
import { esc_crearTitulo, esc_generarEscala } from './esc_generador';
import type { IEscOpciones } from './esc_tipos';

const afinEstandar: IAfinacion = { id: 'estandar', nombre: 'Estándar', midiCuerdas: [64, 59, 55, 50, 45, 40] };

const opcBase: IEscOpciones = {
  tonica: 'Do',
  tipo: 'mayor',
  oct: 3,
  cantOct: 1,
  esIdaVuelta: true,
  bpm: 90,
  modo: 'estricto',
  afinacion: afinEstandar,
  trsInicial: 0,
  pulsosPorNota: 1,
  notacion: 'latina',
};

describe('esc_generador', () => {
  it('títulos en ambas notaciones', () => {
    expect(esc_crearTitulo('Do', 'mayor', 'latina')).toBe('Escala de Do mayor');
    expect(esc_crearTitulo('La', 'pentatonicaMenor', 'anglosajona')).toBe('Escala de A pentatónica menor');
  });

  it('Do mayor ida y vuelta: 15 notas, tiempos crecientes, cuenta de un compás', () => {
    const ej = esc_generarEscala(opcBase);
    expect(ej.titulo).toBe('Escala de Do mayor');
    expect(ej.bpm).toBe(90);
    expect(ej.modo).toBe('estricto');
    expect(ej.notas).toHaveLength(15);
    expect(ej.notas.map((nota) => nota.nombre)).toEqual([
      'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Si', 'La', 'Sol', 'Fa', 'Mi', 'Re', 'Do',
    ]);
    expect(ej.notas[0]?.tiempo).toBe(4);
    ej.notas.forEach((nota, idx) => expect(nota.tiempo).toBe(4 + idx));
    expect(ej.notas[7]).toMatchObject({ nombre: 'Do', oct: 4, cur: 2, trs: 1 });
  });

  it('cuerda/traste generados coinciden con nombre/octava', () => {
    for (const tipo of ['mayor', 'menorNatural', 'pentatonicaMenor', 'pentatonicaMayor'] as const) {
      const ej = esc_generarEscala({ ...opcBase, tonica: 'La', oct: 2, tipo, trsInicial: 5, cantOct: 2, pulsosPorNota: 0.5 });
      for (const nota of ej.notas) {
        const altura = cor_calcularNotaCuerda(nota.cur ?? 0, nota.trs ?? -1, afinEstandar);
        expect({ nombre: altura.nombre, oct: altura.oct }).toEqual({ nombre: nota.nombre, oct: nota.oct });
      }
      expect(ej.notas[1]?.tiempo).toBe(4.5);
    }
  });

  it('copia el dedo de la digitación (0 solo al aire, 1..4 pisado)', () => {
    const ej = esc_generarEscala(opcBase);
    expect(ej.notas[0]).toMatchObject({ cur: 5, trs: 3, dedo: 3 });
    expect(ej.notas[1]).toMatchObject({ cur: 4, trs: 0, dedo: 0 });
    const caja5 = esc_generarEscala({ ...opcBase, tonica: 'La', oct: 2, tipo: 'pentatonicaMenor', trsInicial: 5, cantOct: 2 });
    for (const nota of [...ej.notas, ...caja5.notas]) {
      expect(nota.dedo).toBeDefined();
      expect(nota.trs === 0).toBe(nota.dedo === 0);
      expect(nota.dedo).toBeGreaterThanOrEqual(0);
      expect(nota.dedo).toBeLessThanOrEqual(4);
    }
    expect(caja5.notas[1]).toMatchObject({ cur: 6, trs: 8, dedo: 4 });
  });

  it('solo ida', () => {
    const ej = esc_generarEscala({ ...opcBase, esIdaVuelta: false, tipo: 'pentatonicaMayor' });
    expect(ej.notas).toHaveLength(6);
  });
});

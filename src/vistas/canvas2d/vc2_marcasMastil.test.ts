import { describe, expect, it } from 'vitest';
import { cor_calcularNotaCuerda } from '../../core/cor_notas';
import type { IAfinacion, INota } from '../../core/tipos';
import { VC2_CANT_SIGUIENTES_MASTIL } from './vc2_constantes';
import { vc2_crearMarcasMastil } from './vc2_marcasMastil';

const afinEstandar: IAfinacion = { id: 'estandar', nombre: 'Estándar', midiCuerdas: [64, 59, 55, 50, 45, 40] };

const escala: INota[] = [
  { nombre: 'Do', oct: 3, cur: 5, trs: 3, dedo: 3, tiempo: 0 },
  { nombre: 'Re', oct: 3, cur: 4, trs: 0, dedo: 0, tiempo: 1 },
  { nombre: 'Mi', oct: 3, cur: 4, trs: 2, dedo: 2, tiempo: 2 },
  { nombre: 'Fa', oct: 3, cur: 4, trs: 3, dedo: 3, tiempo: 3 },
  { nombre: 'Sol', oct: 3, cur: 3, trs: 0, dedo: 0, tiempo: 4 },
];

describe('vc2_crearMarcasMastil', () => {
  it('esperada principal + las siguientes, con dedo y nombre', () => {
    const marcas = vc2_crearMarcasMastil(escala, 0, afinEstandar, 'latina');
    expect(marcas).toHaveLength(1 + VC2_CANT_SIGUIENTES_MASTIL);
    expect(marcas[0]).toEqual({ cur: 5, trs: 3, dedo: 3, etiqueta: 'Do3', esPrincipal: true });
    expect(marcas.slice(1).every((marca) => !marca.esPrincipal)).toBe(true);
    expect(marcas[1]).toMatchObject({ cur: 4, trs: 0, dedo: 0 });
  });

  it('notación anglosajona y corte al final del ejercicio', () => {
    const marcas = vc2_crearMarcasMastil(escala, 3, afinEstandar, 'anglosajona');
    expect(marcas.map((marca) => marca.etiqueta)).toEqual(['F3', 'G3']);
  });

  it('índice fuera de rango: sin marcas', () => {
    expect(vc2_crearMarcasMastil(escala, -1, afinEstandar, 'latina')).toEqual([]);
    expect(vc2_crearMarcasMastil(escala, 5, afinEstandar, 'latina')).toEqual([]);
    expect(vc2_crearMarcasMastil([], 0, afinEstandar, 'latina')).toEqual([]);
  });

  it('no repite posiciones: gana la más próxima', () => {
    const repetidas: INota[] = [
      { nombre: 'Mi', oct: 2, cur: 6, trs: 0, dedo: 0, tiempo: 0 },
      { nombre: 'Mi', oct: 2, cur: 6, trs: 0, dedo: 0, tiempo: 1 },
      { nombre: 'Fa', oct: 2, cur: 6, trs: 1, dedo: 1, tiempo: 2 },
    ];
    const marcas = vc2_crearMarcasMastil(repetidas, 0, afinEstandar, 'latina');
    expect(marcas).toHaveLength(2);
    expect(marcas[0]?.esPrincipal).toBe(true);
  });

  it('nota sin cuerda/traste: todas sus posiciones 0..12, sin dedo ni octava', () => {
    const buscar: INota[] = [
      { nombre: 'La', oct: 3, tiempo: 0 },
      { nombre: 'Do', oct: 3, tiempo: 4 },
      { nombre: 'Re', oct: 3, cur: 4, trs: 0, dedo: 0, tiempo: 8 },
    ];
    const marcas = vc2_crearMarcasMastil(buscar, 0, afinEstandar, 'latina');
    const principales = marcas.filter((marca) => marca.esPrincipal);
    expect(principales.length).toBeGreaterThanOrEqual(6);
    for (const marca of principales) {
      expect(marca.dedo).toBeUndefined();
      expect(marca.etiqueta).toBe('La');
      expect(marca.trs).toBeLessThanOrEqual(12);
      expect(cor_calcularNotaCuerda(marca.cur, marca.trs, afinEstandar).nombre).toBe('La');
    }
    expect(principales).toContainEqual(expect.objectContaining({ cur: 5, trs: 0 }));
    expect(principales).toContainEqual(expect.objectContaining({ cur: 6, trs: 5 }));
    // La siguiente sin posición (Do) se omite; la de Re sí se marca.
    expect(marcas.filter((marca) => !marca.esPrincipal)).toEqual([{ cur: 4, trs: 0, dedo: 0, etiqueta: 'Re3', esPrincipal: false }]);
  });

  it('usa la afinación recibida', () => {
    const dropD: IAfinacion = { id: 'dropD', nombre: 'Drop D', midiCuerdas: [64, 59, 55, 50, 45, 38] };
    const marcas = vc2_crearMarcasMastil([{ nombre: 'Re', oct: 2, tiempo: 0 }], 0, dropD, 'latina');
    expect(marcas).toContainEqual(expect.objectContaining({ cur: 6, trs: 0 }));
  });
});

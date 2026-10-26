import { describe, expect, it } from 'vitest';
import { V3D_PULSOS_VISIBLES, V3D_UNIDADES_POR_PULSO } from './v3d_constantes';
import type { INota } from '../../core/tipos';
import {
  v3d_obtenerIdxPrimeraNota,
  v3d_calcularAnchoRegla,
  v3d_calcularPulsosVisibles,
  v3d_calcularXCarril,
  v3d_calcularXTraste,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_ordenarNotas,
} from './v3d_geometria';

describe('v3d_calcularXCarril', () => {
  it('pone la cuerda 6 a la izquierda y la 1 a la derecha', () => {
    expect(v3d_calcularXCarril(6, false)).toBeCloseTo(-2.5);
    expect(v3d_calcularXCarril(1, false)).toBeCloseTo(2.5);
    expect(v3d_calcularXCarril(4, false)).toBeCloseTo(-0.5);
    expect(v3d_calcularXCarril(3, false)).toBeCloseTo(0.5);
  });

  it('invierte el orden en modo zurdo', () => {
    for (let cur = 1; cur <= 6; cur++) {
      expect(v3d_calcularXCarril(cur, true)).toBeCloseTo(-v3d_calcularXCarril(cur, false));
    }
  });

  it('manda las notas sin cuerda o con cuerda inválida al carril central', () => {
    expect(v3d_calcularXCarril(undefined, false)).toBe(0);
    expect(v3d_calcularXCarril(0, false)).toBe(0);
    expect(v3d_calcularXCarril(7, true)).toBe(0);
    expect(v3d_calcularXCarril(2.5, false)).toBe(0);
  });

  it('los carriles son equidistantes', () => {
    const xs = [6, 5, 4, 3, 2, 1].map((cur) => v3d_calcularXCarril(cur, false));
    for (let i = 1; i < xs.length; i++) {
      expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeCloseTo(1);
    }
  });
});

describe('v3d_calcularZNota', () => {
  it('es 0 en la línea de golpe', () => {
    expect(v3d_calcularZNota(5, 5, 1)).toBeCloseTo(0);
  });

  it('es negativa para notas futuras y positiva para pasadas', () => {
    expect(v3d_calcularZNota(6, 5, 1)).toBeCloseTo(-V3D_UNIDADES_POR_PULSO);
    expect(v3d_calcularZNota(4, 5, 1)).toBeCloseTo(V3D_UNIDADES_POR_PULSO);
  });

  it('la velocidad de autopista escala el espaciado', () => {
    expect(v3d_calcularZNota(2, 0, 2)).toBeCloseTo(2 * v3d_calcularZNota(2, 0, 1));
    expect(v3d_calcularZNota(2, 0, 0.5)).toBeCloseTo(-V3D_UNIDADES_POR_PULSO);
  });
});

describe('conversión de unidades y pulsos visibles', () => {
  it('convierte unidades a pulsos de forma inversa a calcularZNota', () => {
    const vel = 1.7;
    const pulsos = v3d_convertirUnidadesAPulsos(10, vel);
    expect(-v3d_calcularZNota(pulsos, 0, vel)).toBeCloseTo(10);
  });

  it('más velocidad muestra menos pulsos', () => {
    expect(v3d_calcularPulsosVisibles(1)).toBe(V3D_PULSOS_VISIBLES);
    expect(v3d_calcularPulsosVisibles(2)).toBe(V3D_PULSOS_VISIBLES / 2);
  });

  it('tolera velocidades no positivas', () => {
    expect(v3d_calcularPulsosVisibles(0)).toBe(V3D_PULSOS_VISIBLES);
    expect(Number.isFinite(v3d_convertirUnidadesAPulsos(4, 0))).toBe(true);
  });
});

describe('v3d_calcularXTraste', () => {
  const ancho = v3d_calcularAnchoRegla();

  it('ubica el traste 0 a la izquierda y el 24 a la derecha', () => {
    expect(v3d_calcularXTraste(0, ancho, false)).toBeLessThan(0);
    expect(v3d_calcularXTraste(24, ancho, false)).toBeGreaterThan(0);
    expect(v3d_calcularXTraste(12, ancho, false)).toBeCloseTo(0);
  });

  it('se espeja en modo zurdo y acota fuera de rango', () => {
    expect(v3d_calcularXTraste(3, ancho, true)).toBeCloseTo(-v3d_calcularXTraste(3, ancho, false));
    expect(v3d_calcularXTraste(-2, ancho, false)).toBeCloseTo(v3d_calcularXTraste(0, ancho, false));
    expect(v3d_calcularXTraste(40, ancho, false)).toBeCloseTo(v3d_calcularXTraste(24, ancho, false));
  });

  it('las casillas quedan dentro de la regla', () => {
    expect(Math.abs(v3d_calcularXTraste(0, ancho, false))).toBeLessThan(ancho / 2);
  });
});

describe('v3d_ordenarNotas y v3d_obtenerIdxPrimeraNota', () => {
  const crearNota = (tiempo: number): INota => ({ nombre: 'Do', oct: 4, tiempo });
  const notas = [crearNota(4), crearNota(0), crearNota(2), crearNota(2), crearNota(8)];

  it('ordena índices por tiempo de forma estable', () => {
    expect(Array.from(v3d_ordenarNotas(notas))).toEqual([1, 2, 3, 0, 4]);
  });

  it('encuentra la primera nota con tiempo >= límite', () => {
    const orden = v3d_ordenarNotas(notas);
    expect(v3d_obtenerIdxPrimeraNota(notas, orden, -1)).toBe(0);
    expect(v3d_obtenerIdxPrimeraNota(notas, orden, 2)).toBe(1);
    expect(v3d_obtenerIdxPrimeraNota(notas, orden, 2.5)).toBe(3);
    expect(v3d_obtenerIdxPrimeraNota(notas, orden, 100)).toBe(5);
  });

  it('funciona con ejercicios vacíos', () => {
    expect(v3d_obtenerIdxPrimeraNota([], new Uint32Array(0), 0)).toBe(0);
  });
});

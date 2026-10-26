import { describe, expect, it } from 'vitest';
import type { INota } from '../../core/tipos';
import {
  V3D_ANCHO_CASILLA,
  V3D_ANCHO_ZONA_MIN,
  V3D_SEPARACION_CUERDAS,
  V3D_Y_CUERDA_1,
  V3D_ZONA_DEF,
} from './v3d_constantesRocksmith';
import { v3d_ordenarNotas } from './v3d_geometria';
import {
  v3d_calcularXBarraTraste,
  v3d_calcularXCasilla,
  v3d_calcularXZona,
  v3d_calcularYCuerda,
  v3d_calcularZonaTrastes,
  v3d_suavizarValor,
  v3d_validarPosMastil,
} from './v3d_geometriaRocksmith';

const crearNota = (tiempo: number, cur?: number, trs?: number): INota => ({ nombre: 'Do', oct: 4, tiempo, cur, trs });

describe('v3d_calcularXCasilla y v3d_calcularXBarraTraste', () => {
  it('la cejuela está en x = 0 y la casilla al aire queda antes', () => {
    expect(v3d_calcularXBarraTraste(0, false)).toBe(0);
    expect(v3d_calcularXCasilla(0, false)).toBeCloseTo(-V3D_ANCHO_CASILLA / 2);
  });

  it('cada casilla queda entre su barra anterior y la suya', () => {
    for (let trs = 1; trs <= 24; trs++) {
      const x = v3d_calcularXCasilla(trs, false);
      expect(x).toBeGreaterThan(v3d_calcularXBarraTraste(trs - 1, false));
      expect(x).toBeLessThan(v3d_calcularXBarraTraste(trs, false));
    }
    expect(v3d_calcularXBarraTraste(5, false) - v3d_calcularXBarraTraste(4, false)).toBeCloseTo(V3D_ANCHO_CASILLA);
  });

  it('se espeja en modo zurdo y acota fuera de rango', () => {
    expect(v3d_calcularXCasilla(7, true)).toBeCloseTo(-v3d_calcularXCasilla(7, false));
    expect(v3d_calcularXBarraTraste(3, true)).toBeCloseTo(-v3d_calcularXBarraTraste(3, false));
    expect(v3d_calcularXCasilla(-3, false)).toBeCloseTo(v3d_calcularXCasilla(0, false));
    expect(v3d_calcularXCasilla(40, false)).toBeCloseTo(v3d_calcularXCasilla(24, false));
    expect(v3d_calcularXBarraTraste(Number.NaN, false)).toBe(0);
  });
});

describe('v3d_calcularYCuerda', () => {
  it('pone la 1.ª abajo y la 6.ª arriba, equidistantes', () => {
    expect(v3d_calcularYCuerda(1)).toBeCloseTo(V3D_Y_CUERDA_1);
    expect(v3d_calcularYCuerda(6)).toBeCloseTo(V3D_Y_CUERDA_1 + 5 * V3D_SEPARACION_CUERDAS);
    for (let cur = 2; cur <= 6; cur++) {
      expect(v3d_calcularYCuerda(cur) - v3d_calcularYCuerda(cur - 1)).toBeCloseTo(V3D_SEPARACION_CUERDAS);
    }
  });

  it('acota cuerdas inválidas', () => {
    expect(v3d_calcularYCuerda(0)).toBeCloseTo(v3d_calcularYCuerda(1));
    expect(v3d_calcularYCuerda(9)).toBeCloseTo(v3d_calcularYCuerda(6));
  });
});

describe('v3d_validarPosMastil', () => {
  it('acepta solo cuerda 1..6 y traste 0..24 enteros', () => {
    expect(v3d_validarPosMastil(crearNota(0, 1, 0))).toBe(true);
    expect(v3d_validarPosMastil(crearNota(0, 6, 24))).toBe(true);
    expect(v3d_validarPosMastil(crearNota(0))).toBe(false);
    expect(v3d_validarPosMastil(crearNota(0, 3))).toBe(false);
    expect(v3d_validarPosMastil(crearNota(0, 7, 2))).toBe(false);
    expect(v3d_validarPosMastil(crearNota(0, 2, 25))).toBe(false);
    expect(v3d_validarPosMastil(crearNota(0, 2, 1.5))).toBe(false);
  });
});

describe('v3d_calcularZonaTrastes', () => {
  it('devuelve null sin notas con posición en la ventana', () => {
    expect(v3d_calcularZonaTrastes([], new Uint32Array(0), 0, 4)).toBeNull();
    const sinPos = [crearNota(0), crearNota(1)];
    expect(v3d_calcularZonaTrastes(sinPos, v3d_ordenarNotas(sinPos), 0, 4)).toBeNull();
    const lejanas = [crearNota(10, 2, 5)];
    expect(v3d_calcularZonaTrastes(lejanas, v3d_ordenarNotas(lejanas), 0, 4)).toBeNull();
  });

  it('abarca las notas de la ventana y respeta el ancho mínimo', () => {
    const notas = [crearNota(0, 2, 5), crearNota(1, 3, 7), crearNota(2, 1, 6), crearNota(9, 1, 15)];
    const zona = v3d_calcularZonaTrastes(notas, v3d_ordenarNotas(notas), 0, 4);
    expect(zona).toEqual({ trsMin: 5, trsMax: 5 + V3D_ANCHO_ZONA_MIN - 1 });
    const ancha = [crearNota(0, 2, 2), crearNota(1, 3, 9)];
    expect(v3d_calcularZonaTrastes(ancha, v3d_ordenarNotas(ancha), 0, 4)).toEqual({ trsMin: 2, trsMax: 9 });
  });

  it('sigue contando la nota recién pasada e ignora las viejas', () => {
    const notas = [crearNota(0, 2, 12), crearNota(3.5, 2, 3)];
    const orden = v3d_ordenarNotas(notas);
    expect(v3d_calcularZonaTrastes(notas, orden, 0.5, 4)?.trsMin).toBe(3);
    expect(v3d_calcularZonaTrastes(notas, orden, 2, 4)).toEqual({ trsMin: 3, trsMax: 3 + V3D_ANCHO_ZONA_MIN - 1 });
  });

  it('las notas al aire no mueven la zona; solo al aire → zona por defecto', () => {
    const conAire = [crearNota(0, 6, 0), crearNota(1, 5, 8)];
    expect(v3d_calcularZonaTrastes(conAire, v3d_ordenarNotas(conAire), 0, 4)?.trsMin).toBe(8);
    const soloAire = [crearNota(0, 6, 0), crearNota(1, 1, 0)];
    expect(v3d_calcularZonaTrastes(soloAire, v3d_ordenarNotas(soloAire), 0, 4)).toEqual(V3D_ZONA_DEF);
  });

  it('no pasa del traste 24', () => {
    const notas = [crearNota(0, 1, 23)];
    const zona = v3d_calcularZonaTrastes(notas, v3d_ordenarNotas(notas), 0, 4);
    expect(zona?.trsMax).toBe(24);
    expect((zona?.trsMax ?? 0) - (zona?.trsMin ?? 0) + 1).toBe(V3D_ANCHO_ZONA_MIN);
  });

  it('la nota esperada sola (anticipo 0) define su zona', () => {
    expect(v3d_calcularZonaTrastes([crearNota(7, 4, 9)], [0], 7, 0)?.trsMin).toBe(9);
  });
});

describe('v3d_calcularXZona', () => {
  it('centra la zona entre sus bordes y se espeja en zurdo', () => {
    const zona = { trsMin: 1, trsMax: 4 };
    expect(v3d_calcularXZona(zona, false)).toBeCloseTo(2 * V3D_ANCHO_CASILLA);
    expect(v3d_calcularXZona(zona, true)).toBeCloseTo(-2 * V3D_ANCHO_CASILLA);
  });
});

describe('v3d_suavizarValor', () => {
  it('se acerca al objetivo sin pasarse y llega con deltas grandes', () => {
    const paso = v3d_suavizarValor(0, 10, 16, 400);
    expect(paso).toBeGreaterThan(0);
    expect(paso).toBeLessThan(10);
    expect(v3d_suavizarValor(0, 10, 1e6, 400)).toBeCloseTo(10);
  });

  it('no depende de los fps: dos pasos de 8 ms = uno de 16 ms', () => {
    const dosPasos = v3d_suavizarValor(v3d_suavizarValor(0, 10, 8, 400), 10, 8, 400);
    expect(dosPasos).toBeCloseTo(v3d_suavizarValor(0, 10, 16, 400));
  });

  it('con constante no positiva o valor no finito salta al objetivo', () => {
    expect(v3d_suavizarValor(3, 7, 16, 0)).toBe(7);
    expect(v3d_suavizarValor(Number.NaN, 7, 16, 400)).toBe(7);
    expect(v3d_suavizarValor(3, 7, 0, 400)).toBe(3);
  });
});

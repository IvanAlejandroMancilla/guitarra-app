import { describe, expect, it } from 'vitest';
import { VC2_TRS_MAX_MASTIL } from './vc2_constantes';
import {
  vc2_calcularGeoMastil,
  vc2_calcularRangoMastil,
  vc2_calcularXTrasteMastil,
  vc2_calcularYCuerdaMastil,
} from './vc2_geometriaMastil';

describe('vc2_calcularRangoMastil', () => {
  it('0..12 si todo cabe (o no hay trastes)', () => {
    expect(vc2_calcularRangoMastil([0, 3, 12])).toEqual({ trsMin: 0, trsMax: VC2_TRS_MAX_MASTIL });
    expect(vc2_calcularRangoMastil([])).toEqual({ trsMin: 0, trsMax: VC2_TRS_MAX_MASTIL });
  });

  it('zona necesaria si hay trastes por encima del 12, con ancho mínimo', () => {
    expect(vc2_calcularRangoMastil([14, 17])).toEqual({ trsMin: 5, trsMax: 17 });
    expect(vc2_calcularRangoMastil([0, 22])).toEqual({ trsMin: 0, trsMax: 22 });
    expect(vc2_calcularRangoMastil([20, 30])).toEqual({ trsMin: 12, trsMax: 24 });
  });

  it('ignora valores inválidos', () => {
    expect(vc2_calcularRangoMastil([-1, 2.5, Number.NaN, 3])).toEqual({ trsMin: 0, trsMax: VC2_TRS_MAX_MASTIL });
  });
});

describe('vc2_calcularGeoMastil', () => {
  const rango = { trsMin: 0, trsMax: 12 };

  it('reparte el ancho en columnas y el alto entre cuerdas, con márgenes simétricos', () => {
    const geo = vc2_calcularGeoMastil(1300, 150, rango, false);
    expect(geo.anchoTrastePx * 13 + 2 * geo.margenIzqPx).toBeCloseTo(1300);
    expect(geo.separacionCuerdasPx * 5 + 2 * geo.margenSupPx).toBeCloseTo(150);
    expect(geo.margenSupPx).toBeGreaterThanOrEqual(14);
  });

  it('cuerda 6 arriba y 1 abajo', () => {
    const geo = vc2_calcularGeoMastil(1300, 150, rango, false);
    expect(vc2_calcularYCuerdaMastil(6, geo)).toBeCloseTo(geo.margenSupPx);
    expect(vc2_calcularYCuerdaMastil(1, geo)).toBeCloseTo(150 - geo.margenSupPx);
    expect(vc2_calcularYCuerdaMastil(5, geo)).toBeGreaterThan(vc2_calcularYCuerdaMastil(6, geo));
  });

  it('traste 0 en la primera columna; zurdo espejado', () => {
    const geo = vc2_calcularGeoMastil(1300, 150, rango, false);
    expect(vc2_calcularXTrasteMastil(0, geo)).toBeCloseTo(geo.margenIzqPx + geo.anchoTrastePx / 2);
    expect(vc2_calcularXTrasteMastil(5, geo) - vc2_calcularXTrasteMastil(4, geo)).toBeCloseTo(geo.anchoTrastePx);
    const geoZurdo = vc2_calcularGeoMastil(1300, 150, rango, true);
    expect(vc2_calcularXTrasteMastil(0, geoZurdo)).toBeCloseTo(1300 - vc2_calcularXTrasteMastil(0, geo));
    expect(vc2_calcularXTrasteMastil(12, geoZurdo)).toBeLessThan(vc2_calcularXTrasteMastil(0, geoZurdo));
  });

  it('rango desplazado: la primera columna es trsMin', () => {
    const geo = vc2_calcularGeoMastil(1300, 150, { trsMin: 5, trsMax: 17 }, false);
    expect(vc2_calcularXTrasteMastil(5, geo)).toBeCloseTo(geo.margenIzqPx + geo.anchoTrastePx / 2);
  });

  it('tamaños degenerados no producen valores no positivos', () => {
    const geo = vc2_calcularGeoMastil(0, 0, rango, false);
    expect(geo.anchoTrastePx).toBeGreaterThan(0);
    expect(geo.separacionCuerdasPx).toBeGreaterThan(0);
  });
});

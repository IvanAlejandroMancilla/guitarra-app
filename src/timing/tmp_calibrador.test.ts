import { describe, expect, it } from 'vitest';
import { tmp_calcularLatencia } from './tmp_calibrador';
import { TMP_INTERVALO_CALIB_MS } from './tmp_constantes';

const clicks = Array.from({ length: 8 }, (_valor, idx) => 1000 + idx * TMP_INTERVALO_CALIB_MS);

describe('tmp_calcularLatencia', () => {
  it('latencia constante: promedio exacto y confiable', () => {
    const resultado = tmp_calcularLatencia(clicks, clicks.map((click) => click + 120));
    expect(resultado).toMatchObject({ latMs: 120, cantMuestras: 8, esConfiable: true });
    expect(resultado.desvioMs).toBeCloseTo(0);
  });

  it('descarta golpes atípicos y clicks sin golpe', () => {
    const golpes = clicks.map((click, idx) => click + 100 + (idx % 2 === 0 ? 5 : -5));
    golpes[3] = (clicks[3] ?? 0) + 400;
    golpes.splice(6, 1);
    const resultado = tmp_calcularLatencia(clicks, golpes);
    expect(resultado.latMs).toBe(100);
    expect(resultado.cantMuestras).toBe(6);
    expect(resultado.esConfiable).toBe(true);
  });

  it('acepta golpes levemente adelantados al click', () => {
    const resultado = tmp_calcularLatencia(clicks, clicks.map((click) => click - 20));
    expect(resultado.latMs).toBe(0);
    expect(resultado.cantMuestras).toBe(8);
  });

  it('no es confiable con pocas muestras o mucha dispersión', () => {
    expect(tmp_calcularLatencia(clicks, []).esConfiable).toBe(false);
    expect(tmp_calcularLatencia(clicks, [1100, 1850]).esConfiable).toBe(false);
    const dispersos = clicks.map((click, idx) => click + 100 + (idx % 2 === 0 ? 50 : -50));
    expect(tmp_calcularLatencia(clicks, dispersos).esConfiable).toBe(false);
  });
});

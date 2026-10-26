import { describe, expect, it } from 'vitest';
import { EFX_TAM_CURVA } from './efx_constantes';
import { efx_calcularCompensacionGan, efx_crearCurvaRectificador, efx_crearCurvaSaturacion } from './efx_curvas';
import type { TEfxTipoCurva } from './efx_tipos';

const obtenerPico = (muestras: Float32Array): number => muestras.reduce((max, valor) => Math.max(max, Math.abs(valor)), 0);

describe('efx_crearCurvaSaturacion', () => {
  const tipos: TEfxTipoCurva[] = ['suave', 'dura', 'asimetrica', 'fuzz', 'valvula'];

  it.each(tipos)('%s: largo pedido, acotada, monótona y 0 → 0', (tipo) => {
    const cant = 1001; // impar: la muestra central es x = 0
    const curva = efx_crearCurvaSaturacion(tipo, 0.6, cant);
    expect(curva.length).toBe(cant);
    expect(obtenerPico(curva)).toBeCloseTo(1, 5);
    expect(curva[500]).toBeCloseTo(0, 6);
    for (let i = 1; i < cant; i++) expect(curva[i] ?? 0).toBeGreaterThanOrEqual((curva[i - 1] ?? 0) - 1e-7);
  });

  it('más ganancia → más salida para señales chicas', () => {
    const idx = Math.round(EFX_TAM_CURVA * 0.525); // x ≈ 0.05
    const poca = efx_crearCurvaSaturacion('suave', 0.1, EFX_TAM_CURVA)[idx] ?? 0;
    const mucha = efx_crearCurvaSaturacion('suave', 0.9, EFX_TAM_CURVA)[idx] ?? 0;
    expect(mucha).toBeGreaterThan(poca);
  });

  it('fuzz y asimétrica recortan distinto cada semiciclo', () => {
    for (const tipo of ['fuzz', 'asimetrica'] as const) {
      const curva = efx_crearCurvaSaturacion(tipo, 0.5, 1001);
      // Índices 450 y 550 = x −0.1 y +0.1: una curva simétrica daría la suma 0.
      expect(Math.abs((curva[450] ?? 0) + (curva[550] ?? 0))).toBeGreaterThan(0.05);
    }
  });

  it('acepta cantidades inválidas sin romper', () => {
    expect(efx_crearCurvaSaturacion('dura', 0.5, 0).length).toBe(2);
    expect(efx_crearCurvaSaturacion('dura', 0.5, Number.NaN).length).toBe(2);
  });

  it('compensación: 1 sin ganancia y decreciente', () => {
    expect(efx_calcularCompensacionGan(0)).toBeCloseTo(1);
    expect(efx_calcularCompensacionGan(1)).toBeLessThan(efx_calcularCompensacionGan(0.5));
  });

  it('rectificador = |x|', () => {
    const curva = efx_crearCurvaRectificador(5);
    expect([...curva]).toEqual([1, 0.5, 0, 0.5, 1]);
  });
});

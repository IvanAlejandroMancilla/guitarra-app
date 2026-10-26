import { describe, expect, it } from 'vitest';
import type { TEfxModeloCab, TEfxModeloRev } from '../core/cor_efectos';
import { efx_generarImpulsoGabinete, efx_generarImpulsoReverb } from './efx_impulsos';

const obtenerPico = (muestras: Float32Array): number => muestras.reduce((max, valor) => Math.max(max, Math.abs(valor)), 0);

describe('efx_generarImpulsoReverb', () => {
  const frecHz = 8000; // baja para que la prueba sea rápida
  const modelos: TEfxModeloRev[] = ['sala', 'placa', 'hall', 'resorte'];

  it.each(modelos)('%s: estéreo, pico 1, cola que decae y canales distintos', (modelo) => {
    const canales = efx_generarImpulsoReverb(frecHz, modelo, 0.5, 7);
    expect(canales).toHaveLength(2);
    const [izq, der] = canales;
    if (izq === undefined || der === undefined) throw new Error('faltan canales');
    expect(izq.length).toBe(der.length);
    expect(Math.max(obtenerPico(izq), obtenerPico(der))).toBeCloseTo(1, 5);
    const cuarto = Math.floor(izq.length / 4);
    const energiaInicio = izq.subarray(0, cuarto).reduce((suma, valor) => suma + valor * valor, 0);
    const energiaFinal = izq.subarray(izq.length - cuarto).reduce((suma, valor) => suma + valor * valor, 0);
    expect(energiaFinal).toBeLessThan(energiaInicio * 0.05);
    expect([...izq.subarray(0, 200)]).not.toEqual([...der.subarray(0, 200)]);
  });

  it('más decaimiento → impulso más largo; misma semilla → mismo impulso', () => {
    const corto = efx_generarImpulsoReverb(frecHz, 'hall', 0, 1)[0]?.length ?? 0;
    const largo = efx_generarImpulsoReverb(frecHz, 'hall', 1, 1)[0]?.length ?? 0;
    expect(largo).toBeGreaterThan(corto);
    expect(efx_generarImpulsoReverb(frecHz, 'sala', 0.3, 5)).toEqual(efx_generarImpulsoReverb(frecHz, 'sala', 0.3, 5));
  });

  it('el resorte tiene reflexiones periódicas (autocorrelación en ~32 ms)', () => {
    const [izq] = efx_generarImpulsoReverb(frecHz, 'resorte', 0.5, 3);
    if (izq === undefined) throw new Error('falta canal');
    const calcularCorrelacion = (retardo: number): number => {
      let suma = 0;
      for (let i = 0; i + retardo < izq.length; i++) suma += (izq[i] ?? 0) * (izq[i + retardo] ?? 0);
      return suma;
    };
    const periodo = Math.round(0.032 * frecHz);
    expect(Math.abs(calcularCorrelacion(periodo))).toBeGreaterThan(Math.abs(calcularCorrelacion(Math.round(periodo * 1.5))));
  });
});

describe('efx_generarImpulsoGabinete', () => {
  const modelos: Exclude<TEfxModeloCab, 'ir'>[] = ['combo1x12', 'britanico2x12', 'cerrado4x12', 'bajo4x10'];

  it.each(modelos)('%s: corto, pico 1 y finito', (modelo) => {
    const impulso = efx_generarImpulsoGabinete(48000, modelo);
    expect(impulso.length).toBeGreaterThan(1000);
    expect(impulso.length).toBeLessThanOrEqual(48000 * 0.05);
    expect(obtenerPico(impulso)).toBeCloseTo(1, 5);
    expect(impulso.every((valor) => Number.isFinite(valor))).toBe(true);
    expect(Math.abs(impulso[impulso.length - 1] ?? 1)).toBeLessThan(0.01);
  });

  it('cada modelo suena distinto', () => {
    const combo = efx_generarImpulsoGabinete(48000, 'combo1x12');
    const cerrado = efx_generarImpulsoGabinete(48000, 'cerrado4x12');
    expect([...combo.subarray(0, 100)]).not.toEqual([...cerrado.subarray(0, 100)]);
  });
});

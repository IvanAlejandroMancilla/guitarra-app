import { describe, expect, it } from 'vitest';
import { CorBus } from '../core/cor_bus';
import type { IEjrResumen } from '../core/cor_eventos';
import { TmpProgresivo, tmp_calcularBpmSiguiente } from './tmp_progresivo';
import { TmpReloj } from './tmp_reloj';

const resumen = (precision: number): IEjrResumen => ({
  titulo: 'X',
  precision,
  durMs: 0,
  marcador: { ptj: 0, racha: 0, rachaMax: 0, aciertos: 0, fallos: 0, multiplicador: 1 },
});

describe('tmp_progresivo', () => {
  it('suma el incremento sin pasar el máximo', () => {
    expect(tmp_calcularBpmSiguiente(80, 5, 160)).toBe(85);
    expect(tmp_calcularBpmSiguiente(158, 5, 160)).toBe(160);
    expect(tmp_calcularBpmSiguiente(160, 5, 160)).toBe(160);
    expect(tmp_calcularBpmSiguiente(170, 5, 160)).toBe(170);
    expect(tmp_calcularBpmSiguiente(80, -5, 160)).toBe(80);
  });

  it('TmpProgresivo sube el BPM solo si está activo y la precisión alcanza el mínimo', () => {
    const bus = new CorBus();
    const ctxFalso = { currentTime: 0, state: 'running' } as AudioContext;
    const reloj = new TmpReloj(ctxFalso, bus);
    reloj.fijarBpm(80);
    const progresivo = new TmpProgresivo(bus, reloj);
    bus.emitir('ejr:fin', resumen(1));
    expect(reloj.obtenerBpmBase()).toBe(80);
    progresivo.fijarOpciones(true, 5, 90);
    bus.emitir('ejr:fin', resumen(0.5));
    expect(reloj.obtenerBpmBase()).toBe(80);
    bus.emitir('ejr:fin', resumen(0.95));
    expect(reloj.obtenerBpmBase()).toBe(85);
    expect(bus.obtenerUltimo('tmp:bpm')).toEqual({ bpm: 85, bpmAnt: 80, esProgresivo: true });
    bus.emitir('ejr:fin', resumen(1));
    bus.emitir('ejr:fin', resumen(1));
    expect(reloj.obtenerBpmBase()).toBe(90);
    progresivo.detener();
  });
});

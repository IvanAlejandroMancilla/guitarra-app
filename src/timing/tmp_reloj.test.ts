import { describe, expect, it, vi } from 'vitest';
import { CorBus } from '../core/cor_bus';
import { TmpLoop } from './tmp_loop';
import { TmpReloj } from './tmp_reloj';
import { tmp_compensarLatencia } from './tmp_latencia';

/** Contexto falso con `currentTime` manipulable (en segundos). */
const crearCtx = (): { ctx: AudioContext; avanzar: (ms: number) => void } => {
  const estado = { seg: 10 };
  const ctxFalso = {
    get currentTime(): number {
      return estado.seg;
    },
    state: 'running',
  };
  return {
    // Doble de prueba: el reloj solo usa `currentTime` y `state`.
    ctx: ctxFalso as AudioContext,
    avanzar: (ms) => {
      estado.seg += ms / 1000;
    },
  };
};

describe('TmpReloj', () => {
  it('tmp_compensarLatencia resta la latencia', () => {
    expect(tmp_compensarLatencia(1000, 120)).toBe(880);
  });

  it('avanza en pulsos con el BPM efectivo y se congela en pausa', () => {
    const bus = new CorBus();
    const { ctx, avanzar } = crearCtx();
    const reloj = new TmpReloj(ctx, bus);
    reloj.fijarBpm(120);
    reloj.reproducir();
    avanzar(1000);
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(2);
    reloj.fijarVelocidad(0.5);
    expect(reloj.obtenerBpm()).toBe(60);
    avanzar(1000);
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(3);
    reloj.pausar();
    avanzar(5000);
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(3);
    expect(reloj.esReproduciendo()).toBe(false);
  });

  it('cambiar el BPM en reproducción conserva la posición en pulsos', () => {
    const bus = new CorBus();
    const { ctx, avanzar } = crearCtx();
    const reloj = new TmpReloj(ctx, bus);
    reloj.fijarBpm(60);
    reloj.reproducir();
    avanzar(2000);
    reloj.fijarBpm(120);
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(2);
    avanzar(500);
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(3);
  });

  it('latencias: salida para la posición audible, entrada para detecciones', () => {
    const bus = new CorBus();
    const { ctx, avanzar } = crearCtx();
    const reloj = new TmpReloj(ctx, bus);
    reloj.fijarBpm(60);
    reloj.fijarLatencia(200, 100);
    reloj.reproducir();
    avanzar(1000);
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(0.9);
    expect(reloj.convertirCtxAPosPulsos(reloj.obtenerTiempoCtxMs())).toBeCloseTo(0.8);
    expect(reloj.convertirPulsosACtxMs(2)).toBeCloseTo(reloj.obtenerTiempoCtxMs() + 1000);
  });

  it('eventos de transporte con la posición cruda', () => {
    const bus = new CorBus();
    const { ctx, avanzar } = crearCtx();
    const reloj = new TmpReloj(ctx, bus);
    const inicio = vi.fn();
    bus.suscribir('tmp:inicio', inicio);
    reloj.fijarBpm(60);
    reloj.reproducir();
    expect(inicio).toHaveBeenCalledWith(expect.objectContaining({ posPulsos: 0, bpm: 60, velocidad: 1 }));
    avanzar(1500);
    reloj.pausar();
    expect(bus.obtenerUltimo('tmp:pausa')?.posPulsos).toBeCloseTo(1.5);
    reloj.fijarPosPulsos(8);
    expect(bus.obtenerUltimo('tmp:posicion')?.posPulsos).toBe(8);
    reloj.detener();
    expect(reloj.obtenerPosPulsos()).toBe(0);
    expect(bus.obtenerUltimo('tmp:detencion')?.posPulsos).toBe(0);
  });

  it('fijarBpm acota y no emite si no cambia', () => {
    const bus = new CorBus();
    const reloj = new TmpReloj(crearCtx().ctx, bus);
    const cambio = vi.fn();
    bus.suscribir('tmp:bpm', cambio);
    reloj.fijarBpm(1000);
    expect(reloj.obtenerBpmBase()).toBe(300);
    reloj.fijarBpm(300);
    expect(cambio).toHaveBeenCalledTimes(1);
  });
});

describe('TmpLoop', () => {
  it('al cruzar el fin emite tmp:loop y vuelve al inicio', () => {
    const bus = new CorBus();
    const { ctx, avanzar } = crearCtx();
    const reloj = new TmpReloj(ctx, bus);
    const loop = new TmpLoop(reloj, bus);
    const vueltas = vi.fn();
    bus.suscribir('tmp:loop', vueltas);
    bus.emitir('ejr:cargado', {
      origen: 'json',
      ej: { titulo: 'X', bpm: 60, modo: 'flexible', notas: [{ nombre: 'Do', oct: 3, tiempo: 5, dur: 1 }] },
    });
    loop.fijarActivo(true);
    reloj.fijarBpm(60);
    reloj.reproducir();
    const crearCuadro = () => ({ tiempoCtxMs: 0, posPulsos: reloj.obtenerPosPulsos(), posMs: 0, deltaMs: 16, bpm: 60 });
    loop.actualizar(crearCuadro());
    avanzar(7900);
    loop.actualizar(crearCuadro());
    expect(vueltas).not.toHaveBeenCalled();
    avanzar(200);
    loop.actualizar(crearCuadro());
    expect(vueltas).toHaveBeenCalledWith({ idxVuelta: 0, inicioPulsos: 0, finPulsos: 8 });
    expect(reloj.obtenerPosPulsos()).toBeCloseTo(0);
  });
});

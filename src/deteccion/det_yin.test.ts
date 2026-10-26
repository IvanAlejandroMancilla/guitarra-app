import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CorBus } from '../core/cor_bus';
import type { ICorFuenteAudio } from '../core/cor_contratos';
import type { IDetNotaDetectada } from '../core/cor_eventos';
import { DET_FRAMES_SILENCIO, DET_INTERVALO_MS } from './det_constantes';
import type { IDetEstimacion, IDetEstimador } from './det_tipos';
import { DetDetectorYin } from './det_yin';

/** Fuente falsa: amplitud constante controlable y reloj que avanza con los timers falsos. */
const crearFuente = (estado: { amp: number }): ICorFuenteAudio => {
  const ctxFalso = {
    get currentTime(): number {
      return Date.now() / 1000;
    },
  };
  return {
    // Doble de prueba: el detector solo lee `currentTime`.
    obtenerCtx: () => ctxFalso as AudioContext,
    leerMuestras: (buf) => buf.fill(estado.amp),
    obtenerFrecMuestreoHz: () => 48000,
    obtenerTamBuf: () => 256,
    esActivo: () => true,
  };
};

const crearEstimador = (estado: { est: IDetEstimacion }): IDetEstimador => ({ estimar: () => estado.est });

describe('DetDetectorYin', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirma la nota con el tiempo del primer frame estable y luego emite silencio', async () => {
    const bus = new CorBus();
    const audio = { amp: 0.2 };
    const est = { est: { frecHz: 110, claridad: 0.97 } };
    const detector = new DetDetectorYin(crearFuente(audio), crearEstimador(est), bus, {
      claridadMin: 0.9,
      framesEstables: 3,
      frecA4Hz: 440,
    });
    const notas: IDetNotaDetectada[] = [];
    const tonos = vi.fn();
    const silencios = vi.fn();
    bus.suscribir('det:nota', (nota) => notas.push(nota));
    bus.suscribir('det:tono', tonos);
    bus.suscribir('det:silencio', silencios);

    await detector.iniciar();
    expect(detector.esActivo()).toBe(true);
    vi.advanceTimersByTime(DET_INTERVALO_MS * 5);
    expect(tonos).toHaveBeenCalledTimes(5);
    expect(notas).toHaveLength(1);
    expect(notas[0]).toMatchObject({ nombre: 'La', oct: 2, midi: 45 });
    // Primer frame a los 20 ms: ese es el instante de ataque, no el de confirmación (60 ms).
    expect(notas[0]?.tiempoMs).toBeCloseTo(DET_INTERVALO_MS);

    audio.amp = 0;
    vi.advanceTimersByTime(DET_INTERVALO_MS * (DET_FRAMES_SILENCIO + 3));
    expect(silencios).toHaveBeenCalledTimes(1);

    audio.amp = 0.2;
    vi.advanceTimersByTime(DET_INTERVALO_MS * 3);
    expect(notas).toHaveLength(2);
    detector.detener();
    expect(detector.esActivo()).toBe(false);
  });

  it('ignora tonos poco claros o fuera de rango', async () => {
    const bus = new CorBus();
    const est = { est: { frecHz: 110, claridad: 0.5 } };
    const detector = new DetDetectorYin(crearFuente({ amp: 0.2 }), crearEstimador(est), bus, {
      claridadMin: 0.9,
      framesEstables: 1,
      frecA4Hz: 440,
    });
    const notas = vi.fn();
    bus.suscribir('det:nota', notas);
    await detector.iniciar();
    vi.advanceTimersByTime(DET_INTERVALO_MS * 3);
    est.est = { frecHz: 3000, claridad: 0.99 };
    vi.advanceTimersByTime(DET_INTERVALO_MS * 3);
    expect(notas).not.toHaveBeenCalled();
    detector.detener();
  });

  it('un ataque nuevo (subida brusca de volumen) permite repetir la misma nota', async () => {
    const bus = new CorBus();
    const audio = { amp: 0.05 };
    const est = { est: { frecHz: 82.41, claridad: 0.97 } };
    const detector = new DetDetectorYin(crearFuente(audio), crearEstimador(est), bus, {
      claridadMin: 0.9,
      framesEstables: 2,
      frecA4Hz: 440,
    });
    const notas = vi.fn();
    bus.suscribir('det:nota', notas);
    await detector.iniciar();
    vi.advanceTimersByTime(DET_INTERVALO_MS * 4);
    expect(notas).toHaveBeenCalledTimes(1);
    audio.amp = 0.3;
    vi.advanceTimersByTime(DET_INTERVALO_MS * 4);
    expect(notas).toHaveBeenCalledTimes(2);
    detector.detener();
  });
});

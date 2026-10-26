import { describe, expect, it, vi } from 'vitest';
import { CorBus } from '../core/cor_bus';
import type { ICorCuadro, ICorReloj } from '../core/cor_contratos';
import type { IDetNotaDetectada, IEjrResultado } from '../core/cor_eventos';
import { cor_notaAMidi } from '../core/cor_notas';
import type { IEjercicio, TNombreNota } from '../core/tipos';
import { EjrPuntaje } from './ejr_puntaje';
import { EjrSesion } from './ejr_sesion';

/** Reloj falso a 60 BPM: 1 pulso = 1000 ms; sin latencias. */
const crearReloj = (estado: { esReproduciendo: boolean }): ICorReloj => ({
  obtenerTiempoCtxMs: () => 0,
  obtenerPosPulsos: () => 0,
  obtenerPosMs: () => 0,
  obtenerBpm: () => 60,
  convertirCtxAPosPulsos: (tiempoCtxMs) => tiempoCtxMs / 1000,
  esReproduciendo: () => estado.esReproduciendo,
});

const crearDet = (nombre: TNombreNota, oct: number, tiempoMs: number): IDetNotaDetectada => ({
  nombre,
  oct,
  midi: cor_notaAMidi(nombre, oct),
  frecHz: 100,
  cents: 0,
  claridad: 0.95,
  tiempoMs,
});

const crearCuadro = (tiempoCtxMs: number): ICorCuadro => ({ tiempoCtxMs, posPulsos: tiempoCtxMs / 1000, posMs: tiempoCtxMs, deltaMs: 16, bpm: 60 });

const ej: IEjercicio = {
  titulo: 'Prueba',
  bpm: 60,
  modo: 'estricto',
  notas: [
    { nombre: 'Do', oct: 3, tiempo: 1 },
    { nombre: 'Re', oct: 3, tiempo: 2 },
    { nombre: 'Mi', oct: 3, tiempo: 3 },
  ],
};

const prepararSesion = (esReproduciendo: boolean) => {
  const bus = new CorBus();
  const estado = { esReproduciendo };
  const sesion = new EjrSesion(bus, crearReloj(estado), new EjrPuntaje(), { modo: 'ejercicio', tolMs: 100 });
  const aciertos: IEjrResultado[] = [];
  const fallos: IEjrResultado[] = [];
  const fin = vi.fn();
  bus.suscribir('ejr:acierto', (res) => aciertos.push(res));
  bus.suscribir('ejr:fallo', (res) => fallos.push(res));
  bus.suscribir('ejr:fin', fin);
  bus.emitir('ejr:cargado', { ej, origen: 'json' });
  return { bus, sesion, estado, aciertos, fallos, fin };
};

describe('EjrSesion con timing', () => {
  it('acierto dentro de la ventana con desvío firmado', () => {
    const { bus, aciertos } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Do', 3, 1050));
    expect(aciertos).toHaveLength(1);
    expect(aciertos[0]).toMatchObject({ idxNota: 0, motivo: null });
    expect(aciertos[0]?.desvioMs).toBeCloseTo(50);
  });

  it('nota equivocada cerca de la esperada cuenta fallo "nota"', () => {
    const { bus, fallos, sesion } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Fa', 3, 1000));
    expect(fallos[0]).toMatchObject({ idxNota: 0, motivo: 'nota' });
    expect(sesion.obtenerNotaEsperada()?.nombre).toBe('Re');
  });

  it('octava equivocada en modo estricto', () => {
    const { bus, fallos } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Do', 4, 1000));
    expect(fallos[0]?.motivo).toBe('octava');
  });

  it('nota correcta fuera de la tolerancia pero dentro de la captura: tarde', () => {
    const { bus, fallos } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Do', 3, 1150));
    expect(fallos[0]?.motivo).toBe('tarde');
  });

  it('detecciones lejos de toda nota se ignoran', () => {
    const { bus, aciertos, fallos } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Do', 3, 1500));
    expect(aciertos).toHaveLength(0);
    expect(fallos).toHaveLength(0);
  });

  it('marca omitidas en actualizar() y emite el fin', () => {
    const { bus, sesion, aciertos, fallos, fin } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Do', 3, 1000));
    sesion.actualizar(crearCuadro(2100));
    expect(fallos).toHaveLength(0);
    sesion.actualizar(crearCuadro(3500));
    expect(fallos.map((res) => res.motivo)).toEqual(['omitida', 'omitida']);
    expect(aciertos).toHaveLength(1);
    expect(fin).toHaveBeenCalledTimes(1);
    expect(fin.mock.calls[0]?.[0]).toMatchObject({ titulo: 'Prueba', precision: 1 / 3 });
  });

  it('tmp:detencion reinicia el marcador', () => {
    const { bus, sesion } = prepararSesion(true);
    bus.emitir('det:nota', crearDet('Do', 3, 1000));
    expect(sesion.obtenerMarcador().aciertos).toBe(1);
    bus.emitir('tmp:detencion', { tiempoMs: 0, posPulsos: 0, posMs: 0, bpm: 60, velocidad: 1 });
    expect(sesion.obtenerMarcador().aciertos).toBe(0);
    expect(sesion.obtenerNotaEsperada()?.nombre).toBe('Do');
  });

  it('un salto hacia adelante descarta las notas anteriores sin contarlas como fallo', () => {
    const { bus, sesion, fallos } = prepararSesion(true);
    bus.emitir('tmp:posicion', { tiempoMs: 0, posPulsos: 2.5, posMs: 2500, bpm: 60, velocidad: 1 });
    sesion.actualizar(crearCuadro(2600));
    expect(fallos).toHaveLength(0);
    expect(sesion.obtenerNotaEsperada()?.nombre).toBe('Mi');
  });
});

describe('EjrSesion nota por nota (reloj detenido)', () => {
  it('avanza al acertar sin importar el tiempo y no avanza al fallar', () => {
    const { bus, sesion, aciertos, fallos, fin } = prepararSesion(false);
    bus.emitir('det:nota', crearDet('Do', 3, 99999));
    expect(aciertos).toHaveLength(1);
    bus.emitir('det:nota', crearDet('Sol', 3, 100000));
    expect(fallos).toHaveLength(1);
    expect(sesion.obtenerNotaEsperada()?.nombre).toBe('Re');
    bus.emitir('det:nota', crearDet('Re', 3, 100001));
    bus.emitir('det:nota', crearDet('Mi', 3, 100002));
    expect(aciertos).toHaveLength(3);
    expect(fin).toHaveBeenCalledTimes(1);
    expect(sesion.obtenerNotaEsperada()).toBeNull();
  });

  it('actualizar() no omite notas con el reloj detenido', () => {
    const { sesion, fallos } = prepararSesion(false);
    sesion.actualizar(crearCuadro(10000));
    expect(fallos).toHaveLength(0);
  });
});

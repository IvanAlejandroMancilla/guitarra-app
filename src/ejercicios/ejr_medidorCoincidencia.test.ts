import { describe, expect, it } from 'vitest';
import { CorBus } from '../core/cor_bus';
import type { IEjrCoincidencia } from '../core/cor_eventos';
import { cor_notaAFrec } from '../core/cor_notas';
import type { IEjercicio } from '../core/tipos';
import { EjrMedidorCoincidencia } from './ejr_medidorCoincidencia';

const ej: IEjercicio = {
  titulo: 'Prueba',
  bpm: 60,
  modo: 'estricto',
  notas: [
    { nombre: 'La', oct: 2, cur: 5, trs: 0, dedo: 0, tiempo: 0 },
    { nombre: 'Do', oct: 3, cur: 5, trs: 3, dedo: 3, tiempo: 1 },
  ],
};

const centsAFactor = (cents: number): number => 2 ** (cents / 1200);

const crear = (modo: 'estricto' | 'flexible' | 'ejercicio' = 'ejercicio') => {
  const bus = new CorBus();
  const medidor = new EjrMedidorCoincidencia(bus, { modo, frecA4Hz: 440 });
  const recibidos: IEjrCoincidencia[] = [];
  bus.suscribir('ejr:coincidencia', (coincidencia) => recibidos.push(coincidencia));
  medidor.iniciar();
  bus.emitir('ejr:cargado', { ej, origen: 'json' });
  return { bus, medidor, recibidos };
};

describe('EjrMedidorCoincidencia', () => {
  it('100 % con la nota esperada afinada', () => {
    const { bus, recibidos } = crear();
    bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 110, claridad: 0.95 });
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0]).toMatchObject({ pct: 100, esNotaCorrecta: true, esSilencio: false, idxNota: 0 });
    expect(recibidos[0]?.detectada).toEqual({ nombre: 'La', oct: 2, midi: 45 });
  });

  it('baja con los cents de desvío', () => {
    const { bus, recibidos } = crear();
    bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 110 * centsAFactor(25), claridad: 0.95 });
    expect(recibidos[0]?.pct).toBeCloseTo(50, 1);
    expect(recibidos[0]?.cents).toBeCloseTo(25, 1);
  });

  it('0 % si es otra nota; en estricto la octava cuenta y en flexible no', () => {
    const estricto = crear();
    estricto.bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 220, claridad: 0.95 });
    expect(estricto.recibidos[0]).toMatchObject({ pct: 0, esNotaCorrecta: false });
    const flexible = crear('flexible');
    flexible.bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 220, claridad: 0.95 });
    expect(flexible.recibidos[0]).toMatchObject({ pct: 100, esNotaCorrecta: true });
  });

  it('sigue a la nota esperada y respeta frecA4Hz', () => {
    const { bus, recibidos, medidor } = crear();
    bus.emitir('ejr:esperada', { nota: ej.notas[1] ?? null, idxNota: 1 });
    bus.emitir('det:tono', { tiempoMs: 1000, frecHz: cor_notaAFrec('Do', 3), claridad: 0.95 });
    expect(recibidos[0]).toMatchObject({ pct: 100, idxNota: 1 });
    medidor.actualizarOpciones({ modo: 'ejercicio', frecA4Hz: 432 });
    bus.emitir('det:tono', { tiempoMs: 2000, frecHz: cor_notaAFrec('Do', 3, 432), claridad: 0.95 });
    expect(recibidos[1]?.pct).toBeCloseTo(100);
  });

  it('sin nota esperada: idxNota −1 y 0 %', () => {
    const { bus, recibidos } = crear();
    bus.emitir('ejr:esperada', { nota: null, idxNota: 2 });
    bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 110, claridad: 0.95 });
    expect(recibidos[0]).toMatchObject({ pct: 0, idxNota: -1, esNotaCorrecta: false });
  });

  it('limita la frecuencia de emisión y suaviza', () => {
    const { bus, recibidos } = crear();
    bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 110, claridad: 0.95 });
    bus.emitir('det:tono', { tiempoMs: 1010, frecHz: 220, claridad: 0.95 });
    expect(recibidos).toHaveLength(1);
    bus.emitir('det:tono', { tiempoMs: 1060, frecHz: 220, claridad: 0.95 });
    expect(recibidos).toHaveLength(2);
    const pct = recibidos[1]?.pct ?? -1;
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it('silencio: 0 % con esSilencio, una sola vez', () => {
    const { bus, recibidos } = crear();
    bus.emitir('det:silencio', { tiempoMs: 1000 });
    bus.emitir('det:silencio', { tiempoMs: 1100 });
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0]).toMatchObject({ pct: 0, cents: 0, esSilencio: true, detectada: null, idxNota: 0 });
  });

  it('detener cancela las suscripciones', () => {
    const { bus, recibidos, medidor } = crear();
    medidor.detener();
    expect(medidor.esActivo()).toBe(false);
    bus.emitir('det:tono', { tiempoMs: 1000, frecHz: 110, claridad: 0.95 });
    expect(recibidos).toHaveLength(0);
  });
});

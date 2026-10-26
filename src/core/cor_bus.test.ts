import { describe, expect, it, vi } from 'vitest';
import { CorBus } from './cor_bus';
import type { IAudNivel } from './cor_eventos';

const nivel: IAudNivel = { tiempoMs: 10, rms: 0.1, rmsDb: -20, picoDb: -14, esSaturado: false };

describe('CorBus', () => {
  it('entrega el payload a los oyentes del evento', () => {
    const bus = new CorBus();
    const oyente = vi.fn();
    const otro = vi.fn();
    bus.suscribir('aud:nivel', oyente);
    bus.suscribir('det:silencio', otro);
    bus.emitir('aud:nivel', nivel);
    expect(oyente).toHaveBeenCalledWith(nivel);
    expect(otro).not.toHaveBeenCalled();
  });

  it('desuscribe con la función devuelta y con desuscribir()', () => {
    const bus = new CorBus();
    const oyenteA = vi.fn();
    const oyenteB = vi.fn();
    const cancelar = bus.suscribir('aud:nivel', oyenteA);
    bus.suscribir('aud:nivel', oyenteB);
    cancelar();
    bus.desuscribir('aud:nivel', oyenteB);
    bus.emitir('aud:nivel', nivel);
    expect(oyenteA).not.toHaveBeenCalled();
    expect(oyenteB).not.toHaveBeenCalled();
  });

  it('guarda el último payload', () => {
    const bus = new CorBus();
    expect(bus.obtenerUltimo('aud:nivel')).toBeUndefined();
    bus.emitir('aud:nivel', nivel);
    const sig: IAudNivel = { ...nivel, tiempoMs: 20 };
    bus.emitir('aud:nivel', sig);
    expect(bus.obtenerUltimo('aud:nivel')).toBe(sig);
  });

  it('un oyente que lanza no rompe a los demás', () => {
    const bus = new CorBus();
    const espiaConsola = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const oyenteSano = vi.fn();
    bus.suscribir('aud:nivel', () => {
      throw new Error('falla');
    });
    bus.suscribir('aud:nivel', oyenteSano);
    expect(() => bus.emitir('aud:nivel', nivel)).not.toThrow();
    expect(oyenteSano).toHaveBeenCalledTimes(1);
    expect(espiaConsola).toHaveBeenCalledTimes(1);
    espiaConsola.mockRestore();
  });

  it('tolera desuscribirse durante la emisión', () => {
    const bus = new CorBus();
    const oyenteB = vi.fn();
    const cancelarA = bus.suscribir('aud:nivel', () => {
      cancelarA();
    });
    bus.suscribir('aud:nivel', oyenteB);
    bus.emitir('aud:nivel', nivel);
    bus.emitir('aud:nivel', nivel);
    expect(oyenteB).toHaveBeenCalledTimes(2);
  });

  it('limpiar() quita oyentes y últimos payloads', () => {
    const bus = new CorBus();
    const oyente = vi.fn();
    bus.suscribir('aud:nivel', oyente);
    bus.emitir('aud:nivel', nivel);
    bus.limpiar();
    bus.emitir('det:silencio', { tiempoMs: 1 });
    expect(bus.obtenerUltimo('aud:nivel')).toBeUndefined();
    bus.emitir('aud:nivel', nivel);
    expect(oyente).toHaveBeenCalledTimes(1);
  });
});

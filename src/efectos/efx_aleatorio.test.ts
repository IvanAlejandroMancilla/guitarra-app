import { describe, expect, it } from 'vitest';
import { efx_crearAleatorio } from './efx_aleatorio';

describe('efx_crearAleatorio', () => {
  it('es determinista por semilla y queda en [0, 1)', () => {
    const genA = efx_crearAleatorio(42);
    const genB = efx_crearAleatorio(42);
    const genC = efx_crearAleatorio(43);
    const serieA = Array.from({ length: 1000 }, () => genA());
    const serieB = Array.from({ length: 1000 }, () => genB());
    const serieC = Array.from({ length: 1000 }, () => genC());
    expect(serieA).toEqual(serieB);
    expect(serieA).not.toEqual(serieC);
    for (const valor of serieA) {
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
    const media = serieA.reduce((suma, valor) => suma + valor, 0) / serieA.length;
    expect(media).toBeGreaterThan(0.4);
    expect(media).toBeLessThan(0.6);
  });
});

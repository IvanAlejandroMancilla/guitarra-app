import { describe, expect, it } from 'vitest';
import type { ICorOpcionesVista } from '../../core/cor_contratos';
import { VC2_PULSOS_VISIBLES, VC2_Y_GOLPE_REL } from './vc2_constantes';
import { vc2_calcularGeometria, vc2_calcularXCarril, vc2_calcularYNota } from './vc2_geometria';

const opc: ICorOpcionesVista = { esZurdo: false, notacion: 'latina', velocidadAutopista: 1, calidad: 'media' };

describe('vc2_geometria', () => {
  it('línea de golpe y píxeles por pulso', () => {
    const geo = vc2_calcularGeometria(600, 1000, opc);
    expect(geo.yGolpePx).toBeCloseTo(1000 * VC2_Y_GOLPE_REL);
    expect(geo.pxPorPulso).toBeCloseTo(geo.yGolpePx / VC2_PULSOS_VISIBLES);
    expect(vc2_calcularGeometria(600, 1000, { ...opc, velocidadAutopista: 2 }).pxPorPulso).toBeCloseTo(geo.pxPorPulso * 2);
  });

  it('carriles: diestro con la cuerda 6 a la izquierda, zurdo invertido, centrados', () => {
    const geo = vc2_calcularGeometria(600, 800, opc);
    const x6 = vc2_calcularXCarril(6, geo);
    const x1 = vc2_calcularXCarril(1, geo);
    expect(x6).toBeLessThan(x1);
    expect((x6 + x1) / 2).toBeCloseTo(300);
    expect(vc2_calcularXCarril(5, geo) - x6).toBeCloseTo(geo.anchoCarrilPx);
    const geoZurdo = vc2_calcularGeometria(600, 800, { ...opc, esZurdo: true });
    expect(vc2_calcularXCarril(6, geoZurdo)).toBeCloseTo(x1);
  });

  it('sin cuerda o cuerda inválida: centro', () => {
    const geo = vc2_calcularGeometria(600, 800, opc);
    expect(vc2_calcularXCarril(undefined, geo)).toBe(300);
    expect(vc2_calcularXCarril(9, geo)).toBe(300);
  });

  it('ancho de carril acotado en pantallas anchas', () => {
    const geo = vc2_calcularGeometria(4000, 800, opc);
    expect(geo.anchoCarrilPx).toBeLessThanOrEqual(120);
  });

  it('Y de nota: en la línea al llegar, arriba si es futura, abajo si pasó', () => {
    const geo = vc2_calcularGeometria(600, 1000, opc);
    expect(vc2_calcularYNota(4, 4, geo)).toBeCloseTo(geo.yGolpePx);
    expect(vc2_calcularYNota(4 + VC2_PULSOS_VISIBLES, 4, geo)).toBeCloseTo(0);
    expect(vc2_calcularYNota(3, 4, geo)).toBeGreaterThan(geo.yGolpePx);
  });
});

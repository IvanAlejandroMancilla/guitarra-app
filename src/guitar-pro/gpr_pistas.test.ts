import { describe, expect, it } from 'vitest';
import type { IGprPista } from '../core/cor_eventos';
import { gpr_elegirPistaGuitarra } from './gpr_pistas';

const crearPista = (parcial: Partial<IGprPista> & { idx: number }): IGprPista => ({
  nombre: `Pista ${parcial.idx}`,
  esPercusion: false,
  esGuitarra: false,
  cantCuerdas: 0,
  afinacion: null,
  programaMidi: 0,
  ...parcial,
});

describe('gpr_elegirPistaGuitarra', () => {
  it('elige la primera guitarra', () => {
    const pistas = [
      crearPista({ idx: 0, esPercusion: true }),
      crearPista({ idx: 1, cantCuerdas: 4, programaMidi: 33 }),
      crearPista({ idx: 2, cantCuerdas: 6, programaMidi: 29, esGuitarra: true }),
      crearPista({ idx: 3, cantCuerdas: 6, programaMidi: 25, esGuitarra: true }),
    ];
    expect(gpr_elegirPistaGuitarra(pistas)).toBe(2);
  });

  it('sin guitarras, elige la primera pista con cuerdas que no sea percusión', () => {
    const pistas = [
      crearPista({ idx: 0, esPercusion: true }),
      crearPista({ idx: 1, programaMidi: 0 }),
      crearPista({ idx: 2, cantCuerdas: 4, programaMidi: 33 }),
    ];
    expect(gpr_elegirPistaGuitarra(pistas)).toBe(2);
  });

  it('sin cuerdas, elige la primera que no sea percusión; si todas lo son, la primera', () => {
    expect(gpr_elegirPistaGuitarra([crearPista({ idx: 0, esPercusion: true }), crearPista({ idx: 1 })])).toBe(1);
    expect(gpr_elegirPistaGuitarra([crearPista({ idx: 4, esPercusion: true })])).toBe(4);
  });

  it('devuelve -1 si no hay pistas', () => {
    expect(gpr_elegirPistaGuitarra([])).toBe(-1);
  });
});

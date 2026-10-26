import { describe, expect, it } from 'vitest';
import { DetFiltroEstabilidad } from './det_estabilidad';

describe('DetFiltroEstabilidad', () => {
  it('confirma tras N frames iguales y solo una vez', () => {
    const filtro = new DetFiltroEstabilidad(3);
    expect(filtro.registrar(40)).toBeNull();
    expect(filtro.registrar(40)).toBeNull();
    expect(filtro.registrar(40)).toBe(40);
    expect(filtro.registrar(40)).toBeNull();
    expect(filtro.registrar(40)).toBeNull();
  });

  it('un cambio de nota reinicia la cuenta', () => {
    const filtro = new DetFiltroEstabilidad(3);
    filtro.registrar(40);
    filtro.registrar(40);
    expect(filtro.registrar(45)).toBeNull();
    expect(filtro.registrar(45)).toBeNull();
    expect(filtro.registrar(45)).toBe(45);
  });

  it('un salto breve no vuelve a confirmar la misma nota', () => {
    const filtro = new DetFiltroEstabilidad(2);
    filtro.registrar(40);
    expect(filtro.registrar(40)).toBe(40);
    filtro.registrar(52);
    filtro.registrar(40);
    expect(filtro.registrar(40)).toBeNull();
  });

  it('el silencio rearma la misma nota', () => {
    const filtro = new DetFiltroEstabilidad(2);
    filtro.registrar(40);
    expect(filtro.registrar(40)).toBe(40);
    expect(filtro.registrar(null)).toBeNull();
    filtro.registrar(40);
    expect(filtro.registrar(40)).toBe(40);
  });

  it('reiniciar() y fijarFramesEstables()', () => {
    const filtro = new DetFiltroEstabilidad(3);
    filtro.fijarFramesEstables(1);
    expect(filtro.registrar(50)).toBe(50);
    filtro.reiniciar();
    expect(filtro.registrar(50)).toBe(50);
    filtro.fijarFramesEstables(0);
    filtro.reiniciar();
    expect(filtro.registrar(51)).toBe(51);
  });
});

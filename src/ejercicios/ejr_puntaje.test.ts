import { describe, expect, it } from 'vitest';
import { EJR_MULT_MAX, EJR_PTS_BASE, EJR_RACHA_POR_MULT } from './ejr_constantes';
import { EjrPuntaje, ejr_calcularMultiplicador, ejr_calcularPuntos } from './ejr_puntaje';

describe('ejr_puntaje', () => {
  it('multiplicador por racha con tope', () => {
    expect(ejr_calcularMultiplicador(0)).toBe(1);
    expect(ejr_calcularMultiplicador(EJR_RACHA_POR_MULT - 1)).toBe(1);
    expect(ejr_calcularMultiplicador(EJR_RACHA_POR_MULT)).toBe(2);
    expect(ejr_calcularMultiplicador(1000)).toBe(EJR_MULT_MAX);
    expect(ejr_calcularMultiplicador(-5)).toBe(1);
  });

  it('puntos según precisión (100 % a 50 %) y multiplicador', () => {
    expect(ejr_calcularPuntos(0, 100, 0)).toBe(EJR_PTS_BASE);
    expect(ejr_calcularPuntos(100, 100, 0)).toBe(EJR_PTS_BASE / 2);
    expect(ejr_calcularPuntos(-50, 100, 0)).toBe(75);
    expect(ejr_calcularPuntos(500, 100, 0)).toBe(EJR_PTS_BASE / 2);
    expect(ejr_calcularPuntos(0, 100, EJR_RACHA_POR_MULT)).toBe(EJR_PTS_BASE * 2);
  });

  it('EjrPuntaje acumula, corta la racha con un fallo y se reinicia', () => {
    const puntaje = new EjrPuntaje();
    for (let i = 0; i < EJR_RACHA_POR_MULT; i++) puntaje.registrarAcierto(0, 100);
    expect(puntaje.obtenerMarcador()).toMatchObject({ racha: 10, aciertos: 10, multiplicador: 2, ptj: 1000 });
    expect(puntaje.registrarAcierto(0, 100)).toBe(200);
    puntaje.registrarFallo();
    expect(puntaje.obtenerMarcador()).toMatchObject({ racha: 0, rachaMax: 11, fallos: 1, multiplicador: 1, ptj: 1200 });
    puntaje.reiniciar();
    expect(puntaje.obtenerMarcador()).toEqual({ ptj: 0, racha: 0, rachaMax: 0, aciertos: 0, fallos: 0, multiplicador: 1 });
  });
});

/** Puntaje, racha y multiplicador. */
import type { IEjrMarcador } from '../core/cor_eventos';
import { EJR_MULT_MAX, EJR_PTS_BASE, EJR_RACHA_POR_MULT } from './ejr_constantes';

/** Multiplicador para una racha: 1 + ⌊racha / EJR_RACHA_POR_MULT⌋, hasta EJR_MULT_MAX. */
export function ejr_calcularMultiplicador(racha: number): number {
  return Math.min(1 + Math.floor(Math.max(racha, 0) / EJR_RACHA_POR_MULT), EJR_MULT_MAX);
}

/**
 * Puntos de un acierto: entre 50 % (en el borde de la ventana) y 100 % de
 * `EJR_PTS_BASE` (desvío 0), por el multiplicador de la racha PREVIA al acierto.
 */
export function ejr_calcularPuntos(desvioMs: number, tolMs: number, racha: number): number {
  const precision = tolMs > 0 ? 1 - Math.min(Math.abs(desvioMs) / tolMs, 1) : 1;
  return Math.round(EJR_PTS_BASE * (0.5 + 0.5 * precision) * ejr_calcularMultiplicador(racha));
}

export class EjrPuntaje {
  #ptj = 0;
  #racha = 0;
  #rachaMax = 0;
  #aciertos = 0;
  #fallos = 0;

  /** Devuelve los puntos obtenidos. */
  registrarAcierto(desvioMs: number, tolMs: number): number {
    const puntos = ejr_calcularPuntos(desvioMs, tolMs, this.#racha);
    this.#ptj += puntos;
    this.#racha++;
    this.#rachaMax = Math.max(this.#rachaMax, this.#racha);
    this.#aciertos++;
    return puntos;
  }

  registrarFallo(): void {
    this.#racha = 0;
    this.#fallos++;
  }

  obtenerMarcador(): IEjrMarcador {
    return {
      ptj: this.#ptj,
      racha: this.#racha,
      rachaMax: this.#rachaMax,
      aciertos: this.#aciertos,
      fallos: this.#fallos,
      multiplicador: ejr_calcularMultiplicador(this.#racha),
    };
  }

  reiniciar(): void {
    this.#ptj = 0;
    this.#racha = 0;
    this.#rachaMax = 0;
    this.#aciertos = 0;
    this.#fallos = 0;
  }
}

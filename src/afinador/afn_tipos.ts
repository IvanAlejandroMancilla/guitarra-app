/** Tipos internos del afinador. */
import type { IAfinacion } from '../core/tipos';

export interface IAfnOpciones {
  afinacion: IAfinacion;
  frecA4Hz: number;
  tolCents: number;
}

/** Cuerda al aire más cercana a una frecuencia. */
export interface IAfnCuerdaCercana {
  /** 1–6 (1 = Mi agudo). */
  cur: number;
  midi: number;
  frecRefHz: number;
  /** Desvío respecto de la cuerda al aire (negativo = grave). */
  cents: number;
}

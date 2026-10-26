/** Tipos internos del módulo de escalas. */
import type { TEscTipoEscala } from '../core/cor_eventos';
import type { IAfinacion, ICorPosMastil, TCfgNotacion, TEjrModoValidacion, TNombreNota } from '../core/tipos';

export interface IEscOpciones {
  tonica: TNombreNota;
  tipo: TEscTipoEscala;
  /** Octava científica de la tónica inicial. */
  oct: number;
  cantOct: number;
  /** Subir y volver a bajar. */
  esIdaVuelta: boolean;
  bpm: number;
  modo: TEjrModoValidacion;
  afinacion: IAfinacion;
  /** Primer traste de la caja. */
  trsInicial: number;
  pulsosPorNota: number;
  notacion: TCfgNotacion;
}

/** Posición digitada: cuerda, traste y dedo (0 = al aire, 1 índice … 4 meñique). */
export interface IEscPosicion extends ICorPosMastil {
  dedo: number;
}

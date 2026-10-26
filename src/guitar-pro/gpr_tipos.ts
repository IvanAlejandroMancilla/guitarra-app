/**
 * Tipos internos del módulo gpr.
 * `IGprPartitura` referencia el modelo de alphaTab solo como tipo (`import type`): no carga la librería.
 */
import type { model } from '@coderline/alphatab';
import type { IGprCargado } from '../core/cor_eventos';
import type { IEjercicio } from '../core/tipos';

/** Carga de partituras Guitar Pro y conversión de pistas a ejercicios. */
export interface IGprCargador {
  /** Rechaza con un `Error` de mensaje en español si el archivo no es válido. */
  cargarPartitura(fuente: ArrayBuffer, nombreArchivo: string): Promise<IGprCargado>;
  /** Convierte otra pista de la última partitura cargada. Lanza `Error` si no hay partitura o la pista no existe. */
  convertirPista(idxPst: number): IEjercicio;
}

/** Compás en el orden real de reproducción (repeticiones y finales alternativos ya desplegados). */
export interface IGprCompasTocado {
  /** Índice del compás en la partitura (`masterBars`). */
  idxCompas: number;
  /** Inicio en ticks MIDI de alphaTab (los mismos que `AlphaTabApi.tickPosition`). */
  inicioTicks: number;
}

/** Partitura leída + orden de reproducción calculado por el generador MIDI de alphaTab. */
export interface IGprPartitura {
  score: model.Score;
  compases: readonly IGprCompasTocado[];
}

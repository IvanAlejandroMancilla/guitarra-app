/** Tipos internos del módulo de ejercicios. */
import type { TEjrMotivoFallo } from '../core/cor_eventos';
import type { TCfgModoValidacion } from '../core/tipos';

export interface IEjrOpciones {
  /** `'ejercicio'` = usar el `modo` que trae cada ejercicio. */
  modo: TCfgModoValidacion;
  /** Ventana de tolerancia (±ms). */
  tolMs: number;
}

export interface IEjrEvaluacion {
  esAcierto: boolean;
  /** `null` en aciertos. */
  motivo: TEjrMotivoFallo | null;
}

/** Opciones del medidor de coincidencia en vivo (`EjrMedidorCoincidencia`). */
export interface IEjrOpcionesCoincidencia {
  /** `'ejercicio'` = usar el `modo` que trae cada ejercicio. */
  modo: TCfgModoValidacion;
  /** Frecuencia de referencia La4 en Hz. */
  frecA4Hz: number;
}

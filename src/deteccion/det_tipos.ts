/** Tipos internos del módulo de detección. */

export interface IDetOpciones {
  /** Claridad mínima (0..1) para aceptar un tono. */
  claridadMin: number;
  /** Frames consecutivos con la misma nota para confirmarla. */
  framesEstables: number;
  /** Frecuencia de referencia de La4. */
  frecA4Hz: number;
}

/** Resultado crudo del estimador. `frecHz` = 0 y `claridad` = 0 si no hay tono. */
export interface IDetEstimacion {
  frecHz: number;
  claridad: number;
}

/** Estimador de frecuencia fundamental intercambiable (Pitchy, otro YIN, WASM…). */
export interface IDetEstimador {
  estimar(buf: Float32Array, frecMuestreoHz: number): IDetEstimacion;
}

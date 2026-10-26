/** Rangos válidos de los campos numéricos de `IConfig` (fuente: docs/convenciones-nombres.md §5.1). */
import type { ICfgRango, TCfgClaveNumerica } from './cfg_tipos';

export const CFG_RANGOS: Readonly<Record<TCfgClaveNumerica, Readonly<ICfgRango>>> = Object.freeze({
  ganEntrada: { min: 0, max: 4, paso: 0.05 },
  latEntradaMs: { min: 0, max: 500, paso: 1 },
  latSalidaMs: { min: 0, max: 500, paso: 1 },
  claridadMin: { min: 0.5, max: 0.99, paso: 0.01 },
  framesEstables: { min: 1, max: 10, paso: 1 },
  frecA4Hz: { min: 430, max: 450, paso: 0.5 },
  tolMs: { min: 20, max: 300, paso: 5 },
  bpm: { min: 30, max: 300, paso: 1 },
  velocidad: { min: 0.5, max: 1, paso: 0.05 },
  incBpmProgresivo: { min: 1, max: 20, paso: 1 },
  bpmMaxProgresivo: { min: 30, max: 300, paso: 1 },
  volMetronomo: { min: 0, max: 1, paso: 0.01 },
  volAcp: { min: 0, max: 1, paso: 0.01 },
  velocidadAutopista: { min: 0.5, max: 3, paso: 0.1 },
  volMonitor: { min: 0, max: 1, paso: 0.01 },
});

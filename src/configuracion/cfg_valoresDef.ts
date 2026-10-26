/** Valores por defecto de la configuración (rangos y descripción de cada campo en `IConfig`). */
import type { IConfig } from '../core/tipos';

export const CFG_VALORES_DEF: Readonly<IConfig> = Object.freeze({
  idDispEntrada: '',
  ganEntrada: 1,
  latEntradaMs: 0,
  latSalidaMs: 0,
  claridadMin: 0.9,
  framesEstables: 3,
  frecA4Hz: 440,
  modoValidacion: 'ejercicio',
  tolMs: 100,
  bpm: 80,
  velocidad: 1,
  esProgresivo: false,
  incBpmProgresivo: 5,
  bpmMaxProgresivo: 160,
  esLoop: false,
  esMetronomoActivo: true,
  idAfinacion: 'estandar',
  volMetronomo: 0.7,
  volAcp: 0.8,
  vista: 'rocksmith',
  calidad: 'media',
  velocidadAutopista: 1,
  esZurdo: false,
  notacion: 'latina',
  esMonitorActivo: false,
  volMonitor: 0.5,
  // Literal (no se importa de efx): EFX_ID_PRESET_DEF.
  idPresetEfx: 'fabrica:limpioBrillante',
});

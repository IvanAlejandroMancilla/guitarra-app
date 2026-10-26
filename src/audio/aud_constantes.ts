/** Constantes de captura de audio (contrato: docs/firmas-aprobadas.md §2). */

/** Tamaño de FFT del `AnalyserNode` = muestras por lectura (≈ 43 ms a 48 kHz). */
export const AUD_TAM_FFT = 2048;
/** Ganancia de entrada por defecto. */
export const AUD_GAN_DEF = 1;
/** Ganancia de entrada máxima. */
export const AUD_GAN_MAX = 4;
/** Intervalo del monitor de onda y nivel (≈ 30 fps). */
export const AUD_INTERVALO_MONITOR_MS = 33;
/** Piso de dBFS para silencio absoluto. */
export const AUD_DB_MIN = -100;
/** Amplitud de pico (0..1) a partir de la cual se considera saturación. */
export const AUD_UMBRAL_SATURACION = 0.98;

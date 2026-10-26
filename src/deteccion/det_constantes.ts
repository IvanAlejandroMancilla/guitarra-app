/** Constantes de detección de tono (contrato: docs/firmas-aprobadas.md §3). */

/** Si1: cubre la cuerda 6 de Drop C (Do2) y graves desafinados. */
export const DET_FREC_MIN_HZ = 61.74;
/** Mi6 (traste 24 de la cuerda 1). */
export const DET_FREC_MAX_HZ = 1318.51;
/** Claridad mínima por defecto para aceptar un tono. */
export const DET_CLARIDAD_DEF = 0.9;
/** Frames consecutivos con la misma nota para confirmarla. */
export const DET_FRAMES_ESTABLES_DEF = 3;
/** Frames sin tono para declarar silencio (y rearmar el filtro). */
export const DET_FRAMES_SILENCIO = 5;
/** RMS lineal por debajo del cual el frame se considera silencio. */
export const DET_RMS_MIN = 0.01;
/** Periodo de análisis (50 frames/s). */
export const DET_INTERVALO_MS = 20;

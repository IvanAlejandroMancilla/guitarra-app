/** Constantes de timing y metrónomo (contrato: docs/firmas-aprobadas.md §7). */

export const TMP_BPM_DEF = 80;
export const TMP_BPM_MIN = 30;
export const TMP_BPM_MAX = 300;
/** Paso de BPM de los atajos subir/bajar. */
export const TMP_PASO_BPM = 5;
export const TMP_PULSOS_COMPAS_DEF = 4;
/** Horizonte de programación de clicks (los `'tmp:pulso'` llegan con este adelanto). */
export const TMP_ANTICIPACION_MS = 100;
/** Periodo del programador de clicks. */
export const TMP_INTERVALO_PROG_MS = 25;
export const TMP_FREC_CLICK_HZ = 1000;
export const TMP_FREC_ACENTO_HZ = 1500;
export const TMP_DUR_CLICK_MS = 30;
export const TMP_VELOCIDAD_MIN = 0.5;
export const TMP_VELOCIDAD_MAX = 1;
/** Precisión mínima de una vuelta (0..1) para que el modo progresivo suba el BPM. */
export const TMP_PRECISION_MIN_PROG = 0.9;
export const TMP_CANT_CLICKS_CALIB = 8;
export const TMP_INTERVALO_CALIB_MS = 750;

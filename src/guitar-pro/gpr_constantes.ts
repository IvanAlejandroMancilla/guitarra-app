/** Constantes del módulo Guitar Pro. */

/** Resolución de alphaTab: ticks MIDI por negra (1 pulso). */
export const GPR_TICKS_POR_PULSO = 960;

/** Extensiones aceptadas (minúsculas, sin punto). Los `.psarc` de Rocksmith NO se soportan. */
export const GPR_EXTENSIONES: readonly string[] = ['gp', 'gp3', 'gp4', 'gp5', 'gpx'];

/** Rango General MIDI de guitarras (24 = nylon … 31 = armónicos). */
export const GPR_PROGRAMA_GUITARRA_MIN = 24;
export const GPR_PROGRAMA_GUITARRA_MAX = 31;

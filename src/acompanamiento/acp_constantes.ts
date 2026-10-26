/** Constantes del módulo de acompañamiento. */

/** SoundFont relativo a `import.meta.env.BASE_URL` (archivo en `public/soundfonts/`). */
export const ACP_RUTA_SOUNDFONT = 'soundfonts/sonivox.sf2';

/** Deriva máxima tolerada entre el acompañamiento y el reloj de `tmp` antes de reposicionar. */
export const ACP_DERIVA_MAX_MS = 40;

/** Volumen por defecto de cada pista (0..1). */
export const ACP_VOL_DEF = 0.8;

/** Rango del factor de velocidad de práctica. */
export const ACP_VELOCIDAD_MIN = 0.5;
export const ACP_VELOCIDAD_MAX = 1;

/** Resolución de alphaTab: ticks MIDI por negra (1 pulso). Igual que `GPR_TICKS_POR_PULSO`, sin depender de gpr. */
export const ACP_TICKS_POR_PULSO = 960;

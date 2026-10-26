/** Constantes de la vista Canvas 2D (contrato: docs/firmas-aprobadas.md §8). */

/** Pulsos visibles entre el borde superior y la línea de golpe (con velocidadAutopista = 1). */
export const VC2_PULSOS_VISIBLES = 8;
/** Altura relativa (0..1) de la línea de golpe. Debajo queda la onda en vivo. */
export const VC2_Y_GOLPE_REL = 0.85;
/** Tope de partículas vivas. */
export const VC2_MAX_PARTICULAS = 300;
/** Radio base (alto/2) de una nota. */
export const VC2_RADIO_NOTA_PX = 14;

// ---------- Mástil con dedeo (Vc2VistaMastil) ----------

/** Último traste mostrado por defecto en el diagrama del mástil (y límite de búsqueda de posiciones). */
export const VC2_TRS_MAX_MASTIL = 12;
/** Notas siguientes a la esperada que se marcan (más tenues). */
export const VC2_CANT_SIGUIENTES_MASTIL = 3;
/** Opacidad de las marcas de las notas siguientes (0..1). */
export const VC2_ALFA_SIGUIENTE_MASTIL = 0.35;

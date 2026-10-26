/** Constantes de escalas (contrato: docs/firmas-aprobadas.md §6). */
import type { TEscTipoEscala } from '../core/cor_eventos';

/** Traste más alto que usa la digitación automática. */
export const ESC_TRS_MAX = 22;
/** Trastes que abarca una caja (posición): [trsInicial, trsInicial + ESC_ANCHO_CAJA − 1]. */
export const ESC_ANCHO_CAJA = 4;
export const ESC_PULSOS_POR_NOTA_DEF = 1;
export const ESC_CANT_OCT_DEF = 1;

/** Nombre visible de cada tipo de escala. */
export const ESC_NOMBRES_TIPO: Readonly<Record<TEscTipoEscala, string>> = {
  mayor: 'mayor',
  menorNatural: 'menor natural',
  pentatonicaMenor: 'pentatónica menor',
  pentatonicaMayor: 'pentatónica mayor',
};

/**
 * Constantes de la vista 3D (autopista). Unidades de mundo de Three.js.
 * Ejes: X = carriles (cuerdas), Y = altura, Z = tiempo (la línea de golpe está en z = 0;
 * las notas futuras tienen z negativo y avanzan hacia la cámara).
 */
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import type { IEjercicio } from '../../core/tipos';

/** Unidades de Z por pulso con `velocidadAutopista = 1`. */
export const V3D_UNIDADES_POR_PULSO = 4;
/** Pulsos visibles delante de la línea de golpe con `velocidadAutopista = 1`. */
export const V3D_PULSOS_VISIBLES = 12;
/** Ancho de cada carril (una cuerda). */
export const V3D_ANCHO_CARRIL = 1;
/** Tamaño del pool de instancias de notas visibles a la vez. */
export const V3D_MAX_NOTAS = 512;
export const V3D_FOV_GRADOS = 55;
/** Trastes de la regla del mástil (0..24). */
export const V3D_TRASTES_VISIBLES = 24;

/** Ancho total de los 6 carriles. */
export const V3D_ANCHO_AUTOPISTA = V3D_ANCHO_CARRIL * COR_CANT_CUERDAS;
/** Largo visible de la autopista (fijo en unidades; la velocidad cambia cuántos pulsos caben). */
export const V3D_LARGO_AUTOPISTA = V3D_UNIDADES_POR_PULSO * V3D_PULSOS_VISIBLES;
/** Unidades de autopista que se siguen dibujando detrás de la línea de golpe. */
export const V3D_MARGEN_ATRAS = 3;
/** Altura del centro de las notas sobre la autopista. */
export const V3D_Y_NOTA = 0.2;
/** Tamaño del pool de etiquetas (sprites) visibles a la vez. */
export const V3D_MAX_ETIQUETAS = 96;
export const V3D_COLOR_FONDO = '#070a14';
/** Color de notas sin cuerda (carril central). */
export const V3D_COLOR_SIN_CUERDA = '#e8ecf5';

/** Ejercicio vacío: estado inicial de ambas vistas 3D hasta recibir `'ejr:cargado'`. */
export const V3D_EJ_VACIO: Readonly<IEjercicio> = { titulo: '', bpm: 80, modo: 'flexible', notas: [] };

/** Estados de resultado por nota (arreglos `Uint8Array` de las capas de notas). */
export const V3D_ESTADO_PENDIENTE = 0;
export const V3D_ESTADO_ACIERTO = 1;
export const V3D_ESTADO_FALLO = 2;
/** Duración del destello de una nota acertada. */
export const V3D_DUR_ACIERTO_MS = 280;
export const V3D_MSJ_SIN_EJERCICIO = 'Selecciona un ejercicio para comenzar';

/** Índice de color de una nota: 0..5 = cuerdas 1..6; sin cuerda (o inválida) → 6 (`V3D_COLOR_SIN_CUERDA`). */
export function v3d_obtenerIdxColor(cur: number | undefined): number {
  return cur !== undefined && Number.isInteger(cur) && cur >= 1 && cur <= COR_CANT_CUERDAS ? cur - 1 : COR_CANT_CUERDAS;
}

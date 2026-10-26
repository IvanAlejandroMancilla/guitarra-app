/**
 * Constantes de la vista Rocksmith. Unidades de mundo de Three.js.
 * Ejes: X = trastes (cejuela en x = 0, traste 24 a la derecha; `esZurdo` espeja), Y = cuerdas
 * (6.ª arriba … 1.ª abajo, piso en y = 0), Z = tiempo (las cuerdas están en z = 0; las notas futuras
 * tienen z < 0 y avanzan hacia la cámara). Se reutilizan `V3D_TRASTES_VISIBLES`, `V3D_UNIDADES_POR_PULSO`
 * y `V3D_COLOR_SIN_CUERDA` de `v3d_constantes.ts`.
 */
import type { IV3dZonaTrastes } from './v3d_tipos';

/** Ancho de cada casilla de traste (separación entre barras). */
export const V3D_ANCHO_CASILLA = 1.4;
/** Separación vertical entre cuerdas. */
export const V3D_SEPARACION_CUERDAS = 0.28;
/** Altura de la cuerda 1 (Mi agudo, la más baja en pantalla). */
export const V3D_Y_CUERDA_1 = 0.15;
/** Ancho mínimo de la zona encuadrada, en trastes. */
export const V3D_ANCHO_ZONA_MIN = 4;
/** Pulsos hacia adelante que se miran para elegir la zona de trastes. */
export const V3D_PULSOS_ANTICIPO_ZONA = 4;
/** Constante de tiempo del seguimiento suave de la cámara (y del sombreado de la zona). */
export const V3D_CONSTANTE_CAMARA_MS = 400;
/** Distancia en Z (delante de las cuerdas) a partir de la cual aparece la línea guía de cada gema. */
export const V3D_DIST_GUIA = 16;
/** Color del sombreado de la zona activa en el piso. */
export const V3D_COLOR_ZONA = '#2a3d66';
/** Zona por defecto (sin notas con traste): primera posición. */
export const V3D_ZONA_DEF: Readonly<IV3dZonaTrastes> = { trsMin: 1, trsMax: V3D_ANCHO_ZONA_MIN };

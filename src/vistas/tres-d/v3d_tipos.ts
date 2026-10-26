/** Tipos internos de la vista 3D. */
import type { Object3D } from 'three';
import type { ICorActualizable } from '../../core/cor_contratos';

/** Capa de la escena: aporta un objeto 3D, se actualiza cada cuadro y libera sus recursos. */
export interface IV3dCapa extends ICorActualizable {
  readonly objeto: Object3D;
  /** Llama `dispose()` de geometrías, materiales y texturas propias. */
  liberar(): void;
}

/** Parámetros que dependen de la calidad gráfica elegida. */
export interface IV3dPerfilCalidad {
  pixelRatioMax: number;
  tieneAntialias: boolean;
  tieneSombras: boolean;
  maxParticulas: number;
  segmentosOnda: number;
}

/** Rango de trastes que encuadra la cámara de la vista Rocksmith (ambos inclusive, 0..24). */
export interface IV3dZonaTrastes {
  trsMin: number;
  trsMax: number;
}

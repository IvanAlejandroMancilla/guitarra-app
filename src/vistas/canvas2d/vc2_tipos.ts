/** Tipos internos de la vista Canvas 2D. */
import type { ICorCuadro } from '../../core/cor_contratos';
import type { ICorPosMastil } from '../../core/tipos';

/** Medidas en píxeles CSS (el lienzo aplica devicePixelRatio aparte). */
export interface IVc2Geometria {
  anchoPx: number;
  altoPx: number;
  yGolpePx: number;
  pxPorPulso: number;
  anchoCarrilPx: number;
  esZurdo: boolean;
}

/** Capa dibujable. `cuadro.posPulsos` es la posición visual ya resuelta por la vista. */
export interface IVc2Capa {
  dibujar(ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void;
}

/** Rango de trastes visible en el diagrama del mástil (ambos incluidos). */
export interface IVc2RangoMastil {
  trsMin: number;
  trsMax: number;
}

/**
 * Geometría del diagrama del mástil, en píxeles CSS. Una columna por traste de `trsMin` a `trsMax`;
 * con `trsMin` = 0 la primera columna es la zona "al aire", antes de la cejuela.
 * Los márgenes son simétricos (izquierda = derecha, arriba = abajo); los números de traste van en el margen inferior.
 */
export interface IVc2GeoMastil {
  anchoPx: number;
  altoPx: number;
  margenIzqPx: number;
  margenSupPx: number;
  anchoTrastePx: number;
  separacionCuerdasPx: number;
  trsMin: number;
  trsMax: number;
  /** Zurdo: trastes de derecha a izquierda. */
  esZurdo: boolean;
}

/** Marca de digitación sobre el mástil. */
export interface IVc2MarcaMastil extends ICorPosMastil {
  /** 0 = al aire, 1 índice … 4 meñique; `undefined` si la nota no trae dedo. */
  dedo: number | undefined;
  /** Nombre de la nota en la notación elegida. */
  etiqueta: string;
  /** `true` para la nota esperada; `false` para las siguientes (más tenues). */
  esPrincipal: boolean;
}

/** Capa dibujable del mástil (se dibuja solo cuando algo cambió). */
export interface IVc2CapaMastil {
  dibujar(ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil): void;
}

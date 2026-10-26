/** Perfiles de calidad gráfica de la vista 3D. */
import type { TCfgCalidad } from '../../core/tipos';
import type { IV3dPerfilCalidad } from './v3d_tipos';

export const V3D_PERFILES_CALIDAD: Readonly<Record<TCfgCalidad, IV3dPerfilCalidad>> = {
  baja: { pixelRatioMax: 1, tieneAntialias: false, tieneSombras: false, maxParticulas: 150, segmentosOnda: 128 },
  media: { pixelRatioMax: 1.5, tieneAntialias: true, tieneSombras: false, maxParticulas: 400, segmentosOnda: 256 },
  alta: { pixelRatioMax: 2, tieneAntialias: true, tieneSombras: true, maxParticulas: 1000, segmentosOnda: 512 },
};

/**
 * Texturas de texto compartidas por las vistas 3D (se dibujan una sola vez en un canvas).
 *
 * Atlas de números: cuadrícula de `ceil(sqrt(cantNumeros))` columnas; el número `n` ocupa la celda
 * `(n % columnas, floor(n / columnas))`, con la fila 0 arriba. `v3d_crearGeoCeldaAtlas` conoce esa distribución.
 */
import { CanvasTexture, PlaneGeometry, SRGBColorSpace } from 'three';

const obtenerColumnasAtlas = (cantNumeros: number): number => Math.max(1, Math.ceil(Math.sqrt(cantNumeros)));

const crearTextura = (lienzo: HTMLCanvasElement): CanvasTexture => {
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  textura.needsUpdate = true;
  return textura;
};

/** Atlas con los números `0..cantNumeros−1` en blanco con contorno oscuro (fondo transparente). */
export function v3d_crearAtlasNumeros(cantNumeros: number, tamCeldaPx: number): CanvasTexture {
  const cant = Math.max(1, Math.floor(cantNumeros));
  const columnas = obtenerColumnasAtlas(cant);
  const filas = Math.ceil(cant / columnas);
  const tam = Math.max(8, Math.floor(tamCeldaPx));
  const lienzo = document.createElement('canvas');
  lienzo.width = columnas * tam;
  lienzo.height = filas * tam;
  const ctx = lienzo.getContext('2d');
  if (ctx !== null) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.fillStyle = '#ffffff';
    for (let n = 0; n < cant; n++) {
      const texto = String(n);
      // Los números de dos cifras se achican para que entren en la celda.
      const tamFuentePx = texto.length > 1 ? tam * 0.62 : tam * 0.78;
      ctx.font = `bold ${tamFuentePx}px system-ui, sans-serif`;
      ctx.lineWidth = Math.max(2, tam / 12);
      const xPx = (n % columnas) * tam + tam / 2;
      const yPx = Math.floor(n / columnas) * tam + tam / 2 + tam * 0.04;
      ctx.strokeText(texto, xPx, yPx);
      ctx.fillText(texto, xPx, yPx);
    }
  }
  return crearTextura(lienzo);
}

/**
 * Plano `ancho × alto` (en el plano XY, mirando a +Z) cuyas UV apuntan a la celda `idxCelda`
 * de un atlas creado con `v3d_crearAtlasNumeros(cantNumeros, …)`.
 */
export function v3d_crearGeoCeldaAtlas(idxCelda: number, cantNumeros: number, ancho: number, alto: number): PlaneGeometry {
  const cant = Math.max(1, Math.floor(cantNumeros));
  const columnas = obtenerColumnasAtlas(cant);
  const filas = Math.ceil(cant / columnas);
  const idx = Math.min(Math.max(Math.round(idxCelda), 0), cant - 1);
  const col = idx % columnas;
  const fila = Math.floor(idx / columnas);
  const geo = new PlaneGeometry(ancho, alto);
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) {
    // `flipY` de la textura: v = 1 es el borde superior del canvas.
    uv.setXY(i, (col + uv.getX(i)) / columnas, 1 - (fila + 1 - uv.getY(i)) / filas);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Textura `anchoPx × altoPx` con el texto centrado (negrita, contorno oscuro) sobre fondo transparente. */
export function v3d_crearTexturaTexto(texto: string, anchoPx: number, altoPx: number, color: string): CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.max(1, Math.floor(anchoPx));
  lienzo.height = Math.max(1, Math.floor(altoPx));
  const ctx = lienzo.getContext('2d');
  if (ctx !== null) {
    let tamFuentePx = lienzo.height * 0.62;
    ctx.font = `bold ${tamFuentePx}px system-ui, sans-serif`;
    // Achica la fuente si el texto no entra a lo ancho.
    const anchoTextoPx = ctx.measureText(texto).width;
    const anchoUtilPx = lienzo.width * 0.94;
    if (anchoTextoPx > anchoUtilPx) {
      tamFuentePx *= anchoUtilPx / anchoTextoPx;
      ctx.font = `bold ${tamFuentePx}px system-ui, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, tamFuentePx / 7);
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(texto, lienzo.width / 2, lienzo.height / 2);
    ctx.fillStyle = color;
    ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2);
  }
  return crearTextura(lienzo);
}

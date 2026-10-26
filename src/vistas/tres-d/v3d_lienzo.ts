/**
 * Lienzo común de las vistas 3D. No importa `three`: solo crea el `<canvas>` accesible
 * que ocupa todo el contenedor (el tamaño en píxeles lo fija el renderer).
 */

/** Crea un `<canvas>` al 100 % del contenedor, con rol de imagen y la etiqueta accesible dada, y lo agrega. */
export function v3d_crearLienzo(contenedor: HTMLElement, etiquetaAccesible: string): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.className = 'v3d-lienzo';
  lienzo.style.display = 'block';
  lienzo.style.width = '100%';
  lienzo.style.height = '100%';
  lienzo.setAttribute('role', 'img');
  lienzo.setAttribute('aria-label', etiquetaAccesible);
  contenedor.appendChild(lienzo);
  return lienzo;
}

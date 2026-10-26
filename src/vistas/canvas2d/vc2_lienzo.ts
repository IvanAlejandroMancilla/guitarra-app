/**
 * Lienzo compartido por las vistas 2D: crea el `<canvas>` a pantalla completa del
 * contenedor, sigue su tamaño con `ResizeObserver` y aplica `devicePixelRatio`.
 */
const VC2_DPR_MAX = 2;

export class Vc2Lienzo {
  #lienzo: HTMLCanvasElement | null = null;
  #ctx: CanvasRenderingContext2D | null = null;
  #observador: ResizeObserver | null = null;
  #dpr = 1;
  #anchoPx = 0;
  #altoPx = 0;

  /** Monta el lienzo; `alRedimensionar` recibe el tamaño en píxeles CSS (también al montar). */
  montar(contenedor: HTMLElement, alRedimensionar: (anchoPx: number, altoPx: number) => void): void {
    this.desmontar();
    const lienzo = document.createElement('canvas');
    lienzo.style.display = 'block';
    lienzo.style.width = '100%';
    lienzo.style.height = '100%';
    lienzo.style.background = '#05070d';
    lienzo.setAttribute('aria-label', 'Autopista de notas');
    contenedor.appendChild(lienzo);
    this.#lienzo = lienzo;
    this.#ctx = lienzo.getContext('2d', { alpha: false });
    if (typeof ResizeObserver !== 'undefined') {
      this.#observador = new ResizeObserver((entradas) => {
        const caja = entradas[0]?.contentRect;
        if (caja !== undefined) alRedimensionar(caja.width, caja.height);
      });
      this.#observador.observe(contenedor);
    }
    const caja = contenedor.getBoundingClientRect();
    alRedimensionar(caja.width, caja.height);
  }

  /** Ajusta la resolución interna. Devuelve `true` si cambió. */
  redimensionar(anchoPx: number, altoPx: number): boolean {
    const lienzo = this.#lienzo;
    if (lienzo === null) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, VC2_DPR_MAX);
    const esIgual = anchoPx === this.#anchoPx && altoPx === this.#altoPx && dpr === this.#dpr;
    if (esIgual) return false;
    this.#dpr = dpr;
    this.#anchoPx = Math.max(1, anchoPx);
    this.#altoPx = Math.max(1, altoPx);
    lienzo.width = Math.round(this.#anchoPx * dpr);
    lienzo.height = Math.round(this.#altoPx * dpr);
    return true;
  }

  /** Contexto listo para dibujar en píxeles CSS (transformación con dpr aplicada); `null` si no está montado. */
  obtenerCtx(): CanvasRenderingContext2D | null {
    const ctx = this.#ctx;
    if (ctx === null) return null;
    ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return ctx;
  }

  esMontado(): boolean {
    return this.#lienzo !== null;
  }

  desmontar(): void {
    this.#observador?.disconnect();
    this.#observador = null;
    this.#lienzo?.remove();
    this.#lienzo = null;
    this.#ctx = null;
    this.#anchoPx = 0;
    this.#altoPx = 0;
  }
}

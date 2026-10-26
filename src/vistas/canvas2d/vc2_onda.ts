/** Onda en vivo en la franja inferior (debajo de `geo.yGolpePx`), con disparo en cruce por cero. */
import type { ICorCuadro } from '../../core/cor_contratos';
import { VC2_RADIO_NOTA_PX } from './vc2_constantes';
import type { IVc2Capa, IVc2Geometria } from './vc2_tipos';

const VC2_COLOR_ONDA = '#4de1ff';

export class Vc2Onda implements IVc2Capa {
  #muestras = new Float32Array(0);
  #tieneMuestras = false;
  #color = VC2_COLOR_ONDA;

  /** Copia las muestras (el buffer de `'aud:onda'` se reutiliza). */
  fijarMuestras(muestras: Float32Array): void {
    if (this.#muestras.length !== muestras.length) this.#muestras = new Float32Array(muestras.length);
    this.#muestras.set(muestras);
    this.#tieneMuestras = true;
  }

  fijarColor(color: string): void {
    this.#color = color;
  }

  dibujar(ctx: CanvasRenderingContext2D, _cuadro: ICorCuadro, geo: IVc2Geometria): void {
    const margenSup = VC2_RADIO_NOTA_PX * 1.4 + 18;
    const arriba = geo.yGolpePx + margenSup;
    const abajo = geo.altoPx - 6;
    const alto = abajo - arriba;
    if (alto < 12) return;
    const centro = arriba + alto / 2;
    const izquierda = geo.anchoPx * 0.04;
    const ancho = geo.anchoPx * 0.92;

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = this.#color;
    ctx.fillRect(izquierda, centro - 0.5, ancho, 1);
    ctx.globalAlpha = 1;

    const muestras = this.#muestras;
    const cant = muestras.length;
    if (!this.#tieneMuestras || cant < 4) return;

    // Disparo: primer cruce ascendente por cero en la primera mitad, para que la onda no "baile".
    const ventana = Math.floor(cant / 2);
    let inicio = 0;
    for (let i = 1; i < ventana; i++) {
      if ((muestras[i - 1] ?? 0) < 0 && (muestras[i] ?? 0) >= 0) {
        inicio = i;
        break;
      }
    }
    let pico = 0;
    for (let i = inicio; i < inicio + ventana; i++) pico = Math.max(pico, Math.abs(muestras[i] ?? 0));
    const ganancia = Math.min(Math.max(0.9 / Math.max(pico, 1e-6), 1), 8);
    const mitadAlto = alto / 2;

    ctx.beginPath();
    const pasoPx = 2;
    for (let xRel = 0; xRel <= ancho; xRel += pasoPx) {
      const idx = inicio + Math.floor((xRel / ancho) * (ventana - 1));
      const yPx = centro - (muestras[idx] ?? 0) * ganancia * mitadAlto;
      if (xRel === 0) ctx.moveTo(izquierda + xRel, yPx);
      else ctx.lineTo(izquierda + xRel, yPx);
    }
    ctx.strokeStyle = this.#color;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

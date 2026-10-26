/** Partículas y ondas expansivas de acierto (estructura de arreglos, sin asignaciones por cuadro). */
import type { ICorCuadro } from '../../core/cor_contratos';
import { VC2_MAX_PARTICULAS } from './vc2_constantes';
import type { IVc2Capa } from './vc2_tipos';

const VC2_PTC_POR_EXPLOSION = 30;
const VC2_GRAVEDAD_PX_MS2 = 0.0009;
const VC2_MAX_ANILLOS = 16;
const VC2_VIDA_ANILLO_MS = 380;

export class Vc2Particulas implements IVc2Capa {
  readonly #xPx = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #yPx = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #velX = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #velY = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #vidaMs = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #vidaMaxMs = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #tamPx = new Float32Array(VC2_MAX_PARTICULAS);
  readonly #colores: string[] = new Array<string>(VC2_MAX_PARTICULAS).fill('#ffffff');
  #cantPtc = 0;

  readonly #anilloX = new Float32Array(VC2_MAX_ANILLOS);
  readonly #anilloY = new Float32Array(VC2_MAX_ANILLOS);
  readonly #anilloEdadMs = new Float32Array(VC2_MAX_ANILLOS).fill(VC2_VIDA_ANILLO_MS);
  readonly #anilloColores: string[] = new Array<string>(VC2_MAX_ANILLOS).fill('#ffffff');
  #idxAnilloSig = 0;

  crearExplosion(xPx: number, yPx: number, color: string): void {
    for (let k = 0; k < VC2_PTC_POR_EXPLOSION && this.#cantPtc < VC2_MAX_PARTICULAS; k++) {
      const idx = this.#cantPtc++;
      const angulo = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const velocidad = 0.12 + Math.random() * 0.45;
      this.#xPx[idx] = xPx;
      this.#yPx[idx] = yPx;
      this.#velX[idx] = Math.cos(angulo) * velocidad;
      this.#velY[idx] = Math.sin(angulo) * velocidad;
      const vida = 450 + Math.random() * 450;
      this.#vidaMs[idx] = vida;
      this.#vidaMaxMs[idx] = vida;
      this.#tamPx[idx] = 1.5 + Math.random() * 2.5;
      this.#colores[idx] = Math.random() < 0.25 ? '#ffffff' : color;
    }
    const idxAnillo = this.#idxAnilloSig;
    this.#idxAnilloSig = (this.#idxAnilloSig + 1) % VC2_MAX_ANILLOS;
    this.#anilloX[idxAnillo] = xPx;
    this.#anilloY[idxAnillo] = yPx;
    this.#anilloEdadMs[idxAnillo] = 0;
    this.#anilloColores[idxAnillo] = color;
  }

  dibujar(ctx: CanvasRenderingContext2D, cuadro: ICorCuadro): void {
    const deltaMs = cuadro.deltaMs;
    ctx.globalCompositeOperation = 'lighter';

    for (let idx = 0; idx < VC2_MAX_ANILLOS; idx++) {
      const edad = (this.#anilloEdadMs[idx] ?? VC2_VIDA_ANILLO_MS) + deltaMs;
      this.#anilloEdadMs[idx] = edad;
      if (edad >= VC2_VIDA_ANILLO_MS) continue;
      const rel = edad / VC2_VIDA_ANILLO_MS;
      ctx.globalAlpha = 1 - rel;
      ctx.strokeStyle = this.#anilloColores[idx] ?? '#ffffff';
      ctx.lineWidth = 4 * (1 - rel) + 1;
      ctx.beginPath();
      ctx.arc(this.#anilloX[idx] ?? 0, this.#anilloY[idx] ?? 0, 12 + rel * 46, 0, Math.PI * 2);
      ctx.stroke();
    }

    let idx = 0;
    while (idx < this.#cantPtc) {
      const vida = (this.#vidaMs[idx] ?? 0) - deltaMs;
      if (vida <= 0) {
        this.#quitarParticula(idx);
        continue;
      }
      this.#vidaMs[idx] = vida;
      const velY = (this.#velY[idx] ?? 0) + VC2_GRAVEDAD_PX_MS2 * deltaMs;
      this.#velY[idx] = velY;
      const xPx = (this.#xPx[idx] ?? 0) + (this.#velX[idx] ?? 0) * deltaMs;
      const yPx = (this.#yPx[idx] ?? 0) + velY * deltaMs;
      this.#xPx[idx] = xPx;
      this.#yPx[idx] = yPx;
      const tam = this.#tamPx[idx] ?? 2;
      ctx.globalAlpha = vida / (this.#vidaMaxMs[idx] ?? vida);
      ctx.fillStyle = this.#colores[idx] ?? '#ffffff';
      ctx.fillRect(xPx - tam / 2, yPx - tam / 2, tam, tam);
      idx++;
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Quita la partícula `idx` moviendo la última a su lugar. */
  readonly #quitarParticula = (idx: number): void => {
    const ultima = --this.#cantPtc;
    this.#xPx[idx] = this.#xPx[ultima] ?? 0;
    this.#yPx[idx] = this.#yPx[ultima] ?? 0;
    this.#velX[idx] = this.#velX[ultima] ?? 0;
    this.#velY[idx] = this.#velY[ultima] ?? 0;
    this.#vidaMs[idx] = this.#vidaMs[ultima] ?? 0;
    this.#vidaMaxMs[idx] = this.#vidaMaxMs[ultima] ?? 1;
    this.#tamPx[idx] = this.#tamPx[ultima] ?? 2;
    this.#colores[idx] = this.#colores[ultima] ?? '#ffffff';
  };
}

/**
 * Partículas de explosión (acierto) con `Points` y un pool circular de `perfil.maxParticulas`.
 * Mezcla aditiva: una partícula "muerta" tiene color negro y no aporta luz.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DynamicDrawUsage,
  Points,
  PointsMaterial,
  SRGBColorSpace,
} from 'three';
import type { ICorCuadro } from '../../core/cor_contratos';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

const V3D_VIDA_PTC_MS = 650;
const V3D_GRAVEDAD = -9;
const V3D_PTC_POR_EXPLOSION_MAX = 48;

/** Textura de punto suave (degradado radial), creada una sola vez por capa. */
const crearTexturaPunto = (): CanvasTexture => {
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  if (ctx !== null) {
    const degradado = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    degradado.addColorStop(0, 'rgba(255,255,255,1)');
    degradado.addColorStop(0.35, 'rgba(255,255,255,0.65)');
    degradado.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, 64, 64);
  }
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  return textura;
};

export class V3dParticulas implements IV3dCapa {
  readonly objeto: Points;
  readonly #geo = new BufferGeometry();
  readonly #mat: PointsMaterial;
  readonly #textura: CanvasTexture;
  readonly #cantMax: number;
  readonly #posiciones: Float32Array;
  readonly #colores: Float32Array;
  readonly #velocidades: Float32Array;
  readonly #coloresBase: Float32Array;
  /** Vida restante en ms (≤ 0 = libre). */
  readonly #vidas: Float32Array;
  readonly #attrPos: BufferAttribute;
  readonly #attrColor: BufferAttribute;
  readonly #auxColor = new Color();
  #idxSig = 0;
  #cantVivas = 0;

  constructor(perfil: IV3dPerfilCalidad) {
    this.#cantMax = Math.max(1, Math.floor(perfil.maxParticulas));
    this.#posiciones = new Float32Array(this.#cantMax * 3);
    this.#colores = new Float32Array(this.#cantMax * 3);
    this.#velocidades = new Float32Array(this.#cantMax * 3);
    this.#coloresBase = new Float32Array(this.#cantMax * 3);
    this.#vidas = new Float32Array(this.#cantMax);
    this.#attrPos = new BufferAttribute(this.#posiciones, 3).setUsage(DynamicDrawUsage);
    this.#attrColor = new BufferAttribute(this.#colores, 3).setUsage(DynamicDrawUsage);
    this.#geo.setAttribute('position', this.#attrPos);
    this.#geo.setAttribute('color', this.#attrColor);
    this.#textura = crearTexturaPunto();
    this.#mat = new PointsMaterial({
      size: 0.22,
      map: this.#textura,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    this.objeto = new Points(this.#geo, this.#mat);
    this.objeto.frustumCulled = false;
  }

  /** Lanza una explosión en (x, y, z) del color dado (`'#rrggbb'`). */
  crearExplosion(x: number, y: number, z: number, color: string): void {
    this.#auxColor.set(color);
    const cant = Math.min(V3D_PTC_POR_EXPLOSION_MAX, Math.max(8, Math.floor(this.#cantMax / 6)));
    for (let k = 0; k < cant; k++) {
      const i = this.#idxSig;
      this.#idxSig = (this.#idxSig + 1) % this.#cantMax;
      const angulo = Math.random() * Math.PI * 2;
      const radial = 1.2 + Math.random() * 2.2;
      const i3 = i * 3;
      this.#posiciones[i3] = x;
      this.#posiciones[i3 + 1] = y;
      this.#posiciones[i3 + 2] = z;
      this.#velocidades[i3] = Math.cos(angulo) * radial;
      this.#velocidades[i3 + 1] = 2.5 + Math.random() * 3;
      this.#velocidades[i3 + 2] = Math.sin(angulo) * radial * 0.6;
      // Mezcla leve con blanco para un núcleo más brillante.
      const mezcla = Math.random() * 0.4;
      this.#coloresBase[i3] = this.#auxColor.r + (1 - this.#auxColor.r) * mezcla;
      this.#coloresBase[i3 + 1] = this.#auxColor.g + (1 - this.#auxColor.g) * mezcla;
      this.#coloresBase[i3 + 2] = this.#auxColor.b + (1 - this.#auxColor.b) * mezcla;
      this.#vidas[i] = V3D_VIDA_PTC_MS * (0.6 + Math.random() * 0.4);
    }
    this.#cantVivas = this.#cantMax;
  }

  actualizar(cuadro: ICorCuadro): void {
    if (this.#cantVivas === 0) return;
    const dtSeg = cuadro.deltaMs / 1000;
    let vivas = 0;
    for (let i = 0; i < this.#cantMax; i++) {
      const vida = this.#vidas[i] ?? 0;
      const i3 = i * 3;
      if (vida <= 0) {
        this.#colores[i3] = 0;
        this.#colores[i3 + 1] = 0;
        this.#colores[i3 + 2] = 0;
        continue;
      }
      vivas++;
      const vidaSig = vida - cuadro.deltaMs;
      this.#vidas[i] = vidaSig;
      const vy = (this.#velocidades[i3 + 1] ?? 0) + V3D_GRAVEDAD * dtSeg;
      this.#velocidades[i3 + 1] = vy;
      this.#posiciones[i3] = (this.#posiciones[i3] ?? 0) + (this.#velocidades[i3] ?? 0) * dtSeg;
      this.#posiciones[i3 + 1] = Math.max(0.02, (this.#posiciones[i3 + 1] ?? 0) + vy * dtSeg);
      this.#posiciones[i3 + 2] = (this.#posiciones[i3 + 2] ?? 0) + (this.#velocidades[i3 + 2] ?? 0) * dtSeg;
      const brillo = Math.max(vidaSig / V3D_VIDA_PTC_MS, 0);
      this.#colores[i3] = (this.#coloresBase[i3] ?? 0) * brillo;
      this.#colores[i3 + 1] = (this.#coloresBase[i3 + 1] ?? 0) * brillo;
      this.#colores[i3 + 2] = (this.#coloresBase[i3 + 2] ?? 0) * brillo;
    }
    this.#cantVivas = vivas;
    this.#attrPos.needsUpdate = true;
    this.#attrColor.needsUpdate = true;
  }

  liberar(): void {
    this.#geo.dispose();
    this.#mat.dispose();
    this.#textura.dispose();
  }
}

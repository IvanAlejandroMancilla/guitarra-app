/**
 * Cinta de onda en vivo (osciloscopio) suspendida sobre el horizonte de la autopista.
 * Recibe las muestras de `'aud:onda'` y las remuestrea a `perfil.segmentosOnda` puntos
 * en un buffer propio (el del evento se reutiliza, así que se copia de inmediato).
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { V3D_LARGO_AUTOPISTA } from './v3d_constantes';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

const V3D_ANCHO_ONDA = 22;
const V3D_AMPLITUD_ONDA = 2.2;
const V3D_GROSOR_ONDA = 0.09;
/** Ganancia visual: una guitarra limpia rara vez pasa de ±0.3. */
const V3D_GAN_ONDA = 3;
/** Factor de caída por cuadro cuando no llegan muestras nuevas. */
const V3D_CAIDA_ONDA = 0.9;

export class V3dCintaOnda implements IV3dCapa {
  readonly objeto: Mesh;
  readonly #geo = new BufferGeometry();
  readonly #mat = new MeshBasicMaterial({
    color: '#4fd6ff',
    transparent: true,
    opacity: 0.75,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    fog: false,
  });
  readonly #cantPuntos: number;
  readonly #valores: Float32Array;
  readonly #posiciones: Float32Array;
  readonly #attrPos: BufferAttribute;
  #tieneMuestrasNuevas = false;

  constructor(perfil: IV3dPerfilCalidad) {
    this.#cantPuntos = Math.max(2, Math.floor(perfil.segmentosOnda) + 1);
    this.#valores = new Float32Array(this.#cantPuntos);
    this.#posiciones = new Float32Array(this.#cantPuntos * 2 * 3);
    const indices = new Uint32Array((this.#cantPuntos - 1) * 6);
    for (let i = 0; i < this.#cantPuntos - 1; i++) {
      const sup = i * 2;
      const base = i * 6;
      indices[base] = sup;
      indices[base + 1] = sup + 1;
      indices[base + 2] = sup + 2;
      indices[base + 3] = sup + 1;
      indices[base + 4] = sup + 3;
      indices[base + 5] = sup + 2;
    }
    this.#attrPos = new BufferAttribute(this.#posiciones, 3).setUsage(DynamicDrawUsage);
    this.#geo.setAttribute('position', this.#attrPos);
    this.#geo.setIndex(new BufferAttribute(indices, 1));
    this.#escribirVertices();
    this.objeto = new Mesh(this.#geo, this.#mat);
    this.objeto.position.set(0, 6, -V3D_LARGO_AUTOPISTA * 0.95);
    this.objeto.frustumCulled = false;
  }

  /** Copia (remuestreando) las muestras −1..1 del analizador. */
  fijarMuestras(muestras: Float32Array): void {
    const cantMuestras = muestras.length;
    if (cantMuestras === 0) return;
    for (let i = 0; i < this.#cantPuntos; i++) {
      const idx = Math.floor((i / (this.#cantPuntos - 1)) * (cantMuestras - 1));
      const valor = (muestras[idx] ?? 0) * V3D_GAN_ONDA;
      this.#valores[i] = Math.min(Math.max(valor, -1), 1);
    }
    this.#tieneMuestrasNuevas = true;
  }

  actualizar(): void {
    if (!this.#tieneMuestrasNuevas) {
      for (let i = 0; i < this.#cantPuntos; i++) this.#valores[i] = (this.#valores[i] ?? 0) * V3D_CAIDA_ONDA;
    }
    this.#tieneMuestrasNuevas = false;
    this.#escribirVertices();
    this.#attrPos.needsUpdate = true;
  }

  liberar(): void {
    this.#geo.dispose();
    this.#mat.dispose();
  }

  #escribirVertices(): void {
    for (let i = 0; i < this.#cantPuntos; i++) {
      const x = (i / (this.#cantPuntos - 1) - 0.5) * V3D_ANCHO_ONDA;
      // Atenúa los extremos para que la cinta "nazca" del horizonte.
      const ventana = Math.sin((i / (this.#cantPuntos - 1)) * Math.PI);
      const y = (this.#valores[i] ?? 0) * V3D_AMPLITUD_ONDA * ventana;
      const base = i * 6;
      this.#posiciones[base] = x;
      this.#posiciones[base + 1] = y + V3D_GROSOR_ONDA;
      this.#posiciones[base + 2] = 0;
      this.#posiciones[base + 3] = x;
      this.#posiciones[base + 4] = y - V3D_GROSOR_ONDA;
      this.#posiciones[base + 5] = 0;
    }
  }
}

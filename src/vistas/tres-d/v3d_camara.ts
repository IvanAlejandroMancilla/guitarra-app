/** Cámara en perspectiva oblicua que mira la autopista alejándose. */
import { PerspectiveCamera } from 'three';
import type { ICorActualizable, ICorCuadro } from '../../core/cor_contratos';
import { V3D_FOV_GRADOS, V3D_LARGO_AUTOPISTA } from './v3d_constantes';

/** Posición base (aspecto ≥ 1.2) y punto de mira. */
const V3D_POS_CAMARA = { x: 0, y: 5, z: 7 } as const;
const V3D_MIRA_CAMARA = { x: 0, y: 0, z: -8 } as const;
/** Por debajo de este aspecto la cámara retrocede para que entren los 6 carriles. */
const V3D_ASPECTO_REF = 1.2;
const V3D_ALEJAMIENTO_MAX = 2.4;

export class V3dCamara implements ICorActualizable {
  readonly #camara = new PerspectiveCamera(V3D_FOV_GRADOS, 16 / 9, 0.1, V3D_LARGO_AUTOPISTA * 2.5);
  #alejamiento = 1;
  #relojMs = 0;

  constructor() {
    this.#colocar(0);
  }

  obtenerCamara(): PerspectiveCamera {
    return this.#camara;
  }

  redimensionar(aspecto: number): void {
    if (!Number.isFinite(aspecto) || aspecto <= 0) return;
    this.#camara.aspect = aspecto;
    this.#alejamiento = Math.min(Math.max(V3D_ASPECTO_REF / aspecto, 1), V3D_ALEJAMIENTO_MAX);
    this.#camara.updateProjectionMatrix();
    this.#colocar(this.#relojMs);
  }

  /** Balanceo muy leve para que la escena no se vea estática. */
  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    this.#colocar(this.#relojMs);
  }

  #colocar(relojMs: number): void {
    const balanceo = Math.sin(relojMs / 2600) * 0.08;
    const factor = this.#alejamiento;
    this.#camara.position.set(
      V3D_POS_CAMARA.x + balanceo,
      V3D_POS_CAMARA.y * (1 + (factor - 1) * 0.6),
      V3D_POS_CAMARA.z * factor,
    );
    this.#camara.lookAt(V3D_MIRA_CAMARA.x, V3D_MIRA_CAMARA.y, V3D_MIRA_CAMARA.z);
  }
}

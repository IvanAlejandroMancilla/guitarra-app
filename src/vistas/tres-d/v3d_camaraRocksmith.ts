/**
 * Cámara de la vista Rocksmith: en perspectiva, delante de las cuerdas y algo por encima, mirando hacia
 * el fondo (de donde vienen las notas). Se desplaza suavemente en X para encuadrar la zona de trastes
 * y se aleja si la zona (o una ventana angosta) no entra a lo ancho.
 */
import { PerspectiveCamera } from 'three';
import type { ICorActualizable, ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { V3D_FOV_GRADOS, V3D_LARGO_AUTOPISTA } from './v3d_constantes';
import { V3D_ANCHO_CASILLA, V3D_CONSTANTE_CAMARA_MS, V3D_ZONA_DEF } from './v3d_constantesRocksmith';
import { v3d_calcularXZona, v3d_suavizarValor } from './v3d_geometriaRocksmith';
import type { IV3dZonaTrastes } from './v3d_tipos';

/** Posición respecto del centro de la zona (x) y punto de mira (con alejamiento 1). */
const V3D_POS_CAMARA = { y: 3.6, z: 5.5 } as const;
const V3D_MIRA_CAMARA = { y: 0, z: -9 } as const;
const V3D_ALEJAMIENTO_MAX = 2.4;
/** Casillas de margen a cada lado de la zona que también deben verse. */
const V3D_MARGEN_ZONA_CASILLAS = 1;

export class V3dCamaraRocksmith implements ICorActualizable {
  readonly #camara = new PerspectiveCamera(V3D_FOV_GRADOS, 16 / 9, 0.1, V3D_LARGO_AUTOPISTA * 2.5);
  readonly #esZurdo: boolean;
  #xAct: number;
  #xObjetivo: number;
  #anchoZona: number;
  #alejamientoAct = 1;
  #alejamientoObjetivo = 1;

  constructor(opc: ICorOpcionesVista) {
    this.#esZurdo = opc.esZurdo;
    this.#xObjetivo = v3d_calcularXZona(V3D_ZONA_DEF, this.#esZurdo);
    this.#xAct = this.#xObjetivo;
    this.#anchoZona = (V3D_ZONA_DEF.trsMax - V3D_ZONA_DEF.trsMin + 1) * V3D_ANCHO_CASILLA;
    this.#calcularAlejamientoObjetivo();
    this.#alejamientoAct = this.#alejamientoObjetivo;
    this.#colocar();
  }

  obtenerCamara(): PerspectiveCamera {
    return this.#camara;
  }

  redimensionar(aspecto: number): void {
    if (!Number.isFinite(aspecto) || aspecto <= 0) return;
    this.#camara.aspect = aspecto;
    this.#camara.updateProjectionMatrix();
    this.#calcularAlejamientoObjetivo();
    // Al redimensionar se encuadra de inmediato (no se anima).
    this.#alejamientoAct = this.#alejamientoObjetivo;
    this.#colocar();
  }

  /** Nueva zona a encuadrar; `null` mantiene la actual. */
  fijarZona(zona: IV3dZonaTrastes | null): void {
    if (zona === null) return;
    this.#xObjetivo = v3d_calcularXZona(zona, this.#esZurdo);
    this.#anchoZona = (Math.max(zona.trsMax - zona.trsMin, 0) + 1) * V3D_ANCHO_CASILLA;
    this.#calcularAlejamientoObjetivo();
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#xAct = v3d_suavizarValor(this.#xAct, this.#xObjetivo, cuadro.deltaMs, V3D_CONSTANTE_CAMARA_MS);
    this.#alejamientoAct = v3d_suavizarValor(
      this.#alejamientoAct,
      this.#alejamientoObjetivo,
      cuadro.deltaMs,
      V3D_CONSTANTE_CAMARA_MS,
    );
    this.#colocar();
  }

  /** Alejamiento para que la zona más sus márgenes entre a lo ancho en el plano de las cuerdas. */
  #calcularAlejamientoObjetivo(): void {
    const distBase = Math.hypot(V3D_POS_CAMARA.y, V3D_POS_CAMARA.z);
    const tanMitadVertical = Math.tan((V3D_FOV_GRADOS * Math.PI) / 360);
    const mitadVisible = distBase * tanMitadVertical * this.#camara.aspect;
    const mitadNecesaria = this.#anchoZona / 2 + V3D_MARGEN_ZONA_CASILLAS * V3D_ANCHO_CASILLA;
    const factor = mitadVisible > 0 ? mitadNecesaria / mitadVisible : V3D_ALEJAMIENTO_MAX;
    this.#alejamientoObjetivo = Math.min(Math.max(factor, 1), V3D_ALEJAMIENTO_MAX);
  }

  #colocar(): void {
    const factor = this.#alejamientoAct;
    this.#camara.position.set(this.#xAct, V3D_POS_CAMARA.y * factor, V3D_POS_CAMARA.z * factor);
    this.#camara.lookAt(this.#xAct, V3D_MIRA_CAMARA.y, V3D_MIRA_CAMARA.z);
  }
}

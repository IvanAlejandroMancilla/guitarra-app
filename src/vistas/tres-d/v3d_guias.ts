/**
 * Líneas guía de la vista Rocksmith: cuando una gema está a menos de `V3D_DIST_GUIA` de las cuerdas,
 * una línea vertical del color de su cuerda baja desde la gema hasta el piso (y = 0), marcando sobre
 * qué casilla de traste va a caer; se intensifica al acercarse. Mezcla aditiva (negro = invisible).
 */
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import type { IEjercicio, INota } from '../../core/tipos';
import { V3D_MAX_NOTAS } from './v3d_constantes';
import { V3D_DIST_GUIA } from './v3d_constantesRocksmith';
import {
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_obtenerIdxPrimeraNota,
  v3d_ordenarNotas,
} from './v3d_geometria';
import { v3d_calcularXCasilla, v3d_calcularYCuerda, v3d_validarPosMastil } from './v3d_geometriaRocksmith';
import type { IV3dCapa } from './v3d_tipos';

const V3D_GROSOR_GUIA = 0.03;

export class V3dGuias implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  /** Alto 1 con la base en y = 0: cada instancia se escala a la altura de su cuerda. */
  readonly #geo = new BoxGeometry(V3D_GROSOR_GUIA, 1, V3D_GROSOR_GUIA);
  readonly #mat = new MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  readonly #malla: InstancedMesh;
  readonly #coloresCuerda: Color[];
  readonly #colorNegro = new Color('#000000');
  readonly #auxColor = new Color();
  readonly #auxObj = new Object3D();
  #notas: readonly INota[] = [];
  #orden = new Uint32Array(0);

  constructor(opc: ICorOpcionesVista) {
    this.#opc = { ...opc };
    this.#geo.translate(0, 0.5, 0);
    this.#coloresCuerda = COR_COLORES_CUERDA.map((hex) => new Color(hex));
    this.#malla = new InstancedMesh(this.#geo, this.#mat, V3D_MAX_NOTAS);
    this.#malla.instanceMatrix.setUsage(DynamicDrawUsage);
    this.#malla.frustumCulled = false;
    for (let i = 0; i < V3D_MAX_NOTAS; i++) this.#malla.setColorAt(i, this.#colorNegro);
    this.#malla.count = 0;
    this.#malla.visible = false;
    this.objeto.add(this.#malla);
  }

  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    this.#orden = v3d_ordenarNotas(ej.notas);
  }

  actualizar(cuadro: ICorCuadro): void {
    const vel = this.#opc.velocidadAutopista;
    const esZurdo = this.#opc.esZurdo;
    const pos = cuadro.posPulsos;
    const finPulsos = pos + v3d_convertirUnidadesAPulsos(V3D_DIST_GUIA, vel);
    let cant = 0;
    let idxOrden = v3d_obtenerIdxPrimeraNota(this.#notas, this.#orden, pos);
    for (; idxOrden < this.#orden.length && cant < V3D_MAX_NOTAS; idxOrden++) {
      const nota = this.#notas[this.#orden[idxOrden] ?? 0];
      if (nota === undefined) continue;
      if (nota.tiempo > finPulsos) break;
      if (!v3d_validarPosMastil(nota)) continue;
      const z = v3d_calcularZNota(nota.tiempo, pos, vel);
      const cercania = 1 - Math.min(Math.max(-z / V3D_DIST_GUIA, 0), 1);
      if (cercania <= 0) continue;
      const colorCuerda = this.#coloresCuerda[nota.cur - 1] ?? this.#colorNegro;
      // Aditivo: escalar el color equivale a bajar la opacidad.
      this.#auxColor.copy(colorCuerda).multiplyScalar(0.25 + 0.75 * cercania * cercania);
      this.#auxObj.position.set(v3d_calcularXCasilla(nota.trs, esZurdo), 0, z);
      this.#auxObj.scale.set(1, v3d_calcularYCuerda(nota.cur), 1);
      this.#auxObj.updateMatrix();
      this.#malla.setMatrixAt(cant, this.#auxObj.matrix);
      this.#malla.setColorAt(cant, this.#auxColor);
      cant++;
    }
    this.#malla.count = cant;
    this.#malla.visible = cant > 0;
    if (cant === 0) return;
    this.#malla.instanceMatrix.needsUpdate = true;
    if (this.#malla.instanceColor !== null) this.#malla.instanceColor.needsUpdate = true;
  }

  liberar(): void {
    this.#malla.dispose();
    this.#geo.dispose();
    this.#mat.dispose();
    this.objeto.clear();
  }
}

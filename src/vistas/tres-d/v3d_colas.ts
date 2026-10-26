/**
 * Colas de sostenido de la vista Rocksmith: cinta del color de la cuerda que sale de la gema hacia el fondo
 * y mide `dur` pulsos. Al acertar, la parte que ya cruzó las cuerdas desaparece (se "consume") y el resto
 * brilla; al fallar, la cola se vuelve roja y sigue de largo. Pool `InstancedMesh` de `V3D_MAX_NOTAS`.
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
import { COR_COLOR_FALLO, COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import type { IEjercicio, INota } from '../../core/tipos';
import {
  V3D_ESTADO_ACIERTO,
  V3D_ESTADO_FALLO,
  V3D_ESTADO_PENDIENTE,
  V3D_MARGEN_ATRAS,
  V3D_MAX_NOTAS,
} from './v3d_constantes';
import {
  v3d_calcularPulsosVisibles,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_obtenerIdxPrimeraNota,
  v3d_ordenarNotas,
} from './v3d_geometria';
import { v3d_calcularXCasilla, v3d_calcularYCuerda, v3d_validarPosMastil } from './v3d_geometriaRocksmith';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

const V3D_ANCHO_COLA = 0.16;
const V3D_ALTO_COLA = 0.05;

export class V3dColas implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  readonly #geo = new BoxGeometry(V3D_ANCHO_COLA, V3D_ALTO_COLA, 1);
  readonly #mat = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false });
  /** Núcleo brillante aditivo (solo en calidad media/alta). */
  readonly #matBrillo: MeshBasicMaterial | null;
  readonly #geoBrillo: BoxGeometry | null;
  readonly #mallas: InstancedMesh[] = [];
  readonly #coloresCuerda: Color[];
  readonly #colorFallo = new Color(COR_COLOR_FALLO);
  readonly #colorBlanco = new Color('#ffffff');
  readonly #auxColor = new Color();
  readonly #auxObj = new Object3D();
  #notas: readonly INota[] = [];
  #orden = new Uint32Array(0);
  #estados = new Uint8Array(0);
  #durMax = 0;

  constructor(opc: ICorOpcionesVista, perfil: IV3dPerfilCalidad) {
    this.#opc = { ...opc };
    // La cola nace en el frente (z local 0) y se extiende hacia el futuro (−Z).
    this.#geo.translate(0, 0, -0.5);
    this.#coloresCuerda = COR_COLORES_CUERDA.map((hex) => new Color(hex));
    this.#mallas.push(this.#crearPool(this.#geo, this.#mat));
    this.#matBrillo = perfil.tieneAntialias
      ? new MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.35,
          blending: AdditiveBlending,
          depthWrite: false,
        })
      : null;
    // El brillo es más ancho y bajo que la cinta: un halo alrededor.
    this.#geoBrillo = this.#matBrillo !== null ? new BoxGeometry(V3D_ANCHO_COLA * 2.4, V3D_ALTO_COLA * 0.4, 1) : null;
    if (this.#matBrillo !== null && this.#geoBrillo !== null) {
      this.#geoBrillo.translate(0, 0, -0.5);
      this.#mallas.push(this.#crearPool(this.#geoBrillo, this.#matBrillo));
    }
  }

  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    this.#orden = v3d_ordenarNotas(ej.notas);
    this.#estados = new Uint8Array(ej.notas.length);
    this.#durMax = ej.notas.reduce((max, nota) => Math.max(max, nota.dur ?? 0), 0);
  }

  marcarResultado(idxNota: number, esAcierto: boolean): void {
    if (idxNota < 0 || idxNota >= this.#estados.length) return;
    this.#estados[idxNota] = esAcierto ? V3D_ESTADO_ACIERTO : V3D_ESTADO_FALLO;
  }

  actualizar(cuadro: ICorCuadro): void {
    const vel = this.#opc.velocidadAutopista;
    const esZurdo = this.#opc.esZurdo;
    const pos = cuadro.posPulsos;
    const inicioPulsos = pos - v3d_convertirUnidadesAPulsos(V3D_MARGEN_ATRAS, vel);
    const finPulsos = pos + v3d_calcularPulsosVisibles(vel);
    let cant = 0;
    if (this.#durMax > 0) {
      let idxOrden = v3d_obtenerIdxPrimeraNota(this.#notas, this.#orden, inicioPulsos - this.#durMax);
      for (; idxOrden < this.#orden.length && cant < V3D_MAX_NOTAS; idxOrden++) {
        const idxNota = this.#orden[idxOrden] ?? 0;
        const nota = this.#notas[idxNota];
        if (nota === undefined) continue;
        if (nota.tiempo > finPulsos) break;
        const dur = nota.dur ?? 0;
        if (dur <= 0 || nota.tiempo + dur < inicioPulsos || !v3d_validarPosMastil(nota)) continue;

        const estado = this.#estados[idxNota] ?? V3D_ESTADO_PENDIENTE;
        let zFrente = v3d_calcularZNota(nota.tiempo, pos, vel);
        const zFin = v3d_calcularZNota(nota.tiempo + dur, pos, vel);
        const colorCuerda = this.#coloresCuerda[nota.cur - 1] ?? this.#colorBlanco;
        if (estado === V3D_ESTADO_ACIERTO) {
          zFrente = Math.min(zFrente, 0);
          this.#auxColor.copy(colorCuerda).lerp(this.#colorBlanco, 0.45);
        } else if (estado === V3D_ESTADO_FALLO) {
          this.#auxColor.copy(this.#colorFallo);
        } else {
          this.#auxColor.copy(colorCuerda);
        }
        const largo = zFrente - zFin;
        if (largo <= 0.001) continue;

        this.#auxObj.position.set(v3d_calcularXCasilla(nota.trs, esZurdo), v3d_calcularYCuerda(nota.cur), zFrente);
        this.#auxObj.scale.set(1, 1, largo);
        this.#auxObj.updateMatrix();
        for (const malla of this.#mallas) {
          malla.setMatrixAt(cant, this.#auxObj.matrix);
          malla.setColorAt(cant, this.#auxColor);
        }
        cant++;
      }
    }
    for (const malla of this.#mallas) {
      malla.count = cant;
      malla.visible = cant > 0;
      if (cant === 0) continue;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
    }
  }

  liberar(): void {
    for (const malla of this.#mallas) malla.dispose();
    this.#mallas.length = 0;
    this.#geo.dispose();
    this.#geoBrillo?.dispose();
    this.#mat.dispose();
    this.#matBrillo?.dispose();
    this.objeto.clear();
  }

  #crearPool(geo: BoxGeometry, mat: MeshBasicMaterial): InstancedMesh {
    const malla = new InstancedMesh(geo, mat, V3D_MAX_NOTAS);
    malla.instanceMatrix.setUsage(DynamicDrawUsage);
    malla.frustumCulled = false;
    for (let i = 0; i < V3D_MAX_NOTAS; i++) malla.setColorAt(i, this.#colorBlanco);
    malla.count = 0;
    malla.visible = false;
    this.objeto.add(malla);
    return malla;
  }
}

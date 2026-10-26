/**
 * Notas del ejercicio como `InstancedMesh` (pool de `V3D_MAX_NOTAS`): cabeza de nota + cola de sostenido.
 * La posición sale solo de `cuadro.posPulsos`; las animaciones de acierto/fallo usan el reloj de cuadros
 * (suma de `deltaMs`), nunca `Date.now()`.
 */
import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import { COR_COLOR_ACIERTO, COR_COLOR_FALLO, COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import type { IEjercicio, INota } from '../../core/tipos';
import {
  V3D_ANCHO_CARRIL,
  V3D_COLOR_SIN_CUERDA,
  V3D_DUR_ACIERTO_MS,
  V3D_ESTADO_ACIERTO,
  V3D_ESTADO_FALLO,
  V3D_ESTADO_PENDIENTE,
  V3D_MARGEN_ATRAS,
  V3D_MAX_NOTAS,
  v3d_obtenerIdxColor,
  V3D_UNIDADES_POR_PULSO,
  V3D_Y_NOTA,
} from './v3d_constantes';
import {
  v3d_obtenerIdxPrimeraNota,
  v3d_calcularPulsosVisibles,
  v3d_calcularXCarril,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_ordenarNotas,
} from './v3d_geometria';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

const V3D_DUR_HUNDIMIENTO_MS = 600;
/** Unidades delante de la línea de golpe en las que la nota se ilumina al acercarse. */
const V3D_DIST_APROXIMACION = 3;

export class V3dNotas implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  readonly #geoCabeza = new BoxGeometry(V3D_ANCHO_CARRIL * 0.82, 0.28, 0.42);
  readonly #geoCola = new BoxGeometry(0.16, 0.05, 1);
  readonly #matCabeza = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.15 });
  readonly #matCola = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
  readonly #cabezas: InstancedMesh;
  readonly #colas: InstancedMesh;
  readonly #mallas: readonly InstancedMesh[];
  /** idx 0..5 = cuerdas 1..6, idx 6 = sin cuerda. */
  readonly #coloresCuerda: Color[];
  readonly #colorAcierto = new Color(COR_COLOR_ACIERTO);
  readonly #colorFallo = new Color(COR_COLOR_FALLO);
  readonly #colorBlanco = new Color('#ffffff');
  readonly #auxColor = new Color();
  readonly #auxObj = new Object3D();
  #notas: readonly INota[] = [];
  /** Índices de `#notas` ordenados por `tiempo`. */
  #orden = new Uint32Array(0);
  #estados = new Uint8Array(0);
  /** Momento (reloj de cuadros) en que se marcó el resultado; `NaN` = marcado, aún sin cuadro. */
  #marcasMs = new Float64Array(0);
  #durMax = 0;
  #relojMs = 0;

  constructor(opc: ICorOpcionesVista, perfil: IV3dPerfilCalidad) {
    this.#opc = { ...opc };
    // La cola nace en el frente de la nota y se extiende hacia el futuro (−Z).
    this.#geoCola.translate(0, 0, -0.5);
    this.#coloresCuerda = [...COR_COLORES_CUERDA, V3D_COLOR_SIN_CUERDA].map((hex) => new Color(hex));

    this.#cabezas = new InstancedMesh(this.#geoCabeza, this.#matCabeza, V3D_MAX_NOTAS);
    this.#colas = new InstancedMesh(this.#geoCola, this.#matCola, V3D_MAX_NOTAS);
    this.#mallas = [this.#cabezas, this.#colas];
    for (const malla of this.#mallas) {
      malla.instanceMatrix.setUsage(DynamicDrawUsage);
      // Las instancias cambian cada cuadro: la esfera envolvente calculada una vez quedaría obsoleta.
      malla.frustumCulled = false;
      // Crea `instanceColor` ahora para no asignar memoria durante el bucle.
      for (let i = 0; i < V3D_MAX_NOTAS; i++) malla.setColorAt(i, this.#colorBlanco);
      malla.count = 0;
      this.objeto.add(malla);
    }
    this.#cabezas.castShadow = perfil.tieneSombras;
  }

  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    const cant = ej.notas.length;
    this.#orden = v3d_ordenarNotas(ej.notas);
    this.#estados = new Uint8Array(cant);
    this.#marcasMs = new Float64Array(cant);
    this.#durMax = ej.notas.reduce((max, nota) => Math.max(max, nota.dur ?? 0), 0);
  }

  marcarResultado(idxNota: number, esAcierto: boolean): void {
    if (idxNota < 0 || idxNota >= this.#estados.length) return;
    this.#estados[idxNota] = esAcierto ? V3D_ESTADO_ACIERTO : V3D_ESTADO_FALLO;
    this.#marcasMs[idxNota] = Number.NaN;
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    const vel = this.#opc.velocidadAutopista;
    const esZurdo = this.#opc.esZurdo;
    const pos = cuadro.posPulsos;
    // Las notas falladas siguen de largo y se dibujan un poco más allá de la línea de golpe.
    const inicioPulsos = pos - v3d_convertirUnidadesAPulsos(V3D_MARGEN_ATRAS, vel);
    const finPulsos = pos + v3d_calcularPulsosVisibles(vel);

    let cantCabezas = 0;
    let cantColas = 0;
    let idxOrden = v3d_obtenerIdxPrimeraNota(this.#notas, this.#orden, inicioPulsos - this.#durMax);
    for (; idxOrden < this.#orden.length && cantCabezas < V3D_MAX_NOTAS; idxOrden++) {
      const idxNota = this.#orden[idxOrden] ?? 0;
      const nota = this.#notas[idxNota];
      if (nota === undefined) continue;
      if (nota.tiempo > finPulsos) break;
      const dur = nota.dur ?? 0;
      if (nota.tiempo + dur < inicioPulsos) continue;

      const estado = this.#estados[idxNota] ?? V3D_ESTADO_PENDIENTE;
      if (estado !== V3D_ESTADO_PENDIENTE && Number.isNaN(this.#marcasMs[idxNota] ?? 0)) {
        this.#marcasMs[idxNota] = this.#relojMs;
      }
      const transcurridoMs = this.#relojMs - (this.#marcasMs[idxNota] ?? 0);
      const colorCuerda = this.#coloresCuerda[v3d_obtenerIdxColor(nota.cur)] ?? this.#colorBlanco;
      const x = v3d_calcularXCarril(nota.cur, esZurdo);
      let z = v3d_calcularZNota(nota.tiempo, pos, vel);
      let y = V3D_Y_NOTA;
      let escala = 1;

      if (estado === V3D_ESTADO_ACIERTO) {
        if (transcurridoMs > V3D_DUR_ACIERTO_MS) continue;
        // Queda sobre la línea de golpe: se infla un instante y se desvanece.
        const rel = transcurridoMs / V3D_DUR_ACIERTO_MS;
        z = Math.min(z, 0);
        escala = rel < 0.3 ? 1 + rel * 1.6 : 1.48 * (1 - (rel - 0.3) / 0.7);
        this.#auxColor.copy(this.#colorAcierto).lerp(this.#colorBlanco, 0.35 * (1 - rel));
      } else if (estado === V3D_ESTADO_FALLO) {
        // Sigue avanzando, roja, y se hunde en la autopista.
        y = V3D_Y_NOTA - 0.35 * Math.min(transcurridoMs / V3D_DUR_HUNDIMIENTO_MS, 1);
        this.#auxColor.copy(this.#colorFallo);
      } else {
        // Se ilumina al acercarse a la línea de golpe.
        const cercania = 1 - Math.min(Math.max(-z / V3D_DIST_APROXIMACION, 0), 1);
        this.#auxColor.copy(colorCuerda).lerp(this.#colorBlanco, 0.3 * cercania);
      }

      this.#auxObj.position.set(x, y, z);
      this.#auxObj.scale.setScalar(Math.max(escala, 0.001));
      this.#auxObj.updateMatrix();
      this.#cabezas.setMatrixAt(cantCabezas, this.#auxObj.matrix);
      this.#cabezas.setColorAt(cantCabezas, this.#auxColor);
      cantCabezas++;

      // Cola de sostenido (no se dibuja para notas acertadas).
      if (dur > 0 && estado !== V3D_ESTADO_ACIERTO) {
        const largo = dur * V3D_UNIDADES_POR_PULSO * vel;
        this.#auxObj.position.set(x, y - 0.08, z);
        this.#auxObj.scale.set(1, 1, largo);
        this.#auxObj.updateMatrix();
        this.#colas.setMatrixAt(cantColas, this.#auxObj.matrix);
        this.#colas.setColorAt(cantColas, estado === V3D_ESTADO_FALLO ? this.#colorFallo : colorCuerda);
        cantColas++;
      }
    }

    this.#cabezas.count = cantCabezas;
    this.#colas.count = cantColas;
    for (const malla of this.#mallas) {
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor !== null) malla.instanceColor.needsUpdate = true;
    }
  }

  liberar(): void {
    this.#cabezas.dispose();
    this.#colas.dispose();
    this.#geoCabeza.dispose();
    this.#geoCola.dispose();
    this.#matCabeza.dispose();
    this.#matCola.dispose();
    this.objeto.clear();
  }
}

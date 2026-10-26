/**
 * Bandas de nota de la vista Rocksmith: las notas sin cuerda/traste (p. ej. "encontrar la nota") se
 * muestran como una banda horizontal que cruza todo el mástil a la altura media de las cuerdas, con el
 * nombre de la nota repetido a lo largo (así se lee esté donde esté la cámara), y viaja por Z.
 * Acierto: destello verde y desaparece; fallo: roja y sigue de largo.
 * Pool fijo de `V3D_MAX_BANDAS` pares de mallas; materiales de nombre cacheados por texto.
 */
import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  type CanvasTexture,
} from 'three';
import { COR_COLOR_ACIERTO, COR_COLOR_FALLO } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { COR_CANT_CUERDAS, cor_obtenerEtiquetaNota } from '../../core/cor_notas';
import type { IEjercicio, INota } from '../../core/tipos';
import {
  V3D_COLOR_SIN_CUERDA,
  V3D_DUR_ACIERTO_MS,
  V3D_ESTADO_ACIERTO,
  V3D_ESTADO_FALLO,
  V3D_ESTADO_PENDIENTE,
  V3D_MARGEN_ATRAS,
  V3D_TRASTES_VISIBLES,
} from './v3d_constantes';
import { V3D_ANCHO_CASILLA, V3D_SEPARACION_CUERDAS } from './v3d_constantesRocksmith';
import {
  v3d_calcularPulsosVisibles,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_obtenerIdxPrimeraNota,
  v3d_ordenarNotas,
} from './v3d_geometria';
import { v3d_calcularXBarraTraste, v3d_calcularYCuerda, v3d_validarPosMastil } from './v3d_geometriaRocksmith';
import { v3d_crearTexturaTexto } from './v3d_texturas';
import type { IV3dCapa } from './v3d_tipos';

const V3D_MAX_BANDAS = 16;
const V3D_ALTO_BANDA = V3D_SEPARACION_CUERDAS * 2.4;
const V3D_ALTO_NOMBRE_BANDA = V3D_SEPARACION_CUERDAS * 1.8;
/** Ancho de mundo de cada repetición del nombre (la textura es 8:1). */
const V3D_ANCHO_REPETICION_NOMBRE = V3D_ALTO_NOMBRE_BANDA * 8;

export class V3dBandasNota implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  readonly #geoBanda: PlaneGeometry;
  readonly #geoNombre: PlaneGeometry;
  readonly #matPendiente: MeshBasicMaterial;
  readonly #matAcierto: MeshBasicMaterial;
  readonly #matFallo: MeshBasicMaterial;
  /** Material compartido de los nombres del pool antes de recibir texto. */
  readonly #matVacio = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  readonly #cacheMats = new Map<string, MeshBasicMaterial>();
  readonly #bandas: Mesh[] = [];
  readonly #nombres: Mesh[] = [];
  readonly #xCentro: number;
  readonly #yCentro: number;
  readonly #repeticiones: number;
  #notas: readonly INota[] = [];
  #orden = new Uint32Array(0);
  #estados = new Uint8Array(0);
  #marcasMs = new Float64Array(0);
  #matsPorNota: (MeshBasicMaterial | undefined)[] = [];
  #modo: IEjercicio['modo'] = 'flexible';
  #relojMs = 0;

  constructor(opc: ICorOpcionesVista) {
    this.#opc = { ...opc };
    const signo = this.#opc.esZurdo ? -1 : 1;
    const xIni = v3d_calcularXBarraTraste(0, this.#opc.esZurdo) - signo * V3D_ANCHO_CASILLA;
    const xFin = v3d_calcularXBarraTraste(V3D_TRASTES_VISIBLES, this.#opc.esZurdo);
    const ancho = Math.abs(xFin - xIni);
    this.#xCentro = (xIni + xFin) / 2;
    this.#yCentro = (v3d_calcularYCuerda(1) + v3d_calcularYCuerda(COR_CANT_CUERDAS)) / 2;
    this.#repeticiones = Math.max(1, Math.round(ancho / V3D_ANCHO_REPETICION_NOMBRE));

    this.#geoBanda = new PlaneGeometry(ancho, V3D_ALTO_BANDA);
    this.#geoNombre = new PlaneGeometry(ancho, V3D_ALTO_NOMBRE_BANDA);
    const crearMatBanda = (color: string, opacidad: number): MeshBasicMaterial =>
      new MeshBasicMaterial({ color, transparent: true, opacity: opacidad, blending: AdditiveBlending, depthWrite: false });
    this.#matPendiente = crearMatBanda(V3D_COLOR_SIN_CUERDA, 0.22);
    this.#matAcierto = crearMatBanda(COR_COLOR_ACIERTO, 0.7);
    this.#matFallo = crearMatBanda(COR_COLOR_FALLO, 0.45);

    for (let i = 0; i < V3D_MAX_BANDAS; i++) {
      const banda = new Mesh(this.#geoBanda, this.#matPendiente);
      const nombre = new Mesh(this.#geoNombre, this.#matVacio);
      nombre.renderOrder = 1;
      banda.visible = false;
      nombre.visible = false;
      this.#bandas.push(banda);
      this.#nombres.push(nombre);
      this.objeto.add(banda, nombre);
    }
  }

  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    this.#modo = ej.modo;
    this.#orden = v3d_ordenarNotas(ej.notas);
    this.#estados = new Uint8Array(ej.notas.length);
    this.#marcasMs = new Float64Array(ej.notas.length);
    this.#matsPorNota = new Array<MeshBasicMaterial | undefined>(ej.notas.length);
  }

  marcarResultado(idxNota: number, esAcierto: boolean): void {
    if (idxNota < 0 || idxNota >= this.#estados.length) return;
    this.#estados[idxNota] = esAcierto ? V3D_ESTADO_ACIERTO : V3D_ESTADO_FALLO;
    this.#marcasMs[idxNota] = Number.NaN;
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    const vel = this.#opc.velocidadAutopista;
    const pos = cuadro.posPulsos;
    const inicioPulsos = pos - v3d_convertirUnidadesAPulsos(V3D_MARGEN_ATRAS, vel);
    const finPulsos = pos + v3d_calcularPulsosVisibles(vel);
    let cant = 0;
    let idxOrden = v3d_obtenerIdxPrimeraNota(this.#notas, this.#orden, inicioPulsos);
    for (; idxOrden < this.#orden.length && cant < V3D_MAX_BANDAS; idxOrden++) {
      const idxNota = this.#orden[idxOrden] ?? 0;
      const nota = this.#notas[idxNota];
      if (nota === undefined) continue;
      if (nota.tiempo > finPulsos) break;
      if (v3d_validarPosMastil(nota)) continue;
      const banda = this.#bandas[cant];
      const nombre = this.#nombres[cant];
      if (banda === undefined || nombre === undefined) break;

      const estado = this.#estados[idxNota] ?? V3D_ESTADO_PENDIENTE;
      if (estado !== V3D_ESTADO_PENDIENTE && Number.isNaN(this.#marcasMs[idxNota] ?? 0)) {
        this.#marcasMs[idxNota] = this.#relojMs;
      }
      let z = v3d_calcularZNota(nota.tiempo, pos, vel);
      let escalaY = 1;
      if (estado === V3D_ESTADO_ACIERTO) {
        const rel = (this.#relojMs - (this.#marcasMs[idxNota] ?? 0)) / V3D_DUR_ACIERTO_MS;
        if (rel > 1) continue;
        z = Math.min(z, 0);
        escalaY = 1 + rel * 1.5;
        this.#matAcierto.opacity = 0.7 * (1 - rel);
        banda.material = this.#matAcierto;
        nombre.visible = false;
      } else {
        banda.material = estado === V3D_ESTADO_FALLO ? this.#matFallo : this.#matPendiente;
        let mat = this.#matsPorNota[idxNota];
        if (mat === undefined) {
          mat = this.#obtenerMaterial(nota);
          this.#matsPorNota[idxNota] = mat;
        }
        nombre.material = mat;
        nombre.position.set(this.#xCentro, this.#yCentro, z + 0.01);
        nombre.visible = true;
      }
      banda.position.set(this.#xCentro, this.#yCentro, z);
      banda.scale.y = escalaY;
      banda.visible = true;
      cant++;
    }
    for (let i = cant; i < V3D_MAX_BANDAS; i++) {
      const banda = this.#bandas[i];
      const nombre = this.#nombres[i];
      if (banda !== undefined) banda.visible = false;
      if (nombre !== undefined) nombre.visible = false;
    }
  }

  liberar(): void {
    for (const mat of this.#cacheMats.values()) {
      mat.map?.dispose();
      mat.dispose();
    }
    this.#cacheMats.clear();
    this.#matsPorNota = [];
    this.#geoBanda.dispose();
    this.#geoNombre.dispose();
    this.#matPendiente.dispose();
    this.#matAcierto.dispose();
    this.#matFallo.dispose();
    this.#matVacio.dispose();
    this.#bandas.length = 0;
    this.#nombres.length = 0;
    this.objeto.clear();
  }

  /** Material del nombre (con octava solo en modo estricto). Se crea la primera vez que aparece cada texto. */
  #obtenerMaterial(nota: INota): MeshBasicMaterial {
    const oct = this.#modo === 'estricto' ? nota.oct : undefined;
    const texto = cor_obtenerEtiquetaNota(nota.nombre, oct, this.#opc.notacion);
    const enCache = this.#cacheMats.get(texto);
    if (enCache !== undefined) return enCache;
    const textura: CanvasTexture = v3d_crearTexturaTexto(texto, 1024, 128, '#ffffff');
    textura.wrapS = RepeatWrapping;
    textura.repeat.set(this.#repeticiones, 1);
    const mat = new MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false, color: new Color('#ffffff') });
    this.#cacheMats.set(texto, mat);
    return mat;
  }
}

/**
 * Gemas de la vista Rocksmith: rectángulos redondeados del color de su cuerda con el número de traste,
 * en X = casilla, Y = cuerda y Z = tiempo (solo desde `cuadro.posPulsos`). Se iluminan al acercarse,
 * destellan al acertar y se vuelven rojas al fallar. Si la nota trae dedo (1..4), se muestra pequeño
 * en la esquina superior derecha. Sin ejercicio muestra "Selecciona un ejercicio para comenzar".
 *
 * Pools fijos: un `InstancedMesh` de cuerpos (`V3D_MAX_NOTAS`) y uno de caras por número del atlas
 * (`V3D_MAX_INSTANCIAS_POR_NUMERO` cada uno), así cada cara usa UV fijas sin shaders propios.
 */
import {
  Color,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Shape,
  Sprite,
  SpriteMaterial,
  type CanvasTexture,
  type PlaneGeometry,
} from 'three';
import { COR_COLOR_ACIERTO, COR_COLOR_FALLO, COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { cor_validarDedo, COR_DEDO_AIRE } from '../../core/cor_digitacion';
import type { IEjercicio, INota } from '../../core/tipos';
import {
  V3D_DUR_ACIERTO_MS,
  V3D_ESTADO_ACIERTO,
  V3D_ESTADO_FALLO,
  V3D_ESTADO_PENDIENTE,
  V3D_MARGEN_ATRAS,
  V3D_MAX_NOTAS,
  V3D_MSJ_SIN_EJERCICIO,
  v3d_obtenerIdxColor,
  V3D_TRASTES_VISIBLES,
} from './v3d_constantes';
import { V3D_DIST_GUIA, V3D_ZONA_DEF } from './v3d_constantesRocksmith';
import {
  v3d_calcularPulsosVisibles,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_obtenerIdxPrimeraNota,
  v3d_ordenarNotas,
} from './v3d_geometria';
import {
  v3d_calcularXCasilla,
  v3d_calcularXZona,
  v3d_calcularYCuerda,
  v3d_validarPosMastil,
} from './v3d_geometriaRocksmith';
import { v3d_crearAtlasNumeros, v3d_crearGeoCeldaAtlas, v3d_crearTexturaTexto } from './v3d_texturas';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

/** Medidas de la gema (ancho, alto, profundidad del cuerpo). */
const V3D_ANCHO_GEMA = 0.62;
const V3D_ALTO_GEMA = 0.25;
const V3D_PROFUNDIDAD_GEMA = 0.08;
const V3D_TAM_CARA_NUMERO = 0.24;
const V3D_ESCALA_DEDO = 0.55;
const V3D_REALCE_COLOR = 1.45;
const V3D_MAX_INSTANCIAS_POR_NUMERO = 128;
const V3D_TAM_CELDA_NUMERO_PX = 128;
const V3D_CANT_NUMEROS = V3D_TRASTES_VISIBLES + 1;

export class V3dGemas implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  readonly #geoCuerpo: ExtrudeGeometry;
  readonly #matCuerpo = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.15 });
  readonly #cuerpos: InstancedMesh;
  readonly #atlas: CanvasTexture;
  readonly #matCara: MeshBasicMaterial;
  readonly #geosCara: PlaneGeometry[] = [];
  /** Una malla de caras por número `0..24` (idx = número). */
  readonly #caras: InstancedMesh[] = [];
  readonly #cantPorNumero = new Uint16Array(V3D_CANT_NUMEROS);
  readonly #texMensaje: CanvasTexture;
  readonly #matMensaje: SpriteMaterial;
  readonly #mensaje: Sprite;
  /** idx 0..5 = cuerdas 1..6. */
  readonly #coloresCuerda: Color[];
  readonly #colorAcierto = new Color(COR_COLOR_ACIERTO);
  readonly #colorFallo = new Color(COR_COLOR_FALLO);
  readonly #colorBlanco = new Color('#ffffff');
  readonly #colorDedo = new Color('#ffe08a');
  readonly #auxColor = new Color();
  readonly #auxObj = new Object3D();
  #notas: readonly INota[] = [];
  #orden = new Uint32Array(0);
  #estados = new Uint8Array(0);
  /** Reloj de cuadros al marcar el resultado; `NaN` = marcado, aún sin cuadro. */
  #marcasMs = new Float64Array(0);
  #relojMs = 0;

  constructor(opc: ICorOpcionesVista, perfil: IV3dPerfilCalidad) {
    this.#opc = { ...opc };
    this.#coloresCuerda = COR_COLORES_CUERDA.map((hex) => new Color(hex));

    this.#geoCuerpo = this.#crearGeoCuerpo(perfil.tieneAntialias ? 3 : 1);
    this.#cuerpos = this.#crearPool(this.#geoCuerpo, this.#matCuerpo, V3D_MAX_NOTAS);

    this.#atlas = v3d_crearAtlasNumeros(V3D_CANT_NUMEROS, V3D_TAM_CELDA_NUMERO_PX);
    this.#matCara = new MeshBasicMaterial({ map: this.#atlas, transparent: true, depthWrite: false });
    for (let numero = 0; numero < V3D_CANT_NUMEROS; numero++) {
      const geo = v3d_crearGeoCeldaAtlas(numero, V3D_CANT_NUMEROS, V3D_TAM_CARA_NUMERO, V3D_TAM_CARA_NUMERO);
      this.#geosCara.push(geo);
      const cara = this.#crearPool(geo, this.#matCara, V3D_MAX_INSTANCIAS_POR_NUMERO);
      // Las caras se dibujan después de los cuerpos (transparentes, sin escribir profundidad).
      cara.renderOrder = 1;
      this.#caras.push(cara);
    }

    this.#texMensaje = v3d_crearTexturaTexto(V3D_MSJ_SIN_EJERCICIO, 1024, 128, '#d6dcf0');
    this.#matMensaje = new SpriteMaterial({ map: this.#texMensaje, transparent: true, depthWrite: false });
    this.#mensaje = new Sprite(this.#matMensaje);
    this.#mensaje.scale.set(8, 1, 1);
    this.#mensaje.position.set(v3d_calcularXZona(V3D_ZONA_DEF, this.#opc.esZurdo), 2.4, -6);
    this.objeto.add(this.#mensaje);
  }

  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    this.#orden = v3d_ordenarNotas(ej.notas);
    this.#estados = new Uint8Array(ej.notas.length);
    this.#marcasMs = new Float64Array(ej.notas.length);
    this.#mensaje.visible = ej.notas.length === 0;
  }

  marcarResultado(idxNota: number, esAcierto: boolean): void {
    if (idxNota < 0 || idxNota >= this.#estados.length) return;
    this.#estados[idxNota] = esAcierto ? V3D_ESTADO_ACIERTO : V3D_ESTADO_FALLO;
    this.#marcasMs[idxNota] = Number.NaN;
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    if (this.#mensaje.visible) this.#matMensaje.opacity = 0.65 + 0.25 * Math.sin(this.#relojMs / 700);

    const vel = this.#opc.velocidadAutopista;
    const esZurdo = this.#opc.esZurdo;
    const pos = cuadro.posPulsos;
    const inicioPulsos = pos - v3d_convertirUnidadesAPulsos(V3D_MARGEN_ATRAS, vel);
    const finPulsos = pos + v3d_calcularPulsosVisibles(vel);
    this.#cantPorNumero.fill(0);
    let cantCuerpos = 0;

    let idxOrden = v3d_obtenerIdxPrimeraNota(this.#notas, this.#orden, inicioPulsos);
    for (; idxOrden < this.#orden.length && cantCuerpos < V3D_MAX_NOTAS; idxOrden++) {
      const idxNota = this.#orden[idxOrden] ?? 0;
      const nota = this.#notas[idxNota];
      if (nota === undefined) continue;
      if (nota.tiempo > finPulsos) break;
      if (!v3d_validarPosMastil(nota)) continue;

      const estado = this.#estados[idxNota] ?? V3D_ESTADO_PENDIENTE;
      if (estado !== V3D_ESTADO_PENDIENTE && Number.isNaN(this.#marcasMs[idxNota] ?? 0)) {
        this.#marcasMs[idxNota] = this.#relojMs;
      }
      const transcurridoMs = this.#relojMs - (this.#marcasMs[idxNota] ?? 0);
      const colorCuerda = this.#coloresCuerda[v3d_obtenerIdxColor(nota.cur)] ?? this.#colorBlanco;
      const x = v3d_calcularXCasilla(nota.trs, esZurdo);
      const y = v3d_calcularYCuerda(nota.cur);
      let z = v3d_calcularZNota(nota.tiempo, pos, vel);
      let escala = 1;

      if (estado === V3D_ESTADO_ACIERTO) {
        if (transcurridoMs > V3D_DUR_ACIERTO_MS) continue;
        // Destello sobre las cuerdas: se infla, pasa a blanco/verde y se desvanece.
        const rel = transcurridoMs / V3D_DUR_ACIERTO_MS;
        z = Math.min(z, 0);
        escala = rel < 0.3 ? 1 + rel * 2 : 1.6 * (1 - (rel - 0.3) / 0.7);
        this.#auxColor.copy(this.#colorAcierto).lerp(this.#colorBlanco, 0.6 * (1 - rel));
      } else if (estado === V3D_ESTADO_FALLO) {
        this.#auxColor.copy(this.#colorFallo);
      } else {
        // Se ilumina al acercarse a las cuerdas.
        const cercania = 1 - Math.min(Math.max(-z / V3D_DIST_GUIA, 0), 1);
        this.#auxColor.copy(colorCuerda).lerp(this.#colorBlanco, 0.2 * cercania * cercania);
      }
      // El material es iluminado: se sobreexpone el color de la instancia (> 1 es válido) para que la gema se vea viva.
      this.#auxColor.multiplyScalar(V3D_REALCE_COLOR);
      escala = Math.max(escala, 0.001);

      this.#auxObj.position.set(x, y, z);
      this.#auxObj.scale.setScalar(escala);
      this.#auxObj.updateMatrix();
      this.#cuerpos.setMatrixAt(cantCuerpos, this.#auxObj.matrix);
      this.#cuerpos.setColorAt(cantCuerpos, this.#auxColor);
      cantCuerpos++;

      const zCara = z + (V3D_PROFUNDIDAD_GEMA / 2 + 0.03) * escala;
      this.#agregarCara(nota.trs, x, y, zCara, escala, this.#colorBlanco);
      const dedo = nota.dedo;
      if (cor_validarDedo(dedo) && dedo !== COR_DEDO_AIRE) {
        this.#agregarCara(
          dedo,
          x + (V3D_ANCHO_GEMA / 2 + 0.06) * escala,
          y + (V3D_ALTO_GEMA / 2) * escala,
          zCara,
          escala * V3D_ESCALA_DEDO,
          this.#colorDedo,
        );
      }
    }

    this.#subirInstancias(this.#cuerpos, cantCuerpos);
    for (let numero = 0; numero < this.#caras.length; numero++) {
      const cara = this.#caras[numero];
      if (cara !== undefined) this.#subirInstancias(cara, this.#cantPorNumero[numero] ?? 0);
    }
  }

  liberar(): void {
    this.#cuerpos.dispose();
    for (const cara of this.#caras) cara.dispose();
    for (const geo of this.#geosCara) geo.dispose();
    this.#geoCuerpo.dispose();
    this.#matCuerpo.dispose();
    this.#matCara.dispose();
    this.#atlas.dispose();
    this.#texMensaje.dispose();
    this.#matMensaje.dispose();
    this.#caras.length = 0;
    this.#geosCara.length = 0;
    this.objeto.clear();
  }

  #agregarCara(numero: number, x: number, y: number, z: number, escala: number, color: Color): void {
    const cara = this.#caras[numero];
    const cant = this.#cantPorNumero[numero] ?? 0;
    if (cara === undefined || cant >= V3D_MAX_INSTANCIAS_POR_NUMERO) return;
    this.#auxObj.position.set(x, y, z);
    this.#auxObj.scale.setScalar(escala);
    this.#auxObj.updateMatrix();
    cara.setMatrixAt(cant, this.#auxObj.matrix);
    cara.setColorAt(cant, color);
    this.#cantPorNumero[numero] = cant + 1;
  }

  /** Sube solo el tramo usado del pool (evita copiar los buffers completos a la GPU cada cuadro). */
  #subirInstancias(malla: InstancedMesh, cant: number): void {
    const cantAnt = malla.count;
    malla.count = cant;
    malla.visible = cant > 0;
    if (cant === 0) return;
    const usado = Math.max(cant, cantAnt);
    malla.instanceMatrix.clearUpdateRanges();
    malla.instanceMatrix.addUpdateRange(0, usado * 16);
    malla.instanceMatrix.needsUpdate = true;
    const colores = malla.instanceColor;
    if (colores !== null) {
      colores.clearUpdateRanges();
      colores.addUpdateRange(0, usado * 3);
      colores.needsUpdate = true;
    }
  }

  #crearPool(geo: ExtrudeGeometry | PlaneGeometry, mat: MeshStandardMaterial | MeshBasicMaterial, cant: number): InstancedMesh {
    const malla = new InstancedMesh(geo, mat, cant);
    malla.instanceMatrix.setUsage(DynamicDrawUsage);
    // Las instancias cambian cada cuadro: la esfera envolvente calculada una vez quedaría obsoleta.
    malla.frustumCulled = false;
    // Crea `instanceColor` ahora para no asignar memoria durante el bucle.
    for (let i = 0; i < cant; i++) malla.setColorAt(i, this.#colorBlanco);
    malla.instanceColor?.setUsage(DynamicDrawUsage);
    malla.count = 0;
    malla.visible = false;
    this.objeto.add(malla);
    return malla;
  }

  /** Rectángulo redondeado extruido y centrado en el origen (cara frontal hacia +Z). */
  #crearGeoCuerpo(segmentosBisel: number): ExtrudeGeometry {
    const ancho = V3D_ANCHO_GEMA;
    const alto = V3D_ALTO_GEMA;
    const radio = alto * 0.32;
    const forma = new Shape();
    forma.moveTo(-ancho / 2 + radio, -alto / 2);
    forma.lineTo(ancho / 2 - radio, -alto / 2);
    forma.quadraticCurveTo(ancho / 2, -alto / 2, ancho / 2, -alto / 2 + radio);
    forma.lineTo(ancho / 2, alto / 2 - radio);
    forma.quadraticCurveTo(ancho / 2, alto / 2, ancho / 2 - radio, alto / 2);
    forma.lineTo(-ancho / 2 + radio, alto / 2);
    forma.quadraticCurveTo(-ancho / 2, alto / 2, -ancho / 2, alto / 2 - radio);
    forma.lineTo(-ancho / 2, -alto / 2 + radio);
    forma.quadraticCurveTo(-ancho / 2, -alto / 2, -ancho / 2 + radio, -alto / 2);
    const geo = new ExtrudeGeometry(forma, {
      depth: V3D_PROFUNDIDAD_GEMA,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.015,
      bevelSegments: segmentosBisel,
      curveSegments: 4,
    });
    geo.center();
    return geo;
  }
}

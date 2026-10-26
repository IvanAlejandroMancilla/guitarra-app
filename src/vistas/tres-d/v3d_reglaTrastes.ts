/**
 * Regla de trastes de la vista Rocksmith: piso oscuro, barras de traste en el plano de las cuerdas,
 * líneas de traste que se pierden hacia el fondo, números 0–24 en el piso delante de las cuerdas
 * y sombreado de la zona activa (con seguimiento suave, igual que la cámara).
 */
import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { V3D_LARGO_AUTOPISTA, V3D_MARGEN_ATRAS, V3D_TRASTES_VISIBLES } from './v3d_constantes';
import {
  V3D_ANCHO_CASILLA,
  V3D_COLOR_ZONA,
  V3D_CONSTANTE_CAMARA_MS,
  V3D_ZONA_DEF,
} from './v3d_constantesRocksmith';
import {
  v3d_calcularXBarraTraste,
  v3d_calcularXCasilla,
  v3d_calcularXZona,
  v3d_calcularYCuerda,
  v3d_suavizarValor,
} from './v3d_geometriaRocksmith';
import { v3d_crearAtlasNumeros, v3d_crearGeoCeldaAtlas } from './v3d_texturas';
import type { IV3dCapa, IV3dZonaTrastes } from './v3d_tipos';

const V3D_TAM_CELDA_NUMERO_PX = 128;
const V3D_TAM_NUMERO_REGLA = 0.55;
/** Z de los números (en el piso, delante de las cuerdas). */
const V3D_Z_NUMEROS = 0.55;
const V3D_OPACIDAD_ZONA = 0.6;
const V3D_COLOR_NUMERO = '#6b7391';
const V3D_COLOR_NUMERO_ZONA = '#ffffff';

type TV3dGeoRegla = BoxGeometry | PlaneGeometry;
type TV3dMatRegla = MeshBasicMaterial | MeshStandardMaterial;

export class V3dReglaTrastes implements IV3dCapa {
  readonly objeto = new Group();
  readonly #esZurdo: boolean;
  readonly #geos: TV3dGeoRegla[] = [];
  readonly #mats: TV3dMatRegla[] = [];
  readonly #mallasInstanciadas: InstancedMesh[] = [];
  readonly #atlas: CanvasTexture;
  readonly #zonaPiso: Mesh;
  readonly #matZona: MeshBasicMaterial;
  readonly #numeros: Mesh[] = [];
  readonly #matsNumero: MeshBasicMaterial[] = [];
  readonly #colorNumero = new Color(V3D_COLOR_NUMERO);
  readonly #colorNumeroZona = new Color(V3D_COLOR_NUMERO_ZONA);
  #trsMinAct = Number.NaN;
  #trsMaxAct = Number.NaN;
  #xZonaAct: number;
  #xZonaObjetivo: number;
  #anchoZonaAct: number;
  #anchoZonaObjetivo: number;
  #opacidadZonaAct = 0;
  #opacidadZonaObjetivo = 0;

  constructor(opc: ICorOpcionesVista) {
    this.#esZurdo = opc.esZurdo;
    const signo = this.#esZurdo ? -1 : 1;
    const xIni = v3d_calcularXBarraTraste(0, this.#esZurdo) - signo * V3D_ANCHO_CASILLA * 2;
    const xFin = v3d_calcularXBarraTraste(V3D_TRASTES_VISIBLES, this.#esZurdo) + signo * V3D_ANCHO_CASILLA;
    const anchoTotal = Math.abs(xFin - xIni);
    const xCentro = (xIni + xFin) / 2;
    const largoPiso = V3D_LARGO_AUTOPISTA + V3D_MARGEN_ATRAS + 6;
    const zCentroPiso = (V3D_MARGEN_ATRAS + 2 - V3D_LARGO_AUTOPISTA) / 2;

    // Piso.
    const piso = new Mesh(
      this.#registrarGeo(new PlaneGeometry(anchoTotal, largoPiso)),
      this.#registrarMat(new MeshStandardMaterial({ color: '#0d1122', roughness: 0.9, metalness: 0.05 })),
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(xCentro, 0, zCentroPiso);
    this.objeto.add(piso);

    // Sombreado de la zona (plano de ancho 1 escalado en X).
    this.#matZona = this.#registrarMat(
      new MeshBasicMaterial({ color: V3D_COLOR_ZONA, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.#zonaPiso = new Mesh(this.#registrarGeo(new PlaneGeometry(1, V3D_LARGO_AUTOPISTA + 1.5)), this.#matZona);
    this.#zonaPiso.rotation.x = -Math.PI / 2;
    this.#zonaPiso.position.set(0, 0.012, (1.5 - V3D_LARGO_AUTOPISTA) / 2);
    this.objeto.add(this.#zonaPiso);
    this.#xZonaObjetivo = v3d_calcularXZona(V3D_ZONA_DEF, this.#esZurdo);
    this.#xZonaAct = this.#xZonaObjetivo;
    this.#anchoZonaObjetivo = (V3D_ZONA_DEF.trsMax - V3D_ZONA_DEF.trsMin + 1) * V3D_ANCHO_CASILLA;
    this.#anchoZonaAct = this.#anchoZonaObjetivo;

    // Barras de traste (1..24) en el plano de las cuerdas, y cejuela más gruesa y clara.
    const altoBarras = v3d_calcularYCuerda(COR_CANT_CUERDAS) + 0.12;
    const auxObj = new Object3D();
    const barras = this.#crearInstanciada(new BoxGeometry(0.035, altoBarras, 0.03), '#8b93ad', V3D_TRASTES_VISIBLES);
    const lineas = this.#crearInstanciada(new BoxGeometry(0.03, 0.01, V3D_LARGO_AUTOPISTA), '#262e4a', V3D_TRASTES_VISIBLES + 1);
    for (let trs = 0; trs <= V3D_TRASTES_VISIBLES; trs++) {
      const x = v3d_calcularXBarraTraste(trs, this.#esZurdo);
      auxObj.position.set(x, 0.006, -V3D_LARGO_AUTOPISTA / 2);
      auxObj.updateMatrix();
      lineas.setMatrixAt(trs, auxObj.matrix);
      if (trs === 0) continue;
      auxObj.position.set(x, altoBarras / 2, -0.03);
      auxObj.updateMatrix();
      barras.setMatrixAt(trs - 1, auxObj.matrix);
    }
    const cejuela = new Mesh(
      this.#registrarGeo(new BoxGeometry(0.11, altoBarras + 0.06, 0.06)),
      this.#registrarMat(new MeshBasicMaterial({ color: '#e8ecf5' })),
    );
    cejuela.position.set(v3d_calcularXBarraTraste(0, this.#esZurdo), (altoBarras + 0.06) / 2, -0.03);
    this.objeto.add(cejuela);

    // Números 0..24: un plano por número (UV a su celda del atlas) con material propio para resaltarlo.
    this.#atlas = v3d_crearAtlasNumeros(V3D_TRASTES_VISIBLES + 1, V3D_TAM_CELDA_NUMERO_PX);
    for (let trs = 0; trs <= V3D_TRASTES_VISIBLES; trs++) {
      const geo = this.#registrarGeo(
        v3d_crearGeoCeldaAtlas(trs, V3D_TRASTES_VISIBLES + 1, V3D_TAM_NUMERO_REGLA, V3D_TAM_NUMERO_REGLA),
      );
      const mat = this.#registrarMat(
        new MeshBasicMaterial({ map: this.#atlas, color: V3D_COLOR_NUMERO, transparent: true, depthWrite: false }),
      );
      const numero = new Mesh(geo, mat);
      // Casi acostado en el piso, inclinado hacia la cámara; se eleva lo justo para que el borde
      // inferior (aun resaltado, escala 1.2) no quede bajo el piso.
      const inclinacion = Math.PI / 2.6;
      numero.rotation.x = -inclinacion;
      const yNumero = ((V3D_TAM_NUMERO_REGLA * 1.2) / 2) * Math.cos(inclinacion) + 0.02;
      numero.position.set(v3d_calcularXCasilla(trs, this.#esZurdo), yNumero, V3D_Z_NUMEROS);
      this.objeto.add(numero);
      this.#numeros.push(numero);
      this.#matsNumero.push(mat);
    }
  }

  /** Zona a resaltar (números y sombreado del piso); `null` desvanece el sombreado. */
  fijarZona(zona: IV3dZonaTrastes | null): void {
    if (zona === null) {
      this.#opacidadZonaObjetivo = 0;
      this.#pintarNumeros(Number.NaN, Number.NaN);
      return;
    }
    this.#opacidadZonaObjetivo = V3D_OPACIDAD_ZONA;
    if (zona.trsMin === this.#trsMinAct && zona.trsMax === this.#trsMaxAct) return;
    const xIzq = v3d_calcularXBarraTraste(zona.trsMin - 1, this.#esZurdo);
    const xDer = v3d_calcularXBarraTraste(zona.trsMax, this.#esZurdo);
    this.#xZonaObjetivo = v3d_calcularXZona(zona, this.#esZurdo);
    this.#anchoZonaObjetivo = Math.max(Math.abs(xDer - xIzq), V3D_ANCHO_CASILLA);
    // Si el sombreado estaba apagado, aparece directamente en su lugar.
    if (this.#opacidadZonaAct < 0.02) {
      this.#xZonaAct = this.#xZonaObjetivo;
      this.#anchoZonaAct = this.#anchoZonaObjetivo;
    }
    this.#pintarNumeros(zona.trsMin, zona.trsMax);
  }

  actualizar(cuadro: ICorCuadro): void {
    const delta = cuadro.deltaMs;
    this.#xZonaAct = v3d_suavizarValor(this.#xZonaAct, this.#xZonaObjetivo, delta, V3D_CONSTANTE_CAMARA_MS);
    this.#anchoZonaAct = v3d_suavizarValor(this.#anchoZonaAct, this.#anchoZonaObjetivo, delta, V3D_CONSTANTE_CAMARA_MS);
    this.#opacidadZonaAct = v3d_suavizarValor(this.#opacidadZonaAct, this.#opacidadZonaObjetivo, delta, V3D_CONSTANTE_CAMARA_MS);
    this.#zonaPiso.position.x = this.#xZonaAct;
    this.#zonaPiso.scale.x = this.#anchoZonaAct;
    this.#matZona.opacity = this.#opacidadZonaAct;
    this.#zonaPiso.visible = this.#opacidadZonaAct > 0.005;
  }

  liberar(): void {
    for (const malla of this.#mallasInstanciadas) malla.dispose();
    for (const geo of this.#geos) geo.dispose();
    for (const mat of this.#mats) mat.dispose();
    this.#atlas.dispose();
    this.#mallasInstanciadas.length = 0;
    this.#geos.length = 0;
    this.#mats.length = 0;
    this.#numeros.length = 0;
    this.#matsNumero.length = 0;
    this.objeto.clear();
  }

  /** Números de la zona en blanco y algo más grandes; el resto, tenues. Solo cuando cambia la zona. */
  #pintarNumeros(trsMin: number, trsMax: number): void {
    if (trsMin === this.#trsMinAct && trsMax === this.#trsMaxAct) return;
    // NaN !== NaN: se guarda el estado "sin zona" aparte para no repintar cada cuadro.
    if (Number.isNaN(trsMin) && Number.isNaN(this.#trsMinAct)) return;
    this.#trsMinAct = trsMin;
    this.#trsMaxAct = trsMax;
    for (let trs = 0; trs < this.#numeros.length; trs++) {
      const esZona = trs >= trsMin && trs <= trsMax;
      const mat = this.#matsNumero[trs];
      const numero = this.#numeros[trs];
      if (mat === undefined || numero === undefined) continue;
      mat.color.copy(esZona ? this.#colorNumeroZona : this.#colorNumero);
      mat.opacity = esZona ? 1 : 0.8;
      numero.scale.setScalar(esZona ? 1.2 : 1);
    }
  }

  #crearInstanciada(geo: BoxGeometry, color: string, cant: number): InstancedMesh {
    const mat = this.#registrarMat(new MeshBasicMaterial({ color, blending: AdditiveBlending, transparent: true }));
    const malla = new InstancedMesh(this.#registrarGeo(geo), mat, cant);
    this.#mallasInstanciadas.push(malla);
    this.objeto.add(malla);
    return malla;
  }

  #registrarGeo<TGeo extends TV3dGeoRegla>(geo: TGeo): TGeo {
    this.#geos.push(geo);
    return geo;
  }

  #registrarMat<TMat extends TV3dMatRegla>(mat: TMat): TMat {
    this.#mats.push(mat);
    return mat;
  }
}

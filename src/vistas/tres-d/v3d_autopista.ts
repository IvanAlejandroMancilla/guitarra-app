/**
 * Autopista: piso, 6 carriles coloreados por cuerda, rejilla de pulsos/compases que avanza
 * con el transporte, bordes y línea de golpe brillante con destello por carril.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three';
import { COR_COLOR_ACIERTO, COR_COLOR_FALLO, COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import type { IEjercicio } from '../../core/tipos';
import {
  V3D_ANCHO_AUTOPISTA,
  V3D_ANCHO_CARRIL,
  V3D_COLOR_SIN_CUERDA,
  V3D_LARGO_AUTOPISTA,
  V3D_MARGEN_ATRAS,
  V3D_PULSOS_VISIBLES,
} from './v3d_constantes';
import {
  v3d_calcularPulsosVisibles,
  v3d_calcularXCarril,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
} from './v3d_geometria';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

/** Velocidad mínima de autopista en cfg = 0.5 → caben hasta 2× pulsos; +4 de margen. */
const V3D_MAX_LINEAS_PULSO = Math.ceil(V3D_PULSOS_VISIBLES / 0.5) + 4;
const V3D_PULSOS_COMPAS_DEF = 4;
/** Pulsos por segundo del desplazamiento decorativo cuando no hay ejercicio. */
const V3D_DERIVA_REPOSO = 0.6;
const V3D_DUR_DESTELLO_MS = 350;
/** Índice del destello del carril central (notas sin cuerda). */
const V3D_IDX_CENTRAL = COR_CANT_CUERDAS;

type TV3dGeoAutopista = BoxGeometry | PlaneGeometry;
type TV3dMatAutopista = MeshBasicMaterial | MeshStandardMaterial;

export class V3dAutopista implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  readonly #geos: TV3dGeoAutopista[] = [];
  readonly #mats: TV3dMatAutopista[] = [];
  readonly #lineas: InstancedMesh;
  readonly #matBrilloGolpe: MeshBasicMaterial;
  readonly #matsDestello: MeshBasicMaterial[] = [];
  readonly #inicioDestelloMs: number[] = [];
  readonly #colorDestello: Color[] = [];
  readonly #auxObj = new Object3D();
  readonly #colorPulso = new Color('#2a3350');
  readonly #colorCompas = new Color('#7f8fc0');
  readonly #colorAcierto = new Color(COR_COLOR_ACIERTO);
  readonly #colorFallo = new Color(COR_COLOR_FALLO);
  #pulsosPorCompas = V3D_PULSOS_COMPAS_DEF;
  #tieneEjercicio = false;
  #relojMs = 0;

  constructor(opc: ICorOpcionesVista, perfil: IV3dPerfilCalidad) {
    this.#opc = { ...opc };
    const largoTotal = V3D_LARGO_AUTOPISTA + V3D_MARGEN_ATRAS;
    const zCentro = (V3D_MARGEN_ATRAS - V3D_LARGO_AUTOPISTA) / 2;

    // Piso.
    const geoPiso = this.#registrarGeo(new PlaneGeometry(V3D_ANCHO_AUTOPISTA + 0.6, largoTotal));
    const matPiso = this.#registrarMat(new MeshStandardMaterial({ color: '#10152a', roughness: 0.85, metalness: 0.05 }));
    const piso = new Mesh(geoPiso, matPiso);
    piso.rotation.x = -Math.PI / 2;
    piso.position.z = zCentro;
    piso.receiveShadow = perfil.tieneSombras;
    this.objeto.add(piso);

    // Carriles (franja tenue) y separadores (línea fina del color de la cuerda).
    const geoCarril = this.#registrarGeo(new PlaneGeometry(V3D_ANCHO_CARRIL * 0.94, largoTotal));
    const geoSeparador = this.#registrarGeo(new BoxGeometry(0.03, 0.01, largoTotal));
    for (let cur = 1; cur <= COR_CANT_CUERDAS; cur++) {
      const colorCuerda = COR_COLORES_CUERDA[cur - 1] ?? V3D_COLOR_SIN_CUERDA;
      const x = v3d_calcularXCarril(cur, this.#opc.esZurdo);
      const matCarril = this.#registrarMat(
        new MeshBasicMaterial({ color: colorCuerda, transparent: true, opacity: 0.1, depthWrite: false }),
      );
      const carril = new Mesh(geoCarril, matCarril);
      carril.rotation.x = -Math.PI / 2;
      carril.position.set(x, 0.002, zCentro);
      this.objeto.add(carril);

      const matSep = this.#registrarMat(new MeshBasicMaterial({ color: colorCuerda, transparent: true, opacity: 0.55 }));
      const separador = new Mesh(geoSeparador, matSep);
      separador.position.set(x, 0.006, zCentro);
      this.objeto.add(separador);
    }

    // Bordes laterales brillantes.
    const geoBorde = this.#registrarGeo(new BoxGeometry(0.08, 0.08, largoTotal));
    const matBorde = this.#registrarMat(new MeshBasicMaterial({ color: '#4fd6ff' }));
    for (const lado of [-1, 1]) {
      const borde = new Mesh(geoBorde, matBorde);
      borde.position.set(lado * (V3D_ANCHO_AUTOPISTA / 2 + 0.3), 0.04, zCentro);
      this.objeto.add(borde);
    }

    // Rejilla de pulsos (una instancia por línea visible).
    const geoLinea = this.#registrarGeo(new BoxGeometry(V3D_ANCHO_AUTOPISTA, 0.012, 0.05));
    const matLinea = this.#registrarMat(new MeshBasicMaterial({ color: '#ffffff' }));
    this.#lineas = new InstancedMesh(geoLinea, matLinea, V3D_MAX_LINEAS_PULSO);
    this.#lineas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.#lineas.frustumCulled = false;
    for (let i = 0; i < V3D_MAX_LINEAS_PULSO; i++) this.#lineas.setColorAt(i, this.#colorPulso);
    this.#lineas.count = 0;
    this.objeto.add(this.#lineas);

    // Línea de golpe: barra sólida + brillo aditivo.
    const geoGolpe = this.#registrarGeo(new BoxGeometry(V3D_ANCHO_AUTOPISTA + 0.6, 0.06, 0.12));
    const matGolpe = this.#registrarMat(new MeshBasicMaterial({ color: '#eaf6ff' }));
    const golpe = new Mesh(geoGolpe, matGolpe);
    golpe.position.set(0, 0.03, 0);
    this.objeto.add(golpe);

    const geoBrillo = this.#registrarGeo(new PlaneGeometry(V3D_ANCHO_AUTOPISTA + 0.6, 0.9));
    this.#matBrilloGolpe = this.#registrarMat(
      new MeshBasicMaterial({
        color: '#7fd8ff',
        transparent: true,
        opacity: 0.5,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const brillo = new Mesh(geoBrillo, this.#matBrilloGolpe);
    brillo.rotation.x = -Math.PI / 2;
    brillo.position.set(0, 0.01, 0);
    this.objeto.add(brillo);

    // Destellos por carril (6 cuerdas + central), apagados hasta un acierto/fallo.
    const geoDestello = this.#registrarGeo(new PlaneGeometry(V3D_ANCHO_CARRIL, 2.4));
    for (let idx = 0; idx <= V3D_IDX_CENTRAL; idx++) {
      const mat = this.#registrarMat(
        new MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      const destello = new Mesh(geoDestello, mat);
      destello.rotation.x = -Math.PI / 2;
      const cur = idx < COR_CANT_CUERDAS ? idx + 1 : undefined;
      destello.position.set(v3d_calcularXCarril(cur, this.#opc.esZurdo), 0.015, -0.6);
      this.objeto.add(destello);
      this.#matsDestello.push(mat);
      this.#inicioDestelloMs.push(Number.NEGATIVE_INFINITY);
      this.#colorDestello.push(new Color('#ffffff'));
    }
  }

  cargar(ej: IEjercicio): void {
    const pulsos = ej.pulsosPorCompas;
    this.#pulsosPorCompas = pulsos !== undefined && Number.isInteger(pulsos) && pulsos > 0 ? pulsos : V3D_PULSOS_COMPAS_DEF;
    this.#tieneEjercicio = ej.notas.length > 0;
  }

  /** Destello verde (acierto) o rojo (fallo) en el carril de la cuerda. */
  marcarCarril(cur: number | undefined, esAcierto: boolean): void {
    const esCuerdaValida = cur !== undefined && Number.isInteger(cur) && cur >= 1 && cur <= COR_CANT_CUERDAS;
    const idx = esCuerdaValida ? cur - 1 : V3D_IDX_CENTRAL;
    this.#inicioDestelloMs[idx] = this.#relojMs;
    this.#colorDestello[idx]?.copy(esAcierto ? this.#colorAcierto : this.#colorFallo);
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    const vel = this.#opc.velocidadAutopista;
    // Sin ejercicio la rejilla deriva lentamente (con el reloj de cuadros, no con Date.now()).
    const posVisual = this.#tieneEjercicio
      ? cuadro.posPulsos
      : cuadro.posPulsos + (this.#relojMs / 1000) * V3D_DERIVA_REPOSO;

    // Rejilla de pulsos.
    const primerPulso = Math.ceil(posVisual - v3d_convertirUnidadesAPulsos(V3D_MARGEN_ATRAS, vel));
    const ultimoPulso = Math.floor(posVisual + v3d_calcularPulsosVisibles(vel));
    let cant = 0;
    for (let pulso = primerPulso; pulso <= ultimoPulso && cant < V3D_MAX_LINEAS_PULSO; pulso++) {
      const resto = ((pulso % this.#pulsosPorCompas) + this.#pulsosPorCompas) % this.#pulsosPorCompas;
      const esCompas = resto === 0;
      this.#auxObj.position.set(0, 0.008, v3d_calcularZNota(pulso, posVisual, vel));
      this.#auxObj.scale.set(1, esCompas ? 2 : 1, esCompas ? 2.2 : 1);
      this.#auxObj.updateMatrix();
      this.#lineas.setMatrixAt(cant, this.#auxObj.matrix);
      this.#lineas.setColorAt(cant, esCompas ? this.#colorCompas : this.#colorPulso);
      cant++;
    }
    this.#lineas.count = cant;
    this.#lineas.instanceMatrix.needsUpdate = true;
    if (this.#lineas.instanceColor !== null) this.#lineas.instanceColor.needsUpdate = true;

    // Pulso suave del brillo de la línea de golpe.
    this.#matBrilloGolpe.opacity = 0.42 + 0.12 * Math.sin(this.#relojMs / 420);

    // Destellos por carril.
    for (let idx = 0; idx < this.#matsDestello.length; idx++) {
      const mat = this.#matsDestello[idx];
      const color = this.#colorDestello[idx];
      const inicio = this.#inicioDestelloMs[idx] ?? Number.NEGATIVE_INFINITY;
      if (mat === undefined || color === undefined) continue;
      const rel = (this.#relojMs - inicio) / V3D_DUR_DESTELLO_MS;
      mat.opacity = rel >= 0 && rel < 1 ? 0.85 * (1 - rel) : 0;
      mat.color.copy(color);
    }
  }

  liberar(): void {
    this.#lineas.dispose();
    for (const geo of this.#geos) geo.dispose();
    for (const mat of this.#mats) mat.dispose();
    this.#geos.length = 0;
    this.#mats.length = 0;
    this.objeto.clear();
  }

  #registrarGeo<TGeo extends TV3dGeoAutopista>(geo: TGeo): TGeo {
    this.#geos.push(geo);
    return geo;
  }

  #registrarMat<TMat extends TV3dMatAutopista>(mat: TMat): TMat {
    this.#mats.push(mat);
    return mat;
  }
}

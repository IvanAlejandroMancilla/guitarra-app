/**
 * Las 6 cuerdas horizontales en el plano de golpe (z = 0), del color de cada cuerda (6.ª arriba … 1.ª abajo),
 * con un brillo aditivo detrás. Al acertar la cuerda vibra y brilla; al fallar destella en rojo.
 * Las animaciones usan el reloj de cuadros (suma de `deltaMs`), nunca `Date.now()`.
 */
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import { COR_COLOR_ACIERTO, COR_COLOR_FALLO, COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import { V3D_COLOR_SIN_CUERDA, V3D_TRASTES_VISIBLES } from './v3d_constantes';
import { V3D_ANCHO_CASILLA } from './v3d_constantesRocksmith';
import { v3d_calcularXBarraTraste, v3d_calcularYCuerda } from './v3d_geometriaRocksmith';
import type { IV3dCapa } from './v3d_tipos';

const V3D_DUR_VIBRACION_MS = 650;
const V3D_AMPLITUD_VIBRACION = 0.035;
/** Radio de la cuerda 1 y de la 6 (las intermedias se interpolan). */
const V3D_RADIO_CUERDA_MIN = 0.012;
const V3D_RADIO_CUERDA_MAX = 0.03;
const V3D_OPACIDAD_BRILLO_BASE = 0.14;

export class V3dCuerdas implements IV3dCapa {
  readonly objeto = new Group();
  readonly #geoCuerda: CylinderGeometry;
  readonly #geoBrillo: PlaneGeometry;
  readonly #matsCuerda: MeshBasicMaterial[] = [];
  readonly #matsBrillo: MeshBasicMaterial[] = [];
  readonly #mallasCuerda: Mesh[] = [];
  readonly #coloresBase: Color[];
  readonly #coloresMarca: Color[] = [];
  readonly #inicioMarcaMs: number[] = [];
  readonly #esVibracion: boolean[] = [];
  readonly #colorAcierto = new Color(COR_COLOR_ACIERTO);
  readonly #colorFallo = new Color(COR_COLOR_FALLO);
  readonly #colorBlanco = new Color('#ffffff');
  #relojMs = 0;

  constructor(opc: ICorOpcionesVista) {
    // Las cuerdas van de un poco antes de la casilla al aire hasta pasar el traste 24.
    const xIni = v3d_calcularXBarraTraste(0, opc.esZurdo) - (opc.esZurdo ? -1 : 1) * V3D_ANCHO_CASILLA * 1.6;
    const xFin = v3d_calcularXBarraTraste(V3D_TRASTES_VISIBLES, opc.esZurdo) + (opc.esZurdo ? -1 : 1) * V3D_ANCHO_CASILLA * 0.6;
    const largo = Math.abs(xFin - xIni);
    const xCentro = (xIni + xFin) / 2;

    // Cilindro de radio 1 acostado sobre X; cada cuerda lo escala a su grosor.
    this.#geoCuerda = new CylinderGeometry(1, 1, largo, 8, 1, true);
    this.#geoCuerda.rotateZ(Math.PI / 2);
    this.#geoBrillo = new PlaneGeometry(largo, 0.16);
    this.#coloresBase = COR_COLORES_CUERDA.map((hex) => new Color(hex));

    for (let cur = 1; cur <= COR_CANT_CUERDAS; cur++) {
      const colorHex = COR_COLORES_CUERDA[cur - 1] ?? V3D_COLOR_SIN_CUERDA;
      const y = v3d_calcularYCuerda(cur);
      const matCuerda = new MeshBasicMaterial({ color: colorHex });
      const cuerda = new Mesh(this.#geoCuerda, matCuerda);
      const radio = V3D_RADIO_CUERDA_MIN + ((V3D_RADIO_CUERDA_MAX - V3D_RADIO_CUERDA_MIN) * (cur - 1)) / (COR_CANT_CUERDAS - 1);
      cuerda.scale.set(1, radio, radio);
      cuerda.position.set(xCentro, y, 0);
      this.objeto.add(cuerda);

      const matBrillo = new MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: V3D_OPACIDAD_BRILLO_BASE,
        blending: AdditiveBlending,
        depthWrite: false,
      });
      const brillo = new Mesh(this.#geoBrillo, matBrillo);
      brillo.position.set(xCentro, y, -0.02);
      this.objeto.add(brillo);

      this.#matsCuerda.push(matCuerda);
      this.#matsBrillo.push(matBrillo);
      this.#mallasCuerda.push(cuerda);
      this.#coloresMarca.push(new Color(colorHex));
      this.#inicioMarcaMs.push(Number.NEGATIVE_INFINITY);
      this.#esVibracion.push(false);
    }
  }

  /** Acierto: la cuerda vibra y brilla en verde; fallo: destello rojo sin vibrar. */
  marcarCuerda(cur: number, esAcierto: boolean): void {
    if (!Number.isInteger(cur) || cur < 1 || cur > COR_CANT_CUERDAS) return;
    const idx = cur - 1;
    this.#inicioMarcaMs[idx] = this.#relojMs;
    this.#esVibracion[idx] = esAcierto;
    this.#coloresMarca[idx]?.copy(esAcierto ? this.#colorAcierto : this.#colorFallo);
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    for (let idx = 0; idx < this.#mallasCuerda.length; idx++) {
      const cuerda = this.#mallasCuerda[idx];
      const matCuerda = this.#matsCuerda[idx];
      const matBrillo = this.#matsBrillo[idx];
      const colorBase = this.#coloresBase[idx];
      const colorMarca = this.#coloresMarca[idx];
      if (cuerda === undefined || matCuerda === undefined || matBrillo === undefined) continue;
      if (colorBase === undefined || colorMarca === undefined) continue;
      const transcurridoMs = this.#relojMs - (this.#inicioMarcaMs[idx] ?? Number.NEGATIVE_INFINITY);
      const rel = transcurridoMs / V3D_DUR_VIBRACION_MS;
      const yBase = v3d_calcularYCuerda(idx + 1);
      if (rel < 0 || rel >= 1) {
        cuerda.position.y = yBase;
        matCuerda.color.copy(colorBase);
        matBrillo.color.copy(colorBase);
        matBrillo.opacity = V3D_OPACIDAD_BRILLO_BASE;
        continue;
      }
      const intensidad = 1 - rel;
      // Oscilación amortiguada (~22 Hz visuales) solo en los aciertos.
      const vibracion = this.#esVibracion[idx] === true ? Math.sin(transcurridoMs * 0.14) * V3D_AMPLITUD_VIBRACION * intensidad : 0;
      cuerda.position.y = yBase + vibracion;
      matCuerda.color.copy(colorBase).lerp(this.#colorBlanco, 0.6 * intensidad);
      matBrillo.color.copy(colorBase).lerp(colorMarca, intensidad);
      matBrillo.opacity = V3D_OPACIDAD_BRILLO_BASE + 0.75 * intensidad;
    }
  }

  liberar(): void {
    this.#geoCuerda.dispose();
    this.#geoBrillo.dispose();
    for (const mat of this.#matsCuerda) mat.dispose();
    for (const mat of this.#matsBrillo) mat.dispose();
    this.#matsCuerda.length = 0;
    this.#matsBrillo.length = 0;
    this.#mallasCuerda.length = 0;
    this.objeto.clear();
  }
}

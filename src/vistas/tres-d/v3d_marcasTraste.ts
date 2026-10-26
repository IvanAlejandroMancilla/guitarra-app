/**
 * Regla del mástil delante de la línea de golpe: casillas numeradas 0..V3D_TRASTES_VISIBLES con las
 * marcas de incrustación habituales, y un resaltado sobre el traste de la próxima nota esperada.
 * La textura numerada se dibuja una sola vez.
 */
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import { V3D_COLOR_SIN_CUERDA, V3D_TRASTES_VISIBLES } from './v3d_constantes';
import { v3d_calcularAnchoRegla, v3d_calcularXTraste } from './v3d_geometria';
import type { IV3dCapa } from './v3d_tipos';

const V3D_PROFUNDIDAD_REGLA = 0.6;
const V3D_Z_REGLA = 0.75;
const V3D_TRASTES_CON_MARCA: readonly number[] = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const V3D_ANCHO_TEXTURA_REGLA = 2048;
const V3D_ALTO_TEXTURA_REGLA = 128;

const crearTexturaRegla = (esZurdo: boolean): CanvasTexture => {
  const lienzo = document.createElement('canvas');
  lienzo.width = V3D_ANCHO_TEXTURA_REGLA;
  lienzo.height = V3D_ALTO_TEXTURA_REGLA;
  const ctx = lienzo.getContext('2d');
  const cantCasillas = V3D_TRASTES_VISIBLES + 1;
  const anchoCasilla = V3D_ANCHO_TEXTURA_REGLA / cantCasillas;
  if (ctx !== null) {
    ctx.fillStyle = 'rgba(12,16,32,0.92)';
    ctx.fillRect(0, 0, V3D_ANCHO_TEXTURA_REGLA, V3D_ALTO_TEXTURA_REGLA);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let trs = 0; trs <= V3D_TRASTES_VISIBLES; trs++) {
      const idxCasilla = esZurdo ? V3D_TRASTES_VISIBLES - trs : trs;
      const xIni = idxCasilla * anchoCasilla;
      // Separador de traste (el 0 = cejuela, más grueso).
      ctx.fillStyle = trs === 0 ? '#e8ecf5' : '#59627f';
      const xSep = esZurdo ? xIni : xIni + anchoCasilla;
      ctx.fillRect(xSep - (trs === 0 ? 4 : 1.5), 0, trs === 0 ? 8 : 3, V3D_ALTO_TEXTURA_REGLA);
      if (V3D_TRASTES_CON_MARCA.includes(trs)) {
        ctx.fillStyle = 'rgba(232,236,245,0.25)';
        const cantPuntos = trs === 12 || trs === 24 ? 2 : 1;
        for (let k = 0; k < cantPuntos; k++) {
          const yPunto = cantPuntos === 1 ? 100 : 92 + k * 18;
          ctx.beginPath();
          ctx.arc(xIni + anchoCasilla / 2, yPunto, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#d6dcf0';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText(String(trs), xIni + anchoCasilla / 2, 46);
    }
  }
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
};

export class V3dMarcasTraste implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  readonly #anchoRegla = v3d_calcularAnchoRegla();
  readonly #geoRegla: PlaneGeometry;
  readonly #geoResaltado: PlaneGeometry;
  readonly #textura: CanvasTexture;
  readonly #matRegla: MeshBasicMaterial;
  readonly #matResaltado = new MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.6,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  readonly #resaltado: Mesh;
  readonly #coloresCuerda: Color[];
  #relojMs = 0;

  constructor(opc: ICorOpcionesVista) {
    this.#opc = { ...opc };
    this.#coloresCuerda = [...COR_COLORES_CUERDA, V3D_COLOR_SIN_CUERDA].map((hex) => new Color(hex));
    this.#geoRegla = new PlaneGeometry(this.#anchoRegla, V3D_PROFUNDIDAD_REGLA);
    this.#textura = crearTexturaRegla(this.#opc.esZurdo);
    this.#matRegla = new MeshBasicMaterial({ map: this.#textura, transparent: true, depthWrite: false });
    const regla = new Mesh(this.#geoRegla, this.#matRegla);
    regla.rotation.x = -Math.PI / 2;
    regla.position.set(0, 0.004, V3D_Z_REGLA);
    this.objeto.add(regla);

    const anchoCasilla = this.#anchoRegla / (V3D_TRASTES_VISIBLES + 1);
    this.#geoResaltado = new PlaneGeometry(anchoCasilla * 0.96, V3D_PROFUNDIDAD_REGLA * 0.96);
    this.#resaltado = new Mesh(this.#geoResaltado, this.#matResaltado);
    this.#resaltado.rotation.x = -Math.PI / 2;
    this.#resaltado.position.set(0, 0.008, V3D_Z_REGLA);
    this.#resaltado.visible = false;
    this.objeto.add(this.#resaltado);
  }

  /** Resalta el traste de la próxima nota (color de su cuerda). `undefined` lo oculta. */
  fijarTrasteActivo(trs: number | undefined, cur: number | undefined): void {
    if (trs === undefined || !Number.isFinite(trs)) {
      this.#resaltado.visible = false;
      return;
    }
    const esCuerdaValida = cur !== undefined && Number.isInteger(cur) && cur >= 1 && cur <= COR_COLORES_CUERDA.length;
    const color = this.#coloresCuerda[esCuerdaValida ? cur - 1 : COR_COLORES_CUERDA.length];
    if (color !== undefined) this.#matResaltado.color.copy(color);
    this.#resaltado.position.x = v3d_calcularXTraste(trs, this.#anchoRegla, this.#opc.esZurdo);
    this.#resaltado.visible = true;
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    if (this.#resaltado.visible) this.#matResaltado.opacity = 0.45 + 0.25 * Math.sin(this.#relojMs / 180);
  }

  liberar(): void {
    this.#geoRegla.dispose();
    this.#geoResaltado.dispose();
    this.#matRegla.dispose();
    this.#matResaltado.dispose();
    this.#textura.dispose();
    this.objeto.clear();
  }
}

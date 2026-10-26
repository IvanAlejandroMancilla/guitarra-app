/** Vista del afinador (Canvas 2D): aguja de cents, nota, cuerda objetivo y onda en vivo. */
import type { ICorBus, ICorCuadro, ICorOpcionesVista, ICorVista } from '../../core/cor_contratos';
import { COR_COLOR_ACIERTO } from '../../core/cor_colores';
import type { IAfnLectura } from '../../core/cor_eventos';
import { vc2_calcularGeometria } from './vc2_geometria';
import { Vc2Lienzo } from './vc2_lienzo';
import { Vc2Onda } from './vc2_onda';
import { Vc2PanelAfinador } from './vc2_panelAfinador';
import type { IVc2Geometria } from './vc2_tipos';

/** Sin lecturas nuevas durante este tiempo, el panel vuelve a reposo. */
const VC2_VIGENCIA_LECTURA_MS = 1500;
const VC2_COLOR_ONDA_AFINADOR = '#4de1ff';

export class Vc2VistaAfinador implements ICorVista {
  readonly #bus: ICorBus;
  readonly #lienzo = new Vc2Lienzo();
  readonly #panel = new Vc2PanelAfinador();
  readonly #onda = new Vc2Onda();
  #opc: ICorOpcionesVista;
  #geo: IVc2Geometria;
  #lectura: IAfnLectura | null = null;
  #cancelaciones: (() => void)[] = [];

  constructor(bus: ICorBus, opc: ICorOpcionesVista) {
    this.#bus = bus;
    this.#opc = { ...opc };
    this.#geo = vc2_calcularGeometria(1, 1, opc);
    this.#panel.fijarNotacion(opc.notacion);
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.#cancelaciones = [
      this.#bus.suscribir('afn:lectura', (lectura) => {
        this.#lectura = lectura;
      }),
      this.#bus.suscribir('aud:onda', (onda) => this.#onda.fijarMuestras(onda.muestras)),
    ];
    this.#lienzo.montar(contenedor, (anchoPx, altoPx) => this.redimensionar(anchoPx, altoPx));
    return Promise.resolve();
  }

  desmontar(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
    this.#lienzo.desmontar();
    this.#lectura = null;
  }

  redimensionar(anchoPx: number, altoPx: number): void {
    this.#lienzo.redimensionar(anchoPx, altoPx);
    this.#geo = vc2_calcularGeometria(anchoPx, altoPx, this.#opc);
  }

  actualizarOpciones(opc: ICorOpcionesVista): void {
    this.#opc = { ...opc };
    this.#geo = vc2_calcularGeometria(this.#geo.anchoPx, this.#geo.altoPx, opc);
    this.#panel.fijarNotacion(opc.notacion);
  }

  dibujar(cuadro: ICorCuadro): void {
    const ctx = this.#lienzo.obtenerCtx();
    if (ctx === null) return;
    const geo = this.#geo;
    const lectura = this.#lectura;
    const esVigente = lectura !== null && cuadro.tiempoCtxMs - lectura.tiempoMs <= VC2_VIGENCIA_LECTURA_MS;
    this.#panel.fijarLectura(esVigente ? lectura : null);

    const fondo = ctx.createRadialGradient(geo.anchoPx / 2, geo.altoPx * 0.4, 10, geo.anchoPx / 2, geo.altoPx * 0.4, Math.max(geo.anchoPx, geo.altoPx));
    fondo.addColorStop(0, '#0d1424');
    fondo.addColorStop(1, '#03050a');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, geo.anchoPx, geo.altoPx);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#8c97b0';
    ctx.font = `600 ${Math.round(Math.min(Math.max(geo.anchoPx / 45, 13), 18))}px system-ui, sans-serif`;
    ctx.fillText('Afinador', 16, 14);

    this.#panel.dibujar(ctx, cuadro, geo);
    this.#onda.fijarColor(esVigente && lectura.esAfinado ? COR_COLOR_ACIERTO : VC2_COLOR_ONDA_AFINADOR);
    this.#onda.dibujar(ctx, cuadro, geo);
  }
}

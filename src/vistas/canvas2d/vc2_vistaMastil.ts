/**
 * Mástil con dedeo (franja baja de la pantalla de práctica, ~130–170 px de alto): diagrama de
 * 6 cuerdas × trastes 0–12 (o la zona necesaria) que marca la nota esperada con su dedo y su
 * nombre, y las siguientes más tenues. Para notas sin cuerda/traste marca todas sus posiciones.
 * Solo consume eventos del bus; redibuja únicamente cuando algo cambió.
 */
import type { ICorBus, ICorOpcionesVista, ICorVista } from '../../core/cor_contratos';
import type { IAfinacion, IEjercicio } from '../../core/tipos';
import { Vc2DiagramaMastil } from './vc2_diagramaMastil';
import { vc2_calcularGeoMastil, vc2_calcularRangoMastil } from './vc2_geometriaMastil';
import { Vc2Lienzo } from './vc2_lienzo';
import { vc2_crearMarcasMastil } from './vc2_marcasMastil';
import { Vc2MarcasDedo } from './vc2_marcasDedo';
import type { IVc2CapaMastil, IVc2GeoMastil, IVc2RangoMastil } from './vc2_tipos';

const VC2_COLOR_FONDO_VISTA_MASTIL = '#05070d';
const VC2_COLOR_TEXTO_VACIO = '#8c97b0';
const VC2_ETIQUETA_LIENZO_MASTIL = 'Mástil con la digitación de la nota esperada';

export class Vc2VistaMastil implements ICorVista {
  readonly #bus: ICorBus;
  readonly #lienzo = new Vc2Lienzo();
  readonly #diagrama = new Vc2DiagramaMastil();
  readonly #marcasDedo = new Vc2MarcasDedo();
  readonly #capas: readonly IVc2CapaMastil[] = [this.#diagrama, this.#marcasDedo];
  #opc: ICorOpcionesVista;
  #afinBase: IAfinacion;
  #cancelaciones: (() => void)[] = [];

  #ej: IEjercicio | null = null;
  #idxEsperada = -1;
  #rango: IVc2RangoMastil = vc2_calcularRangoMastil([]);
  #geo: IVc2GeoMastil;
  #esSucio = true;

  constructor(bus: ICorBus, opc: ICorOpcionesVista, afin: IAfinacion) {
    this.#bus = bus;
    this.#opc = { ...opc };
    this.#afinBase = afin;
    this.#geo = vc2_calcularGeoMastil(1, 1, this.#rango, opc.esZurdo);
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.#cancelaciones = [
      this.#bus.suscribir('ejr:cargado', (cargado) => this.#cargar(cargado.ej)),
      this.#bus.suscribir('ejr:esperada', (esperada) => {
        this.#idxEsperada = esperada.nota === null ? -1 : esperada.idxNota;
        this.#actualizarMarcas();
      }),
    ];
    const cargado = this.#bus.obtenerUltimo('ejr:cargado');
    if (cargado !== undefined) this.#cargar(cargado.ej);
    const esperada = this.#bus.obtenerUltimo('ejr:esperada');
    if (esperada !== undefined && this.#ej !== null) {
      this.#idxEsperada = esperada.nota === null ? -1 : esperada.idxNota;
      this.#actualizarMarcas();
    }
    this.#lienzo.montar(contenedor, (anchoPx, altoPx) => this.redimensionar(anchoPx, altoPx));
    const lienzo = contenedor.lastElementChild;
    if (lienzo instanceof HTMLCanvasElement) lienzo.setAttribute('aria-label', VC2_ETIQUETA_LIENZO_MASTIL);
    this.#esSucio = true;
    return Promise.resolve();
  }

  desmontar(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
    this.#lienzo.desmontar();
  }

  redimensionar(anchoPx: number, altoPx: number): void {
    this.#lienzo.redimensionar(anchoPx, altoPx);
    this.#geo = vc2_calcularGeoMastil(anchoPx, altoPx, this.#rango, this.#opc.esZurdo);
    // Cambiar el tamaño del canvas borra su contenido: siempre hay que redibujar.
    this.#esSucio = true;
  }

  actualizarOpciones(opc: ICorOpcionesVista): void {
    const esCambio = opc.esZurdo !== this.#opc.esZurdo || opc.notacion !== this.#opc.notacion;
    this.#opc = { ...opc };
    if (!esCambio) return;
    this.#geo = vc2_calcularGeoMastil(this.#geo.anchoPx, this.#geo.altoPx, this.#rango, opc.esZurdo);
    this.#actualizarMarcas();
  }

  /** Afinación por defecto (configuración). La del ejercicio, si trae, tiene prioridad. */
  fijarAfinacion(afin: IAfinacion): void {
    this.#afinBase = afin;
    this.#actualizarMarcas();
  }

  /** Barato si nada cambió (no usa el cuadro: el mástil no se anima). */
  dibujar(): void {
    if (!this.#esSucio) return;
    const ctx = this.#lienzo.obtenerCtx();
    if (ctx === null) return;
    this.#esSucio = false;
    const geo = this.#geo;
    ctx.fillStyle = VC2_COLOR_FONDO_VISTA_MASTIL;
    ctx.fillRect(0, 0, geo.anchoPx, geo.altoPx);
    for (const capa of this.#capas) capa.dibujar(ctx, geo);
    if (this.#ej === null) this.#dibujarAviso(ctx, geo, 'Elige un ejercicio: aquí verás dónde poner cada dedo');
    else if (this.#idxEsperada < 0) this.#dibujarAviso(ctx, geo, '¡Ejercicio completado!');
  }

  readonly #cargar = (ej: IEjercicio): void => {
    this.#ej = ej;
    this.#idxEsperada = ej.notas.length > 0 ? 0 : -1;
    const trsNotas: number[] = [];
    for (const nota of ej.notas) if (nota.trs !== undefined) trsNotas.push(nota.trs);
    this.#rango = vc2_calcularRangoMastil(trsNotas);
    this.#geo = vc2_calcularGeoMastil(this.#geo.anchoPx, this.#geo.altoPx, this.#rango, this.#opc.esZurdo);
    this.#actualizarMarcas();
  };

  readonly #actualizarMarcas = (): void => {
    const ej = this.#ej;
    const afin = ej?.afinacion ?? this.#afinBase;
    this.#marcasDedo.fijarMarcas(ej === null ? [] : vc2_crearMarcasMastil(ej.notas, this.#idxEsperada, afin, this.#opc.notacion));
    this.#esSucio = true;
  };

  readonly #dibujarAviso = (ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil, texto: string): void => {
    const tam = Math.round(Math.max(12, Math.min(16, geo.altoPx * 0.1)));
    ctx.font = `600 ${tam}px system-ui, sans-serif`;
    const ancho = ctx.measureText(texto).width + tam * 1.6;
    const alto = tam * 2;
    const x = (geo.anchoPx - ancho) / 2;
    const y = (geo.altoPx - alto) / 2;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, ancho, alto, alto / 2);
    ctx.fillStyle = 'rgba(5, 7, 13, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(80, 140, 255, 0.45)';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = VC2_COLOR_TEXTO_VACIO;
    ctx.fillText(texto, geo.anchoPx / 2, geo.altoPx / 2 + 1);
  };
}

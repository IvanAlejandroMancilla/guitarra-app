/**
 * Vista liviana Canvas 2D (estilo autopista oscura): carriles por cuerda, línea de golpe,
 * notas con traste y nombre, partículas al acertar, destello rojo al fallar, onda en vivo
 * e indicador de la nota detectada. Solo consume eventos del bus.
 *
 * Posición dibujada: con el reloj en marcha, `cuadro.posPulsos`; detenido o en pausa
 * ("nota por nota"), se desliza hasta dejar la nota esperada sobre la línea de golpe.
 */
import type { ICorBus, ICorCuadro, ICorOpcionesVista, ICorVista } from '../../core/cor_contratos';
import { COR_COLORES_CUERDA, COR_COLOR_ACIERTO, COR_COLOR_FALLO } from '../../core/cor_colores';
import type { IDetNotaDetectada, IEjrResultado, TCorNombreEvento } from '../../core/cor_eventos';
import { cor_obtenerEtiquetaNota } from '../../core/cor_notas';
import type { IEjercicio, INota } from '../../core/tipos';
import { Vc2Carriles } from './vc2_carriles';
import { vc2_calcularGeometria, vc2_calcularXCarril } from './vc2_geometria';
import { Vc2LineaGolpe } from './vc2_lineaGolpe';
import { Vc2Lienzo } from './vc2_lienzo';
import { Vc2Notas } from './vc2_notas';
import { Vc2Onda } from './vc2_onda';
import { Vc2Particulas } from './vc2_particulas';
import type { IVc2Geometria } from './vc2_tipos';

const VC2_DUR_DESTELLO_MS = 320;
const VC2_DUR_RESALTE_MS = 450;
const VC2_COLOR_TEXTO = '#e6ecf8';
const VC2_COLOR_TEXTO_SUAVE = '#8c97b0';

export class Vc2Vista implements ICorVista {
  readonly #bus: ICorBus;
  readonly #lienzo = new Vc2Lienzo();
  readonly #carriles = new Vc2Carriles();
  readonly #lineaGolpe = new Vc2LineaGolpe();
  readonly #notas = new Vc2Notas();
  readonly #particulas = new Vc2Particulas();
  readonly #onda = new Vc2Onda();
  #opc: ICorOpcionesVista;
  #geo: IVc2Geometria;
  #cancelaciones: (() => void)[] = [];

  #ej: IEjercicio | null = null;
  #esperada: INota | null = null;
  #esReproduciendo = false;
  #posVisual = 0;
  #esPosPendiente = true;

  #destelloMs = 0;
  #intensidadDestello = 1;
  #notaDetectada: IDetNotaDetectada | null = null;
  #esSilencio = true;
  #alfaDetectada = 0;
  #colorResalte = VC2_COLOR_TEXTO;
  #resalteMs = 0;

  constructor(bus: ICorBus, opc: ICorOpcionesVista) {
    this.#bus = bus;
    this.#opc = { ...opc };
    this.#geo = vc2_calcularGeometria(1, 1, opc);
    this.#notas.fijarNotacion(opc.notacion);
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.#cancelaciones = [
      this.#bus.suscribir('ejr:cargado', (cargado) => this.#cargar(cargado.ej)),
      this.#bus.suscribir('ejr:esperada', (esperada) => {
        this.#esperada = esperada.nota;
      }),
      this.#bus.suscribir('ejr:acierto', this.#procesarAcierto),
      this.#bus.suscribir('ejr:fallo', this.#procesarFallo),
      this.#bus.suscribir('aud:onda', (onda) => this.#onda.fijarMuestras(onda.muestras)),
      this.#bus.suscribir('det:nota', (nota) => {
        this.#notaDetectada = nota;
        this.#esSilencio = false;
        this.#alfaDetectada = 1;
      }),
      this.#bus.suscribir('det:silencio', () => {
        this.#esSilencio = true;
      }),
      this.#bus.suscribir('tmp:inicio', () => {
        this.#esReproduciendo = true;
      }),
      this.#bus.suscribir('tmp:pausa', () => {
        this.#esReproduciendo = false;
      }),
      this.#bus.suscribir('tmp:detencion', () => {
        this.#esReproduciendo = false;
        this.#reiniciarResultados();
      }),
      this.#bus.suscribir('tmp:posicion', () => this.#reiniciarResultados()),
    ];
    const cargado = this.#bus.obtenerUltimo('ejr:cargado');
    if (cargado !== undefined) this.#cargar(cargado.ej);
    const esperada = this.#bus.obtenerUltimo('ejr:esperada');
    if (esperada !== undefined) this.#esperada = esperada.nota;
    this.#esReproduciendo = this.#obtenerUltimoTransporte() === 'tmp:inicio';
    this.#lienzo.montar(contenedor, (anchoPx, altoPx) => this.redimensionar(anchoPx, altoPx));
    return Promise.resolve();
  }

  desmontar(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
    this.#lienzo.desmontar();
  }

  redimensionar(anchoPx: number, altoPx: number): void {
    this.#lienzo.redimensionar(anchoPx, altoPx);
    this.#geo = vc2_calcularGeometria(anchoPx, altoPx, this.#opc);
  }

  actualizarOpciones(opc: ICorOpcionesVista): void {
    this.#opc = { ...opc };
    this.#geo = vc2_calcularGeometria(this.#geo.anchoPx, this.#geo.altoPx, opc);
    this.#notas.fijarNotacion(opc.notacion);
  }

  dibujar(cuadro: ICorCuadro): void {
    const ctx = this.#lienzo.obtenerCtx();
    if (ctx === null) return;
    const geo = this.#geo;
    this.#actualizarPosVisual(cuadro);
    const cuadroVisual: ICorCuadro = { ...cuadro, posPulsos: this.#posVisual };

    this.#carriles.dibujar(ctx, cuadroVisual, geo);
    this.#lineaGolpe.dibujar(ctx, cuadroVisual, geo);
    this.#notas.dibujar(ctx, cuadroVisual, geo);
    this.#dibujarDesvanecimientoSuperior(ctx, geo);
    this.#particulas.dibujar(ctx, cuadroVisual);
    this.#onda.dibujar(ctx, cuadroVisual, geo);
    this.#dibujarEncabezado(ctx, cuadro, geo);
    this.#dibujarIndicador(ctx, cuadro, geo);
    this.#dibujarDestello(ctx, cuadro, geo);
  }

  readonly #cargar = (ej: IEjercicio): void => {
    this.#ej = ej;
    this.#notas.cargar(ej);
    this.#carriles.fijarPulsosPorCompas(ej.pulsosPorCompas ?? 4);
    this.#esperada = ej.notas[0] ?? null;
    this.#esPosPendiente = true;
  };

  readonly #reiniciarResultados = (): void => {
    if (this.#ej !== null) this.#notas.cargar(this.#ej);
  };

  readonly #obtenerUltimoTransporte = (): TCorNombreEvento | null => {
    let ultimo: TCorNombreEvento | null = null;
    let tiempoUltimo = -Infinity;
    for (const evento of ['tmp:inicio', 'tmp:pausa', 'tmp:detencion'] as const) {
      const payload = this.#bus.obtenerUltimo(evento);
      if (payload !== undefined && payload.tiempoMs >= tiempoUltimo) {
        ultimo = evento;
        tiempoUltimo = payload.tiempoMs;
      }
    }
    return ultimo;
  };

  readonly #actualizarPosVisual = (cuadro: ICorCuadro): void => {
    if (this.#esReproduciendo || this.#ej === null) {
      this.#posVisual = cuadro.posPulsos;
      this.#esPosPendiente = false;
      return;
    }
    const objetivo = this.#esperada?.tiempo ?? cuadro.posPulsos;
    if (this.#esPosPendiente) {
      this.#posVisual = objetivo;
      this.#esPosPendiente = false;
      return;
    }
    this.#posVisual += (objetivo - this.#posVisual) * Math.min(1, cuadro.deltaMs / 160);
  };

  readonly #procesarAcierto = (resultado: IEjrResultado): void => {
    this.#notas.marcarResultado(resultado.idxNota, true);
    const color = COR_COLORES_CUERDA[(resultado.nota.cur ?? 0) - 1] ?? COR_COLOR_ACIERTO;
    this.#particulas.crearExplosion(vc2_calcularXCarril(resultado.nota.cur, this.#geo), this.#geo.yGolpePx, color);
    this.#colorResalte = COR_COLOR_ACIERTO;
    this.#resalteMs = VC2_DUR_RESALTE_MS;
  };

  readonly #procesarFallo = (resultado: IEjrResultado): void => {
    // En "nota por nota" el fallo no resuelve la nota: se puede seguir intentando.
    if (this.#esReproduciendo || resultado.motivo === 'omitida') this.#notas.marcarResultado(resultado.idxNota, false);
    this.#destelloMs = VC2_DUR_DESTELLO_MS;
    this.#intensidadDestello = resultado.motivo === 'omitida' ? 0.5 : 1;
    if (resultado.detectada !== null) {
      this.#colorResalte = COR_COLOR_FALLO;
      this.#resalteMs = VC2_DUR_RESALTE_MS;
    }
  };

  readonly #dibujarDesvanecimientoSuperior = (ctx: CanvasRenderingContext2D, geo: IVc2Geometria): void => {
    const alto = geo.yGolpePx * 0.22;
    const degradado = ctx.createLinearGradient(0, 0, 0, alto);
    degradado.addColorStop(0, 'rgba(2, 3, 8, 1)');
    degradado.addColorStop(1, 'rgba(2, 3, 8, 0)');
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, geo.anchoPx, alto);
  };

  readonly #dibujarEncabezado = (ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void => {
    const centroX = geo.anchoPx / 2;
    const tamBase = Math.round(Math.min(Math.max(geo.anchoPx / 45, 13), 20));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ej = this.#ej;
    if (ej === null) {
      ctx.fillStyle = VC2_COLOR_TEXTO;
      ctx.font = `700 ${Math.round(tamBase * 1.4)}px system-ui, sans-serif`;
      ctx.fillText('Elige un ejercicio o una escala para empezar', centroX, geo.yGolpePx * 0.38);
      ctx.fillStyle = VC2_COLOR_TEXTO_SUAVE;
      ctx.font = `400 ${tamBase}px system-ui, sans-serif`;
      ctx.fillText('Mientras tanto, toca cualquier nota: aparecerá arriba a la izquierda.', centroX, geo.yGolpePx * 0.38 + tamBase * 2.2);
      return;
    }
    ctx.fillStyle = VC2_COLOR_TEXTO;
    ctx.font = `700 ${Math.round(tamBase * 1.15)}px system-ui, sans-serif`;
    ctx.fillText(ej.titulo, centroX, 14);
    ctx.fillStyle = VC2_COLOR_TEXTO_SUAVE;
    ctx.font = `500 ${tamBase * 0.85}px system-ui, sans-serif`;
    let estado: string;
    if (this.#esperada === null) estado = '¡Ejercicio completado!';
    else if (this.#esReproduciendo) estado = `${Math.round(cuadro.bpm)} BPM`;
    else estado = 'Nota por nota: toca la nota sobre la línea o inicia la reproducción';
    ctx.fillText(estado, centroX, 14 + tamBase * 1.5);

    const esperada = this.#esperada;
    if (esperada !== null) {
      ctx.textAlign = 'right';
      ctx.fillStyle = VC2_COLOR_TEXTO_SUAVE;
      ctx.font = `500 ${tamBase * 0.8}px system-ui, sans-serif`;
      ctx.fillText('Siguiente', geo.anchoPx - 16, 14);
      ctx.fillStyle = COR_COLORES_CUERDA[(esperada.cur ?? 0) - 1] ?? VC2_COLOR_TEXTO;
      ctx.font = `800 ${Math.round(tamBase * 1.6)}px system-ui, sans-serif`;
      ctx.fillText(cor_obtenerEtiquetaNota(esperada.nombre, esperada.oct, this.#opc.notacion), geo.anchoPx - 16, 14 + tamBase);
      if (esperada.cur !== undefined && esperada.trs !== undefined) {
        ctx.fillStyle = VC2_COLOR_TEXTO_SUAVE;
        ctx.font = `500 ${tamBase * 0.8}px system-ui, sans-serif`;
        ctx.fillText(`cuerda ${esperada.cur}, traste ${esperada.trs}`, geo.anchoPx - 16, 14 + tamBase * 2.9);
      }
    }
  };

  readonly #dibujarIndicador = (ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void => {
    if (this.#esSilencio) this.#alfaDetectada = Math.max(0.25, this.#alfaDetectada - cuadro.deltaMs / 600);
    this.#resalteMs = Math.max(0, this.#resalteMs - cuadro.deltaMs);
    const tamBase = Math.round(Math.min(Math.max(geo.anchoPx / 45, 13), 20));
    const nota = this.#notaDetectada;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = VC2_COLOR_TEXTO_SUAVE;
    ctx.font = `500 ${tamBase * 0.8}px system-ui, sans-serif`;
    ctx.fillText('Nota detectada', 16, 14);
    ctx.font = `800 ${Math.round(tamBase * 2.2)}px system-ui, sans-serif`;
    if (nota === null) {
      ctx.fillStyle = '#3a4258';
      ctx.fillText('—', 16, 14 + tamBase);
      return;
    }
    ctx.globalAlpha = this.#alfaDetectada;
    ctx.fillStyle = this.#resalteMs > 0 ? this.#colorResalte : VC2_COLOR_TEXTO;
    ctx.fillText(cor_obtenerEtiquetaNota(nota.nombre, nota.oct, this.#opc.notacion), 16, 14 + tamBase);
    ctx.fillStyle = VC2_COLOR_TEXTO_SUAVE;
    ctx.font = `500 ${tamBase * 0.75}px system-ui, sans-serif`;
    ctx.fillText(`${nota.frecHz.toFixed(1)} Hz`, 16, 14 + tamBase * 3.5);
    ctx.globalAlpha = 1;
  };

  readonly #dibujarDestello = (ctx: CanvasRenderingContext2D, cuadro: ICorCuadro, geo: IVc2Geometria): void => {
    if (this.#destelloMs <= 0) return;
    this.#destelloMs = Math.max(0, this.#destelloMs - cuadro.deltaMs);
    const rel = this.#destelloMs / VC2_DUR_DESTELLO_MS;
    const radio = Math.hypot(geo.anchoPx, geo.altoPx) / 2;
    const degradado = ctx.createRadialGradient(geo.anchoPx / 2, geo.yGolpePx, radio * 0.25, geo.anchoPx / 2, geo.yGolpePx, radio);
    degradado.addColorStop(0, 'rgba(255, 77, 77, 0)');
    degradado.addColorStop(1, COR_COLOR_FALLO);
    ctx.globalAlpha = 0.4 * rel * this.#intensidadDestello;
    ctx.fillStyle = degradado;
    ctx.fillRect(0, 0, geo.anchoPx, geo.altoPx);
    ctx.globalAlpha = 1;
  };
}

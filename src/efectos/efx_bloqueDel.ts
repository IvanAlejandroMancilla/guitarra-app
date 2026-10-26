/**
 * DEL: delay con realimentación filtrada.
 *   entrada ─┬───────────────────────────────────────────────┬─ salida
 *            └→ DelayNode → filtros → color ─┬→ húmedo (mezcla) ┘
 *                  ↑                          └→ realimentación ┘
 * - `digital`: repeticiones limpias (pasa bajos 12 kHz).
 * - `analogico`: más oscuras y con saturación suave en el lazo (pasa bajos 2.8 kHz), leve modulación.
 * - `modulado`: LFO al tiempo de retardo (`profundidad` 0..4 ms, `velocidad` 0.1..5 Hz).
 * `tiempo` 40 ms..1.5 s (exponencial); `realimentacion` 0..0.9; `mezcla` 0..1 (la señal seca siempre pasa).
 */
import type { IEfxParametrosDel, TEfxModeloDel } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { EFX_TAM_CURVA } from './efx_constantes';
import { efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio } from './efx_tipos';

interface IEfxModeloDelay {
  frecPasaBajosHz: number;
  frecPasaAltosHz: number;
  /** Saturación suave en el lazo (tanh con pendiente 1: no agrega ganancia a las repeticiones). */
  tieneColor: boolean;
  /** Modulación fija del modelo (además de la del modelo `modulado`). */
  profundidadFijaSeg: number;
  velocidadFijaHz: number;
}

const EFX_MODELOS_DELAY: Readonly<Record<TEfxModeloDel, IEfxModeloDelay>> = {
  digital: { frecPasaBajosHz: 12000, frecPasaAltosHz: 60, tieneColor: false, profundidadFijaSeg: 0, velocidadFijaHz: 0.5 },
  analogico: { frecPasaBajosHz: 2800, frecPasaAltosHz: 120, tieneColor: true, profundidadFijaSeg: 0.0003, velocidadFijaHz: 0.6 },
  modulado: { frecPasaBajosHz: 6000, frecPasaAltosHz: 80, tieneColor: false, profundidadFijaSeg: 0, velocidadFijaHz: 0.5 },
};

const EFX_RETARDO_MAX_SEG = 2;

/** tanh(x): pendiente 1 en el origen, limita con suavidad cerca de ±1. */
const crearCurvaColor = (): Float32Array<ArrayBuffer> => {
  const curva = new Float32Array(EFX_TAM_CURVA);
  for (let i = 0; i < EFX_TAM_CURVA; i++) curva[i] = Math.tanh((i * 2) / (EFX_TAM_CURVA - 1) - 1);
  return curva;
};
const EFX_REALIMENTACION_MAX = 0.9;
const EFX_PROFUNDIDAD_MAX_SEG = 0.004;

export class EfxBloqueDel implements IEfxBloqueAudio<TEfxModeloDel, IEfxParametrosDel> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #entradaEfecto: GainNode;
  readonly #seco: GainNode;
  readonly #retardo: DelayNode;
  readonly #pasaBajos: BiquadFilterNode;
  readonly #pasaAltos: BiquadFilterNode;
  readonly #color: WaveShaperNode;
  readonly #realimentacion: GainNode;
  readonly #humedo: GainNode;
  readonly #lfo: OscillatorNode;
  readonly #profundidadLfo: GainNode;
  readonly #salidaEfecto: GainNode;
  #modelo: TEfxModeloDel = 'digital';
  #parametros: Readonly<IEfxParametrosDel> | null = null;

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    this.#entradaEfecto = ctx.createGain();
    this.#salidaEfecto = ctx.createGain();
    this.#seco = ctx.createGain();
    this.#retardo = ctx.createDelay(EFX_RETARDO_MAX_SEG);
    this.#retardo.delayTime.value = 0.35;
    this.#pasaBajos = ctx.createBiquadFilter();
    this.#pasaBajos.type = 'lowpass';
    this.#pasaBajos.Q.value = -3;
    this.#pasaAltos = ctx.createBiquadFilter();
    this.#pasaAltos.type = 'highpass';
    this.#pasaAltos.Q.value = -3;
    this.#color = ctx.createWaveShaper();
    this.#realimentacion = ctx.createGain();
    this.#realimentacion.gain.value = 0;
    this.#humedo = ctx.createGain();
    this.#humedo.gain.value = 0;
    this.#lfo = ctx.createOscillator();
    this.#lfo.type = 'sine';
    this.#profundidadLfo = ctx.createGain();
    this.#profundidadLfo.gain.value = 0;

    this.#entradaEfecto.connect(this.#seco).connect(this.#salidaEfecto);
    this.#entradaEfecto.connect(this.#retardo).connect(this.#pasaBajos).connect(this.#pasaAltos).connect(this.#color);
    this.#color.connect(this.#humedo).connect(this.#salidaEfecto);
    this.#color.connect(this.#realimentacion).connect(this.#retardo);
    this.#lfo.connect(this.#profundidadLfo).connect(this.#retardo.delayTime);
    this.#lfo.start();

    this.#conmutador.conectarEfecto(this.#entradaEfecto, this.#salidaEfecto);
    this.#aplicarModelo();
  }

  fijarModelo(modelo: TEfxModeloDel): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    this.#aplicarModelo();
  }

  fijarParametros(parametros: Readonly<IEfxParametrosDel>): void {
    this.#parametros = { ...parametros };
    const ctx = this.#ctx;
    efx_fijarParametro(this.#retardo.delayTime, efx_convertirRelAExponencial(parametros.tiempo, 0.04, 1.5), ctx);
    efx_fijarParametro(this.#realimentacion.gain, efx_convertirRelALineal(parametros.realimentacion, 0, EFX_REALIMENTACION_MAX), ctx);
    efx_fijarParametro(this.#humedo.gain, efx_convertirRelALineal(parametros.mezcla, 0, 1), ctx);
    this.#aplicarModulacion();
  }

  fijarActivo(esActivo: boolean): void {
    this.#conmutador.fijarActivo(esActivo);
  }

  esActivo(): boolean {
    return this.#conmutador.esActivo();
  }

  liberar(): void {
    this.#conmutador.liberar();
    this.#lfo.stop();
    for (const nodo of [
      this.#entradaEfecto, this.#seco, this.#retardo, this.#pasaBajos, this.#pasaAltos, this.#color,
      this.#realimentacion, this.#humedo, this.#lfo, this.#profundidadLfo, this.#salidaEfecto,
    ]) {
      nodo.disconnect();
    }
  }

  readonly #aplicarModelo = (): void => {
    const def = EFX_MODELOS_DELAY[this.#modelo];
    efx_fijarParametro(this.#pasaBajos.frequency, def.frecPasaBajosHz, this.#ctx);
    efx_fijarParametro(this.#pasaAltos.frequency, def.frecPasaAltosHz, this.#ctx);
    this.#color.curve = def.tieneColor ? crearCurvaColor() : null;
    this.#aplicarModulacion();
  };

  readonly #aplicarModulacion = (): void => {
    const def = EFX_MODELOS_DELAY[this.#modelo];
    let profundidadSeg = def.profundidadFijaSeg;
    let velocidadHz = def.velocidadFijaHz;
    if (this.#modelo === 'modulado' && this.#parametros !== null) {
      profundidadSeg = efx_convertirRelALineal(this.#parametros.profundidad, 0, EFX_PROFUNDIDAD_MAX_SEG);
      velocidadHz = efx_convertirRelAExponencial(this.#parametros.velocidad, 0.1, 5);
    }
    efx_fijarParametro(this.#profundidadLfo.gain, profundidadSeg, this.#ctx);
    efx_fijarParametro(this.#lfo.frequency, velocidadHz, this.#ctx);
  };
}

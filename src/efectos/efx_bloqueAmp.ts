/**
 * AMP: preamplificador + tone stack.
 *   pasa altos (por modelo) → realce previo → WaveShaper 4x (curva por modelo) → bloqueo de continua →
 *   graves (lowshelf) → medios (peaking) → agudos (highshelf) → compensación → nivel.
 * graves/medios/agudos: 0.5 = plano, ±12 dB. `nivel` 0.5 = 0 dB (±12 dB). `gan` recorre el rango de saturación del modelo.
 */
import type { IEfxParametrosAmp, TEfxModeloAmp } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { EFX_TAM_CURVA } from './efx_constantes';
import { efx_calcularCompensacionGan, efx_crearCurvaSaturacion } from './efx_curvas';
import { efx_convertirDbAGan, efx_convertirRelALineal } from './efx_escalas';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio, TEfxTipoCurva } from './efx_tipos';

interface IEfxModeloAmp {
  curva: TEfxTipoCurva;
  ganRelMin: number;
  ganRelMax: number;
  frecPreAltosHz: number;
  /** Realce de medios antes de saturar (alta ganancia: más ajustado). */
  frecRealceHz: number;
  ganRealceDb: number;
  frecGravesHz: number;
  frecMediosHz: number;
  qMedios: number;
  frecAgudosHz: number;
}

const EFX_MODELOS_AMP: Readonly<Record<TEfxModeloAmp, IEfxModeloAmp>> = {
  limpio: {
    curva: 'valvula', ganRelMin: 0, ganRelMax: 0.25, frecPreAltosHz: 60, frecRealceHz: 1000, ganRealceDb: 0,
    frecGravesHz: 120, frecMediosHz: 600, qMedios: 0.7, frecAgudosHz: 3200,
  },
  crunch: {
    curva: 'asimetrica', ganRelMin: 0.25, ganRelMax: 0.6, frecPreAltosHz: 90, frecRealceHz: 900, ganRealceDb: 2,
    frecGravesHz: 110, frecMediosHz: 800, qMedios: 0.8, frecAgudosHz: 3000,
  },
  altaGanancia: {
    curva: 'dura', ganRelMin: 0.55, ganRelMax: 1, frecPreAltosHz: 140, frecRealceHz: 750, ganRealceDb: 5,
    frecGravesHz: 100, frecMediosHz: 700, qMedios: 0.9, frecAgudosHz: 3500,
  },
  bajo: {
    curva: 'suave', ganRelMin: 0, ganRelMax: 0.4, frecPreAltosHz: 30, frecRealceHz: 600, ganRealceDb: 0,
    frecGravesHz: 80, frecMediosHz: 500, qMedios: 0.7, frecAgudosHz: 2500,
  },
};

const EFX_RANGO_TONO_DB = 12;

const convertirTonoADb = (rel: number): number => efx_convertirRelALineal(rel, -EFX_RANGO_TONO_DB, EFX_RANGO_TONO_DB);

export class EfxBloqueAmp implements IEfxBloqueAudio<TEfxModeloAmp, IEfxParametrosAmp> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #preAltos: BiquadFilterNode;
  readonly #realce: BiquadFilterNode;
  readonly #saturador: WaveShaperNode;
  readonly #bloqueoDc: BiquadFilterNode;
  readonly #graves: BiquadFilterNode;
  readonly #medios: BiquadFilterNode;
  readonly #agudos: BiquadFilterNode;
  readonly #compensacion: GainNode;
  readonly #nivel: GainNode;
  #modelo: TEfxModeloAmp = 'limpio';
  #gan = 0.3;
  #claveCurva = '';

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    this.#preAltos = ctx.createBiquadFilter();
    this.#preAltos.type = 'highpass';
    this.#preAltos.Q.value = -3;
    this.#realce = ctx.createBiquadFilter();
    this.#realce.type = 'peaking';
    this.#realce.Q.value = 0.8;
    this.#saturador = ctx.createWaveShaper();
    this.#saturador.oversample = '4x';
    this.#bloqueoDc = ctx.createBiquadFilter();
    this.#bloqueoDc.type = 'highpass';
    this.#bloqueoDc.frequency.value = 25;
    this.#bloqueoDc.Q.value = -3;
    this.#graves = ctx.createBiquadFilter();
    this.#graves.type = 'lowshelf';
    this.#medios = ctx.createBiquadFilter();
    this.#medios.type = 'peaking';
    this.#agudos = ctx.createBiquadFilter();
    this.#agudos.type = 'highshelf';
    this.#compensacion = ctx.createGain();
    this.#nivel = ctx.createGain();
    this.#preAltos
      .connect(this.#realce)
      .connect(this.#saturador)
      .connect(this.#bloqueoDc)
      .connect(this.#graves)
      .connect(this.#medios)
      .connect(this.#agudos)
      .connect(this.#compensacion)
      .connect(this.#nivel);
    this.#conmutador.conectarEfecto(this.#preAltos, this.#nivel);
    this.#aplicarModelo();
  }

  fijarModelo(modelo: TEfxModeloAmp): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    this.#aplicarModelo();
  }

  fijarParametros(parametros: Readonly<IEfxParametrosAmp>): void {
    const ctx = this.#ctx;
    this.#gan = parametros.gan;
    this.#actualizarCurva();
    efx_fijarParametro(this.#graves.gain, convertirTonoADb(parametros.graves), ctx);
    efx_fijarParametro(this.#medios.gain, convertirTonoADb(parametros.medios), ctx);
    efx_fijarParametro(this.#agudos.gain, convertirTonoADb(parametros.agudos), ctx);
    efx_fijarParametro(this.#nivel.gain, efx_convertirDbAGan(efx_convertirRelALineal(parametros.nivel, -12, 12)), ctx);
  }

  fijarActivo(esActivo: boolean): void {
    this.#conmutador.fijarActivo(esActivo);
  }

  esActivo(): boolean {
    return this.#conmutador.esActivo();
  }

  liberar(): void {
    this.#conmutador.liberar();
    for (const nodo of [
      this.#preAltos, this.#realce, this.#saturador, this.#bloqueoDc, this.#graves, this.#medios, this.#agudos,
      this.#compensacion, this.#nivel,
    ]) {
      nodo.disconnect();
    }
  }

  readonly #aplicarModelo = (): void => {
    const def = EFX_MODELOS_AMP[this.#modelo];
    const ctx = this.#ctx;
    efx_fijarParametro(this.#preAltos.frequency, def.frecPreAltosHz, ctx);
    efx_fijarParametro(this.#realce.frequency, def.frecRealceHz, ctx);
    efx_fijarParametro(this.#realce.gain, def.ganRealceDb, ctx);
    efx_fijarParametro(this.#graves.frequency, def.frecGravesHz, ctx);
    efx_fijarParametro(this.#medios.frequency, def.frecMediosHz, ctx);
    efx_fijarParametro(this.#medios.Q, def.qMedios, ctx);
    efx_fijarParametro(this.#agudos.frequency, def.frecAgudosHz, ctx);
    this.#actualizarCurva();
  };

  readonly #actualizarCurva = (): void => {
    const def = EFX_MODELOS_AMP[this.#modelo];
    const ganRel = efx_convertirRelALineal(this.#gan, def.ganRelMin, def.ganRelMax);
    const clave = `${this.#modelo}:${ganRel.toFixed(3)}`;
    if (clave === this.#claveCurva) return;
    this.#claveCurva = clave;
    this.#saturador.curve = efx_crearCurvaSaturacion(def.curva, ganRel, EFX_TAM_CURVA);
    // El realce previo suma ganancia antes de saturar; se descuenta en la compensación.
    const ganRealce = efx_convertirDbAGan(def.ganRealceDb);
    efx_fijarParametro(this.#compensacion.gain, efx_calcularCompensacionGan(ganRel) / Math.sqrt(ganRealce), this.#ctx);
  };
}

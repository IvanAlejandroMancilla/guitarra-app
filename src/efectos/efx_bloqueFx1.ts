/**
 * FX1: dinámica. Modelos:
 * - `compresor`: DynamicsCompressorNode (umbral −50..−5 dB, relación 1.5..20, ataque 1..100 ms, liberación 30 ms..1 s).
 * - `compuerta`: compuerta de ruido sin AudioWorklet. Seguidor de envolvente hecho con nodos
 *   (rectificador WaveShaper → pasa bajos) que, pasado por una curva de umbral, controla la ganancia de un VCA
 *   a velocidad de audio. Umbral −80..−30 dB; ataque y liberación fijan el suavizado del control.
 * `nivel` (0.5 = 0 dB, ±12 dB) es la ganancia de salida (makeup).
 */
import type { IEfxParametrosFx1, TEfxModeloFx1 } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { EFX_TAM_CURVA } from './efx_constantes';
import { efx_crearCurvaRectificador } from './efx_curvas';
import { efx_convertirDbAGan, efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio } from './efx_tipos';

/** Atenuación con la compuerta cerrada. */
const EFX_PISO_COMPUERTA_DB = -60;
/** Q (dB) de los pasa bajos del control: respuesta sin sobrepico. */
const EFX_Q_CONTROL_DB = -3;

/** 0 por debajo de 0.25, 1 desde 0.5, transición suave (smoothstep) entre ambos. */
const crearCurvaUmbral = (): Float32Array<ArrayBuffer> => {
  const curva = new Float32Array(EFX_TAM_CURVA);
  for (let i = 0; i < EFX_TAM_CURVA; i++) {
    const x = (i * 2) / (EFX_TAM_CURVA - 1) - 1;
    const avance = Math.min(1, Math.max(0, (x - 0.25) / 0.25));
    curva[i] = avance * avance * (3 - 2 * avance);
  }
  return curva;
};

export class EfxBloqueFx1 implements IEfxBloqueAudio<TEfxModeloFx1, IEfxParametrosFx1> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #envioCompresor: GainNode;
  readonly #compresor: DynamicsCompressorNode;
  readonly #envioCompuerta: GainNode;
  readonly #vca: GainNode;
  readonly #rectificador: WaveShaperNode;
  readonly #pasaBajosEnv: BiquadFilterNode;
  readonly #ganUmbral: GainNode;
  readonly #curvaUmbral: WaveShaperNode;
  readonly #pasaBajosCtrl: BiquadFilterNode;
  readonly #profundidad: GainNode;
  readonly #nivel: GainNode;
  #modelo: TEfxModeloFx1 = 'compuerta';

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    const entradaEfecto = ctx.createGain();
    this.#nivel = ctx.createGain();

    this.#envioCompresor = ctx.createGain();
    this.#compresor = ctx.createDynamicsCompressor();
    this.#compresor.knee.value = 6;
    entradaEfecto.connect(this.#envioCompresor).connect(this.#compresor).connect(this.#nivel);

    this.#envioCompuerta = ctx.createGain();
    this.#vca = ctx.createGain();
    const pisoLin = efx_convertirDbAGan(EFX_PISO_COMPUERTA_DB);
    this.#vca.gain.value = pisoLin;
    this.#rectificador = ctx.createWaveShaper();
    this.#rectificador.curve = efx_crearCurvaRectificador(EFX_TAM_CURVA);
    this.#pasaBajosEnv = ctx.createBiquadFilter();
    this.#pasaBajosEnv.type = 'lowpass';
    this.#pasaBajosEnv.Q.value = EFX_Q_CONTROL_DB;
    this.#ganUmbral = ctx.createGain();
    this.#curvaUmbral = ctx.createWaveShaper();
    this.#curvaUmbral.curve = crearCurvaUmbral();
    this.#pasaBajosCtrl = ctx.createBiquadFilter();
    this.#pasaBajosCtrl.type = 'lowpass';
    this.#pasaBajosCtrl.Q.value = EFX_Q_CONTROL_DB;
    this.#profundidad = ctx.createGain();
    this.#profundidad.gain.value = 1 - pisoLin;
    entradaEfecto.connect(this.#envioCompuerta);
    this.#envioCompuerta.connect(this.#vca).connect(this.#nivel);
    this.#envioCompuerta
      .connect(this.#rectificador)
      .connect(this.#pasaBajosEnv)
      .connect(this.#ganUmbral)
      .connect(this.#curvaUmbral)
      .connect(this.#pasaBajosCtrl)
      .connect(this.#profundidad)
      .connect(this.#vca.gain);

    this.#conmutador.conectarEfecto(entradaEfecto, this.#nivel);
    this.#envioCompresor.gain.value = 0;
    this.#envioCompuerta.gain.value = 1;
  }

  fijarModelo(modelo: TEfxModeloFx1): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    efx_fijarParametro(this.#envioCompresor.gain, modelo === 'compresor' ? 1 : 0, this.#ctx);
    efx_fijarParametro(this.#envioCompuerta.gain, modelo === 'compuerta' ? 1 : 0, this.#ctx);
  }

  fijarParametros(parametros: Readonly<IEfxParametrosFx1>): void {
    const ctx = this.#ctx;
    efx_fijarParametro(this.#compresor.threshold, efx_convertirRelALineal(parametros.umbral, -50, -5), ctx);
    efx_fijarParametro(this.#compresor.ratio, efx_convertirRelAExponencial(parametros.relacion, 1.5, 20), ctx);
    efx_fijarParametro(this.#compresor.attack, efx_convertirRelAExponencial(parametros.ataque, 0.001, 0.1), ctx);
    efx_fijarParametro(this.#compresor.release, efx_convertirRelAExponencial(parametros.liberacion, 0.03, 1), ctx);

    // La envolvente rectificada de una senoidal de amplitud A vale ≈ 0.64·A; la curva abre entre 0.25 y 0.5.
    const umbralLin = efx_convertirDbAGan(efx_convertirRelALineal(parametros.umbral, -80, -30));
    efx_fijarParametro(this.#ganUmbral.gain, 0.5 / umbralLin, ctx);
    efx_fijarParametro(this.#pasaBajosEnv.frequency, efx_convertirRelAExponencial(1 - parametros.liberacion, 3, 40), ctx);
    efx_fijarParametro(this.#pasaBajosCtrl.frequency, efx_convertirRelAExponencial(1 - parametros.ataque, 15, 300), ctx);

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
      this.#envioCompresor, this.#compresor, this.#envioCompuerta, this.#vca, this.#rectificador,
      this.#pasaBajosEnv, this.#ganUmbral, this.#curvaUmbral, this.#pasaBajosCtrl, this.#profundidad, this.#nivel,
    ]) {
      nodo.disconnect();
    }
  }
}

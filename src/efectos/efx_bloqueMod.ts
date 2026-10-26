/**
 * MOD: modulación con un LFO compartido.
 * - `chorus` / `flanger` / `vibrato`: retardo corto modulado (flanger con realimentación). El retardo está en un lazo,
 *   y Web Audio impone ahí un mínimo de 128 muestras (~2.7 ms): los retardos base quedan por encima.
 * - `phaser`: 4 filtros pasa todo en cascada con la frecuencia modulada; `realimentacion` = resonancia (Q).
 * - `tremolo`: LFO a la ganancia.
 * `mezcla` reparte seco/húmedo a potencia constante (1 = solo efecto, p. ej. vibrato puro).
 */
import type { IEfxParametrosMod, TEfxModeloMod } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio } from './efx_tipos';

interface IEfxModeloModulacion {
  velMinHz: number;
  velMaxHz: number;
  /** Retardo central (chorus/flanger/vibrato) en s. */
  retardoBaseSeg: number;
  /** Profundidad máxima: s para retardos, Hz para phaser, ganancia para trémolo. */
  profundidadMax: number;
}

const EFX_MODELOS_MOD: Readonly<Record<TEfxModeloMod, IEfxModeloModulacion>> = {
  chorus: { velMinHz: 0.1, velMaxHz: 3, retardoBaseSeg: 0.015, profundidadMax: 0.005 },
  flanger: { velMinHz: 0.05, velMaxHz: 2, retardoBaseSeg: 0.0045, profundidadMax: 0.0017 },
  vibrato: { velMinHz: 1, velMaxHz: 8, retardoBaseSeg: 0.007, profundidadMax: 0.004 },
  phaser: { velMinHz: 0.05, velMaxHz: 4, retardoBaseSeg: 0.005, profundidadMax: 700 },
  tremolo: { velMinHz: 1, velMaxHz: 12, retardoBaseSeg: 0.005, profundidadMax: 1 },
};

const EFX_CANT_ETAPAS_PHASER = 4;
const EFX_FREC_BASE_PHASER_HZ = 800;
const EFX_REALIMENTACION_MAX_FLANGER = 0.85;

export class EfxBloqueMod implements IEfxBloqueAudio<TEfxModeloMod, IEfxParametrosMod> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #entradaEfecto: GainNode;
  readonly #salidaEfecto: GainNode;
  readonly #seco: GainNode;
  readonly #humedo: GainNode;
  readonly #envioRetardo: GainNode;
  readonly #retardo: DelayNode;
  readonly #realimentacion: GainNode;
  readonly #envioFase: GainNode;
  readonly #etapasFase: BiquadFilterNode[] = [];
  readonly #envioTremolo: GainNode;
  readonly #vcaTremolo: GainNode;
  readonly #lfo: OscillatorNode;
  readonly #profundidadRetardo: GainNode;
  readonly #profundidadFase: GainNode;
  readonly #profundidadTremolo: GainNode;
  #modelo: TEfxModeloMod = 'chorus';
  #parametros: IEfxParametrosMod = { velocidad: 0.3, profundidad: 0.5, realimentacion: 0, mezcla: 0.5 };

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    this.#entradaEfecto = ctx.createGain();
    this.#salidaEfecto = ctx.createGain();
    this.#seco = ctx.createGain();
    this.#humedo = ctx.createGain();
    this.#entradaEfecto.connect(this.#seco).connect(this.#salidaEfecto);
    this.#humedo.connect(this.#salidaEfecto);

    this.#lfo = ctx.createOscillator();
    this.#lfo.type = 'sine';

    // Retardo modulado.
    this.#envioRetardo = ctx.createGain();
    this.#retardo = ctx.createDelay(0.05);
    this.#realimentacion = ctx.createGain();
    this.#realimentacion.gain.value = 0;
    this.#profundidadRetardo = ctx.createGain();
    this.#entradaEfecto.connect(this.#envioRetardo).connect(this.#retardo).connect(this.#humedo);
    this.#retardo.connect(this.#realimentacion).connect(this.#retardo);
    this.#lfo.connect(this.#profundidadRetardo).connect(this.#retardo.delayTime);

    // Phaser.
    this.#envioFase = ctx.createGain();
    this.#profundidadFase = ctx.createGain();
    this.#lfo.connect(this.#profundidadFase);
    let anterior: AudioNode = this.#envioFase;
    for (let i = 0; i < EFX_CANT_ETAPAS_PHASER; i++) {
      const etapa = ctx.createBiquadFilter();
      etapa.type = 'allpass';
      etapa.frequency.value = EFX_FREC_BASE_PHASER_HZ;
      this.#profundidadFase.connect(etapa.frequency);
      anterior.connect(etapa);
      anterior = etapa;
      this.#etapasFase.push(etapa);
    }
    this.#entradaEfecto.connect(this.#envioFase);
    anterior.connect(this.#humedo);

    // Trémolo.
    this.#envioTremolo = ctx.createGain();
    this.#vcaTremolo = ctx.createGain();
    this.#profundidadTremolo = ctx.createGain();
    this.#entradaEfecto.connect(this.#envioTremolo).connect(this.#vcaTremolo).connect(this.#humedo);
    this.#lfo.connect(this.#profundidadTremolo).connect(this.#vcaTremolo.gain);

    this.#lfo.start();
    this.#conmutador.conectarEfecto(this.#entradaEfecto, this.#salidaEfecto);
    this.#aplicar();
  }

  fijarModelo(modelo: TEfxModeloMod): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    this.#aplicar();
  }

  fijarParametros(parametros: Readonly<IEfxParametrosMod>): void {
    this.#parametros = { ...parametros };
    this.#aplicar();
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
      this.#entradaEfecto, this.#salidaEfecto, this.#seco, this.#humedo, this.#envioRetardo, this.#retardo,
      this.#realimentacion, this.#envioFase, ...this.#etapasFase, this.#envioTremolo, this.#vcaTremolo, this.#lfo,
      this.#profundidadRetardo, this.#profundidadFase, this.#profundidadTremolo,
    ]) {
      nodo.disconnect();
    }
  }

  readonly #aplicar = (): void => {
    const ctx = this.#ctx;
    const modelo = this.#modelo;
    const def = EFX_MODELOS_MOD[modelo];
    const par = this.#parametros;
    const esRetardo = modelo === 'chorus' || modelo === 'flanger' || modelo === 'vibrato';
    const esFase = modelo === 'phaser';
    const esTremolo = modelo === 'tremolo';
    const profundidad = efx_convertirRelALineal(par.profundidad, 0, def.profundidadMax);

    efx_fijarParametro(this.#lfo.frequency, efx_convertirRelAExponencial(par.velocidad, def.velMinHz, def.velMaxHz), ctx);
    efx_fijarParametro(this.#envioRetardo.gain, esRetardo ? 1 : 0, ctx);
    efx_fijarParametro(this.#envioFase.gain, esFase ? 1 : 0, ctx);
    efx_fijarParametro(this.#envioTremolo.gain, esTremolo ? 1 : 0, ctx);

    efx_fijarParametro(this.#retardo.delayTime, def.retardoBaseSeg, ctx);
    efx_fijarParametro(this.#profundidadRetardo.gain, esRetardo ? profundidad : 0, ctx);
    const realimentacion = modelo === 'flanger' ? efx_convertirRelALineal(par.realimentacion, 0, EFX_REALIMENTACION_MAX_FLANGER) : 0;
    efx_fijarParametro(this.#realimentacion.gain, realimentacion, ctx);

    efx_fijarParametro(this.#profundidadFase.gain, esFase ? profundidad : 0, ctx);
    const qFase = efx_convertirRelAExponencial(par.realimentacion, 0.4, 4);
    for (const etapa of this.#etapasFase) efx_fijarParametro(etapa.Q, qFase, ctx);

    // Trémolo: ganancia = 1 − p/2 + (p/2)·LFO, entre 1 − p y 1.
    efx_fijarParametro(this.#vcaTremolo.gain, 1 - profundidad / 2, ctx);
    efx_fijarParametro(this.#profundidadTremolo.gain, esTremolo ? profundidad / 2 : 0, ctx);

    const mezcla = efx_convertirRelALineal(par.mezcla, 0, 1);
    efx_fijarParametro(this.#seco.gain, Math.cos((mezcla * Math.PI) / 2), ctx);
    efx_fijarParametro(this.#humedo.gain, Math.sin((mezcla * Math.PI) / 2), ctx);
  };
}

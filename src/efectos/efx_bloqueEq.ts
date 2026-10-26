/**
 * EQ: ecualizador de 3 bandas + volumen de salida del preset.
 *   graves (lowshelf 120 Hz) → medios (peaking 800 Hz) → agudos (highshelf 4 kHz) → nivel.
 * Bandas: 0.5 = plano, ±12 dB. `nivel` 0.5 = 0 dB (±12 dB).
 */
import type { IEfxParametrosEq, TEfxModeloEq } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { efx_convertirDbAGan, efx_convertirRelALineal } from './efx_escalas';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio } from './efx_tipos';

const EFX_RANGO_EQ_DB = 12;

export class EfxBloqueEq implements IEfxBloqueAudio<TEfxModeloEq, IEfxParametrosEq> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #graves: BiquadFilterNode;
  readonly #medios: BiquadFilterNode;
  readonly #agudos: BiquadFilterNode;
  readonly #nivel: GainNode;

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    this.#graves = ctx.createBiquadFilter();
    this.#graves.type = 'lowshelf';
    this.#graves.frequency.value = 120;
    this.#medios = ctx.createBiquadFilter();
    this.#medios.type = 'peaking';
    this.#medios.frequency.value = 800;
    this.#medios.Q.value = 0.9;
    this.#agudos = ctx.createBiquadFilter();
    this.#agudos.type = 'highshelf';
    this.#agudos.frequency.value = 4000;
    this.#nivel = ctx.createGain();
    this.#graves.connect(this.#medios).connect(this.#agudos).connect(this.#nivel);
    this.#conmutador.conectarEfecto(this.#graves, this.#nivel);
  }

  /** Un único modelo (`'tresBandas'`). */
  fijarModelo(modelo: TEfxModeloEq): void {
    void modelo;
  }

  fijarParametros(parametros: Readonly<IEfxParametrosEq>): void {
    const ctx = this.#ctx;
    const convertirADb = (rel: number): number => efx_convertirRelALineal(rel, -EFX_RANGO_EQ_DB, EFX_RANGO_EQ_DB);
    efx_fijarParametro(this.#graves.gain, convertirADb(parametros.graves), ctx);
    efx_fijarParametro(this.#medios.gain, convertirADb(parametros.medios), ctx);
    efx_fijarParametro(this.#agudos.gain, convertirADb(parametros.agudos), ctx);
    efx_fijarParametro(this.#nivel.gain, efx_convertirDbAGan(convertirADb(parametros.nivel)), ctx);
  }

  fijarActivo(esActivo: boolean): void {
    this.#conmutador.fijarActivo(esActivo);
  }

  esActivo(): boolean {
    return this.#conmutador.esActivo();
  }

  liberar(): void {
    this.#conmutador.liberar();
    for (const nodo of [this.#graves, this.#medios, this.#agudos, this.#nivel]) nodo.disconnect();
  }
}

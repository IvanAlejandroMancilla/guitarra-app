/**
 * Convolución con cambio de impulso sin clics: crea un ConvolverNode nuevo por impulso y hace un
 * fundido cruzado con el anterior (evita reasignar `buffer`, que algunos navegadores no permiten).
 */
import { EFX_DUR_FUNDIDO_SEG } from './efx_constantes';
import { efx_fijarParametro } from './efx_rampas';

interface IEfxRanuraConvolucion {
  convolver: ConvolverNode;
  gan: GainNode;
}

export class EfxConvolutor {
  readonly entrada: GainNode;
  readonly salida: GainNode;
  readonly #ctx: BaseAudioContext;
  #act: IEfxRanuraConvolucion | null = null;
  #bufAct: AudioBuffer | null = null;

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.entrada = ctx.createGain();
    this.salida = ctx.createGain();
  }

  /** Cambia el impulso con fundido cruzado. `null` = silencio. */
  fijarImpulso(buf: AudioBuffer | null): void {
    if (buf === this.#bufAct) return;
    this.#bufAct = buf;
    const ant = this.#act;
    if (ant !== null) {
      efx_fijarParametro(ant.gan.gain, 0, this.#ctx);
      globalThis.setTimeout(() => {
        try {
          this.entrada.disconnect(ant.convolver);
        } catch {
          // Ya desconectado por `liberar()`.
        }
        ant.convolver.disconnect();
        ant.gan.disconnect();
      }, EFX_DUR_FUNDIDO_SEG * 4 * 1000);
    }
    this.#act = null;
    if (buf === null) return;
    const convolver = this.#ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = buf;
    const gan = this.#ctx.createGain();
    gan.gain.value = 0;
    this.entrada.connect(convolver).connect(gan).connect(this.salida);
    efx_fijarParametro(gan.gain, 1, this.#ctx);
    this.#act = { convolver, gan };
  }

  liberar(): void {
    this.entrada.disconnect();
    this.salida.disconnect();
    if (this.#act !== null) {
      this.#act.convolver.disconnect();
      this.#act.gan.disconnect();
    }
    this.#act = null;
    this.#bufAct = null;
  }
}

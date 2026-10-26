/**
 * Bypass de un bloque con fundido cruzado corto (sin clics).
 *   entrada ─┬─ directo ───────────────────────┬─ salida
 *            └─ envio → [efecto] → retorno ────┘
 * Los bloques lo usan por composición: `entrada`/`salida` del bloque son las del conmutador.
 */
import { efx_fijarParametro } from './efx_rampas';

export class EfxConmutador {
  readonly entrada: GainNode;
  readonly salida: GainNode;
  readonly #ctx: BaseAudioContext;
  readonly #directo: GainNode;
  readonly #envio: GainNode;
  readonly #retorno: GainNode;
  #esActivo = false;

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.entrada = ctx.createGain();
    this.salida = ctx.createGain();
    this.#directo = ctx.createGain();
    this.#envio = ctx.createGain();
    this.#retorno = ctx.createGain();
    this.#directo.gain.value = 1;
    this.#envio.gain.value = 0;
    this.#retorno.gain.value = 0;
    this.entrada.connect(this.#directo).connect(this.salida);
    this.entrada.connect(this.#envio);
    this.#retorno.connect(this.salida);
  }

  /** Inserta el efecto entre `envio` y `retorno`. Se llama una sola vez, desde el constructor del bloque. */
  conectarEfecto(entradaEfecto: AudioNode, salidaEfecto: AudioNode): void {
    this.#envio.connect(entradaEfecto);
    salidaEfecto.connect(this.#retorno);
  }

  fijarActivo(esActivo: boolean): void {
    if (esActivo === this.#esActivo) return;
    this.#esActivo = esActivo;
    const valorEfecto = esActivo ? 1 : 0;
    efx_fijarParametro(this.#envio.gain, valorEfecto, this.#ctx);
    efx_fijarParametro(this.#retorno.gain, valorEfecto, this.#ctx);
    efx_fijarParametro(this.#directo.gain, 1 - valorEfecto, this.#ctx);
  }

  esActivo(): boolean {
    return this.#esActivo;
  }

  liberar(): void {
    for (const nodo of [this.entrada, this.salida, this.#directo, this.#envio, this.#retorno]) nodo.disconnect();
  }
}

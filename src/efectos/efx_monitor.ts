/**
 * Monitoreo: lleva la salida de la cadena (`fuente`) a los altavoces/audífonos (`destino`).
 * Apagado (por defecto) = desconectado de `destino`, así la cadena no se procesa ni puede acoplarse.
 * Encender/apagar y cambiar el volumen usan rampas cortas (sin clics). Volumen 0..1 con curva cuadrática.
 */
import { EFX_DUR_FUNDIDO_SEG } from './efx_constantes';
import { efx_fijarParametro } from './efx_rampas';

/** Igual al valor por defecto de `IConfig.volMonitor`; main.ts lo fija con `fijarVol`. */
const EFX_VOL_MONITOR_INICIAL = 0.5;

export class EfxMonitor {
  readonly #ctx: BaseAudioContext;
  readonly #fuente: AudioNode;
  readonly #destino: AudioNode;
  readonly #gan: GainNode;
  #esActivo = false;
  #esConectado = false;
  #vol = EFX_VOL_MONITOR_INICIAL;
  #idTemporizador: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: BaseAudioContext, fuente: AudioNode, destino: AudioNode) {
    this.#ctx = ctx;
    this.#fuente = fuente;
    this.#destino = destino;
    this.#gan = ctx.createGain();
    this.#gan.gain.value = 0;
    this.#fuente.connect(this.#gan);
  }

  fijarActivo(esActivo: boolean): void {
    if (esActivo === this.#esActivo) return;
    this.#esActivo = esActivo;
    this.#cancelarDesconexion();
    if (esActivo) {
      if (!this.#esConectado) {
        this.#gan.connect(this.#destino);
        this.#esConectado = true;
      }
      efx_fijarParametro(this.#gan.gain, this.#convertirVolAGan(), this.#ctx);
      return;
    }
    efx_fijarParametro(this.#gan.gain, 0, this.#ctx);
    this.#idTemporizador = setTimeout(() => {
      this.#idTemporizador = null;
      if (this.#esActivo || !this.#esConectado) return;
      this.#gan.disconnect(this.#destino);
      this.#esConectado = false;
    }, EFX_DUR_FUNDIDO_SEG * 4 * 1000);
  }

  /** `vol` 0..1 (se acota). */
  fijarVol(vol: number): void {
    this.#vol = Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : 0;
    if (this.#esActivo) efx_fijarParametro(this.#gan.gain, this.#convertirVolAGan(), this.#ctx);
  }

  esActivo(): boolean {
    return this.#esActivo;
  }

  liberar(): void {
    this.#cancelarDesconexion();
    this.#esActivo = false;
    this.#esConectado = false;
    this.#gan.disconnect();
    try {
      this.#fuente.disconnect(this.#gan);
    } catch {
      // La fuente ya estaba desconectada.
    }
  }

  readonly #convertirVolAGan = (): number => this.#vol * this.#vol;

  readonly #cancelarDesconexion = (): void => {
    if (this.#idTemporizador === null) return;
    clearTimeout(this.#idTemporizador);
    this.#idTemporizador = null;
  };
}

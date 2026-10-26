/** Metrónomo: convierte cada `'tmp:pulso'` en un click programado en el contexto de audio. */
import type { ICorBus } from '../core/cor_contratos';
import type { ITmpPulso } from '../core/cor_eventos';
import { tmp_programarClick } from './tmp_click';

export class TmpMetronomo {
  readonly #ctx: AudioContext;
  readonly #salida: GainNode;
  #vol = 0.7;
  #esActivo = true;
  #cancelar: (() => void) | null;

  constructor(ctx: AudioContext, bus: ICorBus) {
    this.#ctx = ctx;
    this.#salida = ctx.createGain();
    this.#salida.connect(ctx.destination);
    this.#cancelar = bus.suscribir('tmp:pulso', this.#sonarPulso);
  }

  esActivo(): boolean {
    return this.#esActivo;
  }

  /** Volumen 0..1. */
  fijarVol(vol: number): void {
    this.#vol = Number.isFinite(vol) ? Math.min(Math.max(vol, 0), 1) : 0;
  }

  fijarActivo(esActivo: boolean): void {
    this.#esActivo = esActivo;
  }

  /** Deja de escuchar el bus y libera la salida. */
  detener(): void {
    this.#cancelar?.();
    this.#cancelar = null;
    this.#salida.disconnect();
  }

  readonly #sonarPulso = (pulso: ITmpPulso): void => {
    if (!this.#esActivo || this.#vol <= 0) return;
    tmp_programarClick(this.#ctx, this.#salida, pulso.tiempoMs / 1000, pulso.esAcento, this.#vol);
  };
}

/** Publica la onda y el nivel de la entrada a ≈ 30 fps (para vistas y vúmetro). */
import type { ICorBus, ICorFuenteAudio } from '../core/cor_contratos';
import { AUD_INTERVALO_MONITOR_MS, AUD_UMBRAL_SATURACION } from './aud_constantes';
import { aud_calcularPico, aud_calcularRms, aud_convertirADb } from './aud_nivel';

/** Emite `'aud:onda'` (buffer reutilizado) y `'aud:nivel'` mientras la fuente esté activa. */
export class AudMonitor {
  readonly #fuente: ICorFuenteAudio;
  readonly #bus: ICorBus;
  #buf: Float32Array = new Float32Array(0);
  #idIntervalo: ReturnType<typeof setInterval> | null = null;

  constructor(fuente: ICorFuenteAudio, bus: ICorBus) {
    this.#fuente = fuente;
    this.#bus = bus;
  }

  esActivo(): boolean {
    return this.#idIntervalo !== null;
  }

  iniciar(): void {
    if (this.#idIntervalo !== null) return;
    this.#idIntervalo = setInterval(this.#leerFrame, AUD_INTERVALO_MONITOR_MS);
  }

  detener(): void {
    if (this.#idIntervalo !== null) clearInterval(this.#idIntervalo);
    this.#idIntervalo = null;
  }

  readonly #leerFrame = (): void => {
    if (!this.#fuente.esActivo()) return;
    const tamBuf = this.#fuente.obtenerTamBuf();
    if (this.#buf.length !== tamBuf) this.#buf = new Float32Array(tamBuf);
    this.#fuente.leerMuestras(this.#buf);
    const tiempoMs = this.#fuente.obtenerCtx().currentTime * 1000;
    const rms = aud_calcularRms(this.#buf);
    const pico = aud_calcularPico(this.#buf);
    this.#bus.emitir('aud:onda', { tiempoMs, muestras: this.#buf, frecMuestreoHz: this.#fuente.obtenerFrecMuestreoHz() });
    this.#bus.emitir('aud:nivel', {
      tiempoMs,
      rms,
      rmsDb: aud_convertirADb(rms),
      picoDb: aud_convertirADb(pico),
      esSaturado: pico >= AUD_UMBRAL_SATURACION,
    });
  };
}

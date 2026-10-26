/**
 * Reloj de transporte ÚNICO, basado en `AudioContext.currentTime`.
 *
 * Modelo: un ancla (instante del contexto + posición en pulsos). Mientras reproduce,
 * pos = posAncla + (ahora − ctxAncla) × bpmEfectivo / 60000, con bpmEfectivo = bpm × velocidad.
 * Al cambiar bpm o velocidad se re-ancla, así la posición en pulsos se conserva.
 *
 * Latencias:
 * - `obtenerPosPulsos()` es la posición AUDIBLE: resta `latSalidaMs` (lo programado en el
 *   contexto suena después). La usan las vistas.
 * - `convertirCtxAPosPulsos(t)` ubica una detección: resta `latEntradaMs`. Como el músico
 *   toca sobre lo que oye, `latEntradaMs` debe ser la latencia TOTAL ida y vuelta, que es
 *   lo que mide `TmpCalibrador`.
 * - Los payloads de `'tmp:*'` llevan la posición CRUDA (sin latencias): la usan el
 *   programador de clicks y `acp` para programar audio.
 */
import type { ICorBus, ICorPosicionable, ICorReloj, ICorReproducible } from '../core/cor_contratos';
import type { ITmpTransporte } from '../core/cor_eventos';
import { cor_convertirMsAPulsos, cor_convertirPulsosAMs } from '../core/cor_tiempo';
import { TMP_BPM_DEF, TMP_BPM_MAX, TMP_BPM_MIN, TMP_VELOCIDAD_MAX, TMP_VELOCIDAD_MIN } from './tmp_constantes';
import { tmp_compensarLatencia } from './tmp_latencia';

const acotar = (valor: number, min: number, max: number, def: number): number =>
  Number.isFinite(valor) ? Math.min(Math.max(valor, min), max) : def;

export class TmpReloj implements ICorReloj, ICorReproducible, ICorPosicionable {
  readonly #ctx: AudioContext;
  readonly #bus: ICorBus;
  #bpm = TMP_BPM_DEF;
  #velocidad = 1;
  #latEntradaMs = 0;
  #latSalidaMs = 0;
  #esReproduciendo = false;
  #posAncla = 0;
  #ctxAnclaMs = 0;

  constructor(ctx: AudioContext, bus: ICorBus) {
    this.#ctx = ctx;
    this.#bus = bus;
  }

  obtenerTiempoCtxMs(): number {
    return this.#ctx.currentTime * 1000;
  }

  obtenerPosPulsos(): number {
    if (!this.#esReproduciendo) return this.#posAncla;
    return this.#calcularPosCruda(tmp_compensarLatencia(this.obtenerTiempoCtxMs(), this.#latSalidaMs));
  }

  obtenerPosMs(): number {
    return cor_convertirPulsosAMs(this.obtenerPosPulsos(), this.obtenerBpm());
  }

  obtenerBpm(): number {
    return this.#bpm * this.#velocidad;
  }

  /** BPM base (sin el factor de velocidad). */
  obtenerBpmBase(): number {
    return this.#bpm;
  }

  obtenerVelocidad(): number {
    return this.#velocidad;
  }

  convertirCtxAPosPulsos(tiempoCtxMs: number): number {
    if (!this.#esReproduciendo) return this.#posAncla;
    return this.#calcularPosCruda(tmp_compensarLatencia(tiempoCtxMs, this.#latEntradaMs));
  }

  /** Instante del contexto (ms) en que la posición CRUDA vale `posPulsos` (para programar audio). */
  convertirPulsosACtxMs(posPulsos: number): number {
    const ctxAnclaMs = this.#esReproduciendo ? this.#ctxAnclaMs : this.obtenerTiempoCtxMs();
    return ctxAnclaMs + cor_convertirPulsosAMs(posPulsos - this.#posAncla, this.obtenerBpm());
  }

  esReproduciendo(): boolean {
    return this.#esReproduciendo;
  }

  /** Arranca desde la posición actual. Reanuda el contexto si estaba suspendido (llamar tras un gesto). */
  reproducir(): void {
    if (this.#esReproduciendo) return;
    if (this.#ctx.state === 'suspended') void this.#ctx.resume();
    this.#ctxAnclaMs = this.obtenerTiempoCtxMs();
    this.#esReproduciendo = true;
    this.#emitirTransporte('tmp:inicio');
  }

  pausar(): void {
    if (!this.#esReproduciendo) return;
    this.#reanclar();
    this.#esReproduciendo = false;
    this.#emitirTransporte('tmp:pausa');
  }

  /** Detiene y vuelve a 0. */
  detener(): void {
    this.#esReproduciendo = false;
    this.#posAncla = 0;
    this.#ctxAnclaMs = this.obtenerTiempoCtxMs();
    this.#emitirTransporte('tmp:detencion');
  }

  fijarPosPulsos(posPulsos: number): void {
    this.#posAncla = Number.isFinite(posPulsos) ? posPulsos : 0;
    this.#ctxAnclaMs = this.obtenerTiempoCtxMs();
    this.#emitirTransporte('tmp:posicion');
  }

  /** Cambia el BPM base (acotado a TMP_BPM_MIN..MAX) conservando la posición. No emite si no cambia. */
  fijarBpm(bpm: number, esProgresivo = false): void {
    const bpmNuevo = acotar(bpm, TMP_BPM_MIN, TMP_BPM_MAX, TMP_BPM_DEF);
    if (bpmNuevo === this.#bpm) return;
    this.#reanclar();
    const bpmAnt = this.#bpm;
    this.#bpm = bpmNuevo;
    this.#bus.emitir('tmp:bpm', { bpm: bpmNuevo, bpmAnt, esProgresivo });
  }

  /** Factor de velocidad de práctica (acotado a TMP_VELOCIDAD_MIN..MAX) conservando la posición. */
  fijarVelocidad(factor: number): void {
    const velocidadNueva = acotar(factor, TMP_VELOCIDAD_MIN, TMP_VELOCIDAD_MAX, 1);
    if (velocidadNueva === this.#velocidad) return;
    this.#reanclar();
    this.#velocidad = velocidadNueva;
  }

  fijarLatencia(latEntradaMs: number, latSalidaMs: number): void {
    this.#latEntradaMs = Math.max(0, Number.isFinite(latEntradaMs) ? latEntradaMs : 0);
    this.#latSalidaMs = Math.max(0, Number.isFinite(latSalidaMs) ? latSalidaMs : 0);
  }

  readonly #calcularPosCruda = (tiempoCtxMs: number): number =>
    this.#posAncla + cor_convertirMsAPulsos(tiempoCtxMs - this.#ctxAnclaMs, this.obtenerBpm());

  /** Fija el ancla en el instante actual sin mover la posición. */
  readonly #reanclar = (): void => {
    const ahoraMs = this.obtenerTiempoCtxMs();
    if (this.#esReproduciendo) this.#posAncla = this.#calcularPosCruda(ahoraMs);
    this.#ctxAnclaMs = ahoraMs;
  };

  readonly #emitirTransporte = (evento: 'tmp:inicio' | 'tmp:pausa' | 'tmp:detencion' | 'tmp:posicion'): void => {
    const payload: ITmpTransporte = {
      tiempoMs: this.obtenerTiempoCtxMs(),
      posPulsos: this.#posAncla,
      posMs: cor_convertirPulsosAMs(this.#posAncla, this.obtenerBpm()),
      bpm: this.#bpm,
      velocidad: this.#velocidad,
    };
    this.#bus.emitir(evento, payload);
  };
}

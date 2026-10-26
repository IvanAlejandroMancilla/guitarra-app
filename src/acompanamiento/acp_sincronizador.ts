/**
 * Mantiene el acompañamiento de alphaTab alineado con el reloj de `tmp` (el reloj maestro).
 *
 * En cada cuadro:
 * 1. Fija `playbackSpeed = bpmReloj / tempoDeLaPartitura(pos)`: así alphaTab avanza a la misma
 *    cantidad de pulsos por minuto que el reloj (bpm del usuario, velocidad de práctica y modo progresivo),
 *    aunque la partitura tenga cambios de tempo.
 * 2. Estima la posición de alphaTab (último `playerPositionChanged` + tiempo transcurrido) y la compara
 *    con la del reloj; si la deriva supera `ACP_DERIVA_MAX_MS`, reposiciona alphaTab (`tickPosition`).
 * 3. Emite `'acp:posicion'`.
 *
 * `reloj.obtenerPosPulsos()` es la posición AUDIBLE (ya resta `latSalidaMs`); alphaTab informa la
 * posición que está entregando a su salida. Para compararlas se le suma `latSalidaMs` (leído de `'cfg:cambio'`).
 */
import type { AlphaTabApi, midi, synth } from '@coderline/alphatab';
import type { ICorActualizable, ICorBus, ICorCuadro, ICorPosicionable, ICorReloj } from '../core/cor_contratos';
import type { IAcpEstado, ICfgCambio } from '../core/cor_eventos';
import { cor_convertirMsAPulsos, cor_convertirPulsosAMs } from '../core/cor_tiempo';
import { ACP_DERIVA_MAX_MS, ACP_TICKS_POR_PULSO } from './acp_constantes';

/** Tiempo mínimo entre dos reposicionamientos (alphaTab tarda en rellenar su búfer tras un salto). */
const ACP_ESPERA_CORRECCION_MS = 500;
/** Si alphaTab no informa posición en este lapso, la estimación se considera vencida. */
const ACP_VIGENCIA_POS_MS = 500;
/** Cambios de velocidad menores que esto no se envían al sintetizador. */
const ACP_TOL_VELOCIDAD = 0.001;

export class AcpSincronizador implements ICorActualizable, ICorPosicionable {
  readonly #api: AlphaTabApi;
  readonly #reloj: ICorReloj;
  readonly #bus: ICorBus;
  readonly #desuscripciones: (() => void)[];
  #tempos: readonly midi.MasterBarTickLookupTempoChange[] = [];
  #latSalidaMs = 0;
  #esReproduciendo = false;
  /** Último tick informado por alphaTab y el instante (ms de contexto) en que llegó. */
  #ultTicks = 0;
  #ultTiempoCtxMs = Number.NEGATIVE_INFINITY;
  #ultCorreccionCtxMs = Number.NEGATIVE_INFINITY;

  constructor(api: AlphaTabApi, reloj: ICorReloj, bus: ICorBus) {
    this.#api = api;
    this.#reloj = reloj;
    this.#bus = bus;
    this.#latSalidaMs = bus.obtenerUltimo('cfg:cambio')?.cfg.latSalidaMs ?? 0;
    this.#esReproduciendo = bus.obtenerUltimo('acp:estado')?.estado === 'reproduciendo';
    this.#desuscripciones = [
      api.playerPositionChanged.on(this.#alCambiarPosicion),
      bus.suscribir('cfg:cambio', this.#alCambiarConfig),
      bus.suscribir('acp:estado', this.#alCambiarEstado),
    ];
  }

  /** Relee el mapa de tempos de la canción cargada y olvida la estimación anterior. Llamar tras cargar. */
  reiniciar(): void {
    this.#tempos = (this.#api.tickCache?.masterBars ?? []).flatMap((lookup) => lookup.tempoChanges);
    this.#ultTiempoCtxMs = Number.NEGATIVE_INFINITY;
    this.#ultCorreccionCtxMs = Number.NEGATIVE_INFINITY;
  }

  /**
   * Reposiciona alphaTab. `posPulsos` está en el marco del reloj (posición AUDIBLE, como
   * `reloj.obtenerPosPulsos()`); se le suma `latSalidaMs` internamente. También ajusta la velocidad.
   */
  fijarPosPulsos(posPulsos: number): void {
    const bpm = this.#reloj.obtenerBpm();
    const posTransporte = bpm > 0 ? posPulsos + cor_convertirMsAPulsos(this.#latSalidaMs, bpm) : posPulsos;
    this.#ajustarVelocidad(bpm, posTransporte);
    this.#fijarPosTransporte(posTransporte);
  }

  actualizar(cuadro: ICorCuadro): void {
    if (!this.#esReproduciendo || !this.#reloj.esReproduciendo() || !(cuadro.bpm > 0)) return;
    const posTransporte = cuadro.posPulsos + cor_convertirMsAPulsos(this.#latSalidaMs, cuadro.bpm);
    this.#ajustarVelocidad(cuadro.bpm, posTransporte);

    const transcurridoMs = cuadro.tiempoCtxMs - this.#ultTiempoCtxMs;
    if (transcurridoMs > ACP_VIGENCIA_POS_MS) return;
    const posAcp = this.#ultTicks / ACP_TICKS_POR_PULSO + cor_convertirMsAPulsos(Math.max(0, transcurridoMs), cuadro.bpm);
    const derivaMs = cor_convertirPulsosAMs(posAcp - posTransporte, cuadro.bpm);

    if (Math.abs(derivaMs) > ACP_DERIVA_MAX_MS && cuadro.tiempoCtxMs - this.#ultCorreccionCtxMs >= ACP_ESPERA_CORRECCION_MS) {
      this.#ultCorreccionCtxMs = cuadro.tiempoCtxMs;
      this.#fijarPosTransporte(posTransporte);
    }
    this.#bus.emitir('acp:posicion', {
      posMs: cor_convertirPulsosAMs(posAcp, cuadro.bpm),
      posPulsos: posAcp,
      durTotalMs: this.#api.endTime,
      derivaMs,
    });
  }

  /** Quita las suscripciones (alphaTab y bus). */
  liberar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones.length = 0;
  }

  /** Reposiciona alphaTab en una posición de transporte (pulsos, ya con la latencia de salida sumada). */
  #fijarPosTransporte(posTransporte: number): void {
    const ticks = Math.max(0, Math.round(posTransporte * ACP_TICKS_POR_PULSO));
    this.#api.tickPosition = ticks;
    this.#ultTicks = ticks;
    this.#ultTiempoCtxMs = this.#reloj.obtenerTiempoCtxMs();
  }

  /** Velocidad de alphaTab para que siga el BPM efectivo del reloj en la posición dada. */
  #ajustarVelocidad(bpm: number, posTransporte: number): void {
    const tempo = this.#obtenerTempo(posTransporte * ACP_TICKS_POR_PULSO);
    if (!(bpm > 0) || !(tempo > 0)) return;
    const velocidad = bpm / tempo;
    if (Math.abs(this.#api.playbackSpeed - velocidad) > ACP_TOL_VELOCIDAD) this.#api.playbackSpeed = velocidad;
  }

  /** Tempo de la partitura vigente en un tick (último cambio con `tick <= ticks`). */
  #obtenerTempo(ticks: number): number {
    let tempo = this.#tempos[0]?.tempo ?? this.#api.score?.tempo ?? 0;
    for (const cambio of this.#tempos) {
      if (cambio.tick > ticks) break;
      tempo = cambio.tempo;
    }
    return tempo;
  }

  readonly #alCambiarPosicion = (args: synth.PositionChangedEventArgs): void => {
    this.#ultTicks = args.currentTick;
    this.#ultTiempoCtxMs = this.#reloj.obtenerTiempoCtxMs();
  };

  readonly #alCambiarConfig = (cambio: ICfgCambio): void => {
    this.#latSalidaMs = cambio.cfg.latSalidaMs;
  };

  readonly #alCambiarEstado = (estado: IAcpEstado): void => {
    this.#esReproduciendo = estado.estado === 'reproduciendo';
    if (!this.#esReproduciendo) this.#ultTiempoCtxMs = Number.NEGATIVE_INFINITY;
  };
}

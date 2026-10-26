/**
 * Programador de pulsos con anticipación ("lookahead"): cada `TMP_INTERVALO_PROG_MS`
 * emite `'tmp:pulso'` para los pulsos enteros que caen dentro de los próximos
 * `TMP_ANTICIPACION_MS`. `tiempoMs` = instante PROGRAMADO (contexto) del click.
 */
import type { ICorBus } from '../core/cor_contratos';
import type { ITmpTransporte } from '../core/cor_eventos';
import { TMP_ANTICIPACION_MS, TMP_INTERVALO_PROG_MS, TMP_PULSOS_COMPAS_DEF } from './tmp_constantes';
import type { TmpReloj } from './tmp_reloj';

/** Tolerancia para tomar como entero un pulso que cae justo en la posición actual. */
const TMP_EPSILON_PULSOS = 1e-6;

export class TmpProgramador {
  readonly #reloj: TmpReloj;
  readonly #bus: ICorBus;
  #pulsosPorCompas: number;
  #idxSig = 0;
  #idIntervalo: ReturnType<typeof setInterval> | null = null;
  #cancelaciones: (() => void)[] = [];

  constructor(reloj: TmpReloj, bus: ICorBus, pulsosPorCompas: number) {
    this.#reloj = reloj;
    this.#bus = bus;
    this.#pulsosPorCompas = Math.max(1, Math.round(pulsosPorCompas));
  }

  esActivo(): boolean {
    return this.#idIntervalo !== null;
  }

  iniciar(): void {
    if (this.#idIntervalo !== null) return;
    const reubicar = (transporte: ITmpTransporte): void => {
      this.#idxSig = Math.max(0, Math.ceil(transporte.posPulsos - TMP_EPSILON_PULSOS));
    };
    this.#cancelaciones = [
      this.#bus.suscribir('tmp:inicio', reubicar),
      this.#bus.suscribir('tmp:posicion', reubicar),
      this.#bus.suscribir('tmp:detencion', reubicar),
      this.#bus.suscribir('ejr:cargado', (cargado) => this.fijarPulsosPorCompas(cargado.ej.pulsosPorCompas ?? TMP_PULSOS_COMPAS_DEF)),
    ];
    this.#idxSig = Math.max(0, Math.ceil(this.#reloj.obtenerPosPulsos() - TMP_EPSILON_PULSOS));
    this.#idIntervalo = setInterval(this.#programar, TMP_INTERVALO_PROG_MS);
  }

  detener(): void {
    if (this.#idIntervalo !== null) clearInterval(this.#idIntervalo);
    this.#idIntervalo = null;
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
  }

  fijarPulsosPorCompas(cant: number): void {
    this.#pulsosPorCompas = Math.max(1, Math.round(cant));
  }

  readonly #programar = (): void => {
    if (!this.#reloj.esReproduciendo()) return;
    const ahoraMs = this.#reloj.obtenerTiempoCtxMs();
    const horizonteMs = ahoraMs + TMP_ANTICIPACION_MS;
    for (;;) {
      const tiempoMs = this.#reloj.convertirPulsosACtxMs(this.#idxSig);
      if (tiempoMs >= horizonteMs) break;
      const idxPulso = this.#idxSig++;
      // Pulsos ya vencidos (pestaña en segundo plano): se saltean en vez de sonar todos juntos.
      if (tiempoMs < ahoraMs - TMP_INTERVALO_PROG_MS) continue;
      const idxPulsoCompas = idxPulso % this.#pulsosPorCompas;
      this.#bus.emitir('tmp:pulso', {
        tiempoMs,
        idxPulso,
        idxCompas: Math.floor(idxPulso / this.#pulsosPorCompas),
        idxPulsoCompas,
        esAcento: idxPulsoCompas === 0,
      });
    }
  };
}

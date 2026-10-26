/** Velocidad progresiva: sube el BPM al completar una vuelta con buena precisión. */
import type { ICorBus } from '../core/cor_contratos';
import type { IEjrResumen } from '../core/cor_eventos';
import { TMP_PRECISION_MIN_PROG } from './tmp_constantes';
import type { TmpReloj } from './tmp_reloj';

/** Próximo BPM: `bpmAct + incBpm` sin pasar `bpmMax` (y sin bajar si ya lo supera). */
export function tmp_calcularBpmSiguiente(bpmAct: number, incBpm: number, bpmMax: number): number {
  return Math.max(bpmAct, Math.min(bpmAct + Math.max(incBpm, 0), bpmMax));
}

/**
 * Escucha `'ejr:fin'` (fin del ejercicio o de una vuelta del loop) y, si la precisión
 * alcanza `TMP_PRECISION_MIN_PROG`, llama a `reloj.fijarBpm(sig, true)`.
 */
export class TmpProgresivo {
  readonly #reloj: TmpReloj;
  #esActivo = false;
  #incBpm = 5;
  #bpmMax = 160;
  #cancelar: (() => void) | null;

  constructor(bus: ICorBus, reloj: TmpReloj) {
    this.#reloj = reloj;
    this.#cancelar = bus.suscribir('ejr:fin', this.#procesarFin);
  }

  esActivo(): boolean {
    return this.#esActivo;
  }

  fijarOpciones(esActivo: boolean, incBpm: number, bpmMax: number): void {
    this.#esActivo = esActivo;
    this.#incBpm = incBpm;
    this.#bpmMax = bpmMax;
  }

  detener(): void {
    this.#cancelar?.();
    this.#cancelar = null;
  }

  readonly #procesarFin = (resumen: IEjrResumen): void => {
    if (!this.#esActivo || resumen.precision < TMP_PRECISION_MIN_PROG) return;
    const bpmAct = this.#reloj.obtenerBpmBase();
    const bpmSig = tmp_calcularBpmSiguiente(bpmAct, this.#incBpm, this.#bpmMax);
    if (bpmSig !== bpmAct) this.#reloj.fijarBpm(bpmSig, true);
  };
}

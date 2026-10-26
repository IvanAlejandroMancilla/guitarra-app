/**
 * Loop de práctica: cuando la posición cruza `finPulsos`, emite `'tmp:loop'` y
 * luego salta a `inicioPulsos` (eso emite `'tmp:posicion'`). En ese orden: `EjrSesion`
 * cierra la vuelta con `'tmp:loop'` y reubica las notas con `'tmp:posicion'`.
 * Con `'ejr:cargado'` la región pasa a ser el ejercicio completo (redondeado al compás).
 */
import type { ICorActualizable, ICorBus, ICorCuadro, ICorPosicionable } from '../core/cor_contratos';
import type { IEjercicio } from '../core/tipos';
import { TMP_PULSOS_COMPAS_DEF } from './tmp_constantes';

/** Pulsos de margen tras la última nota antes de cerrar la vuelta. */
const TMP_MARGEN_FIN_PULSOS = 1;

const calcularFinEjercicio = (ej: IEjercicio): number => {
  const pulsosPorCompas = ej.pulsosPorCompas ?? TMP_PULSOS_COMPAS_DEF;
  const finNotas = ej.notas.reduce((fin, nota) => Math.max(fin, nota.tiempo + (nota.dur ?? 1)), 0);
  return Math.ceil((finNotas + TMP_MARGEN_FIN_PULSOS) / pulsosPorCompas) * pulsosPorCompas;
};

export class TmpLoop implements ICorActualizable {
  readonly #reloj: ICorPosicionable;
  readonly #bus: ICorBus;
  #inicioPulsos = 0;
  #finPulsos = 0;
  #esActivo = false;
  #idxVuelta = 0;
  #posAnt: number | null = null;

  constructor(reloj: ICorPosicionable, bus: ICorBus) {
    this.#reloj = reloj;
    this.#bus = bus;
    bus.suscribir('ejr:cargado', (cargado) => this.fijarRegion(0, calcularFinEjercicio(cargado.ej)));
    bus.suscribir('tmp:detencion', () => {
      this.#idxVuelta = 0;
      this.#posAnt = null;
    });
    bus.suscribir('tmp:posicion', () => {
      this.#posAnt = null;
    });
    const cargado = bus.obtenerUltimo('ejr:cargado');
    if (cargado !== undefined) this.fijarRegion(0, calcularFinEjercicio(cargado.ej));
  }

  esActivo(): boolean {
    return this.#esActivo;
  }

  fijarRegion(inicioPulsos: number, finPulsos: number): void {
    this.#inicioPulsos = Math.max(0, inicioPulsos);
    this.#finPulsos = Math.max(this.#inicioPulsos, finPulsos);
    this.#idxVuelta = 0;
    this.#posAnt = null;
  }

  fijarActivo(esActivo: boolean): void {
    this.#esActivo = esActivo;
    this.#posAnt = null;
  }

  actualizar(cuadro: ICorCuadro): void {
    const posAnt = this.#posAnt;
    this.#posAnt = cuadro.posPulsos;
    if (!this.#esActivo || this.#finPulsos <= this.#inicioPulsos || posAnt === null) return;
    if (posAnt < this.#finPulsos && cuadro.posPulsos >= this.#finPulsos) {
      this.#bus.emitir('tmp:loop', { idxVuelta: this.#idxVuelta, inicioPulsos: this.#inicioPulsos, finPulsos: this.#finPulsos });
      this.#idxVuelta++;
      this.#reloj.fijarPosPulsos(this.#inicioPulsos);
    }
  }
}

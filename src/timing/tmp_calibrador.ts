/**
 * Calibración de latencia ida y vuelta: suena una serie de clicks y el usuario toca una
 * nota en cada uno (apagando la cuerda entre clicks). Se mide `'det:nota'.tiempoMs − click`,
 * es decir salida + entrada + retardo de detección: exactamente lo que hay que restar a
 * las detecciones (`IConfig.latEntradaMs`).
 */
import type { ICorBus, ICorCalibradorLatencia, ICorResultadoCalibracion } from '../core/cor_contratos';
import { tmp_programarClick } from './tmp_click';
import { TMP_INTERVALO_CALIB_MS } from './tmp_constantes';

const calcularMediana = (valores: readonly number[]): number => {
  const ordenados = [...valores].sort((valA, valB) => valA - valB);
  const mitad = Math.floor(ordenados.length / 2);
  if (ordenados.length === 0) return 0;
  return ordenados.length % 2 === 1 ? (ordenados[mitad] ?? 0) : ((ordenados[mitad - 1] ?? 0) + (ordenados[mitad] ?? 0)) / 2;
};

/**
 * Empareja cada click con el primer golpe en [click − ¼ intervalo, click + ¾ intervalo),
 * descarta atípicos (> 60 ms de la mediana) y promedia. Función pura.
 * Confiable si quedan ≥ 60 % de los clicks (mínimo 3) y el desvío es ≤ 25 ms.
 */
export function tmp_calcularLatencia(tiemposClickMs: readonly number[], tiemposGolpeMs: readonly number[]): ICorResultadoCalibracion {
  const tolAtipicoMs = 60;
  const desvioMaxMs = 25;
  const golpes = [...tiemposGolpeMs].sort((valA, valB) => valA - valB);
  const usados = new Set<number>();
  const diferencias: number[] = [];
  for (const clickMs of tiemposClickMs) {
    const idxGolpe = golpes.findIndex(
      (golpeMs, idx) => !usados.has(idx) && golpeMs >= clickMs - TMP_INTERVALO_CALIB_MS / 4 && golpeMs < clickMs + (TMP_INTERVALO_CALIB_MS * 3) / 4,
    );
    const golpeMs = golpes[idxGolpe];
    if (golpeMs === undefined) continue;
    usados.add(idxGolpe);
    diferencias.push(golpeMs - clickMs);
  }
  const mediana = calcularMediana(diferencias);
  const validas = diferencias.filter((dif) => Math.abs(dif - mediana) <= tolAtipicoMs);
  if (validas.length === 0) return { latMs: 0, desvioMs: 0, cantMuestras: 0, esConfiable: false };
  const promedio = validas.reduce((suma, dif) => suma + dif, 0) / validas.length;
  const varianza = validas.reduce((suma, dif) => suma + (dif - promedio) ** 2, 0) / validas.length;
  const desvioMs = Math.sqrt(varianza);
  const cantMin = Math.max(3, Math.ceil(tiemposClickMs.length * 0.6));
  return {
    latMs: Math.max(0, Math.round(promedio)),
    desvioMs,
    cantMuestras: validas.length,
    esConfiable: validas.length >= cantMin && desvioMs <= desvioMaxMs,
  };
}

export class TmpCalibrador implements ICorCalibradorLatencia {
  readonly #ctx: AudioContext;
  readonly #bus: ICorBus;
  #cancelarEnCurso: (() => void) | null = null;

  constructor(ctx: AudioContext, bus: ICorBus) {
    this.#ctx = ctx;
    this.#bus = bus;
  }

  esActivo(): boolean {
    return this.#cancelarEnCurso !== null;
  }

  /**
   * Requiere la captura y el detector activos. Llamar tras un gesto del usuario.
   * Rechaza con `Error('Calibración cancelada.')` si se llama a `cancelar()`.
   */
  async calibrar(cantClicks: number): Promise<ICorResultadoCalibracion> {
    this.cancelar();
    if (this.#ctx.state === 'suspended') await this.#ctx.resume();
    const cant = Math.max(1, Math.round(cantClicks));
    const inicioMs = this.#ctx.currentTime * 1000 + 600;
    const tiemposClickMs = Array.from({ length: cant }, (_valor, idx) => inicioMs + idx * TMP_INTERVALO_CALIB_MS);
    const salida = this.#ctx.createGain();
    salida.connect(this.#ctx.destination);
    tiemposClickMs.forEach((clickMs, idx) => tmp_programarClick(this.#ctx, salida, clickMs / 1000, idx === 0, 0.9));

    const tiemposGolpeMs: number[] = [];
    const cancelarNota = this.#bus.suscribir('det:nota', (nota) => tiemposGolpeMs.push(nota.tiempoMs));
    const esperaMs = inicioMs - this.#ctx.currentTime * 1000 + cant * TMP_INTERVALO_CALIB_MS + 300;

    return new Promise<ICorResultadoCalibracion>((resolver, rechazar) => {
      const finalizar = (): void => {
        clearTimeout(idTemporizador);
        cancelarNota();
        salida.disconnect();
        this.#cancelarEnCurso = null;
      };
      const idTemporizador = setTimeout(() => {
        finalizar();
        resolver(tmp_calcularLatencia(tiemposClickMs, tiemposGolpeMs));
      }, esperaMs);
      this.#cancelarEnCurso = () => {
        finalizar();
        rechazar(new Error('Calibración cancelada.'));
      };
    });
  }

  cancelar(): void {
    this.#cancelarEnCurso?.();
  }
}

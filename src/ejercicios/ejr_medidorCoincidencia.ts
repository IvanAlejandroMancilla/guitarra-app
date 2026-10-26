/**
 * Medidor de coincidencia en vivo: compara cada `'det:tono'` con la nota esperada y emite
 * `'ejr:coincidencia'` (como máximo cada `EJR_INTERVALO_COINCIDENCIA_MS`).
 * 100 % = nota correcta (según `ejr_validarNota` y el modo efectivo) y afinada; baja con los
 * cents de desvío; 0 % si es otra nota o no hay nota esperada. En `'det:silencio'` emite 0 % con
 * `esSilencio`. No conoce a las vistas ni a la UI.
 */
import type { ICorBus } from '../core/cor_contratos';
import type { IDetTono, IEjrCoincidencia } from '../core/cor_eventos';
import { cor_frecANota } from '../core/cor_notas';
import type { ICorAltura, IEjercicio, INota, IEventoTemporal, TEjrModoValidacion } from '../core/tipos';
import { ejr_calcularPctCoincidencia } from './ejr_coincidencia';
import type { IEjrOpcionesCoincidencia } from './ejr_tipos';
import { ejr_obtenerModo, ejr_validarNota } from './ejr_validador';

const EJR_INTERVALO_COINCIDENCIA_MS = 50;
/** Peso del valor nuevo en el suavizado exponencial del porcentaje (0..1). */
const EJR_FACTOR_SUAVIZADO_COINCIDENCIA = 0.35;
/** Modo del ejercicio supuesto mientras no hay ninguno cargado. */
const EJR_MODO_SIN_EJERCICIO: TEjrModoValidacion = 'flexible';

export class EjrMedidorCoincidencia {
  readonly #bus: ICorBus;
  #opc: IEjrOpcionesCoincidencia;
  #cancelaciones: (() => void)[] = [];

  #modoEj: TEjrModoValidacion = EJR_MODO_SIN_EJERCICIO;
  #esperada: INota | null = null;
  #idxNota = -1;
  /** `null` = sin historia (tras silencio o cambio de nota esperada): el próximo valor entra sin suavizar. */
  #pctSuavizado: number | null = null;
  #ultimaEmisionMs = -Infinity;
  #esSilencioEmitido = false;

  constructor(bus: ICorBus, opc: IEjrOpcionesCoincidencia) {
    this.#bus = bus;
    this.#opc = { ...opc };
  }

  esActivo(): boolean {
    return this.#cancelaciones.length > 0;
  }

  iniciar(): void {
    if (this.esActivo()) return;
    this.#cancelaciones = [
      this.#bus.suscribir('ejr:cargado', (cargado) => this.#cargar(cargado.ej)),
      this.#bus.suscribir('ejr:esperada', (esperada) => this.#fijarEsperada(esperada.nota, esperada.idxNota)),
      this.#bus.suscribir('det:tono', this.#procesarTono),
      this.#bus.suscribir('det:silencio', this.#procesarSilencio),
    ];
    const cargado = this.#bus.obtenerUltimo('ejr:cargado');
    if (cargado !== undefined) this.#cargar(cargado.ej);
    const esperada = this.#bus.obtenerUltimo('ejr:esperada');
    if (esperada !== undefined) this.#fijarEsperada(esperada.nota, esperada.idxNota);
  }

  detener(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
    this.#pctSuavizado = null;
    this.#ultimaEmisionMs = -Infinity;
    this.#esSilencioEmitido = false;
  }

  actualizarOpciones(opc: IEjrOpcionesCoincidencia): void {
    this.#opc = { ...opc };
    this.#pctSuavizado = null;
  }

  readonly #cargar = (ej: IEjercicio): void => {
    this.#modoEj = ej.modo;
    this.#fijarEsperada(ej.notas[0] ?? null, ej.notas.length > 0 ? 0 : -1);
  };

  readonly #fijarEsperada = (nota: INota | null, idxNota: number): void => {
    this.#esperada = nota;
    this.#idxNota = nota === null ? -1 : idxNota;
    this.#pctSuavizado = null;
  };

  readonly #procesarTono = (tono: IDetTono): void => {
    const notaFrec = cor_frecANota(tono.frecHz, this.#opc.frecA4Hz);
    if (!Number.isFinite(notaFrec.cents)) return;
    const detectada: ICorAltura = { nombre: notaFrec.nombre, oct: notaFrec.oct, midi: notaFrec.midi };
    const modo = ejr_obtenerModo(this.#opc.modo, this.#modoEj);
    const esperada = this.#esperada;
    const esNotaCorrecta = esperada !== null && ejr_validarNota(esperada, detectada, modo);
    const pctCrudo = ejr_calcularPctCoincidencia(notaFrec.cents, esNotaCorrecta);
    const previo = this.#pctSuavizado;
    const pct = previo === null ? pctCrudo : previo + (pctCrudo - previo) * EJR_FACTOR_SUAVIZADO_COINCIDENCIA;
    this.#pctSuavizado = pct;
    this.#esSilencioEmitido = false;

    if (tono.tiempoMs - this.#ultimaEmisionMs < EJR_INTERVALO_COINCIDENCIA_MS) return;
    this.#emitir({
      tiempoMs: tono.tiempoMs,
      pct,
      cents: notaFrec.cents,
      esNotaCorrecta,
      esSilencio: false,
      idxNota: this.#idxNota,
      detectada,
    });
  };

  readonly #procesarSilencio = (silencio: IEventoTemporal): void => {
    this.#pctSuavizado = null;
    if (this.#esSilencioEmitido) return;
    this.#esSilencioEmitido = true;
    this.#emitir({
      tiempoMs: silencio.tiempoMs,
      pct: 0,
      cents: 0,
      esNotaCorrecta: false,
      esSilencio: true,
      idxNota: this.#idxNota,
      detectada: null,
    });
  };

  readonly #emitir = (coincidencia: IEjrCoincidencia): void => {
    this.#ultimaEmisionMs = coincidencia.tiempoMs;
    this.#bus.emitir('ejr:coincidencia', coincidencia);
  };
}

/**
 * Sesión de práctica: compara cada `'det:nota'` con las notas esperadas y publica
 * aciertos, fallos, la próxima nota esperada y el resumen final.
 *
 * Dos modos según el reloj:
 * - Reproduciendo (con timing): la detección se ubica en pulsos con
 *   `reloj.convertirCtxAPosPulsos(tiempoMs)` y se busca la nota pendiente más cercana
 *   dentro de la ventana de captura (±tolMs × EJR_FACTOR_CAPTURA). Se prefiere la que
 *   coincide en altura: dentro de ±tolMs es acierto, fuera es fallo `'temprano'`/`'tarde'`.
 *   Si ninguna coincide, la más cercana dentro de ±tolMs cuenta fallo `'nota'`/`'octava'`.
 *   Las detecciones sin nota cercana se ignoran. Una nota cuya ventana de captura ya pasó
 *   se marca `'omitida'` en `actualizar()`. Cada nota recibe un único resultado.
 * - Detenido o en pausa ("nota por nota"): espera la próxima nota sin importar el tiempo;
 *   al acertarla avanza, y una nota equivocada cuenta fallo pero no avanza.
 */
import type { ICorActualizable, ICorBus, ICorCuadro, ICorReloj } from '../core/cor_contratos';
import type { IDetNotaDetectada, IEjrMarcador, IEjrResultado, ITmpTransporte, TEjrMotivoFallo } from '../core/cor_eventos';
import { cor_convertirPulsosAMs } from '../core/cor_tiempo';
import type { IEjercicio, INota } from '../core/tipos';
import { EjrPuntaje } from './ejr_puntaje';
import type { IEjrOpciones } from './ejr_tipos';
import { ejr_obtenerModo, ejr_validarIntento, ejr_validarNota } from './ejr_validador';

/** La ventana de captura (para fallos `'temprano'`/`'tarde'` y para omitir) es tolMs × este factor. */
const EJR_FACTOR_CAPTURA = 2;

export class EjrSesion implements ICorActualizable {
  readonly #bus: ICorBus;
  readonly #reloj: ICorReloj;
  readonly #puntaje: EjrPuntaje;
  #opc: IEjrOpciones;
  #ej: IEjercicio | null = null;
  /** Índices ya resueltos (con resultado o descartados por un salto de posición). */
  readonly #resueltas = new Set<number>();
  /** Primera nota no resuelta. */
  #idxSig = 0;
  #esFinEmitido = false;
  #primerResultadoMs: number | null = null;
  #ultimoResultadoMs = 0;

  constructor(bus: ICorBus, reloj: ICorReloj, puntaje: EjrPuntaje, opc: IEjrOpciones) {
    this.#bus = bus;
    this.#reloj = reloj;
    this.#puntaje = puntaje;
    this.#opc = { ...opc };
    bus.suscribir('ejr:cargado', (cargado) => this.cargar(cargado.ej));
    bus.suscribir('det:nota', this.#procesarNota);
    bus.suscribir('tmp:detencion', () => this.reiniciar());
    bus.suscribir('tmp:posicion', this.#procesarSalto);
    bus.suscribir('tmp:loop', this.#procesarVuelta);
    const cargado = bus.obtenerUltimo('ejr:cargado');
    if (cargado !== undefined) this.cargar(cargado.ej);
  }

  cargar(ej: IEjercicio): void {
    this.#ej = ej;
    this.reiniciar();
  }

  /** Vuelve al comienzo: marcador en cero y todas las notas pendientes. */
  reiniciar(): void {
    this.#puntaje.reiniciar();
    this.#resueltas.clear();
    this.#idxSig = 0;
    this.#esFinEmitido = false;
    this.#primerResultadoMs = null;
    this.#ultimoResultadoMs = 0;
    this.#emitirEsperada();
  }

  actualizarOpciones(opc: IEjrOpciones): void {
    this.#opc = { ...opc };
  }

  obtenerNotaEsperada(): INota | null {
    return this.#ej?.notas[this.#idxSig] ?? null;
  }

  obtenerMarcador(): IEjrMarcador {
    return this.#puntaje.obtenerMarcador();
  }

  /** Marca como omitidas las notas cuya ventana de captura ya pasó. */
  actualizar(cuadro: ICorCuadro): void {
    const ej = this.#ej;
    if (ej === null || this.#esFinEmitido || !this.#reloj.esReproduciendo() || cuadro.bpm <= 0) return;
    const pos = this.#reloj.convertirCtxAPosPulsos(cuadro.tiempoCtxMs);
    const capturaMs = this.#opc.tolMs * EJR_FACTOR_CAPTURA;
    for (let idx = this.#idxSig; idx < ej.notas.length; idx++) {
      const nota = ej.notas[idx];
      if (nota === undefined || this.#resueltas.has(idx)) continue;
      const desvioMs = cor_convertirPulsosAMs(pos - nota.tiempo, cuadro.bpm);
      if (desvioMs <= capturaMs) break;
      this.#puntaje.registrarFallo();
      this.#emitirResultado('ejr:fallo', nota, idx, desvioMs, 'omitida', null, 0, cuadro.tiempoCtxMs);
    }
    this.#avanzar();
  }

  readonly #procesarNota = (det: IDetNotaDetectada): void => {
    const ej = this.#ej;
    if (ej === null || this.#esFinEmitido) return;
    const modo = ejr_obtenerModo(this.#opc.modo, ej.modo);
    if (!this.#reloj.esReproduciendo()) {
      this.#procesarNotaPorNota(det, ej);
      return;
    }
    const bpm = this.#reloj.obtenerBpm();
    if (bpm <= 0) return;
    const pos = this.#reloj.convertirCtxAPosPulsos(det.tiempoMs);
    const tolMs = this.#opc.tolMs;
    const capturaMs = tolMs * EJR_FACTOR_CAPTURA;
    let idxCoincide = -1;
    let desvioCoincide = Infinity;
    let idxCercana = -1;
    let desvioCercana = Infinity;
    for (let idx = this.#idxSig; idx < ej.notas.length; idx++) {
      const nota = ej.notas[idx];
      if (nota === undefined || this.#resueltas.has(idx)) continue;
      const desvioMs = cor_convertirPulsosAMs(pos - nota.tiempo, bpm);
      // Ordenadas por tiempo: las siguientes están todavía más lejos en el futuro.
      if (desvioMs < -capturaMs) break;
      if (desvioMs > capturaMs) continue;
      if (ejr_validarNota(nota, det, modo) && Math.abs(desvioMs) < Math.abs(desvioCoincide)) {
        idxCoincide = idx;
        desvioCoincide = desvioMs;
      }
      if (Math.abs(desvioMs) <= tolMs && Math.abs(desvioMs) < Math.abs(desvioCercana)) {
        idxCercana = idx;
        desvioCercana = desvioMs;
      }
    }
    const idxElegida = idxCoincide >= 0 ? idxCoincide : idxCercana;
    const desvioMs = idxCoincide >= 0 ? desvioCoincide : desvioCercana;
    const nota = ej.notas[idxElegida];
    if (nota === undefined) return;
    const evaluacion = ejr_validarIntento(nota, det, desvioMs, modo, tolMs);
    if (evaluacion.esAcierto) {
      const puntos = this.#puntaje.registrarAcierto(desvioMs, tolMs);
      this.#emitirResultado('ejr:acierto', nota, idxElegida, desvioMs, null, det, puntos, det.tiempoMs);
    } else {
      this.#puntaje.registrarFallo();
      this.#emitirResultado('ejr:fallo', nota, idxElegida, desvioMs, evaluacion.motivo, det, 0, det.tiempoMs);
    }
    this.#avanzar();
  };

  readonly #procesarNotaPorNota = (det: IDetNotaDetectada, ej: IEjercicio): void => {
    const nota = ej.notas[this.#idxSig];
    if (nota === undefined) return;
    const modo = ejr_obtenerModo(this.#opc.modo, ej.modo);
    if (ejr_validarNota(nota, det, modo)) {
      const puntos = this.#puntaje.registrarAcierto(0, this.#opc.tolMs);
      this.#emitirResultado('ejr:acierto', nota, this.#idxSig, 0, null, det, puntos, det.tiempoMs);
      this.#avanzar();
      return;
    }
    // Fallo informativo: la nota sigue pendiente (no se agrega a #resueltas).
    this.#puntaje.registrarFallo();
    const motivo: TEjrMotivoFallo = nota.nombre === det.nombre ? 'octava' : 'nota';
    this.#emitirMsj('ejr:fallo', {
      tiempoMs: det.tiempoMs,
      nota,
      idxNota: this.#idxSig,
      desvioMs: 0,
      motivo,
      detectada: det,
      puntos: 0,
      marcador: this.#puntaje.obtenerMarcador(),
    });
  };

  /** Salto de posición (seek o vuelta de loop): lo anterior se descarta y lo posterior queda pendiente. */
  readonly #procesarSalto = (transporte: ITmpTransporte): void => {
    const ej = this.#ej;
    if (ej === null) return;
    this.#resueltas.clear();
    ej.notas.forEach((nota, idx) => {
      if (nota.tiempo < transporte.posPulsos) this.#resueltas.add(idx);
    });
    this.#idxSig = 0;
    // Si el salto deja todo atrás no hay nada que evaluar: no se emite un resumen vacío.
    this.#esFinEmitido = this.#resueltas.size >= ej.notas.length;
    this.#avanzar(true);
  };

  /** Fin de una vuelta del loop: resumen de la vuelta y marcador nuevo. */
  readonly #procesarVuelta = (): void => {
    if (this.#ej === null) return;
    if (!this.#esFinEmitido) this.#emitirFin();
    this.reiniciar();
  };

  /** Recalcula la primera nota pendiente, avisa si cambió y emite el fin si no quedan. */
  readonly #avanzar = (esForzado = false): void => {
    const ej = this.#ej;
    if (ej === null) return;
    const idxAnt = this.#idxSig;
    while (this.#idxSig < ej.notas.length && this.#resueltas.has(this.#idxSig)) this.#idxSig++;
    if (esForzado || this.#idxSig !== idxAnt) this.#emitirEsperada();
    if (this.#idxSig >= ej.notas.length && !this.#esFinEmitido) this.#emitirFin();
  };

  readonly #emitirResultado = (
    evento: 'ejr:acierto' | 'ejr:fallo',
    nota: INota,
    idxNota: number,
    desvioMs: number,
    motivo: TEjrMotivoFallo | null,
    detectada: IDetNotaDetectada | null,
    puntos: number,
    tiempoMs: number,
  ): void => {
    this.#resueltas.add(idxNota);
    this.#emitirMsj(evento, {
      tiempoMs,
      nota,
      idxNota,
      desvioMs,
      motivo,
      detectada,
      puntos,
      marcador: this.#puntaje.obtenerMarcador(),
    });
  };

  readonly #emitirMsj = (evento: 'ejr:acierto' | 'ejr:fallo', resultado: IEjrResultado): void => {
    this.#primerResultadoMs ??= resultado.tiempoMs;
    this.#ultimoResultadoMs = resultado.tiempoMs;
    this.#bus.emitir(evento, resultado);
  };

  readonly #emitirEsperada = (): void => {
    this.#bus.emitir('ejr:esperada', { nota: this.obtenerNotaEsperada(), idxNota: this.#idxSig });
  };

  readonly #emitirFin = (): void => {
    if (this.#ej === null) return;
    this.#esFinEmitido = true;
    const marcador = this.#puntaje.obtenerMarcador();
    const cantIntentos = marcador.aciertos + marcador.fallos;
    this.#bus.emitir('ejr:fin', {
      titulo: this.#ej.titulo,
      marcador,
      precision: cantIntentos > 0 ? marcador.aciertos / cantIntentos : 0,
      durMs: this.#primerResultadoMs === null ? 0 : this.#ultimoResultadoMs - this.#primerResultadoMs,
    });
  };
}

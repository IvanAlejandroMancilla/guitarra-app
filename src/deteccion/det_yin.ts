/**
 * Detector monofónico: cada `DET_INTERVALO_MS` lee la fuente, estima la fundamental
 * (Pitchy/MPM vía `IDetEstimador`), filtra por volumen, claridad y rango, y publica:
 * - `'det:tono'`   en cada frame con tono válido (afinador);
 * - `'det:nota'`   cuando la nota pasa el filtro de estabilidad (ejercicios);
 * - `'det:silencio'` una vez tras `DET_FRAMES_SILENCIO` frames sin tono.
 * No conoce vistas ni ejercicios: todo sale por el bus.
 */
import type { ICorBus, ICorDetector, ICorFuenteAudio } from '../core/cor_contratos';
import { cor_frecANota } from '../core/cor_notas';
import {
  DET_FRAMES_SILENCIO,
  DET_FREC_MAX_HZ,
  DET_FREC_MIN_HZ,
  DET_INTERVALO_MS,
  DET_RMS_MIN,
} from './det_constantes';
import { DetFiltroEstabilidad } from './det_estabilidad';
import { det_validarClaridad, det_validarRango } from './det_filtros';
import type { IDetEstimador, IDetOpciones } from './det_tipos';

/** Subida de RMS entre frames consecutivos que se interpreta como un ataque nuevo (nota repetida). */
const DET_FACTOR_ATAQUE = 1.6;

const calcularRms = (buf: Float32Array): number => {
  let suma = 0;
  for (let i = 0; i < buf.length; i++) {
    const muestra = buf[i] ?? 0;
    suma += muestra * muestra;
  }
  return buf.length === 0 ? 0 : Math.sqrt(suma / buf.length);
};

export class DetDetectorYin implements ICorDetector {
  readonly #fuente: ICorFuenteAudio;
  readonly #estimador: IDetEstimador;
  readonly #bus: ICorBus;
  readonly #filtro: DetFiltroEstabilidad;
  #opc: IDetOpciones;
  #buf: Float32Array = new Float32Array(0);
  #idIntervalo: ReturnType<typeof setInterval> | null = null;
  /** MIDI de la racha actual y su instante de inicio (ataque). */
  #midiRacha: number | null = null;
  #inicioRachaMs = 0;
  #cantSinTono = 0;
  #esSilencioEmitido = true;
  #rmsAnt = 0;

  constructor(fuente: ICorFuenteAudio, estimador: IDetEstimador, bus: ICorBus, opc: IDetOpciones) {
    this.#fuente = fuente;
    this.#estimador = estimador;
    this.#bus = bus;
    this.#opc = { ...opc };
    this.#filtro = new DetFiltroEstabilidad(opc.framesEstables);
  }

  iniciar(): Promise<void> {
    if (this.#idIntervalo === null) {
      this.#reiniciarRacha();
      this.#cantSinTono = 0;
      this.#esSilencioEmitido = true;
      this.#rmsAnt = 0;
      this.#idIntervalo = setInterval(this.#procesarFrame, DET_INTERVALO_MS);
    }
    return Promise.resolve();
  }

  detener(): void {
    if (this.#idIntervalo !== null) clearInterval(this.#idIntervalo);
    this.#idIntervalo = null;
    this.#reiniciarRacha();
  }

  esActivo(): boolean {
    return this.#idIntervalo !== null;
  }

  actualizarOpciones(opc: IDetOpciones): void {
    this.#opc = { ...opc };
    this.#filtro.fijarFramesEstables(opc.framesEstables);
  }

  /** Procesa un frame (lo llama el intervalo). */
  readonly #procesarFrame = (): void => {
    if (!this.#fuente.esActivo()) return;
    const tamBuf = this.#fuente.obtenerTamBuf();
    if (this.#buf.length !== tamBuf) this.#buf = new Float32Array(tamBuf);
    this.#fuente.leerMuestras(this.#buf);
    const tiempoMs = this.#fuente.obtenerCtx().currentTime * 1000;

    const rms = calcularRms(this.#buf);
    const rmsAnt = this.#rmsAnt;
    this.#rmsAnt = rms;
    if (rms < DET_RMS_MIN) {
      this.#registrarSinTono(tiempoMs);
      return;
    }
    // Ataque nuevo sobre una nota que sigue sonando: rearma el filtro para poder repetir la nota.
    if (rmsAnt >= DET_RMS_MIN && rms > rmsAnt * DET_FACTOR_ATAQUE) this.#reiniciarRacha();

    const estimacion = this.#estimador.estimar(this.#buf, this.#fuente.obtenerFrecMuestreoHz());
    const esTonoValido =
      det_validarClaridad(estimacion.claridad, this.#opc.claridadMin) &&
      det_validarRango(estimacion.frecHz, DET_FREC_MIN_HZ, DET_FREC_MAX_HZ);
    if (!esTonoValido) {
      this.#registrarSinTono(tiempoMs);
      return;
    }

    this.#cantSinTono = 0;
    this.#esSilencioEmitido = false;
    this.#bus.emitir('det:tono', { tiempoMs, frecHz: estimacion.frecHz, claridad: estimacion.claridad });

    const nota = cor_frecANota(estimacion.frecHz, this.#opc.frecA4Hz);
    if (nota.midi !== this.#midiRacha) {
      this.#midiRacha = nota.midi;
      this.#inicioRachaMs = tiempoMs;
    }
    const midiConfirmado = this.#filtro.registrar(nota.midi);
    if (midiConfirmado !== null) {
      this.#bus.emitir('det:nota', { ...nota, claridad: estimacion.claridad, tiempoMs: this.#inicioRachaMs });
    }
  };

  /** Frame sin tono (silencio o ruido): no rompe la racha hasta acumular `DET_FRAMES_SILENCIO`. */
  readonly #registrarSinTono = (tiempoMs: number): void => {
    this.#cantSinTono++;
    if (this.#cantSinTono < DET_FRAMES_SILENCIO || this.#esSilencioEmitido) return;
    this.#esSilencioEmitido = true;
    this.#reiniciarRacha();
    this.#bus.emitir('det:silencio', { tiempoMs });
  };

  readonly #reiniciarRacha = (): void => {
    this.#filtro.reiniciar();
    this.#midiRacha = null;
  };
}

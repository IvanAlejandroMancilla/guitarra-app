/** Captura de la guitarra con `getUserMedia` → `GainNode` → `AnalyserNode`. */
import type { ICorBus, ICorFuenteAudio } from '../core/cor_contratos';
import type { TAudEstado } from '../core/cor_eventos';
import { AUD_GAN_DEF, AUD_GAN_MAX, AUD_TAM_FFT } from './aud_constantes';
import { aud_reanudarContexto } from './aud_contexto';
import { aud_crearRestricciones } from './aud_restricciones';

const obtenerNombreError = (err: unknown): string =>
  typeof err === 'object' && err !== null && 'name' in err && typeof err.name === 'string' ? err.name : '';

const obtenerMsjError = (nombreError: string): string => {
  switch (nombreError) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Permiso de micrófono denegado. Habilítalo en la configuración del navegador (ícono del candado) y vuelve a intentar.';
    case 'NotFoundError':
      return 'No se encontró ninguna entrada de audio. Conecta la interfaz o el micrófono y vuelve a intentar.';
    case 'NotReadableError':
      return 'La entrada de audio está en uso por otra aplicación o no responde.';
    case 'OverconstrainedError':
      return 'El dispositivo de entrada elegido ya no está disponible.';
    case 'NoSoportado':
      return 'Este navegador no permite capturar audio aquí (se necesita HTTPS o localhost).';
    default:
      return 'No se pudo iniciar la captura de audio.';
  }
};

/**
 * Fuente de audio de la guitarra. El analizador NO se conecta a la salida
 * (sin monitoreo) para evitar acoples. Emite `'aud:estado'` en cada cambio y
 * `'cor:error'` cuando el estado pasa a `'denegado'` o `'error'`.
 */
export class AudCaptura implements ICorFuenteAudio {
  readonly #ctx: AudioContext;
  readonly #bus: ICorBus;
  readonly #ganancia: GainNode;
  readonly #analizador: AnalyserNode;
  readonly #bufInterno: Float32Array<ArrayBuffer>;
  #flujo: MediaStream | null = null;
  #fuente: MediaStreamAudioSourceNode | null = null;
  #estado: TAudEstado = 'inactivo';
  #idDisp = '';

  constructor(ctx: AudioContext, bus: ICorBus) {
    this.#ctx = ctx;
    this.#bus = bus;
    this.#ganancia = ctx.createGain();
    this.#ganancia.gain.value = AUD_GAN_DEF;
    this.#analizador = ctx.createAnalyser();
    this.#analizador.fftSize = AUD_TAM_FFT;
    this.#analizador.smoothingTimeConstant = 0;
    this.#ganancia.connect(this.#analizador);
    this.#bufInterno = new Float32Array(this.#analizador.fftSize);
  }

  /**
   * Pide permiso y abre la entrada. Llamar tras un gesto del usuario (reanuda el contexto).
   * Si el dispositivo pedido ya no existe, reintenta con el predeterminado.
   * Llamarlo con la captura activa cambia de dispositivo.
   */
  async iniciar(idDisp = ''): Promise<void> {
    this.#liberarFlujo();
    this.#emitirEstado('solicitando', idDisp, null);
    try {
      await aud_reanudarContexto(this.#ctx);
      const flujo = await this.#obtenerFlujo(idDisp);
      this.#flujo = flujo;
      this.#fuente = this.#ctx.createMediaStreamSource(flujo);
      this.#fuente.connect(this.#ganancia);
      for (const pista of flujo.getAudioTracks()) pista.addEventListener('ended', this.#detenerPorDesconexion);
      this.#emitirEstado('activo', this.#idDisp, null);
    } catch (err) {
      this.#liberarFlujo();
      const nombreError = obtenerNombreError(err);
      const msj = obtenerMsjError(nombreError);
      const esDenegado = nombreError === 'NotAllowedError' || nombreError === 'SecurityError';
      console.error('[aud] Error al iniciar la captura:', err);
      this.#emitirEstado(esDenegado ? 'denegado' : 'error', idDisp, msj);
      this.#bus.emitir('cor:error', { origen: 'aud', msj });
    }
  }

  detener(): void {
    this.#liberarFlujo();
    this.#emitirEstado('inactivo', this.#idDisp, null);
  }

  /** Ganancia de entrada, acotada a [0, `AUD_GAN_MAX`]. */
  fijarGanancia(gan: number): void {
    const ganAcotada = Number.isFinite(gan) ? Math.min(Math.max(gan, 0), AUD_GAN_MAX) : AUD_GAN_DEF;
    this.#ganancia.gain.setTargetAtTime(ganAcotada, this.#ctx.currentTime, 0.02);
  }

  /**
   * Señal limpia de la guitarra: el `GainNode` de entrada (post ganancia, pre efectos).
   * El analizador cuelga de este mismo nodo, así la detección siempre recibe la señal limpia.
   */
  obtenerSalidaLimpia(): AudioNode {
    return this.#ganancia;
  }

  obtenerAnalizador(): AnalyserNode {
    return this.#analizador;
  }

  obtenerCtx(): AudioContext {
    return this.#ctx;
  }

  /** Copia las muestras más recientes en `buf`; ceros si la captura no está activa. */
  leerMuestras(buf: Float32Array): void {
    if (!this.esActivo()) {
      buf.fill(0);
      return;
    }
    // getFloatTimeDomainData exige Float32Array<ArrayBuffer>; se lee en un buffer propio y se copia.
    this.#analizador.getFloatTimeDomainData(this.#bufInterno);
    if (buf.length <= this.#bufInterno.length) {
      buf.set(this.#bufInterno.subarray(this.#bufInterno.length - buf.length));
    } else {
      buf.fill(0);
      buf.set(this.#bufInterno);
    }
  }

  obtenerFrecMuestreoHz(): number {
    return this.#ctx.sampleRate;
  }

  obtenerTamBuf(): number {
    return this.#analizador.fftSize;
  }

  esActivo(): boolean {
    return this.#estado === 'activo';
  }

  readonly #obtenerFlujo = async (idDisp: string): Promise<MediaStream> => {
    if (!('mediaDevices' in navigator) || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      throw new DOMException('getUserMedia no disponible', 'NoSoportado');
    }
    try {
      const flujo = await navigator.mediaDevices.getUserMedia(aud_crearRestricciones(idDisp));
      this.#idDisp = idDisp;
      return flujo;
    } catch (err) {
      const nombreError = obtenerNombreError(err);
      const puedeReintentar = idDisp !== '' && (nombreError === 'OverconstrainedError' || nombreError === 'NotFoundError');
      if (!puedeReintentar) throw err;
      console.warn('[aud] El dispositivo pedido no está disponible; se usa el predeterminado.');
      const flujo = await navigator.mediaDevices.getUserMedia(aud_crearRestricciones());
      this.#idDisp = '';
      return flujo;
    }
  };

  readonly #liberarFlujo = (): void => {
    this.#fuente?.disconnect();
    this.#fuente = null;
    if (this.#flujo !== null) {
      for (const pista of this.#flujo.getTracks()) {
        pista.removeEventListener('ended', this.#detenerPorDesconexion);
        pista.stop();
      }
    }
    this.#flujo = null;
  };

  readonly #detenerPorDesconexion = (): void => {
    this.#liberarFlujo();
    const msj = 'Se desconectó la entrada de audio.';
    this.#emitirEstado('error', this.#idDisp, msj);
    this.#bus.emitir('cor:error', { origen: 'aud', msj });
  };

  readonly #emitirEstado = (estado: TAudEstado, idDisp: string, msjError: string | null): void => {
    this.#estado = estado;
    this.#bus.emitir('aud:estado', { estado, idDisp, msjError });
  };
}

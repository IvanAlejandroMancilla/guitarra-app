/**
 * Contratos (interfaces pequeñas) entre módulos (contrato: docs/firmas-aprobadas.md §1).
 * Las implementaciones concretas se instancian solo en `src/main.ts`.
 */
import type { ICorMapaEventos, TCorNombreEvento, TCorOyente } from './cor_eventos';
import type { IConfig, IEjercicio, TCfgCalidad, TCfgNotacion } from './tipos';

/** Bus de eventos tipado. */
export interface ICorBus {
  emitir<TClave extends TCorNombreEvento>(nombre: TClave, payload: ICorMapaEventos[TClave]): void;
  /** Devuelve una función que cancela la suscripción. */
  suscribir<TClave extends TCorNombreEvento>(nombre: TClave, oyente: TCorOyente<TClave>): () => void;
  desuscribir<TClave extends TCorNombreEvento>(nombre: TClave, oyente: TCorOyente<TClave>): void;
  /** Último payload emitido para ese evento (útil para quien se suscribe tarde). */
  obtenerUltimo<TClave extends TCorNombreEvento>(nombre: TClave): ICorMapaEventos[TClave] | undefined;
}

/** Estado de un cuadro de animación, armado por `CorBucle` desde `ICorReloj`. */
export interface ICorCuadro {
  /** `AudioContext.currentTime * 1000`. */
  tiempoCtxMs: number;
  /** Posición audible de transporte en pulsos. */
  posPulsos: number;
  posMs: number;
  /** Tiempo desde el cuadro anterior en ms, acotado a [0, `COR_DELTA_MAX_MS`]. */
  deltaMs: number;
  /** BPM efectivo (bpm × velocidad). */
  bpm: number;
}

export interface ICorActualizable {
  actualizar(cuadro: ICorCuadro): void;
}

export interface ICorDibujable {
  dibujar(cuadro: ICorCuadro): void;
}

export interface ICorMontable {
  montar(contenedor: HTMLElement): Promise<void>;
  /** Quita del DOM y libera recursos. */
  desmontar(): void;
}

/** Subconjunto de la configuración que afecta a las vistas. */
export interface ICorOpcionesVista {
  esZurdo: boolean;
  notacion: TCfgNotacion;
  velocidadAutopista: number;
  calidad: TCfgCalidad;
}

/** Contrato de vistas (Canvas 2D, 3D). Consumen eventos del bus inyectado por constructor. */
export interface ICorVista extends ICorMontable, ICorDibujable {
  redimensionar(anchoPx: number, altoPx: number): void;
  actualizarOpciones(opc: ICorOpcionesVista): void;
}

/** Lectura del tiempo de transporte sin depender de `tmp`. */
export interface ICorReloj {
  /** `AudioContext.currentTime * 1000`. */
  obtenerTiempoCtxMs(): number;
  /** Posición audible (ya resta `latSalidaMs`). */
  obtenerPosPulsos(): number;
  obtenerPosMs(): number;
  /** BPM efectivo = bpm × velocidad. */
  obtenerBpm(): number;
  /** Para detecciones: convierte un instante del contexto a posición (ya resta `latEntradaMs`). */
  convertirCtxAPosPulsos(tiempoCtxMs: number): number;
  esReproduciendo(): boolean;
}

export interface ICorReproducible {
  reproducir(): void;
  pausar(): void;
  detener(): void;
}

export interface ICorPosicionable {
  fijarPosPulsos(posPulsos: number): void;
}

/** Fuente de audio capturado (implementada por `aud`, consumida por `det`). */
export interface ICorFuenteAudio {
  obtenerCtx(): AudioContext;
  /** Copia las muestras actuales (dominio del tiempo) en `buf`. */
  leerMuestras(buf: Float32Array): void;
  obtenerFrecMuestreoHz(): number;
  obtenerTamBuf(): number;
  esActivo(): boolean;
}

/** Contrato de detectores de nota (YIN, MIDI hexafónico…). Publican por el bus. */
export interface ICorDetector {
  iniciar(): Promise<void>;
  detener(): void;
  esActivo(): boolean;
}

/** Contrato de importadores de ejercicios (JSON, Guitar Pro, MusicXML). */
export interface ICorImportador {
  /** Extensiones aceptadas, en minúsculas. */
  readonly extensiones: readonly string[];
  esCompatible(nombreArchivo: string): boolean;
  /** Rechaza la promesa con un `Error` de mensaje en español si el contenido no es válido. */
  importar(fuente: ArrayBuffer, nombreArchivo: string): Promise<IEjercicio>;
}

/** Lectura de la configuración vigente. Los cambios se notifican con `'cfg:cambio'`. */
export interface ICorFuenteConfig {
  obtenerConfig(): Readonly<IConfig>;
}

export interface ICorEditorConfig extends ICorFuenteConfig {
  actualizarConfig(parcial: Partial<IConfig>): void;
  restablecerConfig(): void;
}

export interface ICorResultadoCalibracion {
  /** Latencia estimada en ms. */
  latMs: number;
  /** Desvío estándar de las mediciones en ms. */
  desvioMs: number;
  cantMuestras: number;
  esConfiable: boolean;
}

export interface ICorCalibradorLatencia {
  calibrar(cantClicks: number): Promise<ICorResultadoCalibracion>;
  cancelar(): void;
}

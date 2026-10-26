/**
 * Tipos centrales de la app. `core` no depende de ningún otro módulo.
 * Convención de octava científica: La4 = 440 Hz, Do4 = MIDI 60, Mi2 = cuerda 6 al aire.
 * Cuerda 1 = Mi agudo, cuerda 6 = Mi grave.
 */

/** Nombre de nota en notación latina (solo sostenidos; los bemoles se normalizan). */
export type TNombreNota =
  | 'Do'
  | 'Do#'
  | 'Re'
  | 'Re#'
  | 'Mi'
  | 'Fa'
  | 'Fa#'
  | 'Sol'
  | 'Sol#'
  | 'La'
  | 'La#'
  | 'Si';

/** Nombre de nota en notación anglosajona (solo sostenidos). */
export type TNombreNotaAnglo = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

/** Identificador de afinación. Las definiciones viven en `afn` (`AFN_AFINACIONES`). */
export type TIdAfinacion = 'estandar' | 'dropD' | 'medioTonoAbajo' | 'dropC' | 'dadgad' | 'openG';

/** Modo de validación de un ejercicio: `estricto` = nombre + octava; `flexible` = solo nombre. */
export type TEjrModoValidacion = 'estricto' | 'flexible';

/** Modo de validación en configuración: `ejercicio` = usar el `modo` que trae cada ejercicio. */
export type TCfgModoValidacion = TEjrModoValidacion | 'ejercicio';

/** Vista activa: liviana Canvas 2D, autopista 3D estilo Guitar Hero o autopista 3D estilo Rocksmith. */
export type TCfgVista = '2d' | 'guitarHero' | 'rocksmith';

/** Calidad gráfica (afecta sobre todo a la vista 3D). */
export type TCfgCalidad = 'baja' | 'media' | 'alta';

/** Notación de nombres de nota mostrada al usuario. */
export type TCfgNotacion = 'latina' | 'anglosajona';

/** Resultado de una operación que puede fallar sin lanzar (validaciones, importaciones). */
export type TCorResultado<TValor> =
  | { esValido: true; valor: TValor }
  | { esValido: false; errores: readonly string[] };

/** Afinación de la guitarra. */
export interface IAfinacion {
  /** `'personalizada'` para afinaciones que no están en el catálogo (ej. pistas Guitar Pro). */
  id: TIdAfinacion | 'personalizada';
  /** Nombre visible en español (ej. "Estándar", "Drop D"). */
  nombre: string;
  /** MIDI de cada cuerda al aire; idx 0 = cuerda 1 (Mi agudo), idx 5 = cuerda 6 (Mi grave). */
  midiCuerdas: readonly number[];
}

/** Nota esperada dentro de un ejercicio. */
export interface INota {
  nombre: TNombreNota;
  /** Octava científica (Do4 = MIDI 60). */
  oct: number;
  /** Cuerda 1–6 (1 = Mi agudo). Opcional: la validación es por nombre/octava. */
  cur?: number;
  /** Traste 0–24. */
  trs?: number;
  /** Inicio en pulsos desde el comienzo del ejercicio. */
  tiempo: number;
  /** Duración en pulsos. */
  dur?: number;
  /** Dedo de la mano izquierda 0–4 (0 = al aire, 1 índice, 2 medio, 3 anular, 4 meñique). */
  dedo?: number;
}

/** Posición en el mástil. */
export interface ICorPosMastil {
  /** Cuerda 1–6 (1 = Mi agudo). */
  cur: number;
  /** Traste 0–24. */
  trs: number;
}

/** Ejercicio o canción a practicar. */
export interface IEjercicio {
  titulo: string;
  bpm: number;
  modo: TEjrModoValidacion;
  /** Ordenadas por `tiempo` ascendente. */
  notas: INota[];
  descripcion?: string;
  afinacion?: IAfinacion;
  /** Pulsos por compás (def. 4). */
  pulsosPorCompas?: number;
}

/** Evento con marca de tiempo absoluta del AudioContext: `AudioContext.currentTime * 1000`. */
export interface IEventoTemporal {
  tiempoMs: number;
}

/** Altura musical: nombre + octava + número MIDI. */
export interface ICorAltura {
  nombre: TNombreNota;
  oct: number;
  /** Número MIDI entero (Do4 = 60, La4 = 69). */
  midi: number;
}

/** Altura obtenida desde una frecuencia, con su desvío. */
export interface ICorNotaFrec extends ICorAltura {
  frecHz: number;
  /** Desvío respecto de la nota temperada más cercana, en cents (−50..50). */
  cents: number;
}

/** Configuración global de la app (plana). Los valores por defecto viven en `cfg` (`CFG_VALORES_DEF`). */
export interface IConfig {
  /** Id del dispositivo de entrada. Def. `''` (= predeterminado del sistema). */
  idDispEntrada: string;
  /** Ganancia de entrada. Rango 0–4, paso 0.05. Def. 1. */
  ganEntrada: number;
  /** Latencia de entrada (captura) en ms; se resta a las detecciones. Rango 0–500, paso 1. Def. 0. */
  latEntradaMs: number;
  /** Latencia de salida en ms: retraso audible de metrónomo/acp; desplaza la vista. Rango 0–500, paso 1. Def. 0. */
  latSalidaMs: number;
  /** Claridad mínima de YIN para aceptar un tono. Rango 0.5–0.99, paso 0.01. Def. 0.9. */
  claridadMin: number;
  /** Frames consecutivos con la misma nota para confirmarla. Rango 1–10, paso 1. Def. 3. */
  framesEstables: number;
  /** Frecuencia de referencia La4 en Hz. Rango 430–450, paso 0.5. Def. 440. */
  frecA4Hz: number;
  /** Modo de validación. Valores `'estricto' | 'flexible' | 'ejercicio'`. Def. `'ejercicio'`. */
  modoValidacion: TCfgModoValidacion;
  /** Ventana de tolerancia (±) en ms para aceptar un acierto. Rango 20–300, paso 5. Def. 100. */
  tolMs: number;
  /** Pulsos por minuto base. Rango 30–300, paso 1. Def. 80. */
  bpm: number;
  /** Factor de velocidad de práctica. Rango 0.5–1, paso 0.05. Def. 1. */
  velocidad: number;
  /** Velocidad progresiva activa (sube el BPM al completar vueltas). Def. false. */
  esProgresivo: boolean;
  /** Incremento de BPM por vuelta en modo progresivo. Rango 1–20, paso 1. Def. 5. */
  incBpmProgresivo: number;
  /** BPM máximo del modo progresivo. Rango 30–300, paso 1. Def. 160. */
  bpmMaxProgresivo: number;
  /** Repetir el ejercicio en bucle. Def. false. */
  esLoop: boolean;
  /** Metrónomo sonando. Def. true. */
  esMetronomoActivo: boolean;
  /** Afinación activa. Def. `'estandar'`. */
  idAfinacion: TIdAfinacion;
  /** Volumen del metrónomo. Rango 0–1, paso 0.01. Def. 0.7. */
  volMetronomo: number;
  /** Volumen general del acompañamiento. Rango 0–1, paso 0.01. Def. 0.8. */
  volAcp: number;
  /** Vista activa. Valores `'2d' | 'guitarHero' | 'rocksmith'`. Def. `'rocksmith'`. */
  vista: TCfgVista;
  /** Calidad gráfica. Valores `'baja' | 'media' | 'alta'`. Def. `'media'`. */
  calidad: TCfgCalidad;
  /** Factor de velocidad visual de la autopista. Rango 0.5–3, paso 0.1. Def. 1. */
  velocidadAutopista: number;
  /** Modo zurdo (invierte el orden horizontal de carriles). Def. false. */
  esZurdo: boolean;
  /** Notación de nombres. Valores `'latina' | 'anglosajona'`. Def. `'latina'`. */
  notacion: TCfgNotacion;
  /** Monitoreo (escuchar la guitarra con efectos por la salida). Def. false (evita acoples). */
  esMonitorActivo: boolean;
  /** Volumen de monitoreo. Rango 0–1, paso 0.01. Def. 0.5. */
  volMonitor: number;
  /** Id del preset de efectos activo (`'fabrica:<clave>'` o `'usuario:<uuid>'`). Def. `'fabrica:limpioBrillante'`. */
  idPresetEfx: string;
}

/**
 * Catálogo tipado de eventos del bus y sus payloads (contrato: docs/firmas-aprobadas.md §1).
 * Nombre de evento: `'<abrev>:<accion>'`, donde `<abrev>` es el módulo que emite.
 * Todo `tiempoMs` (de `IEventoTemporal`) = `AudioContext.currentTime * 1000`.
 * `posMs` / `posPulsos` = posición de transporte (tiempo musical desde el inicio del ejercicio).
 */
import type { IEfxBloques, IEfxPreset, TEfxIdBloque } from './cor_efectos';
import type { IAfinacion, ICorAltura, ICorNotaFrec, IConfig, IEjercicio, IEventoTemporal, INota, TIdAfinacion, TNombreNota } from './tipos';

// ---------- cor ----------

/** Error reportable al usuario. */
export interface ICorError {
  /** Abreviatura del módulo de origen (ej. `'aud'`). */
  origen: string;
  /** Mensaje en español, apto para mostrar. */
  msj: string;
}

// ---------- aud ----------

export type TAudEstado = 'inactivo' | 'solicitando' | 'activo' | 'denegado' | 'error';

export interface IAudEstado {
  estado: TAudEstado;
  /** Id del dispositivo en uso (`''` = predeterminado). */
  idDisp: string;
  /** Mensaje en español para `denegado` / `error`; `null` en los demás estados. */
  msjError: string | null;
}

export interface IAudDispositivo {
  id: string;
  /** Etiqueta visible (vacía si aún no hay permiso de micrófono). */
  etiqueta: string;
  esPredeterminado: boolean;
}

export interface IAudListaDispositivos {
  disps: readonly IAudDispositivo[];
}

export interface IAudNivel extends IEventoTemporal {
  /** RMS lineal 0..1. */
  rms: number;
  /** RMS en dBFS (≤ 0). */
  rmsDb: number;
  /** Pico en dBFS (≤ 0). */
  picoDb: number;
  esSaturado: boolean;
}

export interface IAudOnda extends IEventoTemporal {
  /** Muestras en el dominio del tiempo (−1..1). Buffer reutilizado: copiar si se guarda. */
  muestras: Float32Array;
  frecMuestreoHz: number;
}

// ---------- det ----------

/** Tono crudo de cada frame con claridad suficiente (lo usa el afinador). */
export interface IDetTono extends IEventoTemporal {
  frecHz: number;
  /** Claridad YIN 0..1. */
  claridad: number;
}

/**
 * Nota confirmada tras el filtro de estabilidad (la usa `ejr`).
 * `tiempoMs` = instante del primer frame estable (ataque), no el de confirmación,
 * para que la validación de timing no herede el retardo del filtro.
 */
export interface IDetNotaDetectada extends IEventoTemporal, ICorNotaFrec {
  claridad: number;
}

// ---------- afn ----------

export interface IAfnLectura extends IEventoTemporal {
  /** Nota temperada más cercana a la frecuencia detectada. */
  nombre: TNombreNota;
  oct: number;
  frecHz: number;
  /** Desvío respecto de la nota temperada más cercana. */
  cents: number;
  /** Cuerda objetivo más cercana (1–6). */
  curCercana: number;
  /** Frecuencia de referencia de esa cuerda al aire. */
  frecRefHz: number;
  /** Desvío respecto de la cuerda objetivo (negativo = grave). */
  centsCuerda: number;
  esAfinado: boolean;
  idAfinacion: TIdAfinacion;
}

// ---------- ejr ----------

export interface IEjrEntradaCatalogo {
  id: string;
  titulo: string;
  /** Archivo relativo a `public/ejercicios/`. */
  archivo: string;
  nivel: number;
  descripcion?: string;
}

export interface IEjrCatalogo {
  entradas: readonly IEjrEntradaCatalogo[];
}

export type TEjrOrigen = 'json' | 'escala' | 'gpr';

/** Ejercicio listo para practicar. Único emisor: `EjrControlador`. */
export interface IEjrCargado {
  ej: IEjercicio;
  origen: TEjrOrigen;
}

/** Próxima nota esperada (`null` cuando no quedan notas). */
export interface IEjrEsperada {
  nota: INota | null;
  idxNota: number;
}

export type TEjrMotivoFallo = 'nota' | 'octava' | 'temprano' | 'tarde' | 'omitida';

export interface IEjrMarcador {
  ptj: number;
  racha: number;
  rachaMax: number;
  aciertos: number;
  fallos: number;
  multiplicador: number;
}

/** Payload de `'ejr:acierto'` y `'ejr:fallo'`. */
export interface IEjrResultado extends IEventoTemporal {
  nota: INota;
  idxNota: number;
  /** Desvío tocada − esperada en ms (positivo = tarde). */
  desvioMs: number;
  /** `null` en aciertos. */
  motivo: TEjrMotivoFallo | null;
  /** Nota realmente tocada (`null` si fue omitida). */
  detectada: IDetNotaDetectada | null;
  /** Puntos obtenidos por esta nota. */
  puntos: number;
  marcador: IEjrMarcador;
}

export interface IEjrResumen {
  titulo: string;
  marcador: IEjrMarcador;
  /** Aciertos / notas, 0..1. */
  precision: number;
  durMs: number;
}

/** Medidor de coincidencia en vivo entre lo que suena y la nota esperada. */
export interface IEjrCoincidencia extends IEventoTemporal {
  /** 0..100 (100 = nota correcta y afinada; 0 = otra nota o silencio). */
  pct: number;
  /** Desvío respecto de la nota temperada detectada (−50..50); 0 en silencio. */
  cents: number;
  /** Según `ejr_validarNota` con el modo efectivo. */
  esNotaCorrecta: boolean;
  esSilencio: boolean;
  /** Idx de la nota esperada; −1 si no hay. */
  idxNota: number;
  detectada: ICorAltura | null;
}

// ---------- esc ----------

export type TEscTipoEscala = 'mayor' | 'menorNatural' | 'pentatonicaMenor' | 'pentatonicaMayor';

export interface IEscGenerada {
  ej: IEjercicio;
  tonica: TNombreNota;
  tipo: TEscTipoEscala;
}

// ---------- tmp ----------

/** Payload de `'tmp:inicio'`, `'tmp:pausa'`, `'tmp:detencion'` (stop + vuelta a 0) y `'tmp:posicion'` (salto). */
export interface ITmpTransporte extends IEventoTemporal {
  posPulsos: number;
  posMs: number;
  /** BPM base. */
  bpm: number;
  velocidad: number;
}

/** Pulso del metrónomo. `tiempoMs` = instante PROGRAMADO del click (llega con `TMP_ANTICIPACION_MS` de adelanto). */
export interface ITmpPulso extends IEventoTemporal {
  /** Índice global de pulso (0..). */
  idxPulso: number;
  idxCompas: number;
  /** Pulso dentro del compás (0..pulsosPorCompas−1). */
  idxPulsoCompas: number;
  esAcento: boolean;
}

export interface ITmpBpm {
  bpm: number;
  bpmAnt: number;
  /** El cambio lo produjo el modo progresivo. */
  esProgresivo: boolean;
}

/** Fin de una vuelta del loop. */
export interface ITmpLoop {
  idxVuelta: number;
  inicioPulsos: number;
  finPulsos: number;
}

// ---------- gpr ----------

export interface IGprPista {
  idx: number;
  nombre: string;
  esPercusion: boolean;
  esGuitarra: boolean;
  cantCuerdas: number;
  afinacion: IAfinacion | null;
  /** Programa MIDI 0–127. */
  programaMidi: number;
}

export interface IGprCargado {
  titulo: string;
  artista: string;
  /** Archivo original (lo reutiliza `acp` para el acompañamiento). */
  buf: ArrayBuffer;
  pistas: readonly IGprPista[];
  idxPstGuitarra: number;
  bpm: number;
  /** Ejercicio de la pista de guitarra elegida. */
  ej: IEjercicio;
}

export interface IGprPistaConvertida {
  idxPst: number;
  ej: IEjercicio;
}

// ---------- acp ----------

export type TAcpEstado = 'sinCargar' | 'cargando' | 'listo' | 'reproduciendo' | 'pausado' | 'error';

export interface IAcpEstado {
  estado: TAcpEstado;
  /** 0..1. */
  progresoCarga: number;
  msjError: string | null;
}

export interface IAcpPosicion {
  posMs: number;
  posPulsos: number;
  durTotalMs: number;
  /** Diferencia acompañamiento − reloj `tmp`, en ms. */
  derivaMs: number;
}

/** Mezcla de una pista (también payload de `'cfg:mezclaPista'`). */
export interface IAcpMezclaPista {
  idxPst: number;
  /** Volumen 0..1. */
  vol: number;
  esSolo: boolean;
  esMute: boolean;
}

export interface IAcpMezcla {
  pistas: readonly IAcpMezclaPista[];
  idxPstGuitarra: number;
}

// ---------- efx ----------

export interface IEfxResumenPreset {
  id: string;
  nombre: string;
  esFabrica: boolean;
}

export interface IEfxListaPresets {
  presets: readonly IEfxResumenPreset[];
}

export interface IEfxPresetActivo {
  preset: Readonly<IEfxPreset>;
  esModificado: boolean;
}

export interface IEfxCadenaCambiada {
  idPreset: string;
  idBloque: TEfxIdBloque;
  bloques: Readonly<IEfxBloques>;
  esModificado: boolean;
}

export interface IEfxIrResumen {
  id: string;
  nombre: string;
  durSeg: number;
  fechaMs: number;
}

export interface IEfxListaIr {
  irs: readonly IEfxIrResumen[];
}

export interface IEfxIrCargado {
  ir: IEfxIrResumen;
}

export interface IEfxExportacion {
  texto: string;
  nombreArchivo: string;
}

export interface IEfxImportacion {
  cantImportados: number;
  errores: readonly string[];
}

// ---------- cfg ----------

export interface ICfgCambio {
  cfg: Readonly<IConfig>;
  /** Claves modificadas. */
  claves: readonly (keyof IConfig)[];
}

// ---------- ui ----------

export type TUiPantalla = 'menu' | 'practica' | 'afinador' | 'configuracion' | 'mezclador';

export type TUiAccionTransporte =
  | 'reproducir'
  | 'pausar'
  | 'alternar'
  | 'reiniciar'
  | 'subirBpm'
  | 'bajarBpm'
  | 'alternarLoop';

export interface IUiPantallaSolicitada {
  pantalla: TUiPantalla;
}

export interface IUiTransporte {
  accion: TUiAccionTransporte;
}

export interface IUiEjercicioElegido {
  /** Relativa a `public/ejercicios/`. */
  ruta: string;
}

export interface IUiEscalaElegida {
  tonica: TNombreNota;
  tipo: TEscTipoEscala;
  oct: number;
}

export interface IUiArchivoElegido {
  archivo: File;
}

export interface IUiPistaElegida {
  idxPst: number;
}

export interface IUiPresetEfxElegido {
  id: string;
}

/** Edición de un bloque de efectos: `estado` corresponde al tipo de `idBloque`. */
export type TUiBloqueEfxEditado = { [TId in TEfxIdBloque]: { idBloque: TId; estado: IEfxBloques[TId] } }[TEfxIdBloque];

export type TUiGestionPresetEfx =
  /** Sobrescribe el preset de usuario activo. */
  | { accion: 'guardar' }
  | { accion: 'guardarComo'; nombre: string }
  | { accion: 'renombrar'; id: string; nombre: string }
  | { accion: 'borrar'; id: string }
  | { accion: 'exportar' }
  | { accion: 'importar'; texto: string };

// ---------- mapa ----------

export interface ICorMapaEventos {
  'cor:error': ICorError;
  'aud:estado': IAudEstado;
  'aud:dispositivos': IAudListaDispositivos;
  'aud:nivel': IAudNivel;
  'aud:onda': IAudOnda;
  /** Cada frame con claridad suficiente (lo usa el afinador). */
  'det:tono': IDetTono;
  /** Tras el filtro de estabilidad (lo usa ejr). */
  'det:nota': IDetNotaDetectada;
  'det:silencio': IEventoTemporal;
  'afn:lectura': IAfnLectura;
  'ejr:catalogo': IEjrCatalogo;
  /** Único emisor: EjrControlador. */
  'ejr:cargado': IEjrCargado;
  'ejr:esperada': IEjrEsperada;
  'ejr:acierto': IEjrResultado;
  'ejr:fallo': IEjrResultado;
  'ejr:fin': IEjrResumen;
  /** EjrMedidorCoincidencia, como máximo cada `EJR_INTERVALO_COINCIDENCIA_MS`. */
  'ejr:coincidencia': IEjrCoincidencia;
  'esc:generada': IEscGenerada;
  'tmp:inicio': ITmpTransporte;
  'tmp:pausa': ITmpTransporte;
  /** Stop + vuelta a 0. */
  'tmp:detencion': ITmpTransporte;
  /** Salto (seek o vuelta de loop). */
  'tmp:posicion': ITmpTransporte;
  'tmp:pulso': ITmpPulso;
  'tmp:bpm': ITmpBpm;
  'tmp:loop': ITmpLoop;
  'gpr:cargado': IGprCargado;
  'gpr:pistaConvertida': IGprPistaConvertida;
  'acp:estado': IAcpEstado;
  'acp:posicion': IAcpPosicion;
  'acp:mezcla': IAcpMezcla;
  'efx:presets': IEfxListaPresets;
  /** Al elegir, guardar, renombrar o importar. */
  'efx:presetActivo': IEfxPresetActivo;
  /** Cada edición de bloque. */
  'efx:cadena': IEfxCadenaCambiada;
  'efx:irs': IEfxListaIr;
  'efx:irCargado': IEfxIrCargado;
  /** La UI descarga el texto con `ui_descargarTexto`. */
  'efx:exportacion': IEfxExportacion;
  'efx:importacion': IEfxImportacion;
  'cfg:cambio': ICfgCambio;
  'cfg:mezclaPista': IAcpMezclaPista;
  'ui:pantalla': IUiPantallaSolicitada;
  'ui:transporte': IUiTransporte;
  'ui:ejercicio': IUiEjercicioElegido;
  'ui:escala': IUiEscalaElegida;
  'ui:archivoGp': IUiArchivoElegido;
  'ui:pistaGp': IUiPistaElegida;
  'ui:presetEfx': IUiPresetEfxElegido;
  'ui:bloqueEfx': TUiBloqueEfxEditado;
  'ui:gestionPresetEfx': TUiGestionPresetEfx;
  /** Reutiliza el payload de `'ui:archivoGp'`. */
  'ui:archivoIr': IUiArchivoElegido;
}

export type TCorNombreEvento = keyof ICorMapaEventos;

export type TCorOyente<TClave extends TCorNombreEvento> = (payload: ICorMapaEventos[TClave]) => void;

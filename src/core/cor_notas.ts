/**
 * Conversión frecuencia ↔ MIDI ↔ nota y utilidades de cuerdas. Funciones puras.
 * Octava científica: Do4 = MIDI 60, La4 = MIDI 69 = 440 Hz (configurable).
 */
import type {
  IAfinacion,
  ICorAltura,
  ICorNotaFrec,
  ICorPosMastil,
  TCfgNotacion,
  TNombreNota,
  TNombreNotaAnglo,
} from './tipos';

/** Nombres latinos; idx = clase de altura (0 = Do). */
export const COR_NOMBRES_NOTA: readonly TNombreNota[] = [
  'Do',
  'Do#',
  'Re',
  'Re#',
  'Mi',
  'Fa',
  'Fa#',
  'Sol',
  'Sol#',
  'La',
  'La#',
  'Si',
];

/** Nombres anglosajones; idx = clase de altura (0 = C). */
export const COR_NOMBRES_ANGLO: readonly TNombreNotaAnglo[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

export const COR_FREC_A4_DEF = 440;
export const COR_MIDI_A4 = 69;
export const COR_CANT_CUERDAS = 6;

const COR_SEMITONOS_OCT = 12;

const COR_IDX_LATINA: Readonly<Record<string, number>> = {
  do: 0,
  re: 2,
  mi: 4,
  fa: 5,
  sol: 7,
  la: 9,
  si: 11,
};

const COR_IDX_ANGLO: Readonly<Record<string, number>> = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

const obtenerClaseAltura = (midi: number): number =>
  ((midi % COR_SEMITONOS_OCT) + COR_SEMITONOS_OCT) % COR_SEMITONOS_OCT;

const obtenerNombrePorIdx = (idx: number): TNombreNota => {
  const nombre = COR_NOMBRES_NOTA[obtenerClaseAltura(idx)];
  if (nombre === undefined) throw new RangeError(`Índice de nota inválido: ${idx}`);
  return nombre;
};

/** Frecuencia → número MIDI fraccionario. */
export function cor_frecAMidi(frecHz: number, frecA4Hz: number = COR_FREC_A4_DEF): number {
  return COR_MIDI_A4 + COR_SEMITONOS_OCT * Math.log2(frecHz / frecA4Hz);
}

/** Número MIDI (puede ser fraccionario) → frecuencia en Hz. */
export function cor_midiAFrec(midi: number, frecA4Hz: number = COR_FREC_A4_DEF): number {
  return frecA4Hz * Math.pow(2, (midi - COR_MIDI_A4) / COR_SEMITONOS_OCT);
}

/** Número MIDI → altura (se redondea al entero más cercano). */
export function cor_midiANota(midi: number): ICorAltura {
  const midiEntero = Math.round(midi);
  return {
    nombre: obtenerNombrePorIdx(midiEntero),
    oct: Math.floor(midiEntero / COR_SEMITONOS_OCT) - 1,
    midi: midiEntero,
  };
}

/** Nombre + octava → número MIDI. */
export function cor_notaAMidi(nombre: TNombreNota, oct: number): number {
  return (oct + 1) * COR_SEMITONOS_OCT + COR_NOMBRES_NOTA.indexOf(nombre);
}

/**
 * Frecuencia → nota temperada más cercana con su desvío en cents (−50..50).
 * Lanza `RangeError` si `frecHz` o `frecA4Hz` no son finitos y mayores que 0:
 * quien llama debe filtrar antes los frames sin tono.
 */
export function cor_frecANota(frecHz: number, frecA4Hz: number = COR_FREC_A4_DEF): ICorNotaFrec {
  if (!Number.isFinite(frecHz) || frecHz <= 0) throw new RangeError(`Frecuencia inválida: ${frecHz}`);
  if (!Number.isFinite(frecA4Hz) || frecA4Hz <= 0) throw new RangeError(`Frecuencia de La4 inválida: ${frecA4Hz}`);
  const midiExacto = cor_frecAMidi(frecHz, frecA4Hz);
  const altura = cor_midiANota(midiExacto);
  return { ...altura, frecHz, cents: (midiExacto - altura.midi) * 100 };
}

/** Nombre + octava → frecuencia en Hz. */
export function cor_notaAFrec(nombre: TNombreNota, oct: number, frecA4Hz: number = COR_FREC_A4_DEF): number {
  return cor_midiAFrec(cor_notaAMidi(nombre, oct), frecA4Hz);
}

export function cor_convertirAAnglo(nombre: TNombreNota): TNombreNotaAnglo {
  const anglo = COR_NOMBRES_ANGLO[COR_NOMBRES_NOTA.indexOf(nombre)];
  if (anglo === undefined) throw new RangeError(`Nombre de nota inválido: ${nombre}`);
  return anglo;
}

export function cor_convertirALatina(nombre: TNombreNotaAnglo): TNombreNota {
  return obtenerNombrePorIdx(COR_NOMBRES_ANGLO.indexOf(nombre));
}

/**
 * Texto libre → nombre latino. Acepta latina o anglosajona, mayúsculas/minúsculas,
 * sostenidos (`#`, `♯`) y bemoles (`b`, `♭`): "do", "Reb", "C#", "Bb", "SOL♯".
 * No interpreta octava. `null` si no se reconoce.
 */
export function cor_convertirTextoANota(texto: string): TNombreNota | null {
  const limpio = texto.trim().toLowerCase().replace(/♯/g, '#').replace(/♭/g, 'b');
  const coincidencia = /^(do|re|mi|fa|sol|la|si|[a-g])(#|b)?$/.exec(limpio);
  if (coincidencia === null) return null;
  const base = coincidencia[1] ?? '';
  const idxBase = base.length === 1 ? COR_IDX_ANGLO[base] : COR_IDX_LATINA[base];
  if (idxBase === undefined) return null;
  const alteracion = coincidencia[2] === '#' ? 1 : coincidencia[2] === 'b' ? -1 : 0;
  return obtenerNombrePorIdx(idxBase + alteracion);
}

/**
 * MIDI de una cuerda (1 = Mi agudo = `midiCuerdas[0]`) en un traste.
 * Lanza `RangeError` si la cuerda no existe en la afinación o el traste no es un entero ≥ 0.
 */
export function cor_calcularMidiCuerda(cur: number, trs: number, afin: IAfinacion): number {
  const midiAire = Number.isInteger(cur) ? afin.midiCuerdas[cur - 1] : undefined;
  if (midiAire === undefined) throw new RangeError(`Cuerda inválida: ${cur}`);
  if (!Number.isInteger(trs) || trs < 0) throw new RangeError(`Traste inválido: ${trs}`);
  return midiAire + trs;
}

/** Altura de una cuerda en un traste. Lanza `RangeError` igual que `cor_calcularMidiCuerda`. */
export function cor_calcularNotaCuerda(cur: number, trs: number, afin: IAfinacion): ICorAltura {
  return cor_midiANota(cor_calcularMidiCuerda(cur, trs, afin));
}

/** Texto visible de una nota según la notación (ej. "Do#4" o "C#4"). Sin `oct`, solo el nombre. */
export function cor_obtenerEtiquetaNota(nombre: TNombreNota, oct: number | undefined, notacion: TCfgNotacion): string {
  const texto = notacion === 'anglosajona' ? cor_convertirAAnglo(nombre) : nombre;
  return oct === undefined ? texto : `${texto}${oct}`;
}

/**
 * Todas las posiciones (cur, trs) de la afinación donde suena `nombre` (cualquier octava)
 * entre `trsMin` y `trsMax` inclusive. Orden: cuerda 6 → 1 y, dentro de cada cuerda, traste ascendente.
 * Los límites se acotan a enteros ≥ 0; si `trsMin > trsMax` devuelve `[]`.
 */
export function cor_listarPosicionesNota(
  nombre: TNombreNota,
  afin: IAfinacion,
  trsMin: number,
  trsMax: number,
): ICorPosMastil[] {
  const claseObjetivo = COR_NOMBRES_NOTA.indexOf(nombre);
  const desde = Math.max(0, Math.ceil(trsMin));
  const hasta = Math.floor(trsMax);
  const posiciones: ICorPosMastil[] = [];
  if (claseObjetivo < 0 || !Number.isFinite(desde) || !Number.isFinite(hasta)) return posiciones;
  for (let cur = afin.midiCuerdas.length; cur >= 1; cur--) {
    const midiAire = afin.midiCuerdas[cur - 1];
    if (midiAire === undefined) continue;
    const primerTrs = desde + obtenerClaseAltura(claseObjetivo - midiAire - desde);
    for (let trs = primerTrs; trs <= hasta; trs += COR_SEMITONOS_OCT) posiciones.push({ cur, trs });
  }
  return posiciones;
}

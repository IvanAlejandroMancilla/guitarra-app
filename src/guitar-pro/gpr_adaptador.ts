/**
 * Adaptador modelo alphaTab → modelo interno (`INota`, `IEjercicio`, `IGprPista`, `IAfinacion`).
 * Solo usa tipos de alphaTab (`import type`): no carga la librería.
 *
 * Numeración verificada en alphaTab 1.8.4:
 * - `Note.string`: 1 = cuerda más GRAVE (línea inferior de la tablatura).
 * - `Staff.tuning`: idx 0 = línea superior = cuerda más AGUDA.
 * Interno: cur 1 = Mi agudo y `IAfinacion.midiCuerdas[0]` = cuerda 1, así que
 * `midiCuerdas = staff.tuning` (mismo orden) y `cur = cantCuerdas − note.string + 1`.
 */
import type { model } from '@coderline/alphatab';
import type { IGprPista } from '../core/cor_eventos';
import { cor_calcularMidiCuerda, cor_midiANota } from '../core/cor_notas';
import type { IAfinacion, IEjercicio, INota } from '../core/tipos';
import { GPR_PROGRAMA_GUITARRA_MAX, GPR_PROGRAMA_GUITARRA_MIN, GPR_TICKS_POR_PULSO } from './gpr_constantes';
import type { IGprCompasTocado } from './gpr_tipos';

type TGprScore = model.Score;
type TGprTrack = model.Track;
type TGprStaff = model.Staff;
type TGprBeat = model.Beat;
type TGprNote = model.Note;

/** Nota candidata con su MIDI, para quedarse con la más aguda de cada instante. */
interface IGprCandidata {
  nota: INota;
  midi: number;
}

const GPR_CANAL_PERCUSION = 9;
const GPR_PULSOS_REDONDA = 4;
const GPR_TITULO_DEF = 'Sin título';
/** Valores de `Fingers.IndexFinger` y `Fingers.LittleFinger` (alphaTab 1.8.4). */
const GPR_DEDO_INDICE = 1;
const GPR_DEDO_MENIQUE = 4;

/** Pentagrama principal de una pista: el primero con cuerdas y que no sea de percusión. */
const obtenerPentagrama = (track: TGprTrack): TGprStaff | undefined =>
  track.staves.find((staff) => staff.tuning.length > 0 && !staff.isPercussion) ?? track.staves[0];

const validarPercusion = (track: TGprTrack): boolean =>
  track.isPercussion || track.playbackInfo.primaryChannel === GPR_CANAL_PERCUSION;

/** Duración en ticks de la nota sumando las notas ligadas que la continúan. */
const calcularDurTicks = (note: TGprNote): number => {
  let durTicks = note.beat.playbackDuration;
  let sig = note.tieDestination;
  while (sig !== null && sig !== note) {
    durTicks += sig.beat.playbackDuration;
    sig = sig.tieDestination;
  }
  return durTicks;
};

const crearCandidata = (
  note: TGprNote,
  staff: TGprStaff,
  afin: IAfinacion | null,
  tiempo: number,
): IGprCandidata | null => {
  if (note.isDead || note.isTieDestination || !note.isVisible) return null;
  const dur = gpr_convertirTicksAPulsos(calcularDurTicks(note));
  if (afin === null) {
    // Instrumento sin cuerdas (teclado, etc.): altura real sin transposición de visualización.
    const midi = note.calculateRealValue(false, true);
    const altura = cor_midiANota(midi);
    return { nota: { nombre: altura.nombre, oct: altura.oct, tiempo, dur }, midi };
  }
  const cur = afin.midiCuerdas.length - note.string + 1;
  const trs = note.fret + staff.capo;
  let midi: number;
  try {
    midi = note.isHarmonic ? note.calculateRealValue(false, true) : cor_calcularMidiCuerda(cur, trs, afin);
  } catch {
    // Cuerda o traste fuera de rango (archivo corrupto): se ignora la nota.
    return null;
  }
  const altura = cor_midiANota(midi);
  const nota: INota = { nombre: altura.nombre, oct: altura.oct, cur, trs, tiempo, dur };
  // Con cejilla, el traste 0 del archivo (`note.fret`) es cuerda al aire aunque `trs` sume la cejilla.
  const dedo = gpr_convertirDedo(note.leftHandFinger, note.fret);
  if (dedo !== undefined) nota.dedo = dedo;
  return { nota, midi };
};

/** La nota más aguda de un beat (en acordes solo se conserva la más aguda). */
const elegirNotaAguda = (
  beat: TGprBeat,
  staff: TGprStaff,
  afin: IAfinacion | null,
  tiempo: number,
): IGprCandidata | null => {
  let mejor: IGprCandidata | null = null;
  for (const note of beat.notes) {
    const candidata = crearCandidata(note, staff, afin, tiempo);
    if (candidata !== null && (mejor === null || candidata.midi > mejor.midi)) mejor = candidata;
  }
  return mejor;
};

const listarCompasesLineales = (score: TGprScore): IGprCompasTocado[] =>
  score.masterBars.map((masterBar) => ({ idxCompas: masterBar.index, inicioTicks: masterBar.start }));

const crearNombreAfinacion = (midiCuerdas: readonly number[]): string =>
  [...midiCuerdas]
    .reverse()
    .map((midi) => cor_midiANota(midi).nombre)
    .join(' ');

/**
 * Digitación de mano izquierda de alphaTab (`Note.leftHandFinger`, enum `Fingers`:
 * Unknown −2, NoOrDead −1, Thumb 0, IndexFinger 1, MiddleFinger 2, AnnularFinger 3, LittleFinger 4)
 * → `INota.dedo`. Traste 0 → 0 (al aire); índice..meñique → 1..4; pulgar o sin dato → `undefined`.
 */
export function gpr_convertirDedo(dedoGp: number, trs: number): number | undefined {
  if (trs === 0) return 0;
  return Number.isInteger(dedoGp) && dedoGp >= GPR_DEDO_INDICE && dedoGp <= GPR_DEDO_MENIQUE ? dedoGp : undefined;
}

/** Ticks MIDI de alphaTab → pulsos (negras). */
export function gpr_convertirTicksAPulsos(ticks: number): number {
  return ticks / GPR_TICKS_POR_PULSO;
}

/**
 * `Staff.tuning` de alphaTab (idx 0 = cuerda más aguda) → `IAfinacion` (idx 0 = cuerda 1 = Mi agudo).
 * El orden coincide, por eso solo se copia. Siempre `id: 'personalizada'`.
 */
export function gpr_convertirAfinacion(tunings: readonly number[]): IAfinacion {
  const midiCuerdas = [...tunings];
  return { id: 'personalizada', nombre: crearNombreAfinacion(midiCuerdas), midiCuerdas };
}

/** BPM inicial de la partitura. */
export function gpr_obtenerBpm(score: TGprScore): number {
  return score.masterBars[0]?.tempoAutomation?.value ?? score.tempo;
}

/** Pistas de la partitura para que el usuario elija cuál toca. */
export function gpr_listarPistas(score: TGprScore): IGprPista[] {
  return score.tracks.map((track) => {
    const staff = obtenerPentagrama(track);
    const esPercusion = validarPercusion(track);
    const cantCuerdas = esPercusion || staff === undefined ? 0 : staff.tuning.length;
    const programaMidi = track.playbackInfo.program;
    const esGuitarra =
      !esPercusion &&
      cantCuerdas >= 6 &&
      programaMidi >= GPR_PROGRAMA_GUITARRA_MIN &&
      programaMidi <= GPR_PROGRAMA_GUITARRA_MAX;
    return {
      idx: track.index,
      nombre: track.name.trim() === '' ? `Pista ${track.index + 1}` : track.name,
      esPercusion,
      esGuitarra,
      cantCuerdas,
      afinacion: staff !== undefined && cantCuerdas > 0 ? gpr_convertirAfinacion(staff.tuning) : null,
      programaMidi,
    };
  });
}

/**
 * Convierte una pista a `IEjercicio` (tiempo y dur en pulsos).
 * Ignora silencios, notas de adorno, notas muertas y destinos de ligadura; en acordes y voces
 * simultáneas conserva la nota más aguda. `compases` = orden de reproducción (ver `gpr_leerPartitura`);
 * sin él se usa el orden lineal de la partitura (sin desplegar repeticiones).
 * Lanza `RangeError` si la pista no existe.
 */
export function gpr_convertirPista(
  score: TGprScore,
  idxPst: number,
  compases?: readonly IGprCompasTocado[],
): IEjercicio {
  const track = score.tracks[idxPst];
  if (track === undefined) throw new RangeError(`La pista ${idxPst + 1} no existe en el archivo.`);
  const staff = obtenerPentagrama(track);
  const esPercusion = validarPercusion(track);
  const afin =
    staff !== undefined && !esPercusion && staff.tuning.length > 0 ? gpr_convertirAfinacion(staff.tuning) : null;

  const notas: INota[] = [];
  if (staff !== undefined && !esPercusion) {
    for (const compas of compases ?? listarCompasesLineales(score)) {
      const bar = staff.bars[compas.idxCompas];
      if (bar === undefined) continue;
      const porTick = new Map<number, IGprCandidata>();
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          if (beat.isRest || beat.graceGroup !== null) continue;
          const ticks = compas.inicioTicks + beat.playbackStart;
          const candidata = elegirNotaAguda(beat, staff, afin, gpr_convertirTicksAPulsos(ticks));
          const previa = porTick.get(ticks);
          if (candidata !== null && (previa === undefined || candidata.midi > previa.midi)) {
            porTick.set(ticks, candidata);
          }
        }
      }
      for (const candidata of porTick.values()) notas.push(candidata.nota);
    }
  }
  notas.sort((notaA, notaB) => notaA.tiempo - notaB.tiempo);

  const titulo = score.title.trim() === '' ? GPR_TITULO_DEF : score.title.trim();
  const nombrePst = track.name.trim() === '' ? `Pista ${idxPst + 1}` : track.name.trim();
  const artista = score.artist.trim();
  const primerCompas = score.masterBars[0];
  const ej: IEjercicio = {
    titulo: `${titulo} (${nombrePst})`,
    bpm: gpr_obtenerBpm(score),
    // Flexible: la detección monofónica puede confundir octavas; el usuario puede forzar "estricto" en cfg.
    modo: 'flexible',
    notas,
    descripcion: artista === '' ? `Pista «${nombrePst}»` : `${artista} — pista «${nombrePst}»`,
  };
  if (afin !== null) ej.afinacion = afin;
  if (primerCompas !== undefined) {
    ej.pulsosPorCompas =
      (primerCompas.timeSignatureNumerator * GPR_PULSOS_REDONDA) / primerCompas.timeSignatureDenominator;
  }
  return ej;
}

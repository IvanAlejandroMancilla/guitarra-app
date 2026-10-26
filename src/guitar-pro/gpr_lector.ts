/**
 * Lectura de archivos Guitar Pro con alphaTab.
 * alphaTab se carga en diferido (`import()` dinámico) la primera vez que se lee un archivo,
 * para no penalizar el arranque de la vista liviana.
 */
import type { IGprCompasTocado, IGprPartitura } from './gpr_tipos';

const MSJ_ARCHIVO_INVALIDO = 'No se pudo leer el archivo: no es un Guitar Pro válido o su versión no está soportada.';
const MSJ_SIN_PISTAS = 'El archivo Guitar Pro no contiene pistas.';

/**
 * Lee un archivo Guitar Pro (GP3–GP7, GPX) y calcula el orden real de reproducción de los compases
 * (con repeticiones desplegadas) usando el mismo generador MIDI que el reproductor de alphaTab,
 * para que los pulsos del ejercicio coincidan con `tickPosition` del acompañamiento.
 * Rechaza con un `Error` en español si el contenido no es válido.
 */
export async function gpr_leerPartitura(buf: ArrayBuffer): Promise<IGprPartitura> {
  const alphaTab = await import('@coderline/alphatab');
  const settings = new alphaTab.Settings();
  let score: IGprPartitura['score'];
  try {
    score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buf), settings);
  } catch (err) {
    throw new Error(MSJ_ARCHIVO_INVALIDO, { cause: err });
  }
  if (score.tracks.length === 0) throw new Error(MSJ_SIN_PISTAS);

  const archivoMidi = new alphaTab.midi.MidiFile();
  const generador = new alphaTab.midi.MidiFileGenerator(
    score,
    settings,
    new alphaTab.midi.AlphaSynthMidiFileHandler(archivoMidi),
  );
  generador.generate();
  const compases: IGprCompasTocado[] = generador.tickLookup.masterBars.map((lookup) => ({
    idxCompas: lookup.masterBar.index,
    inicioTicks: lookup.start,
  }));
  return { score, compases };
}

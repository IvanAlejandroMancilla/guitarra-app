/** Intervalos de escala en semitonos desde la tónica. Funciones puras. */
import type { TEscTipoEscala } from '../core/cor_eventos';
import { cor_notaAMidi } from '../core/cor_notas';
import type { TNombreNota } from '../core/tipos';

export const ESC_INTERVALOS: Readonly<Record<TEscTipoEscala, readonly number[]>> = {
  mayor: [0, 2, 4, 5, 7, 9, 11],
  menorNatural: [0, 2, 3, 5, 7, 8, 10],
  pentatonicaMenor: [0, 3, 5, 7, 10],
  pentatonicaMayor: [0, 2, 4, 7, 9],
};

/**
 * MIDI ascendentes de la escala desde `tonica` en la octava `oct`, durante `cantOct`
 * octavas, incluyendo la tónica final (ej. Do mayor, 1 octava = 8 notas).
 */
export function esc_calcularMidisEscala(tonica: TNombreNota, tipo: TEscTipoEscala, oct: number, cantOct: number): number[] {
  const midiTonica = cor_notaAMidi(tonica, oct);
  const cantOctAcotada = Math.max(1, Math.round(cantOct));
  const midis: number[] = [];
  for (let idxOct = 0; idxOct < cantOctAcotada; idxOct++) {
    for (const intervalo of ESC_INTERVALOS[tipo]) midis.push(midiTonica + 12 * idxOct + intervalo);
  }
  midis.push(midiTonica + 12 * cantOctAcotada);
  return midis;
}

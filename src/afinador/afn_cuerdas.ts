/** Búsqueda de la cuerda al aire objetivo. Función pura. */
import { cor_midiAFrec } from '../core/cor_notas';
import type { IAfinacion } from '../core/tipos';
import { afn_calcularCents } from './afn_cents';
import type { IAfnCuerdaCercana } from './afn_tipos';

/**
 * Cuerda al aire de `afin` más cercana (en cents) a `frecHz`.
 * Lanza `RangeError` si `frecHz` ≤ 0 o la afinación no tiene cuerdas.
 */
export function afn_obtenerCuerdaCercana(frecHz: number, afin: IAfinacion, frecA4Hz: number): IAfnCuerdaCercana {
  let mejor: IAfnCuerdaCercana | null = null;
  for (const [idx, midi] of afin.midiCuerdas.entries()) {
    const frecRefHz = cor_midiAFrec(midi, frecA4Hz);
    const cents = afn_calcularCents(frecHz, frecRefHz);
    if (mejor === null || Math.abs(cents) < Math.abs(mejor.cents)) mejor = { cur: idx + 1, midi, frecRefHz, cents };
  }
  if (mejor === null) throw new RangeError(`La afinación "${afin.nombre}" no tiene cuerdas.`);
  return mejor;
}

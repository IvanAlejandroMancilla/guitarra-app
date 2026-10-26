/** Marcas de digitación para el diagrama del mástil. Función pura. */
import { cor_listarPosicionesNota, cor_obtenerEtiquetaNota } from '../../core/cor_notas';
import type { IAfinacion, INota, TCfgNotacion } from '../../core/tipos';
import { VC2_CANT_SIGUIENTES_MASTIL, VC2_TRS_MAX_MASTIL } from './vc2_constantes';
import type { IVc2MarcaMastil } from './vc2_tipos';

const tienePosicion = (nota: INota): nota is INota & { cur: number; trs: number } => nota.cur !== undefined && nota.trs !== undefined;

/**
 * Marca la nota `idxEsperada` (`esPrincipal`) y las `VC2_CANT_SIGUIENTES_MASTIL` siguientes.
 * - Nota con cuerda/traste: una marca con su dedo y su nombre con octava.
 * - Nota esperada sin cuerda/traste ("encontrar la nota"): todas sus posiciones en los trastes
 *   0..`VC2_TRS_MAX_MASTIL` de `afin` (`cor_listarPosicionesNota`), sin dedo y con el nombre sin octava.
 * - Las siguientes sin cuerda/traste se omiten (marcar todas sus posiciones confundiría con la esperada).
 * - Una posición ya marcada no se repite (gana la nota más próxima).
 * Devuelve `[]` si `idxEsperada` está fuera de rango.
 */
export function vc2_crearMarcasMastil(
  notas: readonly INota[],
  idxEsperada: number,
  afin: IAfinacion,
  notacion: TCfgNotacion,
): IVc2MarcaMastil[] {
  const marcas: IVc2MarcaMastil[] = [];
  if (!Number.isInteger(idxEsperada) || idxEsperada < 0 || idxEsperada >= notas.length) return marcas;
  const ocupadas = new Set<string>();
  const agregar = (marca: IVc2MarcaMastil): void => {
    const clave = `${marca.cur}:${marca.trs}`;
    if (ocupadas.has(clave)) return;
    ocupadas.add(clave);
    marcas.push(marca);
  };

  const fin = Math.min(notas.length, idxEsperada + 1 + VC2_CANT_SIGUIENTES_MASTIL);
  for (let idx = idxEsperada; idx < fin; idx++) {
    const nota = notas[idx];
    if (nota === undefined) continue;
    const esPrincipal = idx === idxEsperada;
    if (tienePosicion(nota)) {
      agregar({
        cur: nota.cur,
        trs: nota.trs,
        dedo: nota.dedo,
        etiqueta: cor_obtenerEtiquetaNota(nota.nombre, nota.oct, notacion),
        esPrincipal,
      });
    } else if (esPrincipal) {
      const etiqueta = cor_obtenerEtiquetaNota(nota.nombre, undefined, notacion);
      for (const pos of cor_listarPosicionesNota(nota.nombre, afin, 0, VC2_TRS_MAX_MASTIL)) {
        agregar({ cur: pos.cur, trs: pos.trs, dedo: undefined, etiqueta, esPrincipal });
      }
    }
  }
  return marcas;
}

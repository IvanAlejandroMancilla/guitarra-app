/** Catálogo de afinaciones. `midiCuerdas[0]` = cuerda 1 (Mi agudo), `[5]` = cuerda 6. */
import type { IAfinacion, TIdAfinacion } from '../core/tipos';

export const AFN_AFINACIONES: Readonly<Record<TIdAfinacion, IAfinacion>> = {
  estandar: { id: 'estandar', nombre: 'Estándar (Mi La Re Sol Si Mi)', midiCuerdas: [64, 59, 55, 50, 45, 40] },
  dropD: { id: 'dropD', nombre: 'Drop D (Re La Re Sol Si Mi)', midiCuerdas: [64, 59, 55, 50, 45, 38] },
  medioTonoAbajo: {
    id: 'medioTonoAbajo',
    nombre: 'Medio tono abajo (Mi♭ La♭ Re♭ Sol♭ Si♭ Mi♭)',
    midiCuerdas: [63, 58, 54, 49, 44, 39],
  },
  dropC: { id: 'dropC', nombre: 'Drop C (Do Sol Do Fa La Re)', midiCuerdas: [62, 57, 53, 48, 43, 36] },
  dadgad: { id: 'dadgad', nombre: 'DADGAD (Re La Re Sol La Re)', midiCuerdas: [62, 57, 55, 50, 45, 38] },
  openG: { id: 'openG', nombre: 'Sol abierta (Re Sol Re Sol Si Re)', midiCuerdas: [62, 59, 55, 50, 43, 38] },
};

export const AFN_ID_AFINACION_DEF: TIdAfinacion = 'estandar';

/** Afinación del catálogo; si el id no existe, devuelve la estándar. */
export function afn_obtenerAfinacion(id: TIdAfinacion): IAfinacion {
  return AFN_AFINACIONES[id] ?? AFN_AFINACIONES[AFN_ID_AFINACION_DEF];
}

/** Generación de ejercicios de escala. Funciones puras. */
import type { TEscTipoEscala } from '../core/cor_eventos';
import { cor_midiANota, cor_obtenerEtiquetaNota } from '../core/cor_notas';
import type { IEjercicio, INota, TCfgNotacion, TNombreNota } from '../core/tipos';
import { ESC_NOMBRES_TIPO } from './esc_constantes';
import { esc_calcularDigitacion } from './esc_digitacion';
import { esc_calcularMidisEscala } from './esc_intervalos';
import type { IEscOpciones } from './esc_tipos';

/** Pulsos de cuenta antes de la primera nota (un compás de 4/4). */
const ESC_PULSOS_ENTRADA = 4;
const ESC_PULSOS_POR_COMPAS = 4;

/** "Escala de Do mayor", "Escala de A pentatónica menor"… */
export function esc_crearTitulo(tonica: TNombreNota, tipo: TEscTipoEscala, notacion: TCfgNotacion): string {
  return `Escala de ${cor_obtenerEtiquetaNota(tonica, undefined, notacion)} ${ESC_NOMBRES_TIPO[tipo]}`;
}

/**
 * Ejercicio con la escala ascendente (y descendente si `esIdaVuelta`), digitada en la
 * caja que empieza en `trsInicial`. La primera nota cae tras un compás de cuenta.
 * Lanza `RangeError` si alguna nota no entra en el mástil.
 */
export function esc_generarEscala(opc: IEscOpciones): IEjercicio {
  const midisAsc = esc_calcularMidisEscala(opc.tonica, opc.tipo, opc.oct, opc.cantOct);
  const posAsc = esc_calcularDigitacion(midisAsc, opc.afinacion, opc.trsInicial);
  const midis = opc.esIdaVuelta ? [...midisAsc, ...midisAsc.slice(0, -1).reverse()] : midisAsc;
  const posiciones = opc.esIdaVuelta ? [...posAsc, ...posAsc.slice(0, -1).reverse()] : posAsc;
  const pulsosPorNota = opc.pulsosPorNota > 0 ? opc.pulsosPorNota : 1;

  const notas: INota[] = midis.map((midi, idx) => {
    const altura = cor_midiANota(midi);
    const pos = posiciones[idx];
    const nota: INota = { nombre: altura.nombre, oct: altura.oct, tiempo: ESC_PULSOS_ENTRADA + idx * pulsosPorNota, dur: pulsosPorNota };
    if (pos !== undefined) {
      nota.cur = pos.cur;
      nota.trs = pos.trs;
      nota.dedo = pos.dedo;
    }
    return nota;
  });

  const etiquetaTonica = cor_obtenerEtiquetaNota(opc.tonica, opc.oct, opc.notacion);
  const textoOct = opc.cantOct === 1 ? '1 octava' : `${opc.cantOct} octavas`;
  return {
    titulo: esc_crearTitulo(opc.tonica, opc.tipo, opc.notacion),
    bpm: opc.bpm,
    modo: opc.modo,
    notas,
    descripcion: `Desde ${etiquetaTonica}, ${textoOct}${opc.esIdaVuelta ? ', ida y vuelta' : ''}, desde el traste ${opc.trsInicial}.`,
    afinacion: opc.afinacion,
    pulsosPorCompas: ESC_PULSOS_POR_COMPAS,
  };
}

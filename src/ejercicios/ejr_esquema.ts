/**
 * Validación del formato JSON de ejercicio (docs/arquitectura.md). Función pura.
 * Tolerante en la entrada: acepta nombres de nota latinos o anglosajones, con
 * sostenidos o bemoles ("Reb", "C#"), y los normaliza a `TNombreNota`.
 * `modo` ausente = `'flexible'`. Las notas se devuelven ordenadas por `tiempo`.
 */
import { COR_DEDO_MAX, cor_validarDedo } from '../core/cor_digitacion';
import { COR_CANT_CUERDAS, cor_convertirTextoANota } from '../core/cor_notas';
import { cor_validarRegistro } from '../core/cor_validacion';
import type { IAfinacion, IEjercicio, INota, TCorResultado, TEjrModoValidacion } from '../core/tipos';

const EJR_TRS_MAX = 24;
const EJR_OCT_MIN = -1;
const EJR_OCT_MAX = 9;
const EJR_PULSOS_COMPAS_MAX = 16;
const EJR_IDS_AFINACION: readonly string[] = ['estandar', 'dropD', 'medioTonoAbajo', 'dropC', 'dadgad', 'openG', 'personalizada'];

const validarEntero = (valor: unknown, min: number, max: number): valor is number =>
  typeof valor === 'number' && Number.isInteger(valor) && valor >= min && valor <= max;

const validarNumeroFinito = (valor: unknown): valor is number => typeof valor === 'number' && Number.isFinite(valor);

const validarNota = (valor: unknown, ruta: string, errores: string[]): INota | null => {
  if (!cor_validarRegistro(valor)) {
    errores.push(`${ruta}: debe ser un objeto.`);
    return null;
  }
  const cantErrores = errores.length;
  const nombre = typeof valor.nombre === 'string' ? cor_convertirTextoANota(valor.nombre) : null;
  if (nombre === null) errores.push(`${ruta}.nombre: nombre de nota no reconocido (ej. "Do", "Fa#", "Sib").`);
  if (!validarEntero(valor.oct, EJR_OCT_MIN, EJR_OCT_MAX)) errores.push(`${ruta}.oct: debe ser un entero entre ${EJR_OCT_MIN} y ${EJR_OCT_MAX}.`);
  if (valor.cur !== undefined && !validarEntero(valor.cur, 1, COR_CANT_CUERDAS)) {
    errores.push(`${ruta}.cur: debe ser un entero entre 1 y ${COR_CANT_CUERDAS}.`);
  }
  if (valor.trs !== undefined && !validarEntero(valor.trs, 0, EJR_TRS_MAX)) {
    errores.push(`${ruta}.trs: debe ser un entero entre 0 y ${EJR_TRS_MAX}.`);
  }
  if (valor.dedo !== undefined) {
    if (!cor_validarDedo(valor.dedo)) {
      errores.push(`${ruta}.dedo: debe ser un entero entre 0 (al aire) y ${COR_DEDO_MAX} (meñique).`);
    } else if (valor.trs === undefined) {
      errores.push(`${ruta}.dedo: requiere "trs" (traste).`);
    } else if (typeof valor.trs === 'number' && (valor.trs === 0) !== (valor.dedo === 0)) {
      errores.push(`${ruta}.dedo: el dedo 0 (al aire) solo vale con el traste 0, y el traste 0 solo con el dedo 0.`);
    }
  }
  if (!validarNumeroFinito(valor.tiempo) || valor.tiempo < 0) errores.push(`${ruta}.tiempo: debe ser un número de pulsos ≥ 0.`);
  if (valor.dur !== undefined && (!validarNumeroFinito(valor.dur) || valor.dur <= 0)) {
    errores.push(`${ruta}.dur: debe ser un número de pulsos > 0.`);
  }
  if (errores.length > cantErrores || nombre === null || typeof valor.oct !== 'number' || typeof valor.tiempo !== 'number') {
    return null;
  }
  const nota: INota = { nombre, oct: valor.oct, tiempo: valor.tiempo };
  if (typeof valor.cur === 'number') nota.cur = valor.cur;
  if (typeof valor.trs === 'number') nota.trs = valor.trs;
  if (typeof valor.dur === 'number') nota.dur = valor.dur;
  if (cor_validarDedo(valor.dedo)) nota.dedo = valor.dedo;
  return nota;
};

const validarAfinacion = (valor: unknown, errores: string[]): IAfinacion | null => {
  if (!cor_validarRegistro(valor)) {
    errores.push('afinacion: debe ser un objeto.');
    return null;
  }
  const midiCuerdas = valor.midiCuerdas;
  const esListaCuerdasValida =
    Array.isArray(midiCuerdas) &&
    midiCuerdas.length === COR_CANT_CUERDAS &&
    midiCuerdas.every((midi) => validarEntero(midi, 0, 127));
  if (!esListaCuerdasValida) errores.push(`afinacion.midiCuerdas: debe tener ${COR_CANT_CUERDAS} números MIDI (de la cuerda 1 a la 6).`);
  const id = typeof valor.id === 'string' && EJR_IDS_AFINACION.includes(valor.id) ? valor.id : 'personalizada';
  const nombre = typeof valor.nombre === 'string' && valor.nombre.trim() !== '' ? valor.nombre : 'Personalizada';
  if (!esListaCuerdasValida || !Array.isArray(midiCuerdas)) return null;
  // `id` se comprobó contra EJR_IDS_AFINACION, que replica TIdAfinacion | 'personalizada'.
  return { id: id as IAfinacion['id'], nombre, midiCuerdas: midiCuerdas.map(Number) };
};

/** Valida un valor desconocido (JSON parseado) como `IEjercicio`. Mensajes de error en español. */
export function ejr_validarEjercicio(valor: unknown): TCorResultado<IEjercicio> {
  const errores: string[] = [];
  if (!cor_validarRegistro(valor)) return { esValido: false, errores: ['El ejercicio debe ser un objeto JSON.'] };

  const titulo = typeof valor.titulo === 'string' ? valor.titulo.trim() : '';
  if (titulo === '') errores.push('titulo: es obligatorio.');
  if (!validarNumeroFinito(valor.bpm) || valor.bpm <= 0) errores.push('bpm: debe ser un número mayor que 0.');
  let modo: TEjrModoValidacion = 'flexible';
  if (valor.modo === 'estricto' || valor.modo === 'flexible') modo = valor.modo;
  else if (valor.modo !== undefined) errores.push('modo: debe ser "estricto" o "flexible".');

  const notas: INota[] = [];
  if (!Array.isArray(valor.notas) || valor.notas.length === 0) {
    errores.push('notas: debe ser una lista con al menos una nota.');
  } else {
    valor.notas.forEach((crudo: unknown, idx: number) => {
      const nota = validarNota(crudo, `notas[${idx}]`, errores);
      if (nota !== null) notas.push(nota);
    });
  }

  if (valor.descripcion !== undefined && typeof valor.descripcion !== 'string') errores.push('descripcion: debe ser texto.');
  if (valor.pulsosPorCompas !== undefined && !validarEntero(valor.pulsosPorCompas, 1, EJR_PULSOS_COMPAS_MAX)) {
    errores.push(`pulsosPorCompas: debe ser un entero entre 1 y ${EJR_PULSOS_COMPAS_MAX}.`);
  }
  const afinacion = valor.afinacion === undefined ? null : validarAfinacion(valor.afinacion, errores);

  if (errores.length > 0 || typeof valor.bpm !== 'number') return { esValido: false, errores };

  const ej: IEjercicio = {
    titulo,
    bpm: valor.bpm,
    modo,
    // sort es estable: notas con el mismo tiempo conservan el orden del archivo.
    notas: notas.sort((notaA, notaB) => notaA.tiempo - notaB.tiempo),
  };
  if (typeof valor.descripcion === 'string') ej.descripcion = valor.descripcion;
  if (typeof valor.pulsosPorCompas === 'number') ej.pulsosPorCompas = valor.pulsosPorCompas;
  if (afinacion !== null) ej.afinacion = afinacion;
  return { esValido: true, valor: ej };
}

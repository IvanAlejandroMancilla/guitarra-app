/**
 * Validación de datos no confiables (localStorage, archivos importados, archivos de IR). Funciones puras.
 * Los presets se completan con `EFX_BLOQUES_DEF`: campos faltantes o inválidos toman el valor neutro y
 * los parámetros se acotan a 0..1. Solo es error lo que no se puede completar (no es objeto, sin nombre).
 */
import type { IEfxBloques, IEfxEstadoBloque, IEfxEstadoCab, IEfxPreset, TEfxIdBloque } from '../core/cor_efectos';
import { cor_validarRegistro } from '../core/cor_validacion';
import type { TCorResultado } from '../core/tipos';
import { EFX_LARGO_MAX_NOMBRE, EFX_TAM_MAX_IR_BYTES } from './efx_constantes';
import { EFX_BLOQUES_DEF } from './efx_presetsFabrica';

type TEfxModelosPorBloque = { readonly [TId in TEfxIdBloque]: readonly IEfxBloques[TId]['modelo'][] };

const EFX_MODELOS_POR_BLOQUE: TEfxModelosPorBloque = {
  fx1: ['compuerta', 'compresor'],
  fx2: ['overdrive', 'distorsion', 'fuzz', 'wahAuto'],
  amp: ['limpio', 'crunch', 'altaGanancia', 'bajo'],
  cab: ['combo1x12', 'britanico2x12', 'cerrado4x12', 'bajo4x10', 'ir'],
  del: ['digital', 'analogico', 'modulado'],
  mod: ['chorus', 'phaser', 'flanger', 'tremolo', 'vibrato'],
  rev: ['sala', 'placa', 'hall', 'resorte'],
  eq: ['tresBandas'],
};

const EFX_EXTENSION_IR = '.wav';

const acotarRel = (valor: number): number => Math.min(1, Math.max(0, valor));

const validarBloque = <TModelo extends string, TParametros extends { [TClave in keyof TParametros]: number }>(
  valor: unknown,
  def: Readonly<IEfxEstadoBloque<TModelo, TParametros>>,
  modelos: readonly TModelo[],
): IEfxEstadoBloque<TModelo, TParametros> => {
  const parametros: TParametros = { ...def.parametros };
  if (!cor_validarRegistro(valor)) return { esActivo: def.esActivo, modelo: def.modelo, parametros };
  const esModelo = (candidato: unknown): candidato is TModelo => modelos.some((modelo) => modelo === candidato);
  const crudos = cor_validarRegistro(valor['parametros']) ? valor['parametros'] : {};
  for (const clave of Object.keys(def.parametros) as (keyof TParametros & string)[]) {
    const crudo = crudos[clave];
    if (typeof crudo === 'number' && Number.isFinite(crudo)) {
      // TParametros solo tiene campos numéricos (restricción del genérico).
      parametros[clave] = acotarRel(crudo) as TParametros[keyof TParametros & string];
    }
  }
  return {
    esActivo: typeof valor['esActivo'] === 'boolean' ? valor['esActivo'] : def.esActivo,
    modelo: esModelo(valor['modelo']) ? valor['modelo'] : def.modelo,
    parametros,
  };
};

const validarCab = (valor: unknown): IEfxEstadoCab => {
  const base = validarBloque(valor, EFX_BLOQUES_DEF.cab, EFX_MODELOS_POR_BLOQUE.cab);
  const idIr = cor_validarRegistro(valor) ? valor['idIr'] : null;
  return { ...base, idIr: base.modelo === 'ir' && typeof idIr === 'string' && idIr !== '' ? idIr : null };
};

const validarBloques = (valor: unknown): IEfxBloques => {
  const crudos = cor_validarRegistro(valor) ? valor : {};
  return {
    fx1: validarBloque(crudos['fx1'], EFX_BLOQUES_DEF.fx1, EFX_MODELOS_POR_BLOQUE.fx1),
    fx2: validarBloque(crudos['fx2'], EFX_BLOQUES_DEF.fx2, EFX_MODELOS_POR_BLOQUE.fx2),
    amp: validarBloque(crudos['amp'], EFX_BLOQUES_DEF.amp, EFX_MODELOS_POR_BLOQUE.amp),
    cab: validarCab(crudos['cab']),
    del: validarBloque(crudos['del'], EFX_BLOQUES_DEF.del, EFX_MODELOS_POR_BLOQUE.del),
    mod: validarBloque(crudos['mod'], EFX_BLOQUES_DEF.mod, EFX_MODELOS_POR_BLOQUE.mod),
    rev: validarBloque(crudos['rev'], EFX_BLOQUES_DEF.rev, EFX_MODELOS_POR_BLOQUE.rev),
    eq: validarBloque(crudos['eq'], EFX_BLOQUES_DEF.eq, EFX_MODELOS_POR_BLOQUE.eq),
  };
};

/** Nombre visible: sin espacios en los extremos y como máximo `EFX_LARGO_MAX_NOMBRE` caracteres. */
const acotarNombre = (nombre: string): string => nombre.trim().slice(0, EFX_LARGO_MAX_NOMBRE).trim();

/**
 * Valida un preset y completa lo faltante con `EFX_BLOQUES_DEF`.
 * `id` inválido o ausente queda como `''` (quien lo guarde asigna uno nuevo).
 */
export function efx_validarPreset(valor: unknown): TCorResultado<IEfxPreset> {
  if (!cor_validarRegistro(valor)) return { esValido: false, errores: ['El preset no es un objeto.'] };
  const nombreCrudo = valor['nombre'];
  const nombre = typeof nombreCrudo === 'string' ? acotarNombre(nombreCrudo) : '';
  if (nombre === '') return { esValido: false, errores: ['El preset no tiene nombre.'] };
  const idCrudo = valor['id'];
  return {
    esValido: true,
    valor: { id: typeof idCrudo === 'string' ? idCrudo.trim() : '', nombre, bloques: validarBloques(valor['bloques']) },
  };
}

/** Valida extensión `.wav` y tamaño. `valor` = nombre visible (sin extensión, acotado). */
export function efx_validarArchivoIr(nombreArchivo: string, tamBytes: number): TCorResultado<string> {
  const errores: string[] = [];
  if (!nombreArchivo.toLowerCase().endsWith(EFX_EXTENSION_IR)) errores.push('El IR debe ser un archivo .wav.');
  if (!Number.isFinite(tamBytes) || tamBytes <= 0) {
    errores.push('El archivo de IR está vacío.');
  } else if (tamBytes > EFX_TAM_MAX_IR_BYTES) {
    const tamMb = (tamBytes / 1_048_576).toFixed(1);
    errores.push(`El archivo de IR pesa ${tamMb} MB; el máximo es ${EFX_TAM_MAX_IR_BYTES / 1_048_576} MB.`);
  }
  if (errores.length > 0) return { esValido: false, errores };
  const sinExtension = nombreArchivo.slice(0, nombreArchivo.length - EFX_EXTENSION_IR.length);
  const nombre = acotarNombre(sinExtension);
  return { esValido: true, valor: nombre === '' ? 'IR sin nombre' : nombre };
}

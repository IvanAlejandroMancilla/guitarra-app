/**
 * Validación de configuraciones de origen no confiable (localStorage, archivos importados).
 * - `cfg_validarConfig`: estricta, informa cada campo inválido (para importar).
 * - `cfg_completarConfig`: tolerante, descarta lo inválido y acota rangos (para cargar).
 */
import { cor_validarRegistro } from '../core/cor_validacion';
import type { IConfig, TCorResultado } from '../core/tipos';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgRango, TCfgClaveNumerica } from './cfg_tipos';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

type TCfgClaveBooleana = {
  [TClave in keyof IConfig]: IConfig[TClave] extends boolean ? TClave : never;
}[keyof IConfig];

type TCfgClaveOpcion = 'modoValidacion' | 'vista' | 'calidad' | 'notacion' | 'idAfinacion';

/** Largo máximo aceptado para `idDispEntrada` (los ids reales rondan los 64 caracteres). */
const CFG_LARGO_MAX_ID_DISP = 512;

/** Largo máximo aceptado para `idPresetEfx` (`'usuario:<uuid>'` ocupa 44). */
const CFG_LARGO_MAX_ID_PRESET = 64;

/** Exhaustivo por el tipo `Record`: si se agrega un booleano a `IConfig`, falla la compilación. */
const CFG_CLAVES_BOOLEANAS: Readonly<Record<TCfgClaveBooleana, number>> = {
  esProgresivo: 1,
  esLoop: 1,
  esMetronomoActivo: 1,
  esZurdo: 1,
  esMonitorActivo: 1,
};

const CFG_OPCIONES: { readonly [TClave in TCfgClaveOpcion]: readonly IConfig[TClave][] } = {
  modoValidacion: ['ejercicio', 'estricto', 'flexible'],
  vista: ['2d', 'guitarHero', 'rocksmith'],
  calidad: ['baja', 'media', 'alta'],
  notacion: ['latina', 'anglosajona'],
  idAfinacion: ['estandar', 'dropD', 'medioTonoAbajo', 'dropC', 'dadgad', 'openG'],
};

// Object.keys devuelve string[]; las claves salen de objetos tipados exhaustivamente, así que el cast es seguro.
const CFG_CLAVES_NUMERICAS = Object.keys(CFG_RANGOS) as TCfgClaveNumerica[];
const CFG_LISTA_BOOLEANAS = Object.keys(CFG_CLAVES_BOOLEANAS) as TCfgClaveBooleana[];
const CFG_LISTA_OPCIONES = Object.keys(CFG_OPCIONES) as TCfgClaveOpcion[];

const contarDecimales = (num: number): number => {
  const texto = String(num);
  const idxPunto = texto.indexOf('.');
  return idxPunto < 0 ? 0 : texto.length - idxPunto - 1;
};

const leerNumero = (valor: unknown): number | undefined =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : undefined;

const leerBooleano = (valor: unknown): boolean | undefined => (typeof valor === 'boolean' ? valor : undefined);

const leerTexto = (valor: unknown): string | undefined =>
  typeof valor === 'string' && valor.length <= CFG_LARGO_MAX_ID_DISP ? valor : undefined;

/** Id de preset: texto no vacío de hasta `CFG_LARGO_MAX_ID_PRESET` caracteres (la existencia la resuelve efx). */
const leerIdPreset = (valor: unknown): string | undefined =>
  typeof valor === 'string' && valor.trim() !== '' && valor.length <= CFG_LARGO_MAX_ID_PRESET ? valor : undefined;

const leerOpcion = <TClave extends TCfgClaveOpcion>(clave: TClave, valor: unknown): IConfig[TClave] | undefined =>
  CFG_OPCIONES[clave].find((opcion) => opcion === valor);

const fijarOpcion = <TClave extends TCfgClaveOpcion>(destino: IConfig, clave: TClave, valor: unknown): void => {
  const opcion = leerOpcion(clave, valor);
  if (opcion !== undefined) destino[clave] = opcion;
};

const listarOpciones = (clave: TCfgClaveOpcion): string => CFG_OPCIONES[clave].map((opcion) => `'${opcion}'`).join(', ');

/**
 * Acota `valor` a `[min, max]` y lo redondea al `paso` más cercano (contado desde `min`).
 * Un valor no finito devuelve `rango.min`.
 */
export function cfg_acotarValor(valor: number, rango: Readonly<ICfgRango>): number {
  if (!Number.isFinite(valor)) return rango.min;
  const acotado = Math.min(rango.max, Math.max(rango.min, valor));
  if (rango.paso <= 0) return acotado;
  const cantPasos = Math.round((acotado - rango.min) / rango.paso);
  const decimales = Math.max(contarDecimales(rango.paso), contarDecimales(rango.min));
  const redondeado = Number((rango.min + cantPasos * rango.paso).toFixed(decimales));
  return Math.min(rango.max, Math.max(rango.min, redondeado));
}

/**
 * Construye una configuración completa a partir de datos no confiables.
 * Cada campo ausente o de tipo incorrecto toma el valor de `base`; los números se acotan a su rango.
 * `base` (def. `CFG_VALORES_DEF`) permite conservar la configuración vigente ante un parcial inválido.
 */
export function cfg_completarConfig(valor: unknown, base: Readonly<IConfig> = CFG_VALORES_DEF): IConfig {
  const fuente: Readonly<Record<string, unknown>> = cor_validarRegistro(valor) ? valor : {};
  const cfg: IConfig = { ...base };

  const idDisp = leerTexto(fuente['idDispEntrada']);
  if (idDisp !== undefined) cfg.idDispEntrada = idDisp;
  const idPreset = leerIdPreset(fuente['idPresetEfx']);
  if (idPreset !== undefined) cfg.idPresetEfx = idPreset;

  for (const clave of CFG_CLAVES_NUMERICAS) {
    const num = leerNumero(fuente[clave]);
    if (num !== undefined) cfg[clave] = cfg_acotarValor(num, CFG_RANGOS[clave]);
  }
  for (const clave of CFG_LISTA_BOOLEANAS) {
    const esActivo = leerBooleano(fuente[clave]);
    if (esActivo !== undefined) cfg[clave] = esActivo;
  }
  for (const clave of CFG_LISTA_OPCIONES) fijarOpcion(cfg, clave, fuente[clave]);
  return cfg;
}

/**
 * Validación estricta: todos los campos deben existir, con el tipo correcto y dentro de su rango.
 * Los campos desconocidos se ignoran. Los números válidos se redondean a su paso.
 */
export function cfg_validarConfig(valor: unknown): TCorResultado<IConfig> {
  if (!cor_validarRegistro(valor)) {
    return { esValido: false, errores: ['La configuración debe ser un objeto JSON.'] };
  }
  const errores: string[] = [];

  if (leerTexto(valor['idDispEntrada']) === undefined) {
    errores.push(`"idDispEntrada" debe ser un texto de hasta ${CFG_LARGO_MAX_ID_DISP} caracteres.`);
  }
  if (leerIdPreset(valor['idPresetEfx']) === undefined) {
    errores.push(`"idPresetEfx" debe ser un texto no vacío de hasta ${CFG_LARGO_MAX_ID_PRESET} caracteres.`);
  }
  for (const clave of CFG_CLAVES_NUMERICAS) {
    const rango = CFG_RANGOS[clave];
    const num = leerNumero(valor[clave]);
    if (num === undefined) {
      errores.push(`"${clave}" debe ser un número.`);
    } else if (num < rango.min || num > rango.max) {
      errores.push(`"${clave}" debe estar entre ${rango.min} y ${rango.max} (vale ${num}).`);
    }
  }
  for (const clave of CFG_LISTA_BOOLEANAS) {
    if (leerBooleano(valor[clave]) === undefined) errores.push(`"${clave}" debe ser verdadero o falso.`);
  }
  for (const clave of CFG_LISTA_OPCIONES) {
    if (leerOpcion(clave, valor[clave]) === undefined) {
      errores.push(`"${clave}" debe ser uno de: ${listarOpciones(clave)}.`);
    }
  }

  if (errores.length > 0) return { esValido: false, errores };
  return { esValido: true, valor: cfg_completarConfig(valor) };
}

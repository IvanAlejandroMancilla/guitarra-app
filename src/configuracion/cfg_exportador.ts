/** Exportar / importar la configuración como texto JSON (formato `ICfgAlmacenado`). */
import { cor_validarRegistro } from '../core/cor_validacion';
import type { IConfig, TCorResultado } from '../core/tipos';
import { CFG_VERSION } from './cfg_constantes';
import { cfg_migrarConfig } from './cfg_migraciones';
import type { ICfgAlmacenado } from './cfg_tipos';
import { cfg_validarConfig } from './cfg_validador';

/** JSON legible (indentado) con versión de esquema. */
export function cfg_exportarJson(cfg: Readonly<IConfig>): string {
  const almacenado: ICfgAlmacenado = { version: CFG_VERSION, cfg: { ...cfg } };
  return JSON.stringify(almacenado, null, 2);
}

/**
 * Interpreta un archivo exportado.
 * - Versión actual: validación estricta (se informan todos los campos inválidos).
 * - Versión anterior (o sin versión): se migra y se completan los campos faltantes.
 * - Versión futura: se rechaza.
 */
export function cfg_importarJson(texto: string): TCorResultado<IConfig> {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { esValido: false, errores: ['El archivo no contiene JSON válido.'] };
  }
  if (!cor_validarRegistro(datos)) {
    return { esValido: false, errores: ['El archivo no contiene una configuración.'] };
  }
  const version = datos['version'];
  if (version === undefined) return cfg_validarConfig(cfg_migrarConfig(datos));
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return { esValido: false, errores: ['La versión del archivo no es válida.'] };
  }
  if (version > CFG_VERSION) {
    return {
      esValido: false,
      errores: [`El archivo es de una versión más nueva de la app (${version}); esta versión admite hasta la ${CFG_VERSION}.`],
    };
  }
  if (!cor_validarRegistro(datos['cfg'])) {
    return { esValido: false, errores: ['Falta el campo "cfg" con la configuración.'] };
  }
  if (version < CFG_VERSION) return cfg_validarConfig(cfg_migrarConfig(datos));
  return cfg_validarConfig(datos['cfg']);
}

/** Exportar / importar presets del usuario como JSON (formato `IEfxArchivoPresets`). Funciones puras. */
import type { IEfxPreset } from '../core/cor_efectos';
import { cor_validarRegistro } from '../core/cor_validacion';
import type { TCorResultado } from '../core/tipos';
import { EFX_VERSION_PRESETS } from './efx_constantes';
import { efx_validarPreset } from './efx_esquema';
import type { IEfxArchivoPresets } from './efx_tipos';

/** JSON legible (indentado) con versión de formato. */
export function efx_exportarPresets(presets: readonly IEfxPreset[]): string {
  const archivo: IEfxArchivoPresets = { version: EFX_VERSION_PRESETS, presets: structuredClone([...presets]) };
  return JSON.stringify(archivo, null, 2);
}

/**
 * Interpreta un archivo exportado (`{ version, presets }`) o un único preset suelto (`{ nombre, bloques }`).
 * Si algún preset es inválido se rechaza todo el archivo e informa cada error ("Preset 2: …").
 */
export function efx_importarPresets(texto: string): TCorResultado<IEfxPreset[]> {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { esValido: false, errores: ['El archivo no contiene JSON válido.'] };
  }
  if (!cor_validarRegistro(datos)) return { esValido: false, errores: ['El archivo no contiene presets.'] };
  if (datos['presets'] === undefined && datos['bloques'] !== undefined) {
    const preset = efx_validarPreset(datos);
    return preset.esValido ? { esValido: true, valor: [preset.valor] } : preset;
  }
  const version = datos['version'];
  if (version !== undefined) {
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      return { esValido: false, errores: ['La versión del archivo de presets no es válida.'] };
    }
    if (version > EFX_VERSION_PRESETS) {
      return {
        esValido: false,
        errores: [`El archivo es de una versión más nueva de la app (${version}); esta versión admite hasta la ${EFX_VERSION_PRESETS}.`],
      };
    }
  }
  const crudos = datos['presets'];
  if (!Array.isArray(crudos)) return { esValido: false, errores: ['Falta la lista "presets" en el archivo.'] };
  if (crudos.length === 0) return { esValido: false, errores: ['El archivo no contiene presets.'] };
  const presets: IEfxPreset[] = [];
  const errores: string[] = [];
  crudos.forEach((crudo: unknown, idx) => {
    const resultado = efx_validarPreset(crudo);
    if (resultado.esValido) presets.push(resultado.valor);
    else for (const error of resultado.errores) errores.push(`Preset ${idx + 1}: ${error}`);
  });
  return errores.length > 0 ? { esValido: false, errores } : { esValido: true, valor: presets };
}

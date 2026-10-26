/**
 * Migraciones del esquema persistido.
 * Versión 0 = objeto `IConfig` plano, sin envoltorio `{ version, cfg }` (formato anterior al versionado).
 * Versión 1 = `ICfgAlmacenado`; `vista` admitía `'2d' | '3d'`.
 * Versión 2 = `vista` pasa a `'2d' | 'guitarHero' | 'rocksmith'` y se agregan `esMonitorActivo`, `volMonitor`, `idPresetEfx`
 *             (los campos nuevos los completa `cfg_completarConfig` con sus valores por defecto).
 * Para subir de versión: incrementar `CFG_VERSION` y agregar aquí la migración `CFG_MIGRACIONES[versionAnt]`.
 */
import { cor_validarRegistro } from '../core/cor_validacion';
import type { IConfig } from '../core/tipos';
import { CFG_VERSION } from './cfg_constantes';
import type { TCfgMigracion } from './cfg_tipos';
import { cfg_completarConfig } from './cfg_validador';

/** Clave = versión de origen; la función lleva los datos a la versión siguiente. */
export const CFG_MIGRACIONES: Readonly<Record<number, TCfgMigracion>> = Object.freeze({
  // v0 → v1: los nombres de campo no cambiaron; solo se agregó el envoltorio versionado.
  0: (datosAnt: Readonly<Record<string, unknown>>): Record<string, unknown> => ({ ...datosAnt }),
  // v1 → v2: la autopista 3D de entonces es la vista "Guitar Hero"; los demás valores se conservan.
  1: (datosAnt: Readonly<Record<string, unknown>>): Record<string, unknown> =>
    datosAnt['vista'] === '3d' ? { ...datosAnt, vista: 'guitarHero' } : { ...datosAnt },
});

/** Separa versión y datos de lo almacenado. Sin envoltorio válido se asume la versión 0. */
const leerEnvoltorio = (
  almacenado: Readonly<Record<string, unknown>>,
): { version: number; datos: Readonly<Record<string, unknown>> } => {
  const version = almacenado['version'];
  const datos = almacenado['cfg'];
  if (typeof version === 'number' && Number.isInteger(version) && version >= 0 && cor_validarRegistro(datos)) {
    return { version, datos };
  }
  return { version: 0, datos: almacenado };
};

/**
 * Lleva datos persistidos de cualquier versión conocida a una `IConfig` completa y válida.
 * Datos ilegibles → valores por defecto. Versiones futuras → se conservan los campos reconocibles.
 */
export function cfg_migrarConfig(almacenado: unknown): IConfig {
  if (!cor_validarRegistro(almacenado)) return cfg_completarConfig(undefined);
  const envoltorio = leerEnvoltorio(almacenado);
  let datos: Readonly<Record<string, unknown>> = envoltorio.datos;
  for (let version = envoltorio.version; version < CFG_VERSION; version++) {
    const migracion = CFG_MIGRACIONES[version];
    if (migracion !== undefined) datos = migracion(datos);
  }
  return cfg_completarConfig(datos);
}

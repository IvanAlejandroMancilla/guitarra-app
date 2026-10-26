/** Persistencia de los presets del usuario en un `Storage` (en la app, `window.localStorage`). */
import type { IEfxPreset } from '../core/cor_efectos';
import { cor_validarRegistro } from '../core/cor_validacion';
import { EFX_CLAVE_ALMACEN, EFX_VERSION_PRESETS } from './efx_constantes';
import { efx_validarPreset } from './efx_esquema';
import type { IEfxAlmacenPresets, IEfxArchivoPresets } from './efx_tipos';

/**
 * Lee y escribe `IEfxArchivoPresets` bajo `EFX_CLAVE_ALMACEN`.
 * Todo acceso va en try/catch (almacenamiento bloqueado, lleno o dañado): nunca lanza.
 * Al cargar es tolerante: descarta solo los presets dañados, no todos.
 */
export class EfxAlmacenPresets implements IEfxAlmacenPresets {
  readonly #almacenamiento: Storage;

  constructor(almacenamiento: Storage) {
    this.#almacenamiento = almacenamiento;
  }

  cargar(): IEfxPreset[] {
    let texto: string | null;
    try {
      texto = this.#almacenamiento.getItem(EFX_CLAVE_ALMACEN);
    } catch (err) {
      console.warn('[efx] No se pudieron leer los presets guardados:', err);
      return [];
    }
    if (texto === null) return [];
    let datos: unknown;
    try {
      datos = JSON.parse(texto);
    } catch (err) {
      console.warn('[efx] Los presets guardados están dañados; se ignoran.', err);
      return [];
    }
    if (!cor_validarRegistro(datos) || !Array.isArray(datos['presets'])) {
      console.warn('[efx] El formato de los presets guardados no es válido; se ignoran.');
      return [];
    }
    const version = datos['version'];
    if (typeof version === 'number' && version > EFX_VERSION_PRESETS) {
      console.warn(`[efx] Los presets guardados son de una versión más nueva (${version}); se intentan leer igual.`);
    }
    const presets: IEfxPreset[] = [];
    for (const crudo of datos['presets'] as unknown[]) {
      const resultado = efx_validarPreset(crudo);
      if (resultado.esValido) presets.push(resultado.valor);
    }
    return presets;
  }

  guardar(presets: readonly IEfxPreset[]): void {
    const archivo: IEfxArchivoPresets = { version: EFX_VERSION_PRESETS, presets: [...presets] };
    try {
      this.#almacenamiento.setItem(EFX_CLAVE_ALMACEN, JSON.stringify(archivo));
    } catch (err) {
      console.warn('[efx] No se pudieron guardar los presets:', err);
    }
  }
}

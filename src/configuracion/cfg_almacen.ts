/** Persistencia de la configuración en un `Storage` (en la app, `window.localStorage`). */
import type { IConfig } from '../core/tipos';
import { CFG_CLAVE_ALMACEN, CFG_VERSION } from './cfg_constantes';
import { cfg_migrarConfig } from './cfg_migraciones';
import type { ICfgAlmacen, ICfgAlmacenado } from './cfg_tipos';

/**
 * Lee y escribe `ICfgAlmacenado` bajo `CFG_CLAVE_ALMACEN`.
 * Todo acceso va en try/catch: el almacenamiento puede estar bloqueado, lleno o con datos corruptos.
 */
export class CfgAlmacen implements ICfgAlmacen {
  #almacenamiento: Storage;

  constructor(almacenamiento: Storage) {
    this.#almacenamiento = almacenamiento;
  }

  cargar(): IConfig | null {
    let texto: string | null;
    try {
      texto = this.#almacenamiento.getItem(CFG_CLAVE_ALMACEN);
    } catch (err) {
      console.warn('[cfg] No se pudo leer la configuración guardada:', err);
      return null;
    }
    if (texto === null) return null;
    try {
      return cfg_migrarConfig(JSON.parse(texto));
    } catch (err) {
      console.warn('[cfg] La configuración guardada está dañada; se usan los valores por defecto.', err);
      return null;
    }
  }

  guardar(cfg: Readonly<IConfig>): void {
    const almacenado: ICfgAlmacenado = { version: CFG_VERSION, cfg: { ...cfg } };
    try {
      this.#almacenamiento.setItem(CFG_CLAVE_ALMACEN, JSON.stringify(almacenado));
    } catch (err) {
      console.warn('[cfg] No se pudo guardar la configuración:', err);
    }
  }

  borrar(): void {
    try {
      this.#almacenamiento.removeItem(CFG_CLAVE_ALMACEN);
    } catch (err) {
      console.warn('[cfg] No se pudo borrar la configuración guardada:', err);
    }
  }
}

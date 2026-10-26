/** Estado vigente de la configuración: única fuente de verdad de `IConfig`. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IConfig } from '../core/tipos';
import type { ICfgAlmacen } from './cfg_tipos';
import { cfg_completarConfig } from './cfg_validador';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

const listarClavesCambiadas = (ant: Readonly<IConfig>, sig: Readonly<IConfig>): (keyof IConfig)[] =>
  // Object.keys de un IConfig completo devuelve exactamente sus claves.
  (Object.keys(sig) as (keyof IConfig)[]).filter((clave) => !Object.is(ant[clave], sig[clave]));

/**
 * Carga desde el almacén (validando), persiste cada cambio y emite `'cfg:cambio'`
 * solo con las claves que realmente cambiaron. No emite al construirse.
 */
export class CfgEstado implements ICorEditorConfig {
  #bus: ICorBus;
  #almacen: ICfgAlmacen;
  #cfg: Readonly<IConfig>;

  constructor(bus: ICorBus, almacen: ICfgAlmacen) {
    this.#bus = bus;
    this.#almacen = almacen;
    // No se confía en el almacén: se vuelve a validar aunque ya venga migrado.
    this.#cfg = Object.freeze(cfg_completarConfig(almacen.cargar() ?? CFG_VALORES_DEF));
  }

  obtenerConfig(): Readonly<IConfig> {
    return this.#cfg;
  }

  /** Los valores inválidos del parcial se ignoran (se conserva el vigente); los números se acotan. */
  actualizarConfig(parcial: Partial<IConfig>): void {
    this.#aplicar(cfg_completarConfig({ ...this.#cfg, ...parcial }, this.#cfg), true);
  }

  restablecerConfig(): void {
    this.#aplicar({ ...CFG_VALORES_DEF }, false);
    this.#almacen.borrar();
  }

  #aplicar(sig: IConfig, esPersistible: boolean): void {
    const claves = listarClavesCambiadas(this.#cfg, sig);
    if (claves.length === 0) return;
    this.#cfg = Object.freeze(sig);
    if (esPersistible) this.#almacen.guardar(this.#cfg);
    this.#bus.emitir('cfg:cambio', { cfg: this.#cfg, claves });
  }
}

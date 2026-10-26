/** Tipos internos del módulo de configuración. */
import type { IConfig } from '../core/tipos';

/** Rango válido de un campo numérico de `IConfig`. */
export interface ICfgRango {
  min: number;
  max: number;
  paso: number;
}

/** Claves de `IConfig` cuyo valor es numérico. */
export type TCfgClaveNumerica = {
  [TClave in keyof IConfig]: IConfig[TClave] extends number ? TClave : never;
}[keyof IConfig];

/** Formato persistido (en `localStorage` y en los archivos exportados). */
export interface ICfgAlmacenado {
  version: number;
  cfg: IConfig;
}

/** Persistencia de la configuración. Nunca lanza: los errores se registran en consola. */
export interface ICfgAlmacen {
  /** Configuración guardada ya migrada, o `null` si no hay nada guardado o no se pudo leer. */
  cargar(): IConfig | null;
  guardar(cfg: Readonly<IConfig>): void;
  borrar(): void;
}

/**
 * Migración de un esquema a la versión siguiente.
 * Recibe los datos crudos de la versión N y devuelve los de la versión N+1 (sin validar).
 */
export type TCfgMigracion = (datosAnt: Readonly<Record<string, unknown>>) => Record<string, unknown>;

/** Sección de la pantalla de configuración. */
export interface ICfgSeccion {
  readonly titulo: string;
  /** Crea los controles dentro de `contenedor` con la configuración vigente. */
  montar(contenedor: HTMLElement): void;
  /** Refleja una configuración nueva en los controles (sin volver a emitir cambios). */
  actualizar(cfg: Readonly<IConfig>): void;
  desmontar(): void;
}

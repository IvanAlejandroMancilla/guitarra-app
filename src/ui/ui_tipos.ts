/** Tipos internos de los componentes de interfaz. */
import type { IEfxBloques, TEfxIdBloque } from '../core/cor_efectos';
import type { TUiAccionTransporte } from '../core/cor_eventos';

export type TUiVarianteBoton = 'primario' | 'secundario' | 'peligro' | 'destacado' | 'fantasma';

export interface IUiOpcion<TValor> {
  valor: TValor;
  /** Texto visible en español. */
  etiqueta: string;
}

export interface IUiOpcionesBoton {
  texto: string;
  /** Def. `'secundario'`. */
  variante?: TUiVarianteBoton;
  /** Texto de ayuda (tooltip). */
  titulo?: string;
  /** Nombre accesible si el texto visible no es descriptivo (ej. "−"). */
  etiquetaAccesible?: string;
  alPulsar: () => void;
}

export interface IUiOpcionesSlider {
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
  valor: number;
  /** Sufijo mostrado tras el valor (ej. `'ms'`). Se ignora si hay `formatear`. */
  unidad?: string;
  formatear?: (valor: number) => string;
  /** Se llama en cada movimiento (evento `input`). */
  alCambiar: (valor: number) => void;
}

export interface IUiOpcionesSelector<TValor> {
  etiqueta: string;
  opciones: readonly IUiOpcion<TValor>[];
  valor: TValor;
  alCambiar: (valor: TValor) => void;
}

export interface IUiOpcionesInterruptor {
  etiqueta: string;
  esActivo: boolean;
  /** Texto secundario bajo la etiqueta. */
  descripcion?: string;
  alCambiar: (esActivo: boolean) => void;
}

/** PROPUESTO: entrada de `UI_ATAJOS`. */
export interface IUiAtajo {
  /** Valores de `KeyboardEvent.key` (letras en minúscula; se compara sin distinguir mayúsculas). */
  teclas: readonly string[];
  /** Texto visible de la tecla (ej. "Espacio"). */
  etiquetaTecla: string;
  accion: TUiAccionTransporte;
  descripcion: string;
  /** Se repite al mantener la tecla pulsada (BPM ±). */
  esRepetible: boolean;
}

/** PROPUESTO: opciones de `UiMenu`. */
export interface IUiOpcionesMenu {
  /**
   * Se llama al pulsar "Activar guitarra" (gesto del usuario requerido para pedir el micrófono).
   * Si se omite, el botón no se muestra. Si devuelve una promesa rechazada, se muestra el error.
   */
  alActivarAudio?: () => void | Promise<void>;
}

/** Parámetro de un bloque de efectos tal como se muestra en el mezclador. */
export interface IUiDescriptorParametroEfx<TClave extends string> {
  clave: TClave;
  /** Texto visible en español. */
  etiqueta: string;
  /** Si se indica, el parámetro solo se muestra con esos modelos. */
  modelos?: readonly string[];
}

/** Descripción visible de un bloque de la cadena (título, modelos y parámetros en español). */
export interface IUiDescriptorBloqueEfx<TId extends TEfxIdBloque> {
  id: TId;
  titulo: string;
  modelos: readonly IUiOpcion<IEfxBloques[TId]['modelo']>[];
  parametros: readonly IUiDescriptorParametroEfx<Extract<keyof IEfxBloques[TId]['parametros'], string>>[];
}

export type TUiDescriptoresEfx = { readonly [TId in TEfxIdBloque]: IUiDescriptorBloqueEfx<TId> };

/** Tipos internos del módulo de efectos (main.ts puede importarlos). Contrato: docs/firmas-aprobadas.md §15.A EFX. */
import type {
  IEfxBloques,
  IEfxParametrosAmp,
  IEfxParametrosCab,
  IEfxParametrosDel,
  IEfxParametrosEq,
  IEfxParametrosFx1,
  IEfxParametrosFx2,
  IEfxParametrosMod,
  IEfxParametrosRev,
  IEfxPreset,
  TEfxIdBloque,
  TEfxModeloAmp,
  TEfxModeloCab,
  TEfxModeloDel,
  TEfxModeloEq,
  TEfxModeloFx1,
  TEfxModeloFx2,
  TEfxModeloMod,
  TEfxModeloRev,
} from '../core/cor_efectos';
import type { IEfxIrResumen, IEfxResumenPreset } from '../core/cor_eventos';

/** Forma de la curva de saturación de un WaveShaper. */
export type TEfxTipoCurva = 'suave' | 'dura' | 'asimetrica' | 'fuzz' | 'valvula';

/** Bloque de audio de la cadena. Parámetros normalizados 0..1; cada bloque los mapea a rangos musicales. */
export interface IEfxBloqueAudio<TModelo extends string, TParametros> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  fijarModelo(modelo: TModelo): void;
  fijarParametros(parametros: Readonly<TParametros>): void;
  /** `false` = bypass (con fundido corto). */
  fijarActivo(esActivo: boolean): void;
  esActivo(): boolean;
  liberar(): void;
}

export interface IEfxBloqueCabAudio extends IEfxBloqueAudio<TEfxModeloCab, IEfxParametrosCab> {
  /** IR del usuario para el modelo `'ir'`; `null` = usa el gabinete simulado por defecto. */
  fijarIr(buf: AudioBuffer | null): void;
}

export interface IEfxBloquesAudio {
  fx1: IEfxBloqueAudio<TEfxModeloFx1, IEfxParametrosFx1>;
  fx2: IEfxBloqueAudio<TEfxModeloFx2, IEfxParametrosFx2>;
  amp: IEfxBloqueAudio<TEfxModeloAmp, IEfxParametrosAmp>;
  cab: IEfxBloqueCabAudio;
  del: IEfxBloqueAudio<TEfxModeloDel, IEfxParametrosDel>;
  mod: IEfxBloqueAudio<TEfxModeloMod, IEfxParametrosMod>;
  rev: IEfxBloqueAudio<TEfxModeloRev, IEfxParametrosRev>;
  eq: IEfxBloqueAudio<TEfxModeloEq, IEfxParametrosEq>;
}

export interface IEfxCadena {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  fijarBloques(bloques: Readonly<IEfxBloques>): void;
  fijarBloque<TId extends TEfxIdBloque>(id: TId, estado: Readonly<IEfxBloques[TId]>): void;
  fijarIr(buf: AudioBuffer | null): void;
  liberar(): void;
}

/** Formato de localStorage y de exportación. */
export interface IEfxArchivoPresets {
  version: number;
  presets: IEfxPreset[];
}

export interface IEfxAlmacenPresets {
  cargar(): IEfxPreset[];
  guardar(presets: readonly IEfxPreset[]): void;
}

export interface IEfxBiblioteca {
  listarPresets(): IEfxResumenPreset[];
  obtenerPreset(id: string): IEfxPreset | null;
  /** `null` si es de fábrica o no existe. */
  guardarPreset(id: string, bloques: Readonly<IEfxBloques>): IEfxPreset | null;
  guardarPresetComo(nombre: string, bloques: Readonly<IEfxBloques>): IEfxPreset;
  renombrarPreset(id: string, nombre: string): boolean;
  borrarPreset(id: string): boolean;
  /** Devuelve la cantidad importada. */
  importarPresets(presets: readonly IEfxPreset[]): number;
  /** Solo los del usuario. */
  exportarPresets(): IEfxPreset[];
}

/** IR guardado: resumen + el .wav original. */
export interface IEfxIr extends IEfxIrResumen {
  buf: ArrayBuffer;
}

export interface IEfxAlmacenIr {
  guardarIr(ir: IEfxIr): Promise<void>;
  cargarIr(id: string): Promise<IEfxIr | null>;
  listarIrs(): Promise<IEfxIrResumen[]>;
}

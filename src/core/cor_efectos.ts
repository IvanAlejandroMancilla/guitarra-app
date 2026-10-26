/**
 * Modelo de datos de la cadena de efectos (estilo Nanocore): solo tipos + el orden fijo de bloques.
 * Todos los parámetros están normalizados 0..1 (0.5 = neutro en graves/medios/agudos).
 * La escala física la decide cada bloque en `efx`.
 */

export type TEfxIdBloque = 'fx1' | 'fx2' | 'amp' | 'cab' | 'del' | 'mod' | 'rev' | 'eq';

/** Orden fijo de la cadena: FX1 → FX2 → AMP → CAB → DEL → MOD → REV → EQ. */
export const COR_ORDEN_BLOQUES_EFX: readonly TEfxIdBloque[] = ['fx1', 'fx2', 'amp', 'cab', 'del', 'mod', 'rev', 'eq'];

export type TEfxModeloFx1 = 'compuerta' | 'compresor';
export type TEfxModeloFx2 = 'overdrive' | 'distorsion' | 'fuzz' | 'wahAuto';
export type TEfxModeloAmp = 'limpio' | 'crunch' | 'altaGanancia' | 'bajo';
export type TEfxModeloCab = 'combo1x12' | 'britanico2x12' | 'cerrado4x12' | 'bajo4x10' | 'ir';
export type TEfxModeloDel = 'digital' | 'analogico' | 'modulado';
export type TEfxModeloMod = 'chorus' | 'phaser' | 'flanger' | 'tremolo' | 'vibrato';
export type TEfxModeloRev = 'sala' | 'placa' | 'hall' | 'resorte';
export type TEfxModeloEq = 'tresBandas';

export interface IEfxParametrosFx1 {
  umbral: number;
  relacion: number;
  ataque: number;
  liberacion: number;
  nivel: number;
}

export interface IEfxParametrosFx2 {
  gan: number;
  tono: number;
  nivel: number;
  /** Solo `wahAuto`. */
  sensibilidad: number;
  /** Solo `wahAuto`. */
  velocidad: number;
}

export interface IEfxParametrosAmp {
  gan: number;
  graves: number;
  medios: number;
  agudos: number;
  nivel: number;
}

export interface IEfxParametrosCab {
  filtroGraves: number;
  filtroAgudos: number;
  nivel: number;
}

export interface IEfxParametrosDel {
  tiempo: number;
  realimentacion: number;
  mezcla: number;
  /** Solo `modulado`. */
  profundidad: number;
  /** Solo `modulado`. */
  velocidad: number;
}

export interface IEfxParametrosMod {
  velocidad: number;
  profundidad: number;
  realimentacion: number;
  mezcla: number;
}

export interface IEfxParametrosRev {
  decaimiento: number;
  preRetardo: number;
  tono: number;
  mezcla: number;
}

export interface IEfxParametrosEq {
  graves: number;
  medios: number;
  agudos: number;
  /** Volumen de salida del preset. */
  nivel: number;
}

export interface IEfxEstadoBloque<TModelo extends string, TParametros> {
  esActivo: boolean;
  modelo: TModelo;
  parametros: TParametros;
}

export interface IEfxEstadoCab extends IEfxEstadoBloque<TEfxModeloCab, IEfxParametrosCab> {
  /** Id del IR cargado; solo con modelo `'ir'`. */
  idIr: string | null;
}

export interface IEfxBloques {
  fx1: IEfxEstadoBloque<TEfxModeloFx1, IEfxParametrosFx1>;
  fx2: IEfxEstadoBloque<TEfxModeloFx2, IEfxParametrosFx2>;
  amp: IEfxEstadoBloque<TEfxModeloAmp, IEfxParametrosAmp>;
  cab: IEfxEstadoCab;
  del: IEfxEstadoBloque<TEfxModeloDel, IEfxParametrosDel>;
  mod: IEfxEstadoBloque<TEfxModeloMod, IEfxParametrosMod>;
  rev: IEfxEstadoBloque<TEfxModeloRev, IEfxParametrosRev>;
  eq: IEfxEstadoBloque<TEfxModeloEq, IEfxParametrosEq>;
}

export interface IEfxPreset {
  /** `'fabrica:<clave>'` o `'usuario:<uuid>'`. */
  id: string;
  nombre: string;
  bloques: IEfxBloques;
}

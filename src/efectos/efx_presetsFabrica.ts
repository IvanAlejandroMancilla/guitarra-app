/**
 * Valores neutros de la cadena y presets de fábrica (creados por nosotros, interpretando el estilo
 * de sonidos típicos de un multiefecto tipo Nanocore). Los niveles están ajustados para que los presets
 * suenen parejos; el limitador de `EfxCadena` es solo una protección.
 */
import type { IEfxBloques, IEfxPreset } from '../core/cor_efectos';
import { EFX_PREFIJO_FABRICA } from './efx_constantes';

/** Neutro: todo apagado salvo el EQ plano a 0 dB. Base para completar presets incompletos. */
export const EFX_BLOQUES_DEF: Readonly<IEfxBloques> = Object.freeze<IEfxBloques>({
  fx1: { esActivo: false, modelo: 'compuerta', parametros: { umbral: 0.4, relacion: 0.4, ataque: 0.2, liberacion: 0.4, nivel: 0.5 } },
  fx2: { esActivo: false, modelo: 'overdrive', parametros: { gan: 0.4, tono: 0.5, nivel: 0.5, sensibilidad: 0.5, velocidad: 0.5 } },
  amp: { esActivo: false, modelo: 'limpio', parametros: { gan: 0.3, graves: 0.5, medios: 0.5, agudos: 0.5, nivel: 0.5 } },
  cab: { esActivo: false, modelo: 'combo1x12', parametros: { filtroGraves: 0.1, filtroAgudos: 0.1, nivel: 0.5 }, idIr: null },
  del: { esActivo: false, modelo: 'digital', parametros: { tiempo: 0.6, realimentacion: 0.3, mezcla: 0.25, profundidad: 0.3, velocidad: 0.3 } },
  mod: { esActivo: false, modelo: 'chorus', parametros: { velocidad: 0.3, profundidad: 0.4, realimentacion: 0.3, mezcla: 0.4 } },
  rev: { esActivo: false, modelo: 'sala', parametros: { decaimiento: 0.4, preRetardo: 0.1, tono: 0.6, mezcla: 0.2 } },
  eq: { esActivo: true, modelo: 'tresBandas', parametros: { graves: 0.5, medios: 0.5, agudos: 0.5, nivel: 0.5 } },
});

const crearPreset = (clave: string, nombre: string, bloques: IEfxBloques): IEfxPreset => ({
  id: `${EFX_PREFIJO_FABRICA}${clave}`,
  nombre,
  bloques,
});

export const EFX_PRESETS_FABRICA: readonly IEfxPreset[] = Object.freeze([
  crearPreset('limpioBrillante', 'Limpio brillante', {
    fx1: { esActivo: true, modelo: 'compresor', parametros: { umbral: 0.5, relacion: 0.35, ataque: 0.3, liberacion: 0.4, nivel: 0.56 } },
    fx2: EFX_BLOQUES_DEF.fx2,
    amp: { esActivo: true, modelo: 'limpio', parametros: { gan: 0.3, graves: 0.45, medios: 0.5, agudos: 0.65, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'combo1x12', parametros: { filtroGraves: 0.15, filtroAgudos: 0.1, nivel: 0.5 } },
    del: EFX_BLOQUES_DEF.del,
    mod: { esActivo: true, modelo: 'chorus', parametros: { ...EFX_BLOQUES_DEF.mod.parametros, velocidad: 0.25, profundidad: 0.3, mezcla: 0.25 } },
    rev: { esActivo: true, modelo: 'placa', parametros: { decaimiento: 0.35, preRetardo: 0.1, tono: 0.7, mezcla: 0.22 } },
    eq: { ...EFX_BLOQUES_DEF.eq, parametros: { graves: 0.5, medios: 0.5, agudos: 0.56, nivel: 0.5 } },
  }),
  crearPreset('crunchClasico', 'Crunch clásico', {
    fx1: { esActivo: true, modelo: 'compuerta', parametros: { ...EFX_BLOQUES_DEF.fx1.parametros, umbral: 0.3, ataque: 0.1, liberacion: 0.4 } },
    fx2: EFX_BLOQUES_DEF.fx2,
    amp: { esActivo: true, modelo: 'crunch', parametros: { gan: 0.5, graves: 0.5, medios: 0.6, agudos: 0.55, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'britanico2x12', parametros: { filtroGraves: 0.2, filtroAgudos: 0.15, nivel: 0.5 } },
    del: EFX_BLOQUES_DEF.del,
    mod: EFX_BLOQUES_DEF.mod,
    rev: { esActivo: true, modelo: 'sala', parametros: { decaimiento: 0.3, preRetardo: 0.05, tono: 0.55, mezcla: 0.15 } },
    eq: EFX_BLOQUES_DEF.eq,
  }),
  crearPreset('rock', 'Rock', {
    fx1: { esActivo: true, modelo: 'compuerta', parametros: { ...EFX_BLOQUES_DEF.fx1.parametros, umbral: 0.35, ataque: 0.1, liberacion: 0.35 } },
    fx2: { esActivo: true, modelo: 'overdrive', parametros: { ...EFX_BLOQUES_DEF.fx2.parametros, gan: 0.3, tono: 0.55, nivel: 0.6 } },
    amp: { esActivo: true, modelo: 'crunch', parametros: { gan: 0.75, graves: 0.55, medios: 0.6, agudos: 0.55, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'britanico2x12', parametros: { filtroGraves: 0.2, filtroAgudos: 0.15, nivel: 0.5 } },
    del: { esActivo: true, modelo: 'analogico', parametros: { ...EFX_BLOQUES_DEF.del.parametros, tiempo: 0.6, realimentacion: 0.25, mezcla: 0.15 } },
    mod: EFX_BLOQUES_DEF.mod,
    rev: { esActivo: true, modelo: 'sala', parametros: { decaimiento: 0.35, preRetardo: 0.05, tono: 0.55, mezcla: 0.14 } },
    eq: EFX_BLOQUES_DEF.eq,
  }),
  crearPreset('metal', 'Metal', {
    fx1: { esActivo: true, modelo: 'compuerta', parametros: { ...EFX_BLOQUES_DEF.fx1.parametros, umbral: 0.5, ataque: 0.05, liberacion: 0.25 } },
    fx2: { esActivo: true, modelo: 'overdrive', parametros: { ...EFX_BLOQUES_DEF.fx2.parametros, gan: 0, tono: 0.65, nivel: 0.65 } },
    amp: { esActivo: true, modelo: 'altaGanancia', parametros: { gan: 0.7, graves: 0.6, medios: 0.35, agudos: 0.6, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'cerrado4x12', parametros: { filtroGraves: 0.3, filtroAgudos: 0.2, nivel: 0.5 } },
    del: EFX_BLOQUES_DEF.del,
    mod: EFX_BLOQUES_DEF.mod,
    rev: { esActivo: true, modelo: 'sala', parametros: { decaimiento: 0.25, preRetardo: 0.05, tono: 0.5, mezcla: 0.1 } },
    eq: { ...EFX_BLOQUES_DEF.eq, parametros: { graves: 0.55, medios: 0.45, agudos: 0.52, nivel: 0.55 } },
  }),
  crearPreset('soloDelay', 'Solo con delay', {
    fx1: { esActivo: true, modelo: 'compresor', parametros: { ...EFX_BLOQUES_DEF.fx1.parametros, umbral: 0.55, relacion: 0.3, nivel: 0.55 } },
    fx2: { esActivo: true, modelo: 'distorsion', parametros: { ...EFX_BLOQUES_DEF.fx2.parametros, gan: 0.35, tono: 0.55, nivel: 0.5 } },
    amp: { esActivo: true, modelo: 'crunch', parametros: { gan: 0.6, graves: 0.5, medios: 0.62, agudos: 0.5, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'britanico2x12', parametros: { filtroGraves: 0.2, filtroAgudos: 0.2, nivel: 0.5 } },
    del: { esActivo: true, modelo: 'digital', parametros: { ...EFX_BLOQUES_DEF.del.parametros, tiempo: 0.67, realimentacion: 0.4, mezcla: 0.3 } },
    mod: EFX_BLOQUES_DEF.mod,
    rev: { esActivo: true, modelo: 'hall', parametros: { decaimiento: 0.45, preRetardo: 0.2, tono: 0.55, mezcla: 0.2 } },
    eq: { ...EFX_BLOQUES_DEF.eq, parametros: { graves: 0.5, medios: 0.55, agudos: 0.5, nivel: 0.5 } },
  }),
  crearPreset('ambiente', 'Ambiente', {
    fx1: { esActivo: true, modelo: 'compresor', parametros: { ...EFX_BLOQUES_DEF.fx1.parametros, umbral: 0.55, relacion: 0.3, nivel: 0.55 } },
    fx2: EFX_BLOQUES_DEF.fx2,
    amp: { esActivo: true, modelo: 'limpio', parametros: { gan: 0.2, graves: 0.45, medios: 0.5, agudos: 0.6, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'combo1x12', parametros: { filtroGraves: 0.15, filtroAgudos: 0.15, nivel: 0.5 } },
    del: { esActivo: true, modelo: 'modulado', parametros: { tiempo: 0.75, realimentacion: 0.55, mezcla: 0.35, profundidad: 0.4, velocidad: 0.3 } },
    mod: { esActivo: true, modelo: 'chorus', parametros: { ...EFX_BLOQUES_DEF.mod.parametros, velocidad: 0.2, profundidad: 0.45, mezcla: 0.35 } },
    rev: { esActivo: true, modelo: 'hall', parametros: { decaimiento: 0.85, preRetardo: 0.3, tono: 0.5, mezcla: 0.45 } },
    eq: { ...EFX_BLOQUES_DEF.eq, parametros: { graves: 0.5, medios: 0.5, agudos: 0.5, nivel: 0.48 } },
  }),
  crearPreset('funkWah', 'Funk con wah', {
    fx1: { esActivo: true, modelo: 'compresor', parametros: { umbral: 0.4, relacion: 0.55, ataque: 0.15, liberacion: 0.3, nivel: 0.62 } },
    fx2: { esActivo: true, modelo: 'wahAuto', parametros: { ...EFX_BLOQUES_DEF.fx2.parametros, sensibilidad: 0.6, velocidad: 0.55, tono: 0.35, nivel: 0.55 } },
    amp: { esActivo: true, modelo: 'limpio', parametros: { gan: 0.35, graves: 0.4, medios: 0.55, agudos: 0.6, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'combo1x12', parametros: { filtroGraves: 0.2, filtroAgudos: 0.1, nivel: 0.5 } },
    del: EFX_BLOQUES_DEF.del,
    mod: EFX_BLOQUES_DEF.mod,
    rev: { esActivo: true, modelo: 'sala', parametros: { decaimiento: 0.2, preRetardo: 0.05, tono: 0.6, mezcla: 0.1 } },
    eq: EFX_BLOQUES_DEF.eq,
  }),
  crearPreset('blues', 'Blues', {
    fx1: EFX_BLOQUES_DEF.fx1,
    fx2: { esActivo: true, modelo: 'overdrive', parametros: { ...EFX_BLOQUES_DEF.fx2.parametros, gan: 0.45, tono: 0.45, nivel: 0.55 } },
    amp: { esActivo: true, modelo: 'crunch', parametros: { gan: 0.35, graves: 0.55, medios: 0.6, agudos: 0.45, nivel: 0.5 } },
    cab: { ...EFX_BLOQUES_DEF.cab, esActivo: true, modelo: 'combo1x12', parametros: { filtroGraves: 0.15, filtroAgudos: 0.15, nivel: 0.5 } },
    del: EFX_BLOQUES_DEF.del,
    mod: EFX_BLOQUES_DEF.mod,
    rev: { esActivo: true, modelo: 'resorte', parametros: { decaimiento: 0.4, preRetardo: 0, tono: 0.5, mezcla: 0.22 } },
    eq: EFX_BLOQUES_DEF.eq,
  }),
]);

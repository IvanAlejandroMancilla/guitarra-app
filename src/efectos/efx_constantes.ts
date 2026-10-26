/** Constantes del módulo de efectos (contrato: docs/firmas-aprobadas.md §15.A EFX). */

export const EFX_ID_PRESET_DEF = 'fabrica:limpioBrillante';
export const EFX_PREFIJO_FABRICA = 'fabrica:';
export const EFX_PREFIJO_USUARIO = 'usuario:';
/** Clave de `localStorage` para los presets del usuario. */
export const EFX_CLAVE_ALMACEN = 'guitarra-app:presets';
export const EFX_NOMBRE_EXPORTACION = 'guitarra-app-presets.json';
/** Versión del formato `IEfxArchivoPresets` (localStorage y exportación). */
export const EFX_VERSION_PRESETS = 1;
export const EFX_NOMBRE_BD_IR = 'guitarra-app-ir';
export const EFX_VERSION_BD_IR = 1;
export const EFX_NOMBRE_COLECCION_IR = 'ir';
/** 10 MB. */
export const EFX_TAM_MAX_IR_BYTES = 10_485_760;
export const EFX_DUR_MAX_IR_SEG = 5;
export const EFX_LARGO_MAX_NOMBRE = 40;
export const EFX_MAX_PRESETS_USUARIO = 100;
/** Duración de los fundidos (bypass, cambios de modelo/impulso) para evitar clics. */
export const EFX_DUR_FUNDIDO_SEG = 0.02;
/** Muestras de las curvas de los WaveShaper. */
export const EFX_TAM_CURVA = 4096;
/** Ganancia máxima de entrada de una curva de saturación (`ganRel` = 1). */
export const EFX_GAN_MAX_CURVA = 200;

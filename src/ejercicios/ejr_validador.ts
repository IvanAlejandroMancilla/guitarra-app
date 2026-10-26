/** Validación de un intento (nota tocada vs. esperada). Funciones puras. */
import type { ICorAltura, INota, TCfgModoValidacion, TEjrModoValidacion } from '../core/tipos';
import type { IEjrEvaluacion } from './ejr_tipos';

/** Modo efectivo: la configuración manda salvo que diga `'ejercicio'`. */
export function ejr_obtenerModo(modoCfg: TCfgModoValidacion, modoEj: TEjrModoValidacion): TEjrModoValidacion {
  return modoCfg === 'ejercicio' ? modoEj : modoCfg;
}

/** `estricto`: nombre + octava; `flexible`: solo nombre. */
export function ejr_validarNota(esperada: INota, detectada: ICorAltura, modo: TEjrModoValidacion): boolean {
  if (esperada.nombre !== detectada.nombre) return false;
  return modo === 'flexible' || esperada.oct === detectada.oct;
}

/** `true` si |desvioMs| ≤ `tolMs`. */
export function ejr_validarTiempo(desvioMs: number, tolMs: number): boolean {
  return Math.abs(desvioMs) <= tolMs;
}

/**
 * Evalúa un intento. Primero la altura (`'nota'` u `'octava'`), luego el tiempo
 * (`'temprano'` si desvioMs < −tolMs, `'tarde'` si > tolMs).
 */
export function ejr_validarIntento(
  esperada: INota,
  detectada: ICorAltura,
  desvioMs: number,
  modo: TEjrModoValidacion,
  tolMs: number,
): IEjrEvaluacion {
  if (esperada.nombre !== detectada.nombre) return { esAcierto: false, motivo: 'nota' };
  if (!ejr_validarNota(esperada, detectada, modo)) return { esAcierto: false, motivo: 'octava' };
  if (!ejr_validarTiempo(desvioMs, tolMs)) return { esAcierto: false, motivo: desvioMs < 0 ? 'temprano' : 'tarde' };
  return { esAcierto: true, motivo: null };
}

/** Geometría de la autopista: funciones puras (sin Three.js) para poder probarlas. */
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import type { INota } from '../../core/tipos';
import {
  V3D_ANCHO_AUTOPISTA,
  V3D_ANCHO_CARRIL,
  V3D_PULSOS_VISIBLES,
  V3D_TRASTES_VISIBLES,
  V3D_UNIDADES_POR_PULSO,
} from './v3d_constantes';

/**
 * X del centro del carril de una cuerda. La cuerda 6 (Mi grave) queda a la izquierda y la 1 a la derecha;
 * `esZurdo` invierte el orden. Sin cuerda (o cuerda inválida) → carril central (x = 0).
 */
export function v3d_calcularXCarril(cur: number | undefined, esZurdo: boolean): number {
  if (cur === undefined || !Number.isInteger(cur) || cur < 1 || cur > COR_CANT_CUERDAS) return 0;
  const idxDesdeIzq = COR_CANT_CUERDAS - cur;
  const x = (idxDesdeIzq - (COR_CANT_CUERDAS - 1) / 2) * V3D_ANCHO_CARRIL;
  return esZurdo ? -x : x;
}

/**
 * Z de una nota: 0 en la línea de golpe, negativa en el futuro, positiva ya pasada.
 * Depende solo de la posición de transporte (`posPulsos`), nunca de un reloj propio.
 */
export function v3d_calcularZNota(tiempoPulsos: number, posPulsos: number, velocidadAutopista: number): number {
  return -(tiempoPulsos - posPulsos) * V3D_UNIDADES_POR_PULSO * velocidadAutopista;
}

/** Convierte una distancia en Z a pulsos según la velocidad de la autopista. */
export function v3d_convertirUnidadesAPulsos(unidades: number, velocidadAutopista: number): number {
  if (velocidadAutopista <= 0) return unidades / V3D_UNIDADES_POR_PULSO;
  return unidades / (V3D_UNIDADES_POR_PULSO * velocidadAutopista);
}

/** Pulsos que caben delante de la línea de golpe (más velocidad = notas más separadas = menos pulsos). */
export function v3d_calcularPulsosVisibles(velocidadAutopista: number): number {
  if (velocidadAutopista <= 0) return V3D_PULSOS_VISIBLES;
  return V3D_PULSOS_VISIBLES / velocidadAutopista;
}

/**
 * X del centro de la casilla de un traste en la regla del mástil de ancho `anchoRegla`.
 * Traste 0 a la izquierda (a la derecha si `esZurdo`). Se acota a 0..V3D_TRASTES_VISIBLES.
 */
export function v3d_calcularXTraste(trs: number, anchoRegla: number, esZurdo: boolean): number {
  const cantCasillas = V3D_TRASTES_VISIBLES + 1;
  const trsAcotado = Math.min(Math.max(Math.round(trs), 0), V3D_TRASTES_VISIBLES);
  const anchoCasilla = anchoRegla / cantCasillas;
  const x = -anchoRegla / 2 + anchoCasilla * (trsAcotado + 0.5);
  return esZurdo ? -x : x;
}

/** Ancho de la regla del mástil: un poco más ancha que la autopista. */
export function v3d_calcularAnchoRegla(): number {
  return V3D_ANCHO_AUTOPISTA * 1.5;
}

/**
 * Primera posición de `orden` (índices de `notas` ordenados por `tiempo`) cuya nota empieza
 * en `tiempo >= limitePulsos`. Búsqueda binaria; devuelve `orden.length` si no hay ninguna.
 */
export function v3d_obtenerIdxPrimeraNota(notas: readonly INota[], orden: ArrayLike<number>, limitePulsos: number): number {
  let ini = 0;
  let fin = orden.length;
  while (ini < fin) {
    const medio = (ini + fin) >>> 1;
    const nota = notas[orden[medio] ?? 0];
    if (nota !== undefined && nota.tiempo < limitePulsos) ini = medio + 1;
    else fin = medio;
  }
  return ini;
}

/** Índices de `notas` ordenados por `tiempo` ascendente (estable). */
export function v3d_ordenarNotas(notas: readonly INota[]): Uint32Array<ArrayBuffer> {
  const orden = Array.from({ length: notas.length }, (_, i) => i);
  orden.sort((idxA, idxB) => (notas[idxA]?.tiempo ?? 0) - (notas[idxB]?.tiempo ?? 0) || idxA - idxB);
  return Uint32Array.from(orden);
}

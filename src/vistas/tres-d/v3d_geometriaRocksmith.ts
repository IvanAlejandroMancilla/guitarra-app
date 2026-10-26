/** Geometría de la vista Rocksmith: funciones puras (sin Three.js) para poder probarlas. */
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import type { ICorPosMastil, INota } from '../../core/tipos';
import { V3D_TRASTES_VISIBLES } from './v3d_constantes';
import {
  V3D_ANCHO_CASILLA,
  V3D_ANCHO_ZONA_MIN,
  V3D_SEPARACION_CUERDAS,
  V3D_Y_CUERDA_1,
  V3D_ZONA_DEF,
} from './v3d_constantesRocksmith';
import { v3d_obtenerIdxPrimeraNota } from './v3d_geometria';
import type { IV3dZonaTrastes } from './v3d_tipos';

const acotarTraste = (trs: number): number =>
  Number.isFinite(trs) ? Math.min(Math.max(Math.round(trs), 0), V3D_TRASTES_VISIBLES) : 0;

/** `true` si la nota tiene cuerda (1..6) y traste (0..24) enteros: se dibuja como gema; si no, como banda. */
export function v3d_validarPosMastil(nota: INota): nota is INota & ICorPosMastil {
  const { cur, trs } = nota;
  return (
    cur !== undefined &&
    trs !== undefined &&
    Number.isInteger(cur) &&
    Number.isInteger(trs) &&
    cur >= 1 &&
    cur <= COR_CANT_CUERDAS &&
    trs >= 0 &&
    trs <= V3D_TRASTES_VISIBLES
  );
}

/**
 * X del centro de la casilla de un traste. La casilla `trs` va de la barra `trs − 1` a la barra `trs`;
 * la 0 (al aire) queda antes de la cejuela (x < 0). `esZurdo` espeja el eje. Se acota a 0..24.
 */
export function v3d_calcularXCasilla(trs: number, esZurdo: boolean): number {
  const x = (acotarTraste(trs) - 0.5) * V3D_ANCHO_CASILLA;
  return esZurdo ? -x : x;
}

/** X de la barra metálica que cierra la casilla `trs` (la 0 es la cejuela, en x = 0). Se acota a 0..24. */
export function v3d_calcularXBarraTraste(trs: number, esZurdo: boolean): number {
  const x = acotarTraste(trs) * V3D_ANCHO_CASILLA;
  return esZurdo ? -x : x;
}

/** Altura de una cuerda: la 1.ª (Mi agudo) abajo, la 6.ª (Mi grave) arriba. Se acota a 1..6 (admite valores intermedios). */
export function v3d_calcularYCuerda(cur: number): number {
  const curAcotada = Number.isFinite(cur) ? Math.min(Math.max(cur, 1), COR_CANT_CUERDAS) : 1;
  return V3D_Y_CUERDA_1 + (curAcotada - 1) * V3D_SEPARACION_CUERDAS;
}

/**
 * Zona de trastes de las próximas notas: las que empiezan entre `posPulsos − pulsosAnticipo / 4`
 * (la recién tocada sigue contando, así la zona no salta) y `posPulsos + pulsosAnticipo`.
 * Solo cuentan las notas con cuerda y traste; las al aire no mueven la mano (si solo hay notas al aire,
 * zona por defecto). Se ensancha hacia arriba hasta `V3D_ANCHO_ZONA_MIN` trastes sin pasar del 24.
 * `null` si no hay ninguna nota con posición en la ventana.
 */
export function v3d_calcularZonaTrastes(
  notas: readonly INota[],
  orden: ArrayLike<number>,
  posPulsos: number,
  pulsosAnticipo: number,
): IV3dZonaTrastes | null {
  const anticipo = Math.max(0, pulsosAnticipo);
  const limiteFin = posPulsos + anticipo;
  let trsMin = Number.POSITIVE_INFINITY;
  let trsMax = Number.NEGATIVE_INFINITY;
  let tieneNotaAire = false;
  for (let idxOrden = v3d_obtenerIdxPrimeraNota(notas, orden, posPulsos - anticipo / 4); idxOrden < orden.length; idxOrden++) {
    const nota = notas[orden[idxOrden] ?? 0];
    if (nota === undefined) continue;
    if (nota.tiempo > limiteFin) break;
    if (!v3d_validarPosMastil(nota)) continue;
    if (nota.trs === 0) {
      tieneNotaAire = true;
      continue;
    }
    trsMin = Math.min(trsMin, nota.trs);
    trsMax = Math.max(trsMax, nota.trs);
  }
  if (trsMin > trsMax) return tieneNotaAire ? { ...V3D_ZONA_DEF } : null;
  if (trsMax - trsMin + 1 < V3D_ANCHO_ZONA_MIN) {
    trsMax = trsMin + V3D_ANCHO_ZONA_MIN - 1;
    if (trsMax > V3D_TRASTES_VISIBLES) {
      trsMax = V3D_TRASTES_VISIBLES;
      trsMin = Math.max(1, V3D_TRASTES_VISIBLES - V3D_ANCHO_ZONA_MIN + 1);
    }
  }
  return { trsMin, trsMax };
}

/** X del centro de la zona (entre el borde izquierdo de la casilla `trsMin` y el derecho de `trsMax`). */
export function v3d_calcularXZona(zona: IV3dZonaTrastes, esZurdo: boolean): number {
  return (v3d_calcularXCasilla(zona.trsMin, esZurdo) + v3d_calcularXCasilla(zona.trsMax, esZurdo)) / 2;
}

/**
 * Acerca `valorAct` a `valorObjetivo` con decaimiento exponencial (independiente de los fps).
 * Con `constanteMs ≤ 0` devuelve el objetivo.
 */
export function v3d_suavizarValor(valorAct: number, valorObjetivo: number, deltaMs: number, constanteMs: number): number {
  if (constanteMs <= 0 || !Number.isFinite(valorAct)) return valorObjetivo;
  const factor = 1 - Math.exp(-Math.max(0, deltaMs) / constanteMs);
  return valorAct + (valorObjetivo - valorAct) * factor;
}

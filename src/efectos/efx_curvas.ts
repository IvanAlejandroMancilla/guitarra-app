/** Curvas de saturación para WaveShaperNode. Funciones puras. */
import { EFX_GAN_MAX_CURVA } from './efx_constantes';
import { efx_convertirRelAExponencial } from './efx_escalas';
import type { TEfxTipoCurva } from './efx_tipos';

/** Sesgo de la curva de válvula (asimetría suave → armónicos pares). */
const EFX_SESGO_VALVULA = 0.25;
/** Límite del semiciclo negativo del fuzz (recorte asimétrico). */
const EFX_LIMITE_NEG_FUZZ = 0.6;
/** Dureza del codo de la curva `dura` (más alto = más cercano al recorte duro). */
const EFX_CODO_DURA = 8;

const acotarMuestra = (x: number): number => x / Math.pow(1 + Math.pow(Math.abs(x), EFX_CODO_DURA), 1 / EFX_CODO_DURA);

/** Valor de la curva sin normalizar para la entrada `x` (−1..1) y ganancia `k` (≥ 1). */
const calcularMuestra = (tipo: TEfxTipoCurva, x: number, k: number): number => {
  switch (tipo) {
    case 'suave':
      return Math.tanh(k * x);
    case 'dura':
      return acotarMuestra(k * x);
    case 'asimetrica':
      // Semiciclo negativo con la mitad de ganancia: el positivo recorta antes.
      return x >= 0 ? Math.tanh(k * x) : Math.tanh(0.5 * k * x);
    case 'fuzz': {
      const kFuzz = 3 * k;
      return x >= 0 ? 1 - Math.exp(-kFuzz * x) : -EFX_LIMITE_NEG_FUZZ * (1 - Math.exp(kFuzz * x));
    }
    case 'valvula':
      return Math.tanh(k * x + EFX_SESGO_VALVULA) - Math.tanh(EFX_SESGO_VALVULA);
  }
};

/**
 * Curva monótona, con 0 → 0 y acotada a [−1, 1] (normalizada por su máximo absoluto).
 * `ganRel` (0..1) escala exponencialmente la ganancia de entrada de 1 a `EFX_GAN_MAX_CURVA`.
 * Tipos: `suave` (overdrive), `dura` (distorsión / alta ganancia), `asimetrica` (crunch),
 * `fuzz` (recorte asimétrico extremo), `valvula` (amp limpio con sesgo).
 */
export function efx_crearCurvaSaturacion(tipo: TEfxTipoCurva, ganRel: number, cantMuestras: number): Float32Array<ArrayBuffer> {
  const cant = Math.max(2, Math.trunc(Number.isFinite(cantMuestras) ? cantMuestras : 2));
  const k = efx_convertirRelAExponencial(ganRel, 1, EFX_GAN_MAX_CURVA);
  const curva = new Float32Array(cant);
  let maxAbs = 0;
  for (let i = 0; i < cant; i++) {
    const x = (i * 2) / (cant - 1) - 1;
    const y = calcularMuestra(tipo, x, k);
    curva[i] = y;
    maxAbs = Math.max(maxAbs, Math.abs(y));
  }
  if (maxAbs > 0) {
    for (let i = 0; i < cant; i++) curva[i] = (curva[i] ?? 0) / maxAbs;
  }
  return curva;
}

/**
 * Ganancia de compensación tras una curva con `ganRel`: 1/√k.
 * Mantiene parejo el volumen percibido entre poca y mucha saturación.
 */
export function efx_calcularCompensacionGan(ganRel: number): number {
  return 1 / Math.sqrt(efx_convertirRelAExponencial(ganRel, 1, EFX_GAN_MAX_CURVA));
}

/** |x| (rectificador de onda completa), para seguidores de envolvente hechos con nodos. */
export function efx_crearCurvaRectificador(cantMuestras: number): Float32Array<ArrayBuffer> {
  const cant = Math.max(2, Math.trunc(Number.isFinite(cantMuestras) ? cantMuestras : 2));
  const curva = new Float32Array(cant);
  for (let i = 0; i < cant; i++) curva[i] = Math.abs((i * 2) / (cant - 1) - 1);
  return curva;
}

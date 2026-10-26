/**
 * Respuestas al impulso sintéticas (puras y reproducibles) para los ConvolverNode de reverb y gabinete.
 * Los filtros del gabinete son biquads RBJ aplicados en el dominio del tiempo.
 */
import type { TEfxModeloCab, TEfxModeloRev } from '../core/cor_efectos';
import { efx_crearAleatorio } from './efx_aleatorio';
import { efx_convertirRelALineal } from './efx_escalas';

type TEfxTipoBiquad = 'pasaAltos' | 'pasaBajos' | 'pico';

interface IEfxCoeficientesBiquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

interface IEfxFiltroImpulso {
  tipo: TEfxTipoBiquad;
  frecHz: number;
  q: number;
  /** Solo `pico`. */
  ganDb: number;
}

interface IEfxModeloReverb {
  /** Duración (hasta −60 dB) con decaimiento 0 y 1. */
  durMinSeg: number;
  durMaxSeg: number;
  /** Corte del amortiguamiento al inicio y al final de la cola. */
  frecInicioHz: number;
  frecFinHz: number;
  /** Reflexiones tempranas en ms. */
  reflexionesMs: readonly number[];
  ganReflexiones: number;
  /** Rampa de entrada de la cola difusa (densidad que crece). */
  ataqueSeg: number;
}

interface IEfxModeloGabinete {
  durSeg: number;
  filtros: readonly IEfxFiltroImpulso[];
  /** Reflexiones del panel trasero: [retardo ms, ganancia]. */
  reflexiones: readonly (readonly [number, number])[];
}

const EFX_MODELOS_REVERB: Readonly<Record<TEfxModeloRev, IEfxModeloReverb>> = {
  sala: {
    durMinSeg: 0.35,
    durMaxSeg: 1.6,
    frecInicioHz: 9000,
    frecFinHz: 2500,
    reflexionesMs: [7, 11, 17, 23, 31, 41],
    ganReflexiones: 0.5,
    ataqueSeg: 0.01,
  },
  placa: {
    durMinSeg: 0.8,
    durMaxSeg: 3.5,
    frecInicioHz: 14000,
    frecFinHz: 6000,
    reflexionesMs: [],
    ganReflexiones: 0,
    ataqueSeg: 0.002,
  },
  hall: {
    durMinSeg: 1.4,
    durMaxSeg: 4.8,
    frecInicioHz: 7000,
    frecFinHz: 1800,
    reflexionesMs: [19, 29, 37, 53, 67, 83],
    ganReflexiones: 0.35,
    ataqueSeg: 0.04,
  },
  resorte: {
    durMinSeg: 0.9,
    durMaxSeg: 3,
    frecInicioHz: 5000,
    frecFinHz: 2200,
    reflexionesMs: [],
    ganReflexiones: 0,
    ataqueSeg: 0.005,
  },
};

/** Período de las reflexiones del resorte (ida y vuelta por el muelle). */
const EFX_PERIODO_RESORTE_SEG = 0.032;
/** Duración del chirrido dispersivo de cada reflexión del resorte. */
const EFX_DUR_CHIRRIDO_SEG = 0.018;
/** Ganancia relativa de los chirridos frente a la cola difusa. */
const EFX_GAN_CHIRRIDO = 0.35;

const EFX_MODELOS_GABINETE: Readonly<Record<Exclude<TEfxModeloCab, 'ir'>, IEfxModeloGabinete>> = {
  combo1x12: {
    durSeg: 0.03,
    filtros: [
      { tipo: 'pasaAltos', frecHz: 90, q: 0.8, ganDb: 0 },
      { tipo: 'pico', frecHz: 120, q: 1.2, ganDb: 3 },
      { tipo: 'pico', frecHz: 2500, q: 1, ganDb: 4 },
      { tipo: 'pasaBajos', frecHz: 5500, q: 0.7, ganDb: 0 },
      { tipo: 'pasaBajos', frecHz: 6500, q: 0.7, ganDb: 0 },
    ],
    reflexiones: [
      [0.7, 0.25],
      [1.5, 0.12],
    ],
  },
  britanico2x12: {
    durSeg: 0.035,
    filtros: [
      { tipo: 'pasaAltos', frecHz: 85, q: 0.8, ganDb: 0 },
      { tipo: 'pico', frecHz: 1800, q: 1, ganDb: 3 },
      { tipo: 'pico', frecHz: 3500, q: 1.4, ganDb: 4 },
      { tipo: 'pasaBajos', frecHz: 5000, q: 0.7, ganDb: 0 },
      { tipo: 'pasaBajos', frecHz: 6000, q: 0.7, ganDb: 0 },
    ],
    reflexiones: [
      [0.9, 0.3],
      [1.9, 0.15],
    ],
  },
  cerrado4x12: {
    durSeg: 0.04,
    filtros: [
      { tipo: 'pasaAltos', frecHz: 70, q: 0.9, ganDb: 0 },
      { tipo: 'pico', frecHz: 105, q: 1.5, ganDb: 5 },
      { tipo: 'pico', frecHz: 450, q: 1, ganDb: -4 },
      { tipo: 'pico', frecHz: 2200, q: 1.2, ganDb: 3 },
      { tipo: 'pasaBajos', frecHz: 4500, q: 0.7, ganDb: 0 },
      { tipo: 'pasaBajos', frecHz: 5200, q: 0.7, ganDb: 0 },
    ],
    reflexiones: [
      [1.1, 0.35],
      [2.3, 0.2],
      [3.4, 0.1],
    ],
  },
  bajo4x10: {
    durSeg: 0.04,
    filtros: [
      { tipo: 'pasaAltos', frecHz: 40, q: 0.7, ganDb: 0 },
      { tipo: 'pico', frecHz: 80, q: 1, ganDb: 3 },
      { tipo: 'pico', frecHz: 800, q: 0.8, ganDb: 2 },
      { tipo: 'pasaBajos', frecHz: 4000, q: 0.7, ganDb: 0 },
      { tipo: 'pasaBajos', frecHz: 5000, q: 0.7, ganDb: 0 },
    ],
    reflexiones: [
      [1, 0.3],
      [2.1, 0.15],
    ],
  },
};

/** Coeficientes RBJ (Audio EQ Cookbook) normalizados por a0. */
const calcularCoeficientesBiquad = (filtro: IEfxFiltroImpulso, frecMuestreoHz: number): IEfxCoeficientesBiquad => {
  const frecHz = Math.min(filtro.frecHz, frecMuestreoHz * 0.45);
  const w0 = (2 * Math.PI * frecHz) / frecMuestreoHz;
  const cosW0 = Math.cos(w0);
  const alfa = Math.sin(w0) / (2 * filtro.q);
  if (filtro.tipo === 'pico') {
    const amp = Math.pow(10, filtro.ganDb / 40);
    const a0 = 1 + alfa / amp;
    return {
      b0: (1 + alfa * amp) / a0,
      b1: (-2 * cosW0) / a0,
      b2: (1 - alfa * amp) / a0,
      a1: (-2 * cosW0) / a0,
      a2: (1 - alfa / amp) / a0,
    };
  }
  const a0 = 1 + alfa;
  const signo = filtro.tipo === 'pasaBajos' ? 1 : -1;
  const bExt = (1 - signo * cosW0) / 2;
  return { b0: bExt / a0, b1: (signo * (1 - signo * cosW0)) / a0, b2: bExt / a0, a1: (-2 * cosW0) / a0, a2: (1 - alfa) / a0 };
};

/** Filtra `muestras` en el lugar (forma directa I). */
const aplicarBiquad = (muestras: Float32Array, coef: IEfxCoeficientesBiquad): void => {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < muestras.length; i++) {
    const x0 = muestras[i] ?? 0;
    const y0 = coef.b0 * x0 + coef.b1 * x1 + coef.b2 * x2 - coef.a1 * y1 - coef.a2 * y2;
    muestras[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
};

/** Escala los canales para que el pico absoluto conjunto sea 1 (no hace nada si todo es 0). */
const normalizarPico = (canales: readonly Float32Array[]): void => {
  let maxAbs = 0;
  for (const canal of canales) for (const valor of canal) maxAbs = Math.max(maxAbs, Math.abs(valor));
  if (maxAbs === 0) return;
  for (const canal of canales) for (let i = 0; i < canal.length; i++) canal[i] = (canal[i] ?? 0) / maxAbs;
};

/** Suma chirridos periódicos (agudos primero, como la dispersión de un muelle) al canal. */
const agregarReflexionesResorte = (canal: Float32Array, frecMuestreoHz: number, tauSeg: number, aleatorio: () => number): void => {
  const cantChirrido = Math.round(EFX_DUR_CHIRRIDO_SEG * frecMuestreoHz);
  const periodo = Math.max(1, Math.round(EFX_PERIODO_RESORTE_SEG * frecMuestreoHz * (0.97 + aleatorio() * 0.06)));
  let numEco = 0;
  for (let inicio = Math.round(0.004 * frecMuestreoHz); inicio < canal.length; inicio += periodo) {
    const ganEco = EFX_GAN_CHIRRIDO * Math.exp(-(inicio / frecMuestreoHz) / tauSeg) * (numEco % 2 === 0 ? 1 : -0.8);
    let fase = 0;
    for (let j = 0; j < cantChirrido && inicio + j < canal.length; j++) {
      const avance = j / cantChirrido;
      const frecHz = 3500 * (1 - avance) + 250 * avance;
      fase += (2 * Math.PI * frecHz) / frecMuestreoHz;
      const idx = inicio + j;
      canal[idx] = (canal[idx] ?? 0) + ganEco * Math.sin(Math.PI * avance) * Math.sin(fase);
    }
    numEco++;
  }
};

/** Un canal: ruido con envolvente exponencial y amortiguamiento que oscurece la cola. */
const generarCanalReverb = (
  frecMuestreoHz: number,
  modelo: TEfxModeloRev,
  durSeg: number,
  aleatorio: () => number,
): Float32Array<ArrayBuffer> => {
  const def = EFX_MODELOS_REVERB[modelo];
  const cant = Math.max(1, Math.round(frecMuestreoHz * durSeg));
  const canal = new Float32Array(cant);
  const tauSeg = durSeg / 6.91; // −60 dB al final
  let filtrado = 0;
  for (let i = 0; i < cant; i++) {
    const tSeg = i / frecMuestreoHz;
    const env = Math.exp(-tSeg / tauSeg) * Math.min(1, tSeg / def.ataqueSeg);
    const frecHz = def.frecInicioHz + (def.frecFinHz - def.frecInicioHz) * (tSeg / durSeg);
    const coefPolo = Math.exp((-2 * Math.PI * frecHz) / frecMuestreoHz);
    filtrado = (1 - coefPolo) * (aleatorio() * 2 - 1) + coefPolo * filtrado;
    canal[i] = filtrado * env;
  }
  for (const retardoMs of def.reflexionesMs) {
    const idx = Math.round((retardoMs / 1000) * frecMuestreoHz * (0.9 + aleatorio() * 0.2));
    if (idx >= cant) continue;
    const signo = aleatorio() < 0.5 ? -1 : 1;
    canal[idx] = (canal[idx] ?? 0) + signo * def.ganReflexiones * Math.exp(-(idx / frecMuestreoHz) / tauSeg);
  }
  if (modelo === 'resorte') agregarReflexionesResorte(canal, frecMuestreoHz, tauSeg, aleatorio);
  return canal;
};

/**
 * Impulso estéreo (2 canales decorrelacionados) para la reverb.
 * `decaimientoRel` (0..1) fija la duración entre los límites del modelo. Pico normalizado a 1.
 */
export function efx_generarImpulsoReverb(
  frecMuestreoHz: number,
  modelo: TEfxModeloRev,
  decaimientoRel: number,
  semilla: number,
): Float32Array<ArrayBuffer>[] {
  const def = EFX_MODELOS_REVERB[modelo];
  const durSeg = efx_convertirRelALineal(decaimientoRel, def.durMinSeg, def.durMaxSeg);
  const aleatorio = efx_crearAleatorio(semilla);
  const canales = [
    generarCanalReverb(frecMuestreoHz, modelo, durSeg, aleatorio),
    generarCanalReverb(frecMuestreoHz, modelo, durSeg, aleatorio),
  ];
  normalizarPico(canales);
  return canales;
}

/** Respuesta corta (30–40 ms) de un gabinete simulado: impulso + reflexiones, con la curva del parlante. Pico 1. */
export function efx_generarImpulsoGabinete(frecMuestreoHz: number, modelo: Exclude<TEfxModeloCab, 'ir'>): Float32Array<ArrayBuffer> {
  const def = EFX_MODELOS_GABINETE[modelo];
  const cant = Math.max(16, Math.round(frecMuestreoHz * def.durSeg));
  const impulso = new Float32Array(cant);
  impulso[0] = 1;
  for (const [retardoMs, gan] of def.reflexiones) {
    const idx = Math.round((retardoMs / 1000) * frecMuestreoHz);
    if (idx < cant) impulso[idx] = (impulso[idx] ?? 0) + gan;
  }
  for (const filtro of def.filtros) aplicarBiquad(impulso, calcularCoeficientesBiquad(filtro, frecMuestreoHz));
  // Fundido final: que el corte del impulso no agregue un clic.
  const cantFundido = Math.round(cant * 0.25);
  for (let i = 0; i < cantFundido; i++) {
    const idx = cant - 1 - i;
    impulso[idx] = (impulso[idx] ?? 0) * (i / cantFundido);
  }
  normalizarPico([impulso]);
  return impulso;
}

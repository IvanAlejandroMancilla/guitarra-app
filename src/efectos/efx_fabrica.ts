/** Crea los 8 bloques de audio de la cadena. */
import { EfxBloqueAmp } from './efx_bloqueAmp';
import { EfxBloqueCab } from './efx_bloqueCab';
import { EfxBloqueDel } from './efx_bloqueDel';
import { EfxBloqueEq } from './efx_bloqueEq';
import { EfxBloqueFx1 } from './efx_bloqueFx1';
import { EfxBloqueFx2 } from './efx_bloqueFx2';
import { EfxBloqueMod } from './efx_bloqueMod';
import { EfxBloqueRev } from './efx_bloqueRev';
import type { IEfxBloquesAudio } from './efx_tipos';

/**
 * Asíncrona por contrato (por si un bloque necesitara registrar un AudioWorklet). Hoy ningún bloque lo usa:
 * la compuerta está hecha con nodos nativos, así que no hay archivos de worklet que Vite deba empaquetar.
 */
export function efx_crearBloques(ctx: AudioContext): Promise<IEfxBloquesAudio> {
  return Promise.resolve({
    fx1: new EfxBloqueFx1(ctx),
    fx2: new EfxBloqueFx2(ctx),
    amp: new EfxBloqueAmp(ctx),
    cab: new EfxBloqueCab(ctx),
    del: new EfxBloqueDel(ctx),
    mod: new EfxBloqueMod(ctx),
    rev: new EfxBloqueRev(ctx),
    eq: new EfxBloqueEq(ctx),
  });
}

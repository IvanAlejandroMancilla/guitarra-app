/** Cambios suaves de AudioParam (sin clics). */
import { EFX_DUR_FUNDIDO_SEG } from './efx_constantes';

/** Lleva `parametroAudio` a `valor` con `setTargetAtTime` (~95 % en `EFX_DUR_FUNDIDO_SEG`). */
export function efx_fijarParametro(parametroAudio: AudioParam, valor: number, ctx: BaseAudioContext): void {
  if (!Number.isFinite(valor)) return;
  parametroAudio.setTargetAtTime(valor, ctx.currentTime, EFX_DUR_FUNDIDO_SEG / 3);
}

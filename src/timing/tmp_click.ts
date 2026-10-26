/** Click de metrónomo sintetizado con un oscilador (sin muestras de audio). */
import { TMP_DUR_CLICK_MS, TMP_FREC_ACENTO_HZ, TMP_FREC_CLICK_HZ } from './tmp_constantes';

/** Programa un click en `tiempoSeg` (tiempo del contexto) hacia `destino`. `vol` 0..1. */
export function tmp_programarClick(ctx: BaseAudioContext, destino: AudioNode, tiempoSeg: number, esAcento: boolean, vol: number): void {
  const inicioSeg = Math.max(tiempoSeg, ctx.currentTime);
  const durSeg = TMP_DUR_CLICK_MS / 1000;
  const volPico = Math.min(Math.max(vol, 0), 1) * (esAcento ? 1 : 0.7);
  if (volPico <= 0) return;

  const oscilador = ctx.createOscillator();
  oscilador.type = 'square';
  oscilador.frequency.value = esAcento ? TMP_FREC_ACENTO_HZ : TMP_FREC_CLICK_HZ;
  const envolvente = ctx.createGain();
  envolvente.gain.setValueAtTime(0, inicioSeg);
  envolvente.gain.linearRampToValueAtTime(volPico, inicioSeg + 0.001);
  envolvente.gain.exponentialRampToValueAtTime(0.0001, inicioSeg + durSeg);
  oscilador.connect(envolvente).connect(destino);
  oscilador.start(inicioSeg);
  oscilador.stop(inicioSeg + durSeg + 0.01);
  oscilador.addEventListener('ended', () => {
    oscilador.disconnect();
    envolvente.disconnect();
  });
}

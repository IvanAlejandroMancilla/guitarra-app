/**
 * Crea el `AudioContext` ÚNICO de la app (lo comparten `aud`, `det`, `tmp` y `acp`).
 * Los navegadores lo crean suspendido hasta un gesto del usuario: llamar a
 * `aud_reanudarContexto` dentro de un manejador de clic o tecla.
 */
export function aud_crearContexto(): AudioContext {
  return new AudioContext({ latencyHint: 'interactive' });
}

/** Reanuda el contexto si está suspendido (no hace nada si ya corre o está cerrado). */
export async function aud_reanudarContexto(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') await ctx.resume();
}

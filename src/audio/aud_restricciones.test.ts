import { describe, expect, it } from 'vitest';
import { aud_crearRestricciones } from './aud_restricciones';

describe('aud_crearRestricciones', () => {
  it('desactiva el procesamiento de voz y pide un canal', () => {
    const restricciones = aud_crearRestricciones();
    expect(restricciones.video).toBe(false);
    expect(restricciones.audio).toEqual({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    });
  });

  it('fija el dispositivo exacto solo si se indica', () => {
    expect(aud_crearRestricciones('abc').audio).toMatchObject({ deviceId: { exact: 'abc' } });
    expect(aud_crearRestricciones('').audio).not.toHaveProperty('deviceId');
  });
});

/**
 * Restricciones de `getUserMedia` para guitarra: sin procesamiento de voz
 * (cancelación de eco, supresión de ruido y control automático de ganancia
 * deforman la señal y arruinan la detección de tono) y un solo canal.
 * `idDisp` vacío o ausente = dispositivo predeterminado del sistema.
 */
export function aud_crearRestricciones(idDisp?: string): MediaStreamConstraints {
  const audio: MediaTrackConstraints = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  };
  if (idDisp !== undefined && idDisp !== '') audio.deviceId = { exact: idDisp };
  return { audio, video: false };
}

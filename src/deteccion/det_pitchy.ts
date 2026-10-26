/** Adaptador único de Pitchy (método McLeod, familia de YIN). Ningún otro archivo importa `pitchy`. */
import { PitchDetector } from 'pitchy';
import type { IDetEstimacion, IDetEstimador } from './det_tipos';

export class DetEstimadorPitchy implements IDetEstimador {
  readonly #detector: PitchDetector<Float32Array>;
  readonly #tamBuf: number;

  constructor(tamBuf: number) {
    this.#tamBuf = tamBuf;
    this.#detector = PitchDetector.forFloat32Array(tamBuf);
    // El volumen mínimo lo controla DetDetectorYin con DET_RMS_MIN.
    this.#detector.minVolumeAbsolute = 0;
  }

  /** `buf` debe tener exactamente `tamBuf` muestras. */
  estimar(buf: Float32Array, frecMuestreoHz: number): IDetEstimacion {
    if (buf.length !== this.#tamBuf) return { frecHz: 0, claridad: 0 };
    const [frecHz, claridad] = this.#detector.findPitch(buf, frecMuestreoHz);
    return Number.isFinite(frecHz) && Number.isFinite(claridad) ? { frecHz, claridad } : { frecHz: 0, claridad: 0 };
  }
}

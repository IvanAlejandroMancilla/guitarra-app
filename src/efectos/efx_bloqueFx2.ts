/**
 * FX2: pedal de drive o wah automático.
 * - `overdrive` / `distorsion` / `fuzz`: pasa altos previo (ajusta cuántos graves saturan) → WaveShaper
 *   (oversample 4x) → bloqueo de continua → tono (pasa bajos 1.2–9 kHz) → compensación de nivel.
 * - `wahAuto`: pasa banda resonante cuya frecuencia sigue la envolvente de la señal (rectificador +
 *   pasa bajos). `sensibilidad` = recorrido en Hz por unidad de envolvente; `velocidad` = rapidez de respuesta;
 *   `tono` = frecuencia de reposo (300–900 Hz).
 * `nivel` 0.5 = 0 dB (±12 dB).
 */
import type { IEfxParametrosFx2, TEfxModeloFx2 } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { EFX_TAM_CURVA } from './efx_constantes';
import { efx_calcularCompensacionGan, efx_crearCurvaRectificador, efx_crearCurvaSaturacion } from './efx_curvas';
import { efx_convertirDbAGan, efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio, TEfxTipoCurva } from './efx_tipos';

interface IEfxModeloDrive {
  curva: TEfxTipoCurva;
  frecPreAltosHz: number;
  /** `ganRel` de la curva = ganRelMin + gan·(ganRelMax − ganRelMin). */
  ganRelMin: number;
  ganRelMax: number;
}

const EFX_MODELOS_DRIVE: Readonly<Record<Exclude<TEfxModeloFx2, 'wahAuto'>, IEfxModeloDrive>> = {
  overdrive: { curva: 'suave', frecPreAltosHz: 180, ganRelMin: 0.1, ganRelMax: 0.6 },
  distorsion: { curva: 'dura', frecPreAltosHz: 100, ganRelMin: 0.3, ganRelMax: 0.85 },
  fuzz: { curva: 'fuzz', frecPreAltosHz: 40, ganRelMin: 0.4, ganRelMax: 0.95 },
};

/** Q (lineal) del pasa banda del wah. */
const EFX_Q_WAH = 6;
/** Ganancia de compensación del wah (el pasa banda deja pasar solo una franja). */
const EFX_GAN_WAH = 2.5;

export class EfxBloqueFx2 implements IEfxBloqueAudio<TEfxModeloFx2, IEfxParametrosFx2> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #envioDrive: GainNode;
  readonly #preAltos: BiquadFilterNode;
  readonly #saturador: WaveShaperNode;
  readonly #bloqueoDc: BiquadFilterNode;
  readonly #tono: BiquadFilterNode;
  readonly #compensacion: GainNode;
  readonly #envioWah: GainNode;
  readonly #filtroWah: BiquadFilterNode;
  readonly #ganWah: GainNode;
  readonly #rectificador: WaveShaperNode;
  readonly #pasaBajosEnv: BiquadFilterNode;
  readonly #sensibilidad: GainNode;
  readonly #nivel: GainNode;
  #modelo: TEfxModeloFx2 = 'overdrive';
  #gan = 0.5;
  /** Clave `modelo:ganRel` de la curva vigente, para no recalcularla sin necesidad. */
  #claveCurva = '';

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    const entradaEfecto = ctx.createGain();
    this.#nivel = ctx.createGain();

    this.#envioDrive = ctx.createGain();
    this.#preAltos = ctx.createBiquadFilter();
    this.#preAltos.type = 'highpass';
    this.#preAltos.Q.value = -3;
    this.#saturador = ctx.createWaveShaper();
    this.#saturador.oversample = '4x';
    this.#bloqueoDc = ctx.createBiquadFilter();
    this.#bloqueoDc.type = 'highpass';
    this.#bloqueoDc.frequency.value = 25;
    this.#bloqueoDc.Q.value = -3;
    this.#tono = ctx.createBiquadFilter();
    this.#tono.type = 'lowpass';
    this.#tono.Q.value = -3;
    this.#compensacion = ctx.createGain();
    entradaEfecto
      .connect(this.#envioDrive)
      .connect(this.#preAltos)
      .connect(this.#saturador)
      .connect(this.#bloqueoDc)
      .connect(this.#tono)
      .connect(this.#compensacion)
      .connect(this.#nivel);

    this.#envioWah = ctx.createGain();
    this.#envioWah.gain.value = 0;
    this.#filtroWah = ctx.createBiquadFilter();
    this.#filtroWah.type = 'bandpass';
    this.#filtroWah.Q.value = EFX_Q_WAH;
    this.#ganWah = ctx.createGain();
    this.#ganWah.gain.value = EFX_GAN_WAH;
    this.#rectificador = ctx.createWaveShaper();
    this.#rectificador.curve = efx_crearCurvaRectificador(EFX_TAM_CURVA);
    this.#pasaBajosEnv = ctx.createBiquadFilter();
    this.#pasaBajosEnv.type = 'lowpass';
    this.#pasaBajosEnv.Q.value = -3;
    this.#sensibilidad = ctx.createGain();
    entradaEfecto.connect(this.#envioWah);
    this.#envioWah.connect(this.#filtroWah).connect(this.#ganWah).connect(this.#nivel);
    this.#envioWah.connect(this.#rectificador).connect(this.#pasaBajosEnv).connect(this.#sensibilidad).connect(this.#filtroWah.frequency);

    this.#conmutador.conectarEfecto(entradaEfecto, this.#nivel);
    this.#actualizarCurva();
  }

  fijarModelo(modelo: TEfxModeloFx2): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    const esWah = modelo === 'wahAuto';
    efx_fijarParametro(this.#envioWah.gain, esWah ? 1 : 0, this.#ctx);
    efx_fijarParametro(this.#envioDrive.gain, esWah ? 0 : 1, this.#ctx);
    this.#actualizarCurva();
  }

  fijarParametros(parametros: Readonly<IEfxParametrosFx2>): void {
    const ctx = this.#ctx;
    this.#gan = parametros.gan;
    this.#actualizarCurva();
    efx_fijarParametro(this.#tono.frequency, efx_convertirRelAExponencial(parametros.tono, 1200, 9000), ctx);
    efx_fijarParametro(this.#filtroWah.frequency, efx_convertirRelAExponencial(parametros.tono, 300, 900), ctx);
    efx_fijarParametro(this.#sensibilidad.gain, efx_convertirRelAExponencial(parametros.sensibilidad, 2000, 40000), ctx);
    efx_fijarParametro(this.#pasaBajosEnv.frequency, efx_convertirRelAExponencial(parametros.velocidad, 2, 25), ctx);
    efx_fijarParametro(this.#nivel.gain, efx_convertirDbAGan(efx_convertirRelALineal(parametros.nivel, -12, 12)), ctx);
  }

  fijarActivo(esActivo: boolean): void {
    this.#conmutador.fijarActivo(esActivo);
  }

  esActivo(): boolean {
    return this.#conmutador.esActivo();
  }

  liberar(): void {
    this.#conmutador.liberar();
    for (const nodo of [
      this.#envioDrive, this.#preAltos, this.#saturador, this.#bloqueoDc, this.#tono, this.#compensacion,
      this.#envioWah, this.#filtroWah, this.#ganWah, this.#rectificador, this.#pasaBajosEnv, this.#sensibilidad, this.#nivel,
    ]) {
      nodo.disconnect();
    }
  }

  /** Recalcula la curva y la compensación del drive (el wah no la usa). */
  readonly #actualizarCurva = (): void => {
    if (this.#modelo === 'wahAuto') return;
    const def = EFX_MODELOS_DRIVE[this.#modelo];
    const ganRel = efx_convertirRelALineal(this.#gan, def.ganRelMin, def.ganRelMax);
    const clave = `${this.#modelo}:${ganRel.toFixed(3)}`;
    if (clave === this.#claveCurva) return;
    this.#claveCurva = clave;
    this.#saturador.curve = efx_crearCurvaSaturacion(def.curva, ganRel, EFX_TAM_CURVA);
    efx_fijarParametro(this.#preAltos.frequency, def.frecPreAltosHz, this.#ctx);
    efx_fijarParametro(this.#compensacion.gain, efx_calcularCompensacionGan(ganRel), this.#ctx);
  };
}

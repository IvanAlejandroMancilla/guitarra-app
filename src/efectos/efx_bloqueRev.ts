/**
 * REV: reverb por convolución con impulso generado (`efx_generarImpulsoReverb`).
 *   entrada ─┬→ seco ─────────────────────────────────────────┬─ salida
 *            └→ pre-retardo (0..200 ms) → convolución → tono → húmedo ┘
 * `tono` = pasa bajos 1.5–12 kHz; `mezcla` reparte seco/húmedo a potencia constante.
 * Cambiar modelo o decaimiento regenera el impulso (con demora para no recalcular mientras se arrastra).
 */
import type { IEfxParametrosRev, TEfxModeloRev } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { EfxConvolutor } from './efx_convolutor';
import { efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';
import { efx_generarImpulsoReverb } from './efx_impulsos';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueAudio } from './efx_tipos';

/** Semilla fija: el mismo preset suena igual en cada carga. */
const EFX_SEMILLA_REVERB = 20261025;
const EFX_DEMORA_REGENERAR_MS = 150;
const EFX_PRE_RETARDO_MAX_SEG = 0.2;

export class EfxBloqueRev implements IEfxBloqueAudio<TEfxModeloRev, IEfxParametrosRev> {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #entradaEfecto: GainNode;
  readonly #salidaEfecto: GainNode;
  readonly #seco: GainNode;
  readonly #preRetardo: DelayNode;
  readonly #convolutor: EfxConvolutor;
  readonly #pasaAltos: BiquadFilterNode;
  readonly #tono: BiquadFilterNode;
  readonly #humedo: GainNode;
  #modelo: TEfxModeloRev = 'sala';
  #decaimiento = 0.5;
  /** Clave `modelo:decaimiento` del impulso vigente o pedido. */
  #claveImpulso = '';
  #idTemporizador: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    this.#entradaEfecto = ctx.createGain();
    this.#salidaEfecto = ctx.createGain();
    this.#seco = ctx.createGain();
    this.#preRetardo = ctx.createDelay(EFX_PRE_RETARDO_MAX_SEG + 0.05);
    this.#convolutor = new EfxConvolutor(ctx);
    this.#pasaAltos = ctx.createBiquadFilter();
    this.#pasaAltos.type = 'highpass';
    this.#pasaAltos.frequency.value = 120;
    this.#pasaAltos.Q.value = -3;
    this.#tono = ctx.createBiquadFilter();
    this.#tono.type = 'lowpass';
    this.#tono.Q.value = -3;
    this.#humedo = ctx.createGain();
    this.#humedo.gain.value = 0;
    this.#entradaEfecto.connect(this.#seco).connect(this.#salidaEfecto);
    this.#entradaEfecto.connect(this.#preRetardo).connect(this.#convolutor.entrada);
    this.#convolutor.salida.connect(this.#pasaAltos).connect(this.#tono).connect(this.#humedo).connect(this.#salidaEfecto);
    this.#conmutador.conectarEfecto(this.#entradaEfecto, this.#salidaEfecto);
    this.#regenerarImpulso();
  }

  fijarModelo(modelo: TEfxModeloRev): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    this.#programarImpulso();
  }

  fijarParametros(parametros: Readonly<IEfxParametrosRev>): void {
    const ctx = this.#ctx;
    if (Math.abs(parametros.decaimiento - this.#decaimiento) > 0.005) {
      this.#decaimiento = parametros.decaimiento;
      this.#programarImpulso();
    }
    efx_fijarParametro(this.#preRetardo.delayTime, efx_convertirRelALineal(parametros.preRetardo, 0, EFX_PRE_RETARDO_MAX_SEG), ctx);
    efx_fijarParametro(this.#tono.frequency, efx_convertirRelAExponencial(parametros.tono, 1500, 12000), ctx);
    const mezcla = efx_convertirRelALineal(parametros.mezcla, 0, 1);
    efx_fijarParametro(this.#seco.gain, Math.cos((mezcla * Math.PI) / 2), ctx);
    efx_fijarParametro(this.#humedo.gain, Math.sin((mezcla * Math.PI) / 2), ctx);
  }

  fijarActivo(esActivo: boolean): void {
    this.#conmutador.fijarActivo(esActivo);
  }

  esActivo(): boolean {
    return this.#conmutador.esActivo();
  }

  liberar(): void {
    if (this.#idTemporizador !== null) clearTimeout(this.#idTemporizador);
    this.#idTemporizador = null;
    this.#conmutador.liberar();
    this.#convolutor.liberar();
    for (const nodo of [this.#entradaEfecto, this.#salidaEfecto, this.#seco, this.#preRetardo, this.#pasaAltos, this.#tono, this.#humedo]) {
      nodo.disconnect();
    }
  }

  readonly #programarImpulso = (): void => {
    if (this.#idTemporizador !== null) clearTimeout(this.#idTemporizador);
    this.#idTemporizador = setTimeout(() => {
      this.#idTemporizador = null;
      this.#regenerarImpulso();
    }, EFX_DEMORA_REGENERAR_MS);
  };

  readonly #regenerarImpulso = (): void => {
    const clave = `${this.#modelo}:${this.#decaimiento.toFixed(3)}`;
    if (clave === this.#claveImpulso) return;
    this.#claveImpulso = clave;
    const frecMuestreoHz = this.#ctx.sampleRate;
    const canales = efx_generarImpulsoReverb(frecMuestreoHz, this.#modelo, this.#decaimiento, EFX_SEMILLA_REVERB);
    const largo = canales[0]?.length ?? 1;
    const buf = this.#ctx.createBuffer(canales.length, largo, frecMuestreoHz);
    canales.forEach((canal, idx) => buf.copyToChannel(canal, idx));
    this.#convolutor.fijarImpulso(buf);
  };
}

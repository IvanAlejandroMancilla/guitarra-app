/**
 * CAB: simulación de gabinete por convolución.
 *   ConvolverNode (impulso sintético del modelo o IR del usuario) → corte de graves → corte de agudos → nivel.
 * `filtroGraves` 0 = sin corte (20 Hz) … 1 = 400 Hz; `filtroAgudos` 0 = sin corte (20 kHz) … 1 = 1.5 kHz.
 * Modelo `'ir'` sin IR cargado: usa el combo 1×12 simulado.
 */
import type { IEfxParametrosCab, TEfxModeloCab } from '../core/cor_efectos';
import { EfxConmutador } from './efx_conmutador';
import { EfxConvolutor } from './efx_convolutor';
import { efx_convertirDbAGan, efx_convertirRelAExponencial, efx_convertirRelALineal } from './efx_escalas';
import { efx_generarImpulsoGabinete } from './efx_impulsos';
import { efx_fijarParametro } from './efx_rampas';
import type { IEfxBloqueCabAudio } from './efx_tipos';

type TEfxModeloCabSimulado = Exclude<TEfxModeloCab, 'ir'>;

const EFX_MODELO_CAB_RESPALDO: TEfxModeloCabSimulado = 'combo1x12';

export class EfxBloqueCab implements IEfxBloqueCabAudio {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #ctx: BaseAudioContext;
  readonly #conmutador: EfxConmutador;
  readonly #convolutor: EfxConvolutor;
  readonly #corteGraves: BiquadFilterNode;
  readonly #corteAgudos: BiquadFilterNode;
  readonly #nivel: GainNode;
  readonly #impulsos = new Map<TEfxModeloCabSimulado, AudioBuffer>();
  #modelo: TEfxModeloCab | null = null;
  #bufIr: AudioBuffer | null = null;

  constructor(ctx: BaseAudioContext) {
    this.#ctx = ctx;
    this.#conmutador = new EfxConmutador(ctx);
    this.entrada = this.#conmutador.entrada;
    this.salida = this.#conmutador.salida;
    this.#convolutor = new EfxConvolutor(ctx);
    this.#corteGraves = ctx.createBiquadFilter();
    this.#corteGraves.type = 'highpass';
    this.#corteGraves.Q.value = -3;
    this.#corteAgudos = ctx.createBiquadFilter();
    this.#corteAgudos.type = 'lowpass';
    this.#corteAgudos.Q.value = -3;
    this.#nivel = ctx.createGain();
    this.#convolutor.salida.connect(this.#corteGraves).connect(this.#corteAgudos).connect(this.#nivel);
    this.#conmutador.conectarEfecto(this.#convolutor.entrada, this.#nivel);
    this.fijarModelo(EFX_MODELO_CAB_RESPALDO);
  }

  fijarModelo(modelo: TEfxModeloCab): void {
    if (modelo === this.#modelo) return;
    this.#modelo = modelo;
    this.#aplicarImpulso();
  }

  fijarIr(buf: AudioBuffer | null): void {
    this.#bufIr = buf;
    if (this.#modelo === 'ir') this.#aplicarImpulso();
  }

  fijarParametros(parametros: Readonly<IEfxParametrosCab>): void {
    const ctx = this.#ctx;
    efx_fijarParametro(this.#corteGraves.frequency, efx_convertirRelAExponencial(parametros.filtroGraves, 20, 400), ctx);
    efx_fijarParametro(this.#corteAgudos.frequency, efx_convertirRelAExponencial(1 - parametros.filtroAgudos, 1500, 20000), ctx);
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
    this.#convolutor.liberar();
    for (const nodo of [this.#corteGraves, this.#corteAgudos, this.#nivel]) nodo.disconnect();
    this.#impulsos.clear();
  }

  readonly #aplicarImpulso = (): void => {
    const modelo = this.#modelo ?? EFX_MODELO_CAB_RESPALDO;
    if (modelo === 'ir' && this.#bufIr !== null) {
      this.#convolutor.fijarImpulso(this.#bufIr);
      return;
    }
    this.#convolutor.fijarImpulso(this.#obtenerImpulso(modelo === 'ir' ? EFX_MODELO_CAB_RESPALDO : modelo));
  };

  readonly #obtenerImpulso = (modelo: TEfxModeloCabSimulado): AudioBuffer => {
    const guardado = this.#impulsos.get(modelo);
    if (guardado !== undefined) return guardado;
    const muestras = efx_generarImpulsoGabinete(this.#ctx.sampleRate, modelo);
    const buf = this.#ctx.createBuffer(1, muestras.length, this.#ctx.sampleRate);
    buf.copyToChannel(muestras, 0);
    this.#impulsos.set(modelo, buf);
    return buf;
  };
}

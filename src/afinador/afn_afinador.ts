/** Afinador: escucha `'det:tono'` y publica `'afn:lectura'` con la aguja suavizada. */
import type { ICorBus } from '../core/cor_contratos';
import type { IDetTono } from '../core/cor_eventos';
import { cor_frecANota } from '../core/cor_notas';
import type { TIdAfinacion } from '../core/tipos';
import { AFN_FACTOR_SUAVIZADO } from './afn_constantes';
import { afn_suavizarCents, afn_validarAfinado } from './afn_cents';
import { AFN_ID_AFINACION_DEF } from './afn_afinaciones';
import { afn_obtenerCuerdaCercana } from './afn_cuerdas';
import type { IAfnOpciones } from './afn_tipos';

export class AfnAfinador {
  readonly #bus: ICorBus;
  #opc: IAfnOpciones;
  #cancelaciones: (() => void)[] = [];
  /** Estado del suavizado; se reinicia al cambiar de nota/cuerda o tras silencio. */
  #midiAnt: number | null = null;
  #curAnt: number | null = null;
  #centsSuav = 0;
  #centsCuerdaSuav = 0;

  constructor(bus: ICorBus, opc: IAfnOpciones) {
    this.#bus = bus;
    this.#opc = { ...opc };
  }

  esActivo(): boolean {
    return this.#cancelaciones.length > 0;
  }

  iniciar(): void {
    if (this.esActivo()) return;
    this.#reiniciarSuavizado();
    this.#cancelaciones = [
      this.#bus.suscribir('det:tono', this.#procesarTono),
      this.#bus.suscribir('det:silencio', this.#reiniciarSuavizado),
    ];
  }

  detener(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
  }

  actualizarOpciones(opc: IAfnOpciones): void {
    this.#opc = { ...opc };
    this.#reiniciarSuavizado();
  }

  readonly #procesarTono = (tono: IDetTono): void => {
    if (!(tono.frecHz > 0)) return;
    const { afinacion, frecA4Hz, tolCents } = this.#opc;
    const nota = cor_frecANota(tono.frecHz, frecA4Hz);
    const cuerda = afn_obtenerCuerdaCercana(tono.frecHz, afinacion, frecA4Hz);
    if (nota.midi !== this.#midiAnt || cuerda.cur !== this.#curAnt) {
      this.#midiAnt = nota.midi;
      this.#curAnt = cuerda.cur;
      this.#centsSuav = nota.cents;
      this.#centsCuerdaSuav = cuerda.cents;
    } else {
      this.#centsSuav = afn_suavizarCents(this.#centsSuav, nota.cents, AFN_FACTOR_SUAVIZADO);
      this.#centsCuerdaSuav = afn_suavizarCents(this.#centsCuerdaSuav, cuerda.cents, AFN_FACTOR_SUAVIZADO);
    }
    const idAfinacion: TIdAfinacion = afinacion.id === 'personalizada' ? AFN_ID_AFINACION_DEF : afinacion.id;
    this.#bus.emitir('afn:lectura', {
      tiempoMs: tono.tiempoMs,
      nombre: nota.nombre,
      oct: nota.oct,
      frecHz: tono.frecHz,
      cents: this.#centsSuav,
      curCercana: cuerda.cur,
      frecRefHz: cuerda.frecRefHz,
      centsCuerda: this.#centsCuerdaSuav,
      esAfinado: afn_validarAfinado(this.#centsCuerdaSuav, tolCents),
      idAfinacion,
    });
  };

  readonly #reiniciarSuavizado = (): void => {
    this.#midiAnt = null;
    this.#curAnt = null;
    this.#centsSuav = 0;
    this.#centsCuerdaSuav = 0;
  };
}

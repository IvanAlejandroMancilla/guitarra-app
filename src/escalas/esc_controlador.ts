/** Coordinador de escalas: `'ui:escala'` → `'esc:generada'` usando la configuración vigente. */
import type { ICorBus, ICorFuenteConfig } from '../core/cor_contratos';
import type { IUiEscalaElegida, TEscTipoEscala } from '../core/cor_eventos';
import { cor_notaAMidi } from '../core/cor_notas';
import type { IAfinacion, TIdAfinacion } from '../core/tipos';
import { ESC_ANCHO_CAJA, ESC_CANT_OCT_DEF, ESC_PULSOS_POR_NOTA_DEF, ESC_TRS_MAX } from './esc_constantes';
import { esc_generarEscala } from './esc_generador';

/** Trastes que la caja empieza antes de la tónica (patrones habituales con el dedo 2 en la tónica). */
const ESC_DESPLAZAMIENTO_CAJA: Readonly<Record<TEscTipoEscala, number>> = {
  mayor: 1,
  pentatonicaMayor: 1,
  menorNatural: 0,
  pentatonicaMenor: 0,
};

/** Primer traste de la caja: tónica en la sexta o la quinta cuerda, en el traste más bajo posible. */
const calcularTrsInicial = (midiTonica: number, afin: IAfinacion, tipo: TEscTipoEscala): number => {
  const cantCuerdas = afin.midiCuerdas.length;
  let trsTonica: number | null = null;
  for (const cur of [cantCuerdas, cantCuerdas - 1]) {
    const trs = midiTonica - (afin.midiCuerdas[cur - 1] ?? Number.NaN);
    if (trs >= 0 && trs <= ESC_TRS_MAX - ESC_ANCHO_CAJA && (trsTonica === null || trs < trsTonica)) trsTonica = trs;
  }
  return trsTonica === null ? 0 : Math.max(0, trsTonica - ESC_DESPLAZAMIENTO_CAJA[tipo]);
};

export class EscControlador {
  readonly #bus: ICorBus;
  readonly #fuenteCfg: ICorFuenteConfig;
  readonly #afinaciones: Readonly<Record<TIdAfinacion, IAfinacion>>;
  #cancelar: (() => void) | null = null;

  /** `afinaciones`: catálogo inyectado desde main (`AFN_AFINACIONES`); `esc` no importa `afn`. */
  constructor(bus: ICorBus, fuenteCfg: ICorFuenteConfig, afinaciones: Readonly<Record<TIdAfinacion, IAfinacion>>) {
    this.#bus = bus;
    this.#fuenteCfg = fuenteCfg;
    this.#afinaciones = afinaciones;
  }

  esActivo(): boolean {
    return this.#cancelar !== null;
  }

  iniciar(): void {
    this.#cancelar ??= this.#bus.suscribir('ui:escala', this.#generar);
  }

  detener(): void {
    this.#cancelar?.();
    this.#cancelar = null;
  }

  readonly #generar = (elegida: IUiEscalaElegida): void => {
    const cfg = this.#fuenteCfg.obtenerConfig();
    const afinacion = this.#afinaciones[cfg.idAfinacion] ?? this.#afinaciones.estandar;
    try {
      const ej = esc_generarEscala({
        tonica: elegida.tonica,
        tipo: elegida.tipo,
        oct: elegida.oct,
        cantOct: ESC_CANT_OCT_DEF,
        esIdaVuelta: true,
        bpm: cfg.bpm,
        modo: cfg.modoValidacion === 'ejercicio' ? 'estricto' : cfg.modoValidacion,
        afinacion,
        trsInicial: calcularTrsInicial(cor_notaAMidi(elegida.tonica, elegida.oct), afinacion, elegida.tipo),
        pulsosPorNota: ESC_PULSOS_POR_NOTA_DEF,
        notacion: cfg.notacion,
      });
      this.#bus.emitir('esc:generada', { ej, tonica: elegida.tonica, tipo: elegida.tipo });
    } catch (err) {
      console.error('[esc] No se pudo generar la escala:', err);
      this.#bus.emitir('cor:error', {
        origen: 'esc',
        msj: 'No se pudo generar la escala en esa octava con la afinación actual. Prueba otra octava.',
      });
    }
  };
}

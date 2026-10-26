/**
 * Coordinador del módulo gpr: traduce eventos del bus a llamadas del cargador.
 * 'ui:archivoGp' → 'gpr:cargado'; 'ui:pistaGp' → 'gpr:pistaConvertida'. Errores → 'cor:error'.
 */
import type { ICorBus } from '../core/cor_contratos';
import type { IUiArchivoElegido, IUiPistaElegida } from '../core/cor_eventos';
import type { IGprCargador } from './gpr_tipos';

const GPR_ORIGEN = 'gpr';

const obtenerMensaje = (err: unknown, msjDef: string): string =>
  err instanceof Error && err.message !== '' ? err.message : msjDef;

export class GprControlador {
  readonly #bus: ICorBus;
  readonly #cargador: IGprCargador;
  #desuscripciones: (() => void)[] = [];
  /** Descarta resultados de cargas viejas si el usuario elige otro archivo antes de que termine. */
  #idCarga = 0;

  constructor(bus: ICorBus, cargador: IGprCargador) {
    this.#bus = bus;
    this.#cargador = cargador;
  }

  iniciar(): void {
    if (this.#desuscripciones.length > 0) return;
    this.#desuscripciones = [
      this.#bus.suscribir('ui:archivoGp', this.#alElegirArchivo),
      this.#bus.suscribir('ui:pistaGp', this.#alElegirPista),
    ];
  }

  detener(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#idCarga++;
  }

  readonly #alElegirArchivo = (payload: IUiArchivoElegido): void => {
    const idCarga = ++this.#idCarga;
    const { archivo } = payload;
    void archivo
      .arrayBuffer()
      .then((buf) => this.#cargador.cargarPartitura(buf, archivo.name))
      .then((cargado) => {
        if (idCarga === this.#idCarga) this.#bus.emitir('gpr:cargado', cargado);
      })
      .catch((err: unknown) => {
        if (idCarga !== this.#idCarga) return;
        this.#bus.emitir('cor:error', {
          origen: GPR_ORIGEN,
          msj: obtenerMensaje(err, 'No se pudo cargar el archivo Guitar Pro.'),
        });
      });
  };

  readonly #alElegirPista = (payload: IUiPistaElegida): void => {
    try {
      const ej = this.#cargador.convertirPista(payload.idxPst);
      this.#bus.emitir('gpr:pistaConvertida', { idxPst: payload.idxPst, ej });
    } catch (err) {
      this.#bus.emitir('cor:error', {
        origen: GPR_ORIGEN,
        msj: obtenerMensaje(err, 'No se pudo convertir la pista elegida.'),
      });
    }
  };
}

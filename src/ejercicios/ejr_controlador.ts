/**
 * Coordinador de ejercicios: único emisor de `'ejr:cargado'`.
 * - `iniciar()` carga el catálogo y emite `'ejr:catalogo'`.
 * - `'ui:ejercicio'` → descarga `EJR_RUTA_BASE + ruta`, lo importa y emite `'ejr:cargado'` (origen `'json'`).
 * - `'esc:generada'` → `'ejr:cargado'` (origen `'escala'`).
 * - `'gpr:cargado'` / `'gpr:pistaConvertida'` → `'ejr:cargado'` (origen `'gpr'`).
 * Los errores se publican en `'cor:error'`.
 */
import type { ICorBus, ICorImportador } from '../core/cor_contratos';
import type { IUiEjercicioElegido } from '../core/cor_eventos';
import { ejr_cargarArchivo, ejr_cargarCatalogo } from './ejr_catalogo';
import { EJR_RUTA_BASE } from './ejr_constantes';

const obtenerMsj = (err: unknown, msjDef: string): string => (err instanceof Error && err.message !== '' ? err.message : msjDef);

export class EjrControlador {
  readonly #bus: ICorBus;
  readonly #importador: ICorImportador;
  readonly #urlBase: string;
  #cancelaciones: (() => void)[] = [];
  /** Evita que una descarga lenta pise a un ejercicio elegido después. */
  #idPedido = 0;

  constructor(bus: ICorBus, importador: ICorImportador, urlBase: string) {
    this.#bus = bus;
    this.#importador = importador;
    this.#urlBase = urlBase.endsWith('/') ? urlBase : `${urlBase}/`;
  }

  esActivo(): boolean {
    return this.#cancelaciones.length > 0;
  }

  async iniciar(): Promise<void> {
    if (!this.esActivo()) {
      this.#cancelaciones = [
        this.#bus.suscribir('ui:ejercicio', (elegido) => void this.#cargarEjercicio(elegido)),
        this.#bus.suscribir('esc:generada', (generada) => this.#bus.emitir('ejr:cargado', { ej: generada.ej, origen: 'escala' })),
        this.#bus.suscribir('gpr:cargado', (cargado) => this.#bus.emitir('ejr:cargado', { ej: cargado.ej, origen: 'gpr' })),
        this.#bus.suscribir('gpr:pistaConvertida', (pista) => this.#bus.emitir('ejr:cargado', { ej: pista.ej, origen: 'gpr' })),
      ];
    }
    try {
      const entradas = await ejr_cargarCatalogo(this.#urlBase);
      this.#bus.emitir('ejr:catalogo', { entradas });
    } catch (err) {
      console.error('[ejr] Error al cargar el catálogo:', err);
      this.#bus.emitir('ejr:catalogo', { entradas: [] });
      this.#bus.emitir('cor:error', { origen: 'ejr', msj: obtenerMsj(err, 'No se pudo cargar el catálogo de ejercicios.') });
    }
  }

  detener(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
  }

  readonly #cargarEjercicio = async (elegido: IUiEjercicioElegido): Promise<void> => {
    const idPedido = ++this.#idPedido;
    const ruta = elegido.ruta.replace(/^\/+/, '');
    try {
      const buf = await ejr_cargarArchivo(`${this.#urlBase}${EJR_RUTA_BASE}${ruta}`);
      const ej = await this.#importador.importar(buf, ruta);
      if (idPedido !== this.#idPedido) return;
      this.#bus.emitir('ejr:cargado', { ej, origen: 'json' });
    } catch (err) {
      console.error('[ejr] Error al cargar el ejercicio:', err);
      this.#bus.emitir('cor:error', { origen: 'ejr', msj: obtenerMsj(err, `No se pudo cargar el ejercicio "${ruta}".`) });
    }
  };
}

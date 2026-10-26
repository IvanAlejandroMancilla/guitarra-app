/** Cambia entre pantallas montando/desmontando un `ICorMontable` por pantalla. */
import type { ICorBus, ICorMontable } from '../core/cor_contratos';
import type { TUiPantalla } from '../core/cor_eventos';
import { ui_vaciarElemento } from './ui_dom';

/**
 * Escucha `'ui:pantalla'` y muestra la pantalla pedida dentro de `contenedor`.
 * Tras montar mueve el foco al primer `h1` (para teclado y lectores de pantalla).
 */
export class UiNavegador {
  #bus: ICorBus;
  #contenedor: HTMLElement;
  #pantallas = new Map<TUiPantalla, ICorMontable>();
  #pantallaAct: TUiPantalla | null = null;
  #montableAct: ICorMontable | null = null;
  /** Se incrementa en cada navegación para descartar montajes que terminan tarde. */
  #idxNavegacion = 0;

  constructor(bus: ICorBus, contenedor: HTMLElement) {
    this.#bus = bus;
    this.#contenedor = contenedor;
    bus.suscribir('ui:pantalla', (solicitud) => {
      void this.mostrar(solicitud.pantalla);
    });
  }

  registrar(pantalla: TUiPantalla, montable: ICorMontable): void {
    this.#pantallas.set(pantalla, montable);
  }

  /** Muestra `pantalla` (no emite `'ui:pantalla'`). Si ya está visible, no hace nada. */
  async mostrar(pantalla: TUiPantalla): Promise<void> {
    if (pantalla === this.#pantallaAct) return;
    const montable = this.#pantallas.get(pantalla);
    if (montable === undefined) {
      console.warn(`[ui] Pantalla sin registrar: '${pantalla}'.`);
      return;
    }
    this.#montableAct?.desmontar();
    ui_vaciarElemento(this.#contenedor);
    const idxNavegacion = ++this.#idxNavegacion;
    this.#pantallaAct = pantalla;
    this.#montableAct = montable;
    this.#contenedor.dataset['pantalla'] = pantalla;
    try {
      await montable.montar(this.#contenedor);
    } catch (err) {
      console.error(`[ui] Error al montar la pantalla '${pantalla}':`, err);
      this.#bus.emitir('cor:error', { origen: 'ui', msj: 'No se pudo abrir la pantalla.' });
      return;
    }
    if (idxNavegacion !== this.#idxNavegacion) return;
    const titulo = this.#contenedor.querySelector('h1');
    if (titulo !== null) {
      titulo.tabIndex = -1;
      titulo.focus({ preventScroll: true });
    }
  }

  obtenerPantalla(): TUiPantalla | null {
    return this.#pantallaAct;
  }
}

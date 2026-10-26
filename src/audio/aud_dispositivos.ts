/** Enumeración y observación de dispositivos de entrada de audio. */
import type { ICorBus } from '../core/cor_contratos';
import type { IAudDispositivo, IAudEstado } from '../core/cor_eventos';

/**
 * Lista las entradas de audio. Las etiquetas llegan vacías hasta que el usuario
 * concede el permiso de micrófono (limitación de los navegadores).
 */
export async function aud_listarDispositivos(): Promise<IAudDispositivo[]> {
  if (!('mediaDevices' in navigator) || typeof navigator.mediaDevices.enumerateDevices !== 'function') return [];
  const todos = await navigator.mediaDevices.enumerateDevices();
  const entradas = todos.filter((disp) => disp.kind === 'audioinput');
  const tienePredeterminado = entradas.some((disp) => disp.deviceId === 'default');
  return entradas.map((disp, idx) => ({
    id: disp.deviceId,
    etiqueta: disp.label,
    esPredeterminado: tienePredeterminado ? disp.deviceId === 'default' : idx === 0,
  }));
}

/**
 * Emite `'aud:dispositivos'` al iniciar, cuando cambia el hardware (`devicechange`)
 * y cuando la captura pasa a `'activo'` (en ese momento aparecen las etiquetas).
 */
export class AudObservadorDispositivos {
  readonly #bus: ICorBus;
  #cancelarEstado: (() => void) | null = null;
  #esActivo = false;

  constructor(bus: ICorBus) {
    this.#bus = bus;
  }

  esActivo(): boolean {
    return this.#esActivo;
  }

  async iniciar(): Promise<void> {
    if (!this.#esActivo) {
      this.#esActivo = true;
      if ('mediaDevices' in navigator) navigator.mediaDevices.addEventListener('devicechange', this.#actualizarLista);
      this.#cancelarEstado = this.#bus.suscribir('aud:estado', this.#revisarEstado);
    }
    await this.#emitirLista();
  }

  detener(): void {
    if (!this.#esActivo) return;
    this.#esActivo = false;
    if ('mediaDevices' in navigator) navigator.mediaDevices.removeEventListener('devicechange', this.#actualizarLista);
    this.#cancelarEstado?.();
    this.#cancelarEstado = null;
  }

  readonly #emitirLista = async (): Promise<void> => {
    try {
      const disps = await aud_listarDispositivos();
      this.#bus.emitir('aud:dispositivos', { disps });
    } catch (err) {
      console.error('[aud] No se pudieron listar los dispositivos:', err);
      this.#bus.emitir('cor:error', { origen: 'aud', msj: 'No se pudieron listar los dispositivos de audio.' });
    }
  };

  readonly #actualizarLista = (): void => {
    void this.#emitirLista();
  };

  readonly #revisarEstado = (estado: IAudEstado): void => {
    if (estado.estado === 'activo') void this.#emitirLista();
  };
}

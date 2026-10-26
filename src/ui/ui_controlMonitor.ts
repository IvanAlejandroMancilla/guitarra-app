/** Monitoreo: encender "Escuchar mi guitarra" y su volumen (edita `IConfig`), con el aviso de audífonos. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import { ui_crearElemento } from './ui_dom';
import { UiInterruptor } from './ui_interruptor';
import { UiSlider } from './ui_slider';

const UI_MSJ_AVISO_MONITOR =
  'Usa audífonos: con parlantes el sonido vuelve a la entrada y se acopla. El navegador agrega algo de latencia (un pequeño retraso).';

const formatearPct = (valor: number): string => `${Math.round(valor * 100)} %`;

export class UiControlMonitor {
  readonly elem: HTMLElement;
  #desuscribir: () => void;

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    const cfg = editor.obtenerConfig();
    this.elem = ui_crearElemento('div', 'ui-monitor');
    const interruptor = new UiInterruptor({
      etiqueta: 'Escuchar mi guitarra',
      descripcion: 'Tu guitarra suena con los efectos del mezclador.',
      esActivo: cfg.esMonitorActivo,
      alCambiar: (esMonitorActivo) => {
        editor.actualizarConfig({ esMonitorActivo });
      },
    });
    // Rango de `IConfig.volMonitor` (0–1, paso 0.01); ui no importa cfg.
    const vol = new UiSlider({
      etiqueta: 'Volumen de monitoreo',
      min: 0,
      max: 1,
      paso: 0.01,
      valor: cfg.volMonitor,
      formatear: formatearPct,
      alCambiar: (volMonitor) => {
        editor.actualizarConfig({ volMonitor });
      },
    });
    const aviso = ui_crearElemento('p', 'ui-monitor__aviso', UI_MSJ_AVISO_MONITOR);
    this.elem.append(interruptor.elem, vol.elem, aviso);
    this.elem.classList.toggle('ui-monitor--activo', cfg.esMonitorActivo);

    this.#desuscribir = bus.suscribir('cfg:cambio', (cambio) => {
      if (cambio.claves.includes('esMonitorActivo')) {
        interruptor.fijarEstado(cambio.cfg.esMonitorActivo);
        this.elem.classList.toggle('ui-monitor--activo', cambio.cfg.esMonitorActivo);
      }
      if (cambio.claves.includes('volMonitor')) vol.fijarValor(cambio.cfg.volMonitor);
    });
  }

  liberar(): void {
    this.#desuscribir();
    this.#desuscribir = () => undefined;
  }
}

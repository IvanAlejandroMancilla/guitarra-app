/** Sección Detección: umbral de claridad, frames de estabilidad y La4 de referencia. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IConfig } from '../core/tipos';
import { ui_crearElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSlider } from '../ui/ui_slider';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

export class CfgSeccionDeteccion implements ICfgSeccion {
  readonly titulo = 'Detección de notas';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #claridad: UiSlider | null = null;
  #frames: UiSlider | null = null;
  #frecA4: UiSlider | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    this.#claridad = new UiSlider({
      etiqueta: 'Claridad mínima',
      ...CFG_RANGOS.claridadMin,
      valor: cfg.claridadMin,
      formatear: (valor) => valor.toFixed(2),
      alCambiar: (claridadMin) => {
        this.#editor.actualizarConfig({ claridadMin });
      },
    });
    this.#frames = new UiSlider({
      etiqueta: 'Frames de estabilidad',
      ...CFG_RANGOS.framesEstables,
      valor: cfg.framesEstables,
      formatear: (valor) => (valor === 1 ? '1 frame' : `${valor} frames`),
      alCambiar: (framesEstables) => {
        this.#editor.actualizarConfig({ framesEstables });
      },
    });
    this.#frecA4 = new UiSlider({
      etiqueta: 'La4 de referencia',
      ...CFG_RANGOS.frecA4Hz,
      valor: cfg.frecA4Hz,
      formatear: (valor) => `${valor.toFixed(1)} Hz`,
      alCambiar: (frecA4Hz) => {
        this.#editor.actualizarConfig({ frecA4Hz });
      },
    });
    const ayuda = ui_crearElemento(
      'p',
      'cfg-seccion__nota',
      'Más claridad = menos falsos positivos pero exige notas limpias. Más frames = más estable pero con más retardo.',
    );
    // Lectura en vivo para elegir el umbral: claridad de los tonos que llegan.
    const lectura = ui_crearElemento('p', 'cfg-seccion__lectura', 'Claridad actual: —');
    lectura.setAttribute('aria-live', 'off');
    this.#desuscripciones.push(
      this.#bus.suscribir('det:tono', (tono) => {
        lectura.textContent = `Claridad actual: ${tono.claridad.toFixed(2)} (${tono.frecHz.toFixed(1)} Hz)`;
      }),
      this.#bus.suscribir('det:silencio', () => {
        lectura.textContent = 'Claridad actual: — (silencio)';
      }),
    );

    this.#panel = ui_crearPanel(this.titulo, [this.#claridad.elem, this.#frames.elem, this.#frecA4.elem, ayuda, lectura]);
    contenedor.append(this.#panel);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    this.#claridad?.fijarValor(cfg.claridadMin);
    this.#frames?.fijarValor(cfg.framesEstables);
    this.#frecA4?.fijarValor(cfg.frecA4Hz);
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#panel?.remove();
    this.#panel = null;
    this.#claridad = null;
    this.#frames = null;
    this.#frecA4 = null;
  }
}

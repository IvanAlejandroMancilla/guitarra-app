/** Sección Práctica: BPM, velocidad, modo progresivo, loop y metrónomo. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IConfig } from '../core/tipos';
import { ui_crearElemento } from '../ui/ui_dom';
import { UiInterruptor } from '../ui/ui_interruptor';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSlider } from '../ui/ui_slider';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

interface ICfgControlesPractica {
  bpm: UiSlider;
  velocidad: UiSlider;
  progresivo: UiInterruptor;
  incBpm: UiSlider;
  bpmMax: UiSlider;
  loop: UiInterruptor;
  metronomo: UiInterruptor;
}

export class CfgSeccionPractica implements ICfgSeccion {
  readonly titulo = 'Práctica';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #controles: ICfgControlesPractica | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    const editor = this.#editor;
    const controles: ICfgControlesPractica = {
      bpm: new UiSlider({
        etiqueta: 'BPM base',
        ...CFG_RANGOS.bpm,
        valor: cfg.bpm,
        unidad: 'BPM',
        alCambiar: (bpm) => editor.actualizarConfig({ bpm }),
      }),
      velocidad: new UiSlider({
        etiqueta: 'Velocidad de práctica',
        ...CFG_RANGOS.velocidad,
        valor: cfg.velocidad,
        formatear: (valor) => `${Math.round(valor * 100)} %`,
        alCambiar: (velocidad) => editor.actualizarConfig({ velocidad }),
      }),
      progresivo: new UiInterruptor({
        etiqueta: 'Velocidad progresiva',
        descripcion: 'Sube el BPM cada vez que completas una vuelta con buena precisión.',
        esActivo: cfg.esProgresivo,
        alCambiar: (esProgresivo) => editor.actualizarConfig({ esProgresivo }),
      }),
      incBpm: new UiSlider({
        etiqueta: 'Incremento por vuelta',
        ...CFG_RANGOS.incBpmProgresivo,
        valor: cfg.incBpmProgresivo,
        formatear: (valor) => `+${valor} BPM`,
        alCambiar: (incBpmProgresivo) => editor.actualizarConfig({ incBpmProgresivo }),
      }),
      bpmMax: new UiSlider({
        etiqueta: 'BPM máximo progresivo',
        ...CFG_RANGOS.bpmMaxProgresivo,
        valor: cfg.bpmMaxProgresivo,
        unidad: 'BPM',
        alCambiar: (bpmMaxProgresivo) => editor.actualizarConfig({ bpmMaxProgresivo }),
      }),
      loop: new UiInterruptor({
        etiqueta: 'Repetir en bucle (loop)',
        esActivo: cfg.esLoop,
        alCambiar: (esLoop) => editor.actualizarConfig({ esLoop }),
      }),
      metronomo: new UiInterruptor({
        etiqueta: 'Metrónomo',
        esActivo: cfg.esMetronomoActivo,
        alCambiar: (esMetronomoActivo) => editor.actualizarConfig({ esMetronomoActivo }),
      }),
    };
    this.#controles = controles;

    const grupoProg = ui_crearElemento('div', 'cfg-seccion__subgrupo');
    grupoProg.append(controles.incBpm.elem, controles.bpmMax.elem);
    const lectura = ui_crearElemento('p', 'cfg-seccion__lectura');
    lectura.setAttribute('role', 'status');
    this.#desuscripciones.push(
      this.#bus.suscribir('tmp:bpm', (cambio) => {
        lectura.textContent = cambio.esProgresivo ? `Modo progresivo: subió a ${Math.round(cambio.bpm)} BPM.` : '';
      }),
    );

    this.#panel = ui_crearPanel(this.titulo, [
      controles.bpm.elem,
      controles.velocidad.elem,
      controles.metronomo.elem,
      controles.loop.elem,
      controles.progresivo.elem,
      grupoProg,
      lectura,
    ]);
    contenedor.append(this.#panel);
    this.actualizar(cfg);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    const controles = this.#controles;
    if (controles === null) return;
    controles.bpm.fijarValor(cfg.bpm);
    controles.velocidad.fijarValor(cfg.velocidad);
    controles.progresivo.fijarEstado(cfg.esProgresivo);
    controles.incBpm.fijarValor(cfg.incBpmProgresivo);
    controles.bpmMax.fijarValor(cfg.bpmMaxProgresivo);
    controles.loop.fijarEstado(cfg.esLoop);
    controles.metronomo.fijarEstado(cfg.esMetronomoActivo);
    // Los ajustes del modo progresivo solo se muestran si está activo.
    const grupoProg = controles.incBpm.elem.parentElement;
    if (grupoProg !== null) grupoProg.hidden = !cfg.esProgresivo;
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#panel?.remove();
    this.#panel = null;
    this.#controles = null;
  }
}

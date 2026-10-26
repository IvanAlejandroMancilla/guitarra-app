/** Sección Validación: modo (estricto / flexible / según ejercicio) y tolerancia de timing. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IEjrResultado } from '../core/cor_eventos';
import type { IConfig, TCfgModoValidacion } from '../core/tipos';
import { ui_crearElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSelector } from '../ui/ui_selector';
import { UiSlider } from '../ui/ui_slider';
import type { IUiOpcion } from '../ui/ui_tipos';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

const CFG_OPCIONES_MODO: readonly IUiOpcion<TCfgModoValidacion>[] = [
  { valor: 'ejercicio', etiqueta: 'Según cada ejercicio' },
  { valor: 'estricto', etiqueta: 'Estricto (nota y octava)' },
  { valor: 'flexible', etiqueta: 'Flexible (solo el nombre de la nota)' },
];

export class CfgSeccionValidacion implements ICfgSeccion {
  readonly titulo = 'Validación';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #modo: UiSelector<TCfgModoValidacion> | null = null;
  #tol: UiSlider | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    this.#modo = new UiSelector<TCfgModoValidacion>({
      etiqueta: 'Modo de validación',
      opciones: CFG_OPCIONES_MODO,
      valor: cfg.modoValidacion,
      alCambiar: (modoValidacion) => {
        this.#editor.actualizarConfig({ modoValidacion });
      },
    });
    this.#tol = new UiSlider({
      etiqueta: 'Tolerancia de tiempo',
      ...CFG_RANGOS.tolMs,
      valor: cfg.tolMs,
      formatear: (valor) => `±${valor} ms`,
      alCambiar: (tolMs) => {
        this.#editor.actualizarConfig({ tolMs });
      },
    });
    // Último desvío medido, para ajustar la tolerancia con datos reales.
    const lectura = ui_crearElemento('p', 'cfg-seccion__lectura', 'Último desvío: — (practica un ejercicio para medirlo)');
    const mostrarDesvio = (resultado: IEjrResultado): void => {
      if (resultado.motivo === 'omitida') return;
      const desvio = Math.round(resultado.desvioMs);
      lectura.textContent = `Último desvío: ${desvio > 0 ? '+' : ''}${desvio} ms (${desvio > 0 ? 'tarde' : 'temprano'})`;
    };
    this.#desuscripciones.push(
      this.#bus.suscribir('ejr:acierto', mostrarDesvio),
      this.#bus.suscribir('ejr:fallo', mostrarDesvio),
    );

    this.#panel = ui_crearPanel(this.titulo, [this.#modo.elem, this.#tol.elem, lectura]);
    contenedor.append(this.#panel);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    this.#modo?.fijarValor(cfg.modoValidacion);
    this.#tol?.fijarValor(cfg.tolMs);
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#panel?.remove();
    this.#panel = null;
    this.#modo = null;
    this.#tol = null;
  }
}

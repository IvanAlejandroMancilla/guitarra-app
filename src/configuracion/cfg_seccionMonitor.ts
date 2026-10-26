/** Sección Monitoreo: escuchar la guitarra (con efectos) por la salida y su volumen. Reutiliza `UiControlMonitor`. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import { UiControlMonitor } from '../ui/ui_controlMonitor';
import { ui_crearBoton } from '../ui/ui_boton';
import { ui_crearElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import type { ICfgSeccion } from './cfg_tipos';

export class CfgSeccionMonitor implements ICfgSeccion {
  readonly titulo = 'Monitoreo';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #control: UiControlMonitor | null = null;

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const control = new UiControlMonitor(this.#editor, this.#bus);
    this.#control = control;
    const nota = ui_crearElemento('p', 'cfg-seccion__nota', 'El sonido (amplificador y efectos) se elige en el mezclador.');
    const botones = ui_crearElemento('div', 'cfg-seccion__botones');
    botones.append(
      ui_crearBoton({
        texto: 'Abrir mezclador',
        alPulsar: () => {
          this.#bus.emitir('ui:pantalla', { pantalla: 'mezclador' });
        },
      }),
    );
    this.#panel = ui_crearPanel(this.titulo, [control.elem, nota, botones]);
    contenedor.append(this.#panel);
  }

  actualizar(): void {
    // UiControlMonitor ya sigue 'cfg:cambio' por su cuenta.
  }

  desmontar(): void {
    this.#control?.liberar();
    this.#control = null;
    this.#panel?.remove();
    this.#panel = null;
  }
}

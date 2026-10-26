/** Pantalla de configuración: agrupa las secciones y las mantiene sincronizadas con `'cfg:cambio'`. */
import type { ICorBus, ICorCalibradorLatencia, ICorEditorConfig, ICorMontable } from '../core/cor_contratos';
import { UI_ATAJOS } from '../ui/ui_atajos';
import { ui_crearBoton } from '../ui/ui_boton';
import { ui_crearElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import { CfgSeccionAudio } from './cfg_seccionAudio';
import { CfgSeccionDeteccion } from './cfg_seccionDeteccion';
import { CfgSeccionLatencia } from './cfg_seccionLatencia';
import { CfgSeccionMezcla } from './cfg_seccionMezcla';
import { CfgSeccionMonitor } from './cfg_seccionMonitor';
import { CfgSeccionPractica } from './cfg_seccionPractica';
import { CfgSeccionRespaldo } from './cfg_seccionRespaldo';
import { CfgSeccionValidacion } from './cfg_seccionValidacion';
import { CfgSeccionVista } from './cfg_seccionVista';
import type { ICfgSeccion } from './cfg_tipos';

const crearPanelAtajos = (): HTMLElement => {
  const lista = ui_crearElemento('dl', 'cfg-atajos');
  for (const atajo of UI_ATAJOS) {
    const tecla = ui_crearElemento('dt');
    tecla.append(ui_crearElemento('kbd', [], atajo.etiquetaTecla));
    lista.append(tecla, ui_crearElemento('dd', [], atajo.descripcion));
  }
  const nota = ui_crearElemento('p', 'cfg-seccion__nota', 'Funcionan en la pantalla de práctica.');
  return ui_crearPanel('Atajos de teclado', [lista, nota]);
};

export class CfgPantalla implements ICorMontable {
  #bus: ICorBus;
  #secciones: readonly ICfgSeccion[];
  #raiz: HTMLElement | null = null;
  #desuscribir: (() => void) | null = null;

  constructor(bus: ICorBus, editor: ICorEditorConfig, calibrador: ICorCalibradorLatencia) {
    this.#bus = bus;
    this.#secciones = [
      new CfgSeccionAudio(editor, bus),
      new CfgSeccionLatencia(editor, bus, calibrador),
      new CfgSeccionDeteccion(editor, bus),
      new CfgSeccionValidacion(editor, bus),
      new CfgSeccionPractica(editor, bus),
      new CfgSeccionMezcla(editor, bus),
      new CfgSeccionMonitor(editor, bus),
      new CfgSeccionVista(editor, bus),
      new CfgSeccionRespaldo(editor, bus),
    ];
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.desmontar();
    const raiz = ui_crearElemento('div', 'ui-pantalla cfg-pantalla');
    this.#raiz = raiz;

    const cabecera = ui_crearElemento('header', 'cfg-pantalla__cabecera');
    cabecera.append(
      ui_crearBoton({
        texto: '← Menú',
        variante: 'fantasma',
        etiquetaAccesible: 'Volver al menú',
        alPulsar: () => {
          this.#bus.emitir('ui:pantalla', { pantalla: 'menu' });
        },
      }),
      ui_crearElemento('h1', 'cfg-pantalla__titulo', 'Configuración'),
      ui_crearElemento('p', 'cfg-pantalla__nota', 'Los cambios se aplican y se guardan al instante.'),
    );
    const rejilla = ui_crearElemento('div', 'cfg-pantalla__secciones');
    raiz.append(cabecera, rejilla);
    contenedor.append(raiz);

    for (const seccion of this.#secciones) seccion.montar(rejilla);
    rejilla.append(crearPanelAtajos());
    this.#desuscribir = this.#bus.suscribir('cfg:cambio', (cambio) => {
      for (const seccion of this.#secciones) seccion.actualizar(cambio.cfg);
    });
    return Promise.resolve();
  }

  desmontar(): void {
    this.#desuscribir?.();
    this.#desuscribir = null;
    for (const seccion of this.#secciones) seccion.desmontar();
    this.#raiz?.remove();
    this.#raiz = null;
  }
}

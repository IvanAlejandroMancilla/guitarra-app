/** Sección Vista: tipo de vista (2D, Guitar Hero, Rocksmith), calidad, velocidad de autopista, modo zurdo y notación. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IConfig, TCfgCalidad, TCfgNotacion, TCfgVista } from '../core/tipos';
import { ui_crearElemento } from '../ui/ui_dom';
import { UiInterruptor } from '../ui/ui_interruptor';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSelector } from '../ui/ui_selector';
import { UiSlider } from '../ui/ui_slider';
import type { IUiOpcion } from '../ui/ui_tipos';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

const CFG_OPCIONES_VISTA: readonly IUiOpcion<TCfgVista>[] = [
  { valor: '2d', etiqueta: 'Liviana (Canvas 2D)' },
  { valor: 'guitarHero', etiqueta: 'Autopista Guitar Hero (3D)' },
  { valor: 'rocksmith', etiqueta: 'Rocksmith (3D)' },
];

const CFG_OPCIONES_CALIDAD: readonly IUiOpcion<TCfgCalidad>[] = [
  { valor: 'baja', etiqueta: 'Baja (equipos modestos)' },
  { valor: 'media', etiqueta: 'Media' },
  { valor: 'alta', etiqueta: 'Alta' },
];

const CFG_OPCIONES_NOTACION: readonly IUiOpcion<TCfgNotacion>[] = [
  { valor: 'latina', etiqueta: 'Latina (Do, Re, Mi…)' },
  { valor: 'anglosajona', etiqueta: 'Anglosajona (C, D, E…)' },
];

/** Orígenes de `'cor:error'` relacionados con crear la vista. */
const CFG_ORIGENES_VISTA = ['app', 'v3d', 'vc2'];

interface ICfgControlesVista {
  vista: UiSelector<TCfgVista>;
  calidad: UiSelector<TCfgCalidad>;
  velocidad: UiSlider;
  zurdo: UiInterruptor;
  notacion: UiSelector<TCfgNotacion>;
}

export class CfgSeccionVista implements ICfgSeccion {
  readonly titulo = 'Vista';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #controles: ICfgControlesVista | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    const editor = this.#editor;
    const controles: ICfgControlesVista = {
      vista: new UiSelector<TCfgVista>({
        etiqueta: 'Tipo de vista',
        opciones: CFG_OPCIONES_VISTA,
        valor: cfg.vista,
        alCambiar: (vista) => editor.actualizarConfig({ vista }),
      }),
      calidad: new UiSelector<TCfgCalidad>({
        etiqueta: 'Calidad gráfica',
        opciones: CFG_OPCIONES_CALIDAD,
        valor: cfg.calidad,
        alCambiar: (calidad) => editor.actualizarConfig({ calidad }),
      }),
      velocidad: new UiSlider({
        etiqueta: 'Velocidad de la autopista',
        ...CFG_RANGOS.velocidadAutopista,
        valor: cfg.velocidadAutopista,
        formatear: (valor) => `×${valor.toFixed(1)}`,
        alCambiar: (velocidadAutopista) => editor.actualizarConfig({ velocidadAutopista }),
      }),
      zurdo: new UiInterruptor({
        etiqueta: 'Modo zurdo',
        descripcion: 'Invierte el orden de las cuerdas en pantalla.',
        esActivo: cfg.esZurdo,
        alCambiar: (esZurdo) => editor.actualizarConfig({ esZurdo }),
      }),
      notacion: new UiSelector<TCfgNotacion>({
        etiqueta: 'Notación',
        opciones: CFG_OPCIONES_NOTACION,
        valor: cfg.notacion,
        alCambiar: (notacion) => editor.actualizarConfig({ notacion }),
      }),
    };
    this.#controles = controles;

    const aviso = ui_crearElemento('p', 'cfg-seccion__aviso');
    aviso.setAttribute('role', 'status');
    aviso.hidden = true;
    this.#desuscripciones.push(
      this.#bus.suscribir('cor:error', (error) => {
        if (!CFG_ORIGENES_VISTA.includes(error.origen)) return;
        aviso.textContent = error.msj;
        aviso.hidden = false;
      }),
    );

    this.#panel = ui_crearPanel(this.titulo, [
      controles.vista.elem,
      controles.calidad.elem,
      controles.velocidad.elem,
      controles.zurdo.elem,
      controles.notacion.elem,
      aviso,
    ]);
    contenedor.append(this.#panel);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    const controles = this.#controles;
    if (controles === null) return;
    controles.vista.fijarValor(cfg.vista);
    controles.calidad.fijarValor(cfg.calidad);
    controles.velocidad.fijarValor(cfg.velocidadAutopista);
    controles.zurdo.fijarEstado(cfg.esZurdo);
    controles.notacion.fijarValor(cfg.notacion);
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#panel?.remove();
    this.#panel = null;
    this.#controles = null;
  }
}

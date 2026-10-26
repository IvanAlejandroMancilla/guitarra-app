/** Pantalla del afinador: elegir afinación y montar la vista de afinador recibida. */
import type { ICorBus, ICorEditorConfig, ICorMontable, ICorOpcionesVista, ICorVista } from '../core/cor_contratos';
import type { IConfig, TIdAfinacion } from '../core/tipos';
import { ui_crearBoton } from './ui_boton';
import { ui_crearElemento } from './ui_dom';
import { UiSelector } from './ui_selector';
import type { IUiOpcion } from './ui_tipos';

const UI_AFINACIONES: readonly IUiOpcion<TIdAfinacion>[] = [
  { valor: 'estandar', etiqueta: 'Estándar (Mi La Re Sol Si Mi)' },
  { valor: 'dropD', etiqueta: 'Drop D (Re La Re Sol Si Mi)' },
  { valor: 'medioTonoAbajo', etiqueta: 'Medio tono abajo (Mi♭ La♭ Re♭ Sol♭ Si♭ Mi♭)' },
  { valor: 'dropC', etiqueta: 'Drop C (Do Sol Do Fa La Re)' },
  { valor: 'dadgad', etiqueta: 'DADGAD (Re La Re Sol La Re)' },
  { valor: 'openG', etiqueta: 'Open G (Re Sol Re Sol Si Re)' },
];

const crearOpcionesVista = (cfg: Readonly<IConfig>): ICorOpcionesVista => ({
  esZurdo: cfg.esZurdo,
  notacion: cfg.notacion,
  velocidadAutopista: cfg.velocidadAutopista,
  calidad: cfg.calidad,
});

/**
 * PROPUESTO (firma): se agrega `bus` como primer parámetro (para "Volver al menú" y para seguir
 * `'cfg:cambio'`). Contrato original: `(editor, vistaAfinador)`.
 */
export class UiPantallaAfinador implements ICorMontable {
  #bus: ICorBus;
  #editor: ICorEditorConfig;
  #vista: ICorVista;
  #raiz: HTMLElement | null = null;
  #observador: ResizeObserver | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(bus: ICorBus, editor: ICorEditorConfig, vistaAfinador: ICorVista) {
    this.#bus = bus;
    this.#editor = editor;
    this.#vista = vistaAfinador;
  }

  async montar(contenedor: HTMLElement): Promise<void> {
    this.desmontar();
    const raiz = ui_crearElemento('div', 'ui-pantalla ui-afinador');
    this.#raiz = raiz;
    const cfg = this.#editor.obtenerConfig();

    const cabecera = ui_crearElemento('header', 'ui-afinador__cabecera');
    const volver = ui_crearBoton({
      texto: '← Menú',
      variante: 'fantasma',
      etiquetaAccesible: 'Volver al menú',
      alPulsar: () => {
        this.#bus.emitir('ui:pantalla', { pantalla: 'menu' });
      },
    });
    const selector = new UiSelector<TIdAfinacion>({
      etiqueta: 'Afinación',
      opciones: UI_AFINACIONES,
      valor: cfg.idAfinacion,
      alCambiar: (idAfinacion) => {
        this.#editor.actualizarConfig({ idAfinacion });
      },
    });
    const ayuda = ui_crearElemento(
      'p',
      'ui-afinador__ayuda',
      `Toca una cuerda al aire y ajusta hasta que la aguja quede centrada. Referencia: La4 = ${cfg.frecA4Hz} Hz.`,
    );
    cabecera.append(volver, ui_crearElemento('h1', 'ui-afinador__titulo', 'Afinador'), selector.elem);

    const contenedorVista = ui_crearElemento('div', 'ui-afinador__vista');
    raiz.append(cabecera, ayuda, contenedorVista);
    contenedor.append(raiz);

    this.#desuscripciones.push(
      this.#bus.suscribir('cfg:cambio', (cambio) => {
        if (cambio.claves.includes('idAfinacion')) selector.fijarValor(cambio.cfg.idAfinacion);
        if (cambio.claves.includes('frecA4Hz')) {
          ayuda.textContent = `Toca una cuerda al aire y ajusta hasta que la aguja quede centrada. Referencia: La4 = ${cambio.cfg.frecA4Hz} Hz.`;
        }
        this.#vista.actualizarOpciones(crearOpcionesVista(cambio.cfg));
      }),
    );

    await this.#vista.montar(contenedorVista);
    if (this.#raiz !== raiz) return; // Se desmontó mientras la vista se montaba.
    this.#vista.actualizarOpciones(crearOpcionesVista(this.#editor.obtenerConfig()));
    this.#observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja !== undefined) this.#vista.redimensionar(Math.floor(caja.width), Math.floor(caja.height));
    });
    this.#observador.observe(contenedorVista);
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#observador?.disconnect();
    this.#observador = null;
    if (this.#raiz !== null) {
      this.#vista.desmontar();
      this.#raiz.remove();
      this.#raiz = null;
    }
  }
}

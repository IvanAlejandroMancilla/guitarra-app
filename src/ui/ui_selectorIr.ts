/** Selector de IR de gabinete: elegir un IR guardado o cargar un .wav nuevo (lo procesa efx vía `'ui:archivoIr'`). */
import type { ICorBus } from '../core/cor_contratos';
import type { IEfxIrResumen } from '../core/cor_eventos';
import { ui_elegirArchivo } from './ui_archivos';
import { ui_crearBoton } from './ui_boton';
import { ui_crearElemento } from './ui_dom';
import { UiSelector } from './ui_selector';
import type { IUiOpcion } from './ui_tipos';

const UI_EXTENSIONES_IR = '.wav,audio/wav,audio/x-wav,audio/wave';

const crearOpcionesIr = (irs: readonly IEfxIrResumen[]): IUiOpcion<string | null>[] => [
  { valor: null, etiqueta: irs.length === 0 ? 'Sin IR cargados' : 'Ninguno' },
  ...irs.map((ir) => ({ valor: ir.id, etiqueta: `${ir.nombre} (${ir.durSeg.toFixed(2)} s)` })),
];

export class UiSelectorIr {
  readonly elem: HTMLElement;
  #selector: UiSelector<string | null>;
  #irs: readonly IEfxIrResumen[] = [];
  #idIr: string | null = null;
  #desuscripciones: (() => void)[];

  constructor(bus: ICorBus, alElegir: (idIr: string | null) => void) {
    this.elem = ui_crearElemento('div', 'ui-selector-ir');
    this.#selector = new UiSelector<string | null>({
      etiqueta: 'Respuesta al impulso (IR)',
      opciones: crearOpcionesIr([]),
      valor: null,
      alCambiar: (idIr) => {
        this.#idIr = idIr;
        alElegir(idIr);
      },
    });
    const msj = ui_crearElemento('p', 'ui-selector-ir__msj');
    msj.setAttribute('role', 'status');
    const cargar = ui_crearBoton({
      texto: 'Cargar IR (.wav)',
      titulo: 'Archivo .wav corto (hasta 5 s) con la respuesta al impulso de un gabinete.',
      alPulsar: () => {
        void ui_elegirArchivo(UI_EXTENSIONES_IR).then((archivo) => {
          if (archivo === null) return;
          msj.textContent = `Cargando "${archivo.name}"…`;
          bus.emitir('ui:archivoIr', { archivo });
        });
      },
    });
    this.elem.append(this.#selector.elem, cargar, msj);

    const mostrarIrs = (irs: readonly IEfxIrResumen[]): void => {
      this.#irs = irs;
      this.#selector.fijarOpciones(crearOpcionesIr(irs), this.#idIr);
    };
    mostrarIrs(bus.obtenerUltimo('efx:irs')?.irs ?? []);
    this.#desuscripciones = [
      bus.suscribir('efx:irs', (lista) => {
        mostrarIrs(lista.irs);
      }),
      bus.suscribir('efx:irCargado', ({ ir }) => {
        msj.textContent = `IR "${ir.nombre}" cargado.`;
        if (!this.#irs.some((irAct) => irAct.id === ir.id)) mostrarIrs([...this.#irs, ir]);
        // Recién cargado: se usa en el gabinete.
        this.fijarIdIr(ir.id);
        alElegir(ir.id);
      }),
      bus.suscribir('cor:error', (error) => {
        if (error.origen === 'efx' && msj.textContent.startsWith('Cargando')) msj.textContent = '';
      }),
    ];
  }

  /** Selecciona `idIr` sin llamar a `alElegir`. */
  fijarIdIr(idIr: string | null): void {
    this.#idIr = idIr;
    this.#selector.fijarValor(idIr);
  }

  liberar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
  }
}

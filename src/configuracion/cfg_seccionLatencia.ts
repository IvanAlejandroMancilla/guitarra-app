/** Sección Latencia: latencias de entrada/salida y acceso al asistente de calibración. */
import type { ICorBus, ICorCalibradorLatencia, ICorEditorConfig } from '../core/cor_contratos';
import type { IAudEstado } from '../core/cor_eventos';
import type { IConfig } from '../core/tipos';
import { ui_crearBoton } from '../ui/ui_boton';
import { ui_crearElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSlider } from '../ui/ui_slider';
import { CfgAsistenteLatencia } from './cfg_asistenteLatencia';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

export class CfgSeccionLatencia implements ICfgSeccion {
  readonly titulo = 'Latencia';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #asistente: CfgAsistenteLatencia;
  #panel: HTMLElement | null = null;
  #latEntrada: UiSlider | null = null;
  #latSalida: UiSlider | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus, calibrador: ICorCalibradorLatencia) {
    this.#editor = editor;
    this.#bus = bus;
    this.#asistente = new CfgAsistenteLatencia(calibrador, editor);
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    this.#latEntrada = new UiSlider({
      etiqueta: 'Latencia de entrada',
      ...CFG_RANGOS.latEntradaMs,
      valor: cfg.latEntradaMs,
      unidad: 'ms',
      alCambiar: (latEntradaMs) => {
        this.#editor.actualizarConfig({ latEntradaMs });
      },
    });
    this.#latSalida = new UiSlider({
      etiqueta: 'Latencia de salida',
      ...CFG_RANGOS.latSalidaMs,
      valor: cfg.latSalidaMs,
      unidad: 'ms',
      alCambiar: (latSalidaMs) => {
        this.#editor.actualizarConfig({ latSalidaMs });
      },
    });
    const ayuda = ui_crearElemento(
      'p',
      'cfg-seccion__nota',
      'Entrada: retraso de la captura (se resta a cada nota detectada). Salida: retraso con que oyes el metrónomo y el acompañamiento.',
    );
    const aviso = ui_crearElemento('p', 'cfg-seccion__nota');
    aviso.setAttribute('role', 'status');
    const calibrar = ui_crearBoton({
      texto: 'Calibrar latencia…',
      variante: 'primario',
      alPulsar: () => {
        if (this.#panel !== null) void this.#asistente.montar(this.#panel);
      },
    });
    const mostrarEstado = (estado: IAudEstado): void => {
      const esActivo = estado.estado === 'activo';
      calibrar.disabled = !esActivo;
      aviso.textContent = esActivo ? '' : 'Activa la guitarra desde el menú para poder calibrar.';
    };
    mostrarEstado(this.#bus.obtenerUltimo('aud:estado') ?? { estado: 'inactivo', idDisp: '', msjError: null });
    this.#desuscripciones.push(this.#bus.suscribir('aud:estado', mostrarEstado));

    this.#panel = ui_crearPanel(this.titulo, [this.#latEntrada.elem, this.#latSalida.elem, ayuda, calibrar, aviso]);
    contenedor.append(this.#panel);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    this.#latEntrada?.fijarValor(cfg.latEntradaMs);
    this.#latSalida?.fijarValor(cfg.latSalidaMs);
  }

  desmontar(): void {
    this.#asistente.desmontar();
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#panel?.remove();
    this.#panel = null;
    this.#latEntrada = null;
    this.#latSalida = null;
  }
}

/** Sección Mezcla: volumen del metrónomo, del acompañamiento y de cada pista (estado de `acp`). */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IAcpMezcla, IAcpMezclaPista } from '../core/cor_eventos';
import type { IConfig } from '../core/tipos';
import { ui_crearElemento, ui_vaciarElemento } from '../ui/ui_dom';
import { UiInterruptor } from '../ui/ui_interruptor';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSlider } from '../ui/ui_slider';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

interface ICfgControlesPista {
  vol: UiSlider;
  solo: UiInterruptor;
  mute: UiInterruptor;
  /** Última mezcla conocida de la pista (base para el próximo `'cfg:mezclaPista'`). */
  mezcla: IAcpMezclaPista;
}

const formatearPct = (valor: number): string => `${Math.round(valor * 100)} %`;

export class CfgSeccionMezcla implements ICfgSeccion {
  readonly titulo = 'Mezcla';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #volMetronomo: UiSlider | null = null;
  #volAcp: UiSlider | null = null;
  #listaPistas: HTMLElement | null = null;
  #pistas = new Map<number, ICfgControlesPista>();
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    this.#volMetronomo = new UiSlider({
      etiqueta: 'Volumen del metrónomo',
      ...CFG_RANGOS.volMetronomo,
      valor: cfg.volMetronomo,
      formatear: formatearPct,
      alCambiar: (volMetronomo) => {
        this.#editor.actualizarConfig({ volMetronomo });
      },
    });
    this.#volAcp = new UiSlider({
      etiqueta: 'Volumen del acompañamiento',
      ...CFG_RANGOS.volAcp,
      valor: cfg.volAcp,
      formatear: formatearPct,
      alCambiar: (volAcp) => {
        this.#editor.actualizarConfig({ volAcp });
      },
    });
    this.#listaPistas = ui_crearElemento('div', 'cfg-mezcla__pistas');
    const tituloPistas = ui_crearElemento('h3', 'cfg-seccion__subtitulo', 'Pistas de la canción');

    const mezcla = this.#bus.obtenerUltimo('acp:mezcla');
    this.#mostrarMezcla(mezcla ?? { pistas: [], idxPstGuitarra: -1 });
    this.#desuscripciones.push(
      this.#bus.suscribir('acp:mezcla', (mezclaSig) => {
        this.#mostrarMezcla(mezclaSig);
      }),
    );

    this.#panel = ui_crearPanel(this.titulo, [this.#volMetronomo.elem, this.#volAcp.elem, tituloPistas, this.#listaPistas]);
    contenedor.append(this.#panel);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    this.#volMetronomo?.fijarValor(cfg.volMetronomo);
    this.#volAcp?.fijarValor(cfg.volAcp);
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#pistas.clear();
    this.#panel?.remove();
    this.#panel = null;
    this.#volMetronomo = null;
    this.#volAcp = null;
    this.#listaPistas = null;
  }

  /** Si las pistas son las mismas solo actualiza valores (no corta un arrastre en curso); si no, reconstruye. */
  #mostrarMezcla(mezcla: IAcpMezcla): void {
    const esMismaLista =
      mezcla.pistas.length === this.#pistas.size && mezcla.pistas.every((pista) => this.#pistas.has(pista.idxPst));
    if (esMismaLista && mezcla.pistas.length > 0) {
      for (const pista of mezcla.pistas) {
        const controles = this.#pistas.get(pista.idxPst);
        if (controles === undefined) continue;
        controles.mezcla = { ...pista };
        controles.vol.fijarValor(pista.vol);
        controles.solo.fijarEstado(pista.esSolo);
        controles.mute.fijarEstado(pista.esMute);
      }
      return;
    }
    this.#reconstruirPistas(mezcla);
  }

  #reconstruirPistas(mezcla: IAcpMezcla): void {
    const lista = this.#listaPistas;
    if (lista === null) return;
    ui_vaciarElemento(lista);
    this.#pistas.clear();
    if (mezcla.pistas.length === 0) {
      lista.append(ui_crearElemento('p', 'cfg-seccion__nota', 'Abre una canción Guitar Pro para ajustar el volumen de cada pista.'));
      return;
    }
    const pistasGpr = this.#bus.obtenerUltimo('gpr:cargado')?.pistas ?? [];
    for (const pista of mezcla.pistas) {
      const nombre = pistasGpr.find((pistaGpr) => pistaGpr.idx === pista.idxPst)?.nombre ?? '';
      const esGuitarra = pista.idxPst === mezcla.idxPstGuitarra;
      const titulo = `${pista.idxPst + 1}. ${nombre === '' ? 'Pista' : nombre}${esGuitarra ? ' (tu guitarra)' : ''}`;
      const controles = this.#crearControlesPista(pista, titulo);
      this.#pistas.set(pista.idxPst, controles);
      const fila = ui_crearElemento('fieldset', 'cfg-mezcla__pista');
      fila.append(ui_crearElemento('legend', 'cfg-mezcla__nombre', titulo), controles.vol.elem, controles.solo.elem, controles.mute.elem);
      lista.append(fila);
    }
  }

  #crearControlesPista(pista: IAcpMezclaPista, titulo: string): ICfgControlesPista {
    const emitir = (parcial: Partial<IAcpMezclaPista>): void => {
      const controlesAct = this.#pistas.get(pista.idxPst);
      if (controlesAct === undefined) return;
      controlesAct.mezcla = { ...controlesAct.mezcla, ...parcial, idxPst: pista.idxPst };
      this.#bus.emitir('cfg:mezclaPista', { ...controlesAct.mezcla });
    };
    return {
      vol: new UiSlider({
        etiqueta: `Volumen de ${titulo}`,
        min: 0,
        max: 1,
        paso: 0.01,
        valor: pista.vol,
        formatear: formatearPct,
        alCambiar: (vol) => emitir({ vol }),
      }),
      solo: new UiInterruptor({ etiqueta: 'Solo', esActivo: pista.esSolo, alCambiar: (esSolo) => emitir({ esSolo }) }),
      mute: new UiInterruptor({ etiqueta: 'Silenciar', esActivo: pista.esMute, alCambiar: (esMute) => emitir({ esMute }) }),
      mezcla: { ...pista },
    };
  }
}

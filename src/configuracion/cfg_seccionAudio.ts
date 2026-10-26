/** Sección Audio: dispositivo de entrada, ganancia y medidor de nivel en vivo. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IAudDispositivo, IAudEstado, IAudNivel } from '../core/cor_eventos';
import type { IConfig } from '../core/tipos';
import { ui_crearElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import { UiSelector } from '../ui/ui_selector';
import { UiSlider } from '../ui/ui_slider';
import type { IUiOpcion } from '../ui/ui_tipos';
import { CFG_RANGOS } from './cfg_rangos';
import type { ICfgSeccion } from './cfg_tipos';

/** Rango visible del medidor en dBFS. */
const CFG_DB_MIN_MEDIDOR = -60;

const CFG_TEXTOS_ESTADO: Readonly<Record<IAudEstado['estado'], string>> = {
  inactivo: 'Audio inactivo: pulsa "Activar guitarra" en el menú.',
  solicitando: 'Solicitando permiso de micrófono…',
  activo: 'Capturando audio.',
  denegado: 'Permiso de micrófono denegado.',
  error: 'Error de audio.',
};

const crearOpcionesDisp = (disps: readonly IAudDispositivo[], idAct: string): IUiOpcion<string>[] => {
  const opciones: IUiOpcion<string>[] = [{ valor: '', etiqueta: 'Predeterminado del sistema' }];
  disps.forEach((disp, idx) => {
    if (disp.id === '' || disp.id === 'default') return;
    const etiqueta = disp.etiqueta === '' ? `Entrada ${idx + 1} (activa la guitarra para ver el nombre)` : disp.etiqueta;
    opciones.push({ valor: disp.id, etiqueta });
  });
  if (idAct !== '' && !opciones.some((opcion) => opcion.valor === idAct)) {
    opciones.push({ valor: idAct, etiqueta: 'Dispositivo guardado (no conectado)' });
  }
  return opciones;
};

const convertirDbARel = (db: number): number =>
  Math.min(1, Math.max(0, (db - CFG_DB_MIN_MEDIDOR) / -CFG_DB_MIN_MEDIDOR));

export class CfgSeccionAudio implements ICfgSeccion {
  readonly titulo = 'Audio';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #selDisp: UiSelector<string> | null = null;
  #ganancia: UiSlider | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const cfg = this.#editor.obtenerConfig();
    const disps = this.#bus.obtenerUltimo('aud:dispositivos')?.disps ?? [];

    const selDisp = new UiSelector<string>({
      etiqueta: 'Dispositivo de entrada',
      opciones: crearOpcionesDisp(disps, cfg.idDispEntrada),
      valor: cfg.idDispEntrada,
      alCambiar: (idDispEntrada) => {
        this.#editor.actualizarConfig({ idDispEntrada });
      },
    });
    const rango = CFG_RANGOS.ganEntrada;
    const ganancia = new UiSlider({
      etiqueta: 'Ganancia de entrada',
      ...rango,
      valor: cfg.ganEntrada,
      formatear: (valor) => `×${valor.toFixed(2)}`,
      alCambiar: (ganEntrada) => {
        this.#editor.actualizarConfig({ ganEntrada });
      },
    });
    this.#selDisp = selDisp;
    this.#ganancia = ganancia;

    const medidor = ui_crearElemento('div', 'cfg-medidor');
    medidor.setAttribute('role', 'meter');
    medidor.setAttribute('aria-label', 'Nivel de entrada');
    medidor.setAttribute('aria-valuemin', String(CFG_DB_MIN_MEDIDOR));
    medidor.setAttribute('aria-valuemax', '0');
    const barra = ui_crearElemento('div', 'cfg-medidor__barra');
    const pico = ui_crearElemento('div', 'cfg-medidor__pico');
    medidor.append(barra, pico);
    const textoNivel = ui_crearElemento('p', 'cfg-medidor__texto', 'Sin señal');
    const estado = ui_crearElemento('p', 'cfg-seccion__nota');
    estado.setAttribute('role', 'status');
    const salida = ui_crearElemento(
      'p',
      'cfg-seccion__nota',
      'Salida: se usa el dispositivo de audio predeterminado del sistema (cámbialo desde el sistema operativo).',
    );

    const mostrarNivel = (nivel: IAudNivel): void => {
      const db = Math.max(CFG_DB_MIN_MEDIDOR, nivel.rmsDb);
      barra.style.transform = `scaleX(${convertirDbARel(nivel.rmsDb)})`;
      pico.style.left = `${convertirDbARel(nivel.picoDb) * 100}%`;
      medidor.classList.toggle('cfg-medidor--saturado', nivel.esSaturado);
      medidor.setAttribute('aria-valuenow', db.toFixed(0));
      medidor.setAttribute('aria-valuetext', `${db.toFixed(0)} dB`);
      textoNivel.textContent = nivel.esSaturado
        ? `¡Saturación! Baja la ganancia (${db.toFixed(0)} dB).`
        : `${db.toFixed(0)} dB`;
    };
    const mostrarEstado = (estadoAud: IAudEstado): void => {
      estado.textContent = estadoAud.msjError ?? CFG_TEXTOS_ESTADO[estadoAud.estado];
    };
    const estadoAct = this.#bus.obtenerUltimo('aud:estado');
    mostrarEstado(estadoAct ?? { estado: 'inactivo', idDisp: '', msjError: null });

    this.#desuscripciones.push(
      this.#bus.suscribir('aud:nivel', mostrarNivel),
      this.#bus.suscribir('aud:estado', mostrarEstado),
      this.#bus.suscribir('aud:dispositivos', (lista) => {
        const idAct = this.#editor.obtenerConfig().idDispEntrada;
        selDisp.fijarOpciones(crearOpcionesDisp(lista.disps, idAct), idAct);
      }),
    );

    this.#panel = ui_crearPanel(this.titulo, [selDisp.elem, ganancia.elem, medidor, textoNivel, estado, salida]);
    contenedor.append(this.#panel);
  }

  actualizar(cfg: Readonly<IConfig>): void {
    this.#selDisp?.fijarValor(cfg.idDispEntrada);
    this.#ganancia?.fijarValor(cfg.ganEntrada);
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#panel?.remove();
    this.#panel = null;
    this.#selDisp = null;
    this.#ganancia = null;
  }
}

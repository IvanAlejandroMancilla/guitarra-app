/**
 * Bloque de la pedalera del mezclador: encendido, selector de modelo y una perilla por parámetro.
 * Solo muestra y edita el estado: quien lo usa decide qué hacer con el estado nuevo (`alCambiar`).
 */
import type { IEfxBloques, TEfxIdBloque } from '../core/cor_efectos';
import { ui_crearElemento } from './ui_dom';
import { UiSelector } from './ui_selector';
import type { IUiDescriptorBloqueEfx, IUiDescriptorParametroEfx } from './ui_tipos';

/** Recorrido angular de la perilla (grados, simétrico respecto de las 12). */
const UI_GIRO_MAX_PERILLA = 135;
/** Píxeles de arrastre vertical para recorrer la perilla entera. */
const UI_PX_RECORRIDO_PERILLA = 160;
/** Paso de las perillas (los parámetros están normalizados 0..1). */
const UI_PASO_PERILLA = 0.01;

interface IUiPerilla {
  elem: HTMLElement;
  entrada: HTMLInputElement;
  fijarValor: (valor: number) => void;
}

const acotarRel = (valor: number): number => Math.min(1, Math.max(0, valor));

const redondearPaso = (valor: number): number => Number((Math.round(acotarRel(valor) / UI_PASO_PERILLA) * UI_PASO_PERILLA).toFixed(2));

/** Escala de amplificador 0–10 con un decimal. */
const formatearPerilla = (valor: number): string => (valor * 10).toFixed(1);

/**
 * Perilla: `input type="range"` nativo (teclado y lectores de pantalla) visualmente oculto,
 * más un dial que se arrastra en vertical (arriba = más). La rueda del ratón no se usa para no robar el desplazamiento.
 */
const crearPerilla = (etiqueta: string, nombreAccesible: string, alCambiar: (valor: number) => void): IUiPerilla => {
  const elem = ui_crearElemento('div', 'ui-perilla');
  const entrada = ui_crearElemento('input', 'ui-perilla__entrada');
  entrada.type = 'range';
  entrada.min = '0';
  entrada.max = '1';
  entrada.step = String(UI_PASO_PERILLA);
  entrada.setAttribute('aria-label', nombreAccesible);
  const dial = ui_crearElemento('div', 'ui-perilla__dial');
  dial.setAttribute('aria-hidden', 'true');
  dial.append(ui_crearElemento('span', 'ui-perilla__marca'));
  const cuerpo = ui_crearElemento('div', 'ui-perilla__cuerpo');
  cuerpo.append(entrada, dial);
  const valorVisible = ui_crearElemento('span', 'ui-perilla__valor');
  valorVisible.setAttribute('aria-hidden', 'true');
  elem.append(cuerpo, ui_crearElemento('span', 'ui-perilla__etiqueta', etiqueta), valorVisible);

  const mostrar = (valor: number): void => {
    const texto = formatearPerilla(valor);
    dial.style.setProperty('--ui-giro', `${(valor * 2 - 1) * UI_GIRO_MAX_PERILLA}deg`);
    dial.style.setProperty('--ui-relleno', `${valor * 100}%`);
    valorVisible.textContent = texto;
    entrada.setAttribute('aria-valuetext', `${texto} de 10`);
  };
  const fijarValor = (valor: number): void => {
    const acotado = acotarRel(valor);
    if (entrada.valueAsNumber !== acotado) entrada.value = String(acotado);
    mostrar(acotado);
  };
  const aplicar = (valor: number): void => {
    const valorSig = redondearPaso(valor);
    if (valorSig === entrada.valueAsNumber) return;
    fijarValor(valorSig);
    alCambiar(valorSig);
  };

  entrada.addEventListener('input', () => {
    mostrar(entrada.valueAsNumber);
    alCambiar(entrada.valueAsNumber);
  });

  let yIni = 0;
  let valorIni = 0;
  let idPuntero: number | null = null;
  cuerpo.addEventListener('pointerdown', (evento) => {
    if (entrada.disabled || evento.button !== 0) return;
    evento.preventDefault();
    entrada.focus({ preventScroll: true });
    idPuntero = evento.pointerId;
    yIni = evento.clientY;
    valorIni = entrada.valueAsNumber;
    cuerpo.setPointerCapture(evento.pointerId);
    elem.classList.add('ui-perilla--arrastrando');
  });
  cuerpo.addEventListener('pointermove', (evento) => {
    if (evento.pointerId !== idPuntero) return;
    // Con Mayús el ajuste es fino (4 veces más lento).
    const factor = evento.shiftKey ? 4 : 1;
    aplicar(valorIni + (yIni - evento.clientY) / (UI_PX_RECORRIDO_PERILLA * factor));
  });
  const soltar = (evento: PointerEvent): void => {
    if (evento.pointerId !== idPuntero) return;
    idPuntero = null;
    elem.classList.remove('ui-perilla--arrastrando');
  };
  cuerpo.addEventListener('pointerup', soltar);
  cuerpo.addEventListener('pointercancel', soltar);

  fijarValor(0.5);
  return { elem, entrada, fijarValor };
};

const validarParametroVisible = (param: IUiDescriptorParametroEfx<string>, modelo: string): boolean =>
  param.modelos === undefined || param.modelos.includes(modelo);

export class UiBloqueEfecto<TId extends TEfxIdBloque> {
  readonly elem: HTMLElement;
  #descriptor: IUiDescriptorBloqueEfx<TId>;
  #alCambiar: (estado: IEfxBloques[TId]) => void;
  #estado: IEfxBloques[TId] | null = null;
  #botonEncendido: HTMLButtonElement;
  #selModelo: UiSelector<IEfxBloques[TId]['modelo']>;
  #perillas = new Map<string, IUiPerilla>();

  constructor(descriptor: IUiDescriptorBloqueEfx<TId>, alCambiar: (estado: IEfxBloques[TId]) => void) {
    this.#descriptor = descriptor;
    this.#alCambiar = alCambiar;
    this.elem = ui_crearElemento('section', ['ui-bloque-efx', `ui-bloque-efx--${descriptor.id}`, 'ui-bloque-efx--apagado']);
    this.elem.setAttribute('aria-label', descriptor.titulo);

    const cabecera = ui_crearElemento('header', 'ui-bloque-efx__cabecera');
    this.#botonEncendido = ui_crearElemento('button', 'ui-bloque-efx__encendido');
    this.#botonEncendido.type = 'button';
    this.#botonEncendido.setAttribute('aria-label', `Encender ${descriptor.titulo}`);
    this.#botonEncendido.setAttribute('aria-pressed', 'false');
    this.#botonEncendido.append(ui_crearElemento('span', 'ui-bloque-efx__led'), ui_crearElemento('span', 'ui-bloque-efx__textoEncendido', 'OFF'));
    this.#botonEncendido.addEventListener('click', () => {
      const estado = this.#estado;
      if (estado !== null) this.#emitir({ ...estado, esActivo: !estado.esActivo });
    });
    cabecera.append(ui_crearElemento('h3', 'ui-bloque-efx__titulo', descriptor.titulo), this.#botonEncendido);

    const modeloIni = descriptor.modelos[0];
    if (modeloIni === undefined) throw new Error(`El bloque "${descriptor.id}" no tiene modelos.`);
    this.#selModelo = new UiSelector<IEfxBloques[TId]['modelo']>({
      etiqueta: 'Modelo',
      opciones: descriptor.modelos,
      valor: modeloIni.valor,
      alCambiar: (modelo) => {
        const estado = this.#estado;
        if (estado !== null) this.#emitir({ ...estado, modelo });
      },
    });
    this.#selModelo.elem.classList.add('ui-bloque-efx__modelo');
    this.#selModelo.elem.hidden = descriptor.modelos.length < 2;

    const perillas = ui_crearElemento('div', 'ui-bloque-efx__perillas');
    for (const param of descriptor.parametros) {
      const perilla = crearPerilla(param.etiqueta, `${descriptor.titulo}: ${param.etiqueta}`, (valor) => {
        const estado = this.#estado;
        if (estado === null) return;
        this.#emitir({ ...estado, parametros: { ...estado.parametros, [param.clave]: valor } });
      });
      this.#perillas.set(param.clave, perilla);
      perillas.append(perilla.elem);
    }

    this.elem.append(cabecera, this.#selModelo.elem, perillas);
    this.#fijarHabilitado(false);
  }

  /** Refleja `estado` sin llamar a `alCambiar`. */
  fijarEstado(estado: Readonly<IEfxBloques[TId]>): void {
    // Readonly<T> → T: el bloque nunca muta el estado recibido (cada edición crea una copia) y
    // TypeScript no relaciona Readonly<IEfxBloques[TId]> con IEfxBloques[TId] cuando TId es genérico.
    this.#estado = estado as IEfxBloques[TId];
    this.#fijarHabilitado(true);
    this.#botonEncendido.setAttribute('aria-pressed', String(estado.esActivo));
    const textoEncendido = this.#botonEncendido.querySelector('.ui-bloque-efx__textoEncendido');
    if (textoEncendido !== null) textoEncendido.textContent = estado.esActivo ? 'ON' : 'OFF';
    this.elem.classList.toggle('ui-bloque-efx--apagado', !estado.esActivo);
    this.elem.dataset['modelo'] = estado.modelo;
    this.#selModelo.fijarValor(estado.modelo);
    for (const param of this.#descriptor.parametros) {
      const perilla = this.#perillas.get(param.clave);
      if (perilla === undefined) continue;
      const valor: unknown = estado.parametros[param.clave];
      if (typeof valor === 'number') perilla.fijarValor(valor);
      perilla.elem.hidden = !validarParametroVisible(param, estado.modelo);
    }
  }

  #emitir(estado: IEfxBloques[TId]): void {
    // Se refleja de inmediato: varias ediciones seguidas se apoyan en el último estado aunque el eco del bus tarde.
    this.fijarEstado(estado);
    this.#alCambiar(estado);
  }

  #fijarHabilitado(esHabilitado: boolean): void {
    this.#botonEncendido.disabled = !esHabilitado;
    const selector = this.#selModelo.elem.querySelector('select');
    if (selector !== null) selector.disabled = !esHabilitado;
    for (const perilla of this.#perillas.values()) perilla.entrada.disabled = !esHabilitado;
  }
}

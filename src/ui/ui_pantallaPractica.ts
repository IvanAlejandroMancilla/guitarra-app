/**
 * Pantalla de práctica. Cabe entera en la ventana (100dvh) sin desplazamiento:
 * cabecera / cuerpo (vista que ocupa el resto + lateral con marcador y medidor) / franja del mástil / transporte.
 */
import type { ICorBus, ICorMontable } from '../core/cor_contratos';
import type { IAcpEstado, IEjrCargado } from '../core/cor_eventos';
import { ui_crearBoton } from './ui_boton';
import { ui_crearElemento } from './ui_dom';
import type { UiMarcador } from './ui_marcador';
import type { UiMedidorCoincidencia } from './ui_medidorCoincidencia';
import type { UiPanelPistas } from './ui_panelPistas';
import type { UiBarraTransporte } from './ui_transporte';

export class UiPantallaPractica implements ICorMontable {
  #bus: ICorBus;
  #transporte: UiBarraTransporte;
  #marcador: UiMarcador;
  #panelPistas: UiPanelPistas;
  #medidor: UiMedidorCoincidencia;
  #contenedorVista: HTMLElement;
  #contenedorMastil: HTMLElement;
  #raiz: HTMLElement | null = null;
  #desuscripciones: (() => void)[] = [];

  constructor(
    bus: ICorBus,
    transporte: UiBarraTransporte,
    marcador: UiMarcador,
    panelPistas: UiPanelPistas,
    medidor: UiMedidorCoincidencia,
  ) {
    this.#bus = bus;
    this.#transporte = transporte;
    this.#marcador = marcador;
    this.#panelPistas = panelPistas;
    this.#medidor = medidor;
    this.#contenedorVista = ui_crearElemento('div', 'ui-practica__vista');
    this.#contenedorMastil = ui_crearElemento('div', 'ui-practica__mastil');
    this.#contenedorMastil.setAttribute('role', 'region');
    this.#contenedorMastil.setAttribute('aria-label', 'Mástil con la digitación');
  }

  /**
   * Elemento donde `main.ts` monta la `ICorVista` activa. Existe desde la construcción y se
   * reutiliza en cada montaje; mide su tamaño con `ResizeObserver` para llamar a `redimensionar`.
   */
  obtenerContenedorVista(): HTMLElement {
    return this.#contenedorVista;
  }

  /** Franja bajo la vista donde `main.ts` monta el mástil con dedeo. Persistente, igual que el de la vista. */
  obtenerContenedorMastil(): HTMLElement {
    return this.#contenedorMastil;
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.desmontar();
    const raiz = ui_crearElemento('div', 'ui-pantalla ui-practica');
    this.#raiz = raiz;

    const cabecera = ui_crearElemento('header', 'ui-practica__cabecera');
    const volver = ui_crearBoton({
      texto: '← Menú',
      variante: 'fantasma',
      etiquetaAccesible: 'Volver al menú',
      alPulsar: () => {
        this.#bus.emitir('ui:transporte', { accion: 'pausar' });
        this.#bus.emitir('ui:pantalla', { pantalla: 'menu' });
      },
    });
    const titulo = ui_crearElemento('h1', 'ui-practica__titulo', 'Cargando…');
    const estadoAcp = ui_crearElemento('p', 'ui-practica__estado');
    estadoAcp.setAttribute('role', 'status');
    const mezclador = ui_crearBoton({
      texto: 'Mezclador',
      titulo: 'Amplificador, efectos y monitoreo',
      alPulsar: () => {
        this.#bus.emitir('ui:transporte', { accion: 'pausar' });
        this.#bus.emitir('ui:pantalla', { pantalla: 'mezclador' });
      },
    });
    mezclador.classList.add('ui-practica__mezclador');
    cabecera.append(volver, titulo, estadoAcp, this.#panelPistas.elem, mezclador);

    const lateral = ui_crearElemento('div', 'ui-practica__lateral');
    lateral.append(this.#marcador.elem, this.#medidor.elem);
    const cuerpo = ui_crearElemento('div', 'ui-practica__cuerpo');
    cuerpo.append(this.#contenedorVista, lateral);
    raiz.append(cabecera, cuerpo, this.#contenedorMastil, this.#transporte.elem);

    const mostrarEjercicio = (cargado: IEjrCargado): void => {
      titulo.textContent = cargado.ej.titulo;
    };
    const mostrarAcp = (estado: IAcpEstado): void => {
      if (estado.estado === 'cargando') {
        estadoAcp.textContent = `Cargando acompañamiento… ${Math.round(estado.progresoCarga * 100)} %`;
      } else if (estado.estado === 'error') {
        estadoAcp.textContent = estado.msjError ?? 'No se pudo cargar el acompañamiento.';
      } else {
        estadoAcp.textContent = '';
      }
    };
    const cargado = this.#bus.obtenerUltimo('ejr:cargado');
    if (cargado !== undefined) mostrarEjercicio(cargado);
    const estado = this.#bus.obtenerUltimo('acp:estado');
    if (estado !== undefined) mostrarAcp(estado);
    this.#desuscripciones.push(
      this.#bus.suscribir('ejr:cargado', mostrarEjercicio),
      this.#bus.suscribir('acp:estado', mostrarAcp),
    );

    contenedor.append(raiz);
    return Promise.resolve();
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#raiz?.remove();
    this.#raiz = null;
  }
}

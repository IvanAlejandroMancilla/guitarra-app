/** Barra de transporte: reproducir/pausar, reiniciar, BPM −/+, loop y posición. */
import type { ICorBus, ICorFuenteConfig } from '../core/cor_contratos';
import type { ITmpPulso, ITmpTransporte, TUiAccionTransporte } from '../core/cor_eventos';
import { ui_crearBoton } from './ui_boton';
import { ui_crearElemento } from './ui_dom';

/** Pulsos por compás supuestos para mostrar la posición tras un salto (antes del siguiente pulso). */
const UI_PULSOS_COMPAS_DEF = 4;

export class UiBarraTransporte {
  readonly elem: HTMLElement;
  #bus: ICorBus;
  #botonReproducir: HTMLButtonElement;
  #botonLoop: HTMLButtonElement;
  #textoBpm: HTMLElement;
  #textoPos: HTMLElement;
  #luzPulso: HTMLElement;
  #pulsosPorCompas = UI_PULSOS_COMPAS_DEF;

  constructor(bus: ICorBus, fuenteCfg: ICorFuenteConfig) {
    this.#bus = bus;
    this.elem = ui_crearElemento('div', 'ui-transporte');
    this.elem.setAttribute('role', 'toolbar');
    this.elem.setAttribute('aria-label', 'Transporte');

    this.#botonReproducir = this.#crearBoton('Reproducir', 'alternar', 'primario');
    this.#botonReproducir.classList.add('ui-transporte__reproducir');
    const botonReiniciar = this.#crearBoton('Reiniciar', 'reiniciar', 'secundario');
    const bajar = this.#crearBoton('−', 'bajarBpm', 'secundario', 'Bajar BPM');
    const subir = this.#crearBoton('+', 'subirBpm', 'secundario', 'Subir BPM');
    this.#textoBpm = ui_crearElemento('span', 'ui-transporte__bpm');
    this.#textoBpm.setAttribute('aria-live', 'polite');
    this.#botonLoop = this.#crearBoton('Loop', 'alternarLoop', 'secundario');
    this.#luzPulso = ui_crearElemento('span', 'ui-transporte__luz');
    this.#luzPulso.setAttribute('aria-hidden', 'true');
    this.#textoPos = ui_crearElemento('span', 'ui-transporte__pos', 'Compás 1 · Pulso 1');

    const grupoBpm = ui_crearElemento('div', 'ui-transporte__grupo');
    grupoBpm.append(bajar, this.#textoBpm, subir);
    const grupoPos = ui_crearElemento('div', 'ui-transporte__grupo');
    grupoPos.append(this.#luzPulso, this.#textoPos);
    this.elem.append(this.#botonReproducir, botonReiniciar, grupoBpm, this.#botonLoop, grupoPos);

    const cfg = fuenteCfg.obtenerConfig();
    this.#mostrarBpm(bus.obtenerUltimo('tmp:bpm')?.bpm ?? cfg.bpm);
    this.#mostrarLoop(cfg.esLoop);
    this.#mostrarReproduccion(false);

    bus.suscribir('tmp:bpm', (cambio) => {
      this.#mostrarBpm(cambio.bpm);
    });
    bus.suscribir('cfg:cambio', (cambio) => {
      if (cambio.claves.includes('esLoop')) this.#mostrarLoop(cambio.cfg.esLoop);
      if (cambio.claves.includes('bpm') && bus.obtenerUltimo('tmp:bpm') === undefined) this.#mostrarBpm(cambio.cfg.bpm);
    });
    bus.suscribir('ejr:cargado', (cargado) => {
      this.#pulsosPorCompas = cargado.ej.pulsosPorCompas ?? UI_PULSOS_COMPAS_DEF;
      this.#mostrarPosPulsos(0);
    });
    bus.suscribir('tmp:inicio', () => {
      this.#mostrarReproduccion(true);
    });
    bus.suscribir('tmp:pausa', (transporte) => {
      this.#mostrarReproduccion(false);
      this.#mostrarTransporte(transporte);
    });
    bus.suscribir('tmp:detencion', (transporte) => {
      this.#mostrarReproduccion(false);
      this.#mostrarTransporte(transporte);
    });
    bus.suscribir('tmp:posicion', (transporte) => {
      this.#mostrarTransporte(transporte);
    });
    bus.suscribir('tmp:pulso', (pulso) => {
      this.#mostrarPulso(pulso);
    });
  }

  #crearBoton(
    texto: string,
    accion: TUiAccionTransporte,
    variante: 'primario' | 'secundario',
    etiquetaAccesible?: string,
  ): HTMLButtonElement {
    return ui_crearBoton({
      texto,
      variante,
      etiquetaAccesible,
      alPulsar: () => {
        this.#bus.emitir('ui:transporte', { accion });
      },
    });
  }

  #mostrarBpm(bpm: number): void {
    this.#textoBpm.textContent = `${Math.round(bpm)} BPM`;
  }

  #mostrarLoop(esLoop: boolean): void {
    this.#botonLoop.setAttribute('aria-pressed', String(esLoop));
    this.#botonLoop.classList.toggle('ui-boton--activo', esLoop);
  }

  #mostrarReproduccion(esReproduciendo: boolean): void {
    this.#botonReproducir.textContent = esReproduciendo ? 'Pausar' : 'Reproducir';
    this.#botonReproducir.title = 'Atajo: Espacio';
  }

  #mostrarTransporte(transporte: ITmpTransporte): void {
    this.#mostrarPosPulsos(transporte.posPulsos);
  }

  #mostrarPosPulsos(posPulsos: number): void {
    const idxPulso = Math.max(0, Math.floor(posPulsos));
    const idxCompas = Math.floor(idxPulso / this.#pulsosPorCompas);
    this.#mostrarPosicion(idxCompas, idxPulso - idxCompas * this.#pulsosPorCompas);
  }

  #mostrarPulso(pulso: ITmpPulso): void {
    this.#mostrarPosicion(pulso.idxCompas, pulso.idxPulsoCompas);
    this.#luzPulso.classList.remove('ui-transporte__luz--pulso', 'ui-transporte__luz--acento');
    // Forzar reflujo para reiniciar la animación CSS del destello.
    void this.#luzPulso.offsetWidth;
    this.#luzPulso.classList.add(pulso.esAcento ? 'ui-transporte__luz--acento' : 'ui-transporte__luz--pulso');
  }

  #mostrarPosicion(idxCompas: number, idxPulsoCompas: number): void {
    this.#textoPos.textContent = `Compás ${idxCompas + 1} · Pulso ${idxPulsoCompas + 1}`;
  }
}

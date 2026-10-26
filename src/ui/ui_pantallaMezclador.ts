/**
 * Pantalla "Mezclador" estilo pedalera (Nanocore): presets, cadena FX1 → … → EQ, IR del gabinete, monitoreo y nivel de entrada.
 * Sin lógica de audio: refleja `'efx:*'` y pide cambios con `'ui:bloqueEfx'` (y los componentes con sus propios eventos).
 * Los componentes viven mientras viva la pantalla (siguen el bus aunque no esté visible); montar solo inserta el DOM.
 */
import type { ICorBus, ICorEditorConfig, ICorMontable } from '../core/cor_contratos';
import { COR_ORDEN_BLOQUES_EFX } from '../core/cor_efectos';
import type { IEfxBloques, TEfxIdBloque } from '../core/cor_efectos';
import type { IAudNivel, TUiBloqueEfxEditado, TUiPantalla } from '../core/cor_eventos';
import { UiBloqueEfecto } from './ui_bloqueEfecto';
import { UI_BLOQUES_EFX } from './ui_bloquesEfx';
import { ui_crearBoton } from './ui_boton';
import { UiControlMonitor } from './ui_controlMonitor';
import { ui_crearElemento } from './ui_dom';
import { UiListaPresets } from './ui_listaPresets';
import { ui_crearPanel } from './ui_panel';
import { UiSelectorIr } from './ui_selectorIr';

/** Rango visible del medidor de entrada en dBFS. */
const UI_DB_MIN_MEDIDOR = -60;

const UI_NOMBRES_PANTALLA: Readonly<Record<TUiPantalla, string>> = {
  menu: 'menú',
  practica: 'práctica',
  afinador: 'afinador',
  configuracion: 'configuración',
  mezclador: 'mezclador',
};

/** Un `UiBloqueEfecto` por bloque, cada uno con su tipo. */
type TUiControlesBloques = { [TId in TEfxIdBloque]: UiBloqueEfecto<TId> };

const convertirDbARel = (db: number): number => Math.min(1, Math.max(0, (db - UI_DB_MIN_MEDIDOR) / -UI_DB_MIN_MEDIDOR));

export class UiPantallaMezclador implements ICorMontable {
  #bus: ICorBus;
  #editor: ICorEditorConfig;
  #pantallaAnt: TUiPantalla = 'menu';
  #pantallaAct: TUiPantalla | null = null;
  #bloquesEstado: IEfxBloques | null = null;
  #listaPresets: UiListaPresets;
  #bloques: TUiControlesBloques;
  #selectorIr: UiSelectorIr;
  #cadena: HTMLElement;
  #aviso: HTMLElement;
  #raiz: HTMLElement | null = null;
  #botonVolver: HTMLButtonElement | null = null;
  #control: UiControlMonitor | null = null;
  #desuscripcionesMontaje: (() => void)[] = [];

  constructor(bus: ICorBus, editor: ICorEditorConfig) {
    this.#bus = bus;
    this.#editor = editor;
    bus.suscribir('ui:pantalla', ({ pantalla }) => {
      if (pantalla === 'mezclador' && this.#pantallaAct !== 'mezclador' && this.#pantallaAct !== null) {
        this.#pantallaAnt = this.#pantallaAct;
      }
      this.#pantallaAct = pantalla;
      this.#mostrarVolver();
    });

    this.#listaPresets = new UiListaPresets(bus);
    // Un literal por bloque: así cada edición queda tipada con su id (miembro concreto de TUiBloqueEfxEditado).
    this.#bloques = {
      fx1: new UiBloqueEfecto(UI_BLOQUES_EFX.fx1, (estado) => this.#editarBloque({ idBloque: 'fx1', estado })),
      fx2: new UiBloqueEfecto(UI_BLOQUES_EFX.fx2, (estado) => this.#editarBloque({ idBloque: 'fx2', estado })),
      amp: new UiBloqueEfecto(UI_BLOQUES_EFX.amp, (estado) => this.#editarBloque({ idBloque: 'amp', estado })),
      cab: new UiBloqueEfecto(UI_BLOQUES_EFX.cab, (estado) => this.#editarBloque({ idBloque: 'cab', estado })),
      del: new UiBloqueEfecto(UI_BLOQUES_EFX.del, (estado) => this.#editarBloque({ idBloque: 'del', estado })),
      mod: new UiBloqueEfecto(UI_BLOQUES_EFX.mod, (estado) => this.#editarBloque({ idBloque: 'mod', estado })),
      rev: new UiBloqueEfecto(UI_BLOQUES_EFX.rev, (estado) => this.#editarBloque({ idBloque: 'rev', estado })),
      eq: new UiBloqueEfecto(UI_BLOQUES_EFX.eq, (estado) => this.#editarBloque({ idBloque: 'eq', estado })),
    };
    this.#selectorIr = new UiSelectorIr(bus, (idIr) => {
      const cab = this.#bloquesEstado?.cab;
      if (cab === undefined) return;
      const estado = { ...cab, idIr, modelo: idIr === null ? cab.modelo : 'ir' as const };
      this.#bloques.cab.fijarEstado(estado);
      this.#editarBloque({ idBloque: 'cab', estado });
    });
    this.#bloques.cab.elem.append(this.#selectorIr.elem);

    this.#cadena = ui_crearElemento('ol', 'ui-mezclador__cadena');
    this.#cadena.setAttribute('aria-label', 'Cadena de efectos, en orden de la señal');
    for (const id of COR_ORDEN_BLOQUES_EFX) {
      const item = ui_crearElemento('li', 'ui-mezclador__ranura');
      item.append(this.#bloques[id].elem);
      this.#cadena.append(item);
    }

    this.#aviso = ui_crearElemento('p', 'ui-mezclador__aviso');
    this.#aviso.setAttribute('role', 'status');
    this.#aviso.hidden = true;
    bus.suscribir('cor:error', (error) => {
      if (error.origen !== 'efx') return;
      this.#aviso.textContent = error.msj;
      this.#aviso.hidden = false;
    });

    const activo = bus.obtenerUltimo('efx:presetActivo');
    const cadena = bus.obtenerUltimo('efx:cadena');
    if (activo !== undefined) this.#mostrarBloques(activo.preset.bloques);
    else if (cadena !== undefined) this.#mostrarBloques(cadena.bloques);
    bus.suscribir('efx:presetActivo', ({ preset }) => {
      this.#aviso.hidden = true;
      this.#mostrarBloques(preset.bloques);
    });
    bus.suscribir('efx:cadena', ({ bloques }) => {
      this.#mostrarBloques(bloques);
    });
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.desmontar();
    const raiz = ui_crearElemento('div', 'ui-pantalla ui-mezclador');
    this.#raiz = raiz;

    const cabecera = ui_crearElemento('header', 'ui-mezclador__cabecera');
    this.#botonVolver = ui_crearBoton({
      texto: '← Volver',
      variante: 'fantasma',
      alPulsar: () => {
        this.#bus.emitir('ui:pantalla', { pantalla: this.#pantallaAnt });
      },
    });
    this.#mostrarVolver();
    cabecera.append(
      this.#botonVolver,
      ui_crearElemento('h1', 'ui-mezclador__titulo', 'Mezclador'),
      ui_crearElemento('p', 'ui-mezclador__nota', 'Los cambios suenan al instante. Guárdalos en un preset para no perderlos.'),
    );

    this.#control = new UiControlMonitor(this.#editor, this.#bus);
    const salida = ui_crearPanel('Salida', [this.#control.elem, this.#crearMedidor()]);
    salida.classList.add('ui-mezclador__salida');
    const lateral = ui_crearElemento('div', 'ui-mezclador__lateral');
    this.#listaPresets.elem.classList.add('ui-panel');
    lateral.append(this.#listaPresets.elem, salida);

    const principal = ui_crearElemento('div', 'ui-mezclador__principal');
    principal.append(ui_crearElemento('h2', 'ui-panel__titulo', 'Cadena de efectos'), this.#aviso, this.#cadena);

    const cuerpo = ui_crearElemento('div', 'ui-mezclador__cuerpo');
    cuerpo.append(lateral, principal);
    raiz.append(cabecera, cuerpo);
    contenedor.append(raiz);
    return Promise.resolve();
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripcionesMontaje) desuscribir();
    this.#desuscripcionesMontaje = [];
    this.#control?.liberar();
    this.#control = null;
    this.#botonVolver = null;
    this.#raiz?.remove();
    this.#raiz = null;
  }

  /** El bloque ya refleja su estado nuevo; aquí se actualiza la copia local y se pide el cambio a efx. */
  #editarBloque(edicion: TUiBloqueEfxEditado): void {
    const bloquesAct = this.#bloquesEstado;
    if (bloquesAct === null) return;
    this.#bloquesEstado = { ...bloquesAct, [edicion.idBloque]: edicion.estado };
    if (edicion.idBloque === 'cab') this.#selectorIr.fijarIdIr(edicion.estado.idIr);
    this.#bus.emitir('ui:bloqueEfx', edicion);
  }

  #mostrarBloques(bloques: Readonly<IEfxBloques>): void {
    this.#bloquesEstado = { ...bloques };
    for (const id of COR_ORDEN_BLOQUES_EFX) this.#mostrarBloque(id, bloques);
    this.#selectorIr.fijarIdIr(bloques.cab.idIr);
  }

  #mostrarBloque<TId extends TEfxIdBloque>(id: TId, bloques: Readonly<IEfxBloques>): void {
    this.#bloques[id].fijarEstado(bloques[id]);
  }

  #mostrarVolver(): void {
    const boton = this.#botonVolver;
    if (boton === null) return;
    boton.setAttribute('aria-label', `Volver a ${UI_NOMBRES_PANTALLA[this.#pantallaAnt]}`);
  }

  /** Medidor de nivel de entrada (`'aud:nivel'`); la suscripción vive solo mientras la pantalla está montada. */
  #crearMedidor(): HTMLElement {
    const contenedor = ui_crearElemento('div', 'ui-mezclador__nivel');
    const medidor = ui_crearElemento('div', 'ui-mezclador__medidor');
    medidor.setAttribute('role', 'meter');
    medidor.setAttribute('aria-label', 'Nivel de entrada');
    medidor.setAttribute('aria-valuemin', String(UI_DB_MIN_MEDIDOR));
    medidor.setAttribute('aria-valuemax', '0');
    medidor.setAttribute('aria-valuenow', String(UI_DB_MIN_MEDIDOR));
    const barra = ui_crearElemento('div', 'ui-mezclador__medidorBarra');
    const pico = ui_crearElemento('div', 'ui-mezclador__medidorPico');
    medidor.append(barra, pico);
    const texto = ui_crearElemento('p', 'ui-mezclador__medidorTexto', 'Entrada: sin señal (activa la guitarra desde el menú)');
    contenedor.append(ui_crearElemento('span', 'ui-mezclador__medidorEtiqueta', 'Nivel de entrada'), medidor, texto);

    const mostrarNivel = (nivel: IAudNivel): void => {
      const db = Math.max(UI_DB_MIN_MEDIDOR, nivel.rmsDb);
      barra.style.transform = `scaleX(${convertirDbARel(nivel.rmsDb)})`;
      pico.style.left = `${convertirDbARel(nivel.picoDb) * 100}%`;
      medidor.classList.toggle('ui-mezclador__medidor--saturado', nivel.esSaturado);
      medidor.setAttribute('aria-valuenow', db.toFixed(0));
      medidor.setAttribute('aria-valuetext', `${db.toFixed(0)} dB`);
      texto.textContent = nivel.esSaturado
        ? `¡Saturación! Baja la ganancia de entrada (${db.toFixed(0)} dB).`
        : `Entrada: ${db.toFixed(0)} dB`;
    };
    this.#desuscripcionesMontaje.push(this.#bus.suscribir('aud:nivel', mostrarNivel));
    return contenedor;
  }
}

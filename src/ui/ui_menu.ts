/** Menú principal: activar la guitarra, elegir ejercicio, generar escala, abrir Guitar Pro y navegar. */
import type { ICorBus, ICorFuenteConfig, ICorMontable } from '../core/cor_contratos';
import type { IAudEstado, IEjrCatalogo, TEscTipoEscala, TUiPantalla } from '../core/cor_eventos';
import { COR_NOMBRES_NOTA, cor_obtenerEtiquetaNota } from '../core/cor_notas';
import type { TCfgNotacion, TNombreNota } from '../core/tipos';
import { ui_crearBoton } from './ui_boton';
import { ui_elegirArchivo } from './ui_archivos';
import { ui_crearElemento, ui_vaciarElemento } from './ui_dom';
import { ui_crearPanel } from './ui_panel';
import { UiSelector } from './ui_selector';
import type { IUiOpcion, IUiOpcionesMenu } from './ui_tipos';

const UI_EXTENSIONES_GP = '.gp,.gp3,.gp4,.gp5,.gpx';
const UI_OCT_ESCALA_DEF = 3;

const UI_TIPOS_ESCALA: readonly IUiOpcion<TEscTipoEscala>[] = [
  { valor: 'mayor', etiqueta: 'Mayor' },
  { valor: 'menorNatural', etiqueta: 'Menor natural' },
  { valor: 'pentatonicaMenor', etiqueta: 'Pentatónica menor' },
  { valor: 'pentatonicaMayor', etiqueta: 'Pentatónica mayor' },
];

const UI_OCTAVAS: readonly IUiOpcion<number>[] = [2, 3, 4, 5].map((oct) => ({ valor: oct, etiqueta: `Octava ${oct}` }));

const UI_TEXTOS_AUDIO: Readonly<Record<IAudEstado['estado'], string>> = {
  inactivo: 'Activar guitarra',
  solicitando: 'Solicitando permiso…',
  activo: 'Guitarra activa',
  denegado: 'Reintentar activar guitarra',
  error: 'Reintentar activar guitarra',
};

const crearOpcionesTonica = (notacion: TCfgNotacion): IUiOpcion<TNombreNota>[] =>
  COR_NOMBRES_NOTA.map((nombre) => ({ valor: nombre, etiqueta: cor_obtenerEtiquetaNota(nombre, undefined, notacion) }));

export class UiMenu implements ICorMontable {
  #bus: ICorBus;
  #fuenteCfg: ICorFuenteConfig;
  #opc: IUiOpcionesMenu;
  #raiz: HTMLElement | null = null;
  #desuscripciones: (() => void)[] = [];
  #tonica: TNombreNota = 'Do';
  #tipo: TEscTipoEscala = 'mayor';
  #oct = UI_OCT_ESCALA_DEF;

  constructor(bus: ICorBus, fuenteCfg: ICorFuenteConfig, opc: IUiOpcionesMenu = {}) {
    this.#bus = bus;
    this.#fuenteCfg = fuenteCfg;
    this.#opc = opc;
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.desmontar();
    const raiz = ui_crearElemento('div', 'ui-pantalla ui-menu');
    this.#raiz = raiz;

    const cabecera = ui_crearElemento('header', 'ui-menu__cabecera');
    cabecera.append(
      ui_crearElemento('h1', 'ui-menu__titulo', 'Guitarra'),
      ui_crearElemento('p', 'ui-menu__subtitulo', 'Practica con tu guitarra real: escalas, ejercicios y canciones.'),
    );
    raiz.append(cabecera);

    const audio = this.#crearPanelAudio();
    if (audio !== null) raiz.append(audio);

    const rejilla = ui_crearElemento('div', 'ui-menu__rejilla');
    rejilla.append(this.#crearPanelEjercicios(), this.#crearPanelEscala(), this.#crearPanelCanciones(), this.#crearPanelHerramientas());
    raiz.append(rejilla);

    contenedor.append(raiz);
    return Promise.resolve();
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#raiz?.remove();
    this.#raiz = null;
  }

  #navegar(pantalla: TUiPantalla): void {
    this.#bus.emitir('ui:pantalla', { pantalla });
  }

  #crearPanelAudio(): HTMLElement | null {
    const alActivarAudio = this.#opc.alActivarAudio;
    if (alActivarAudio === undefined) return null;
    const msj = ui_crearElemento('p', 'ui-menu__estadoAudio');
    msj.setAttribute('role', 'status');
    const boton = ui_crearBoton({
      texto: UI_TEXTOS_AUDIO.inactivo,
      variante: 'destacado',
      titulo: 'El navegador pedirá permiso para usar el micrófono o la interfaz de audio.',
      alPulsar: () => {
        msj.textContent = '';
        Promise.resolve()
          .then(() => alActivarAudio())
          .catch((err: unknown) => {
            console.error('[ui] Error al activar el audio:', err);
            msj.textContent = 'No se pudo activar la guitarra. Revisa que la interfaz esté conectada.';
          });
      },
    });
    boton.classList.add('ui-menu__activar');

    const mostrarEstado = (estado: IAudEstado): void => {
      boton.textContent = UI_TEXTOS_AUDIO[estado.estado];
      boton.disabled = estado.estado === 'solicitando' || estado.estado === 'activo';
      boton.classList.toggle('ui-boton--activo', estado.estado === 'activo');
      if (estado.estado === 'denegado') {
        msj.textContent = estado.msjError ?? 'Permiso de micrófono denegado. Habilítalo desde la barra de direcciones.';
      } else if (estado.estado === 'error') {
        msj.textContent = estado.msjError ?? 'Error de audio.';
      } else if (estado.estado === 'activo') {
        msj.textContent = 'Listo: ya puedes tocar.';
      } else {
        msj.textContent = '';
      }
    };
    const estadoAct = this.#bus.obtenerUltimo('aud:estado');
    if (estadoAct !== undefined) mostrarEstado(estadoAct);
    this.#desuscripciones.push(this.#bus.suscribir('aud:estado', mostrarEstado));

    const contenedor = ui_crearElemento('div', 'ui-menu__audio');
    contenedor.append(boton, msj);
    return contenedor;
  }

  #crearPanelEjercicios(): HTMLElement {
    const lista = ui_crearElemento('ul', 'ui-menu__lista');
    const mostrarCatalogo = (catalogo: IEjrCatalogo): void => {
      ui_vaciarElemento(lista);
      if (catalogo.entradas.length === 0) {
        lista.append(ui_crearElemento('li', 'ui-menu__vacio', 'No hay ejercicios en el catálogo.'));
        return;
      }
      const entradas = [...catalogo.entradas].sort((ent1, ent2) => ent1.nivel - ent2.nivel);
      for (const entrada of entradas) {
        const boton = ui_crearBoton({
          texto: '',
          variante: 'fantasma',
          alPulsar: () => {
            this.#navegar('practica');
            this.#bus.emitir('ui:ejercicio', { ruta: entrada.archivo });
          },
        });
        boton.classList.add('ui-menu__ejercicio');
        boton.append(
          ui_crearElemento('span', 'ui-menu__ejercicioTitulo', entrada.titulo),
          ui_crearElemento('span', 'ui-menu__nivel', `Nivel ${entrada.nivel}`),
        );
        if (entrada.descripcion !== undefined) {
          boton.append(ui_crearElemento('span', 'ui-menu__descripcion', entrada.descripcion));
        }
        const item = ui_crearElemento('li');
        item.append(boton);
        lista.append(item);
      }
    };
    const catalogo = this.#bus.obtenerUltimo('ejr:catalogo');
    if (catalogo === undefined) lista.append(ui_crearElemento('li', 'ui-menu__vacio', 'Cargando ejercicios…'));
    else mostrarCatalogo(catalogo);
    this.#desuscripciones.push(this.#bus.suscribir('ejr:catalogo', mostrarCatalogo));
    return ui_crearPanel('Ejercicios', [lista]);
  }

  #crearPanelEscala(): HTMLElement {
    const selTonica = new UiSelector<TNombreNota>({
      etiqueta: 'Tónica',
      opciones: crearOpcionesTonica(this.#fuenteCfg.obtenerConfig().notacion),
      valor: this.#tonica,
      alCambiar: (tonica) => {
        this.#tonica = tonica;
      },
    });
    const selTipo = new UiSelector<TEscTipoEscala>({
      etiqueta: 'Tipo de escala',
      opciones: UI_TIPOS_ESCALA,
      valor: this.#tipo,
      alCambiar: (tipo) => {
        this.#tipo = tipo;
      },
    });
    const selOct = new UiSelector<number>({
      etiqueta: 'Octava inicial',
      opciones: UI_OCTAVAS,
      valor: this.#oct,
      alCambiar: (oct) => {
        this.#oct = oct;
      },
    });
    this.#desuscripciones.push(
      this.#bus.suscribir('cfg:cambio', (cambio) => {
        if (cambio.claves.includes('notacion')) selTonica.fijarOpciones(crearOpcionesTonica(cambio.cfg.notacion), this.#tonica);
      }),
    );
    const generar = ui_crearBoton({
      texto: 'Generar y practicar',
      variante: 'primario',
      alPulsar: () => {
        this.#navegar('practica');
        this.#bus.emitir('ui:escala', { tonica: this.#tonica, tipo: this.#tipo, oct: this.#oct });
      },
    });
    const campos = ui_crearElemento('div', 'ui-menu__campos');
    campos.append(selTonica.elem, selTipo.elem, selOct.elem);
    return ui_crearPanel('Generar escala', [campos, generar]);
  }

  #crearPanelCanciones(): HTMLElement {
    const msj = ui_crearElemento('p', 'ui-menu__ayuda', 'Archivos .gp, .gp3, .gp4, .gp5 y .gpx. Se reproducen las demás pistas de fondo.');
    const abrir = ui_crearBoton({
      texto: 'Abrir archivo Guitar Pro…',
      variante: 'primario',
      alPulsar: () => {
        void ui_elegirArchivo(UI_EXTENSIONES_GP).then((archivo) => {
          if (archivo === null) return;
          this.#navegar('practica');
          this.#bus.emitir('ui:archivoGp', { archivo });
        });
      },
    });
    return ui_crearPanel('Canciones', [msj, abrir]);
  }

  #crearPanelHerramientas(): HTMLElement {
    const botones = ui_crearElemento('div', 'ui-menu__botones');
    botones.append(
      ui_crearBoton({ texto: 'Afinador', alPulsar: () => this.#navegar('afinador') }),
      ui_crearBoton({ texto: 'Mezclador', titulo: 'Amplificador, efectos y monitoreo', alPulsar: () => this.#navegar('mezclador') }),
      ui_crearBoton({ texto: 'Configuración', alPulsar: () => this.#navegar('configuracion') }),
    );
    return ui_crearPanel('Herramientas', [botones]);
  }
}

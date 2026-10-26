/**
 * Vista "Guitar Hero": autopista 3D de carriles (uno por cuerda) con Three.js.
 * Se carga de forma diferida desde `main.ts` (`await import('./vistas/tres-d/v3d_vistaGuitarHero')`).
 * Solo consume `core` y eventos del bus; la posición de las notas sale de `cuadro.posPulsos`.
 */
import { COR_COLOR_ACIERTO } from '../../core/cor_colores';
import type { ICorBus, ICorCuadro, ICorOpcionesVista, ICorVista } from '../../core/cor_contratos';
import type { IDetNotaDetectada, IEjrCargado, IEjrEsperada, IEjrResultado, IAudOnda } from '../../core/cor_eventos';
import type { IEjercicio } from '../../core/tipos';
import { V3dAutopista } from './v3d_autopista';
import { V3D_PERFILES_CALIDAD } from './v3d_calidad';
import { V3dCamara } from './v3d_camara';
import { V3dCintaOnda } from './v3d_cintaOnda';
import { V3D_EJ_VACIO, V3D_Y_NOTA } from './v3d_constantes';
import { V3dEscena } from './v3d_escena';
import { V3dEtiquetas } from './v3d_etiquetas';
import { v3d_calcularXCarril } from './v3d_geometria';
import { v3d_crearLienzo } from './v3d_lienzo';
import { V3dMarcasTraste } from './v3d_marcasTraste';
import { V3dNotas } from './v3d_notas';
import { V3dParticulas } from './v3d_particulas';
import type { IV3dCapa } from './v3d_tipos';
import { v3d_validarWebgl } from './v3d_webgl';

/** Objetos que dependen de las opciones: se recrean juntos al cambiarlas. */
interface IV3dMontajeGuitarHero {
  lienzo: HTMLCanvasElement;
  escena: V3dEscena;
  camara: V3dCamara;
  autopista: V3dAutopista;
  marcasTraste: V3dMarcasTraste;
  notas: V3dNotas;
  particulas: V3dParticulas;
  cintaOnda: V3dCintaOnda;
  etiquetas: V3dEtiquetas;
  capas: readonly IV3dCapa[];
}

export class V3dVistaGuitarHero implements ICorVista {
  readonly #bus: ICorBus;
  #opc: ICorOpcionesVista;
  #contenedor: HTMLElement | null = null;
  #montaje: IV3dMontajeGuitarHero | null = null;
  #observador: ResizeObserver | null = null;
  #desuscripciones: (() => void)[] = [];
  #ej: IEjercicio = V3D_EJ_VACIO;
  #esperada: IEjrEsperada | null = null;
  #anchoPx = 0;
  #altoPx = 0;

  constructor(bus: ICorBus, opc: ICorOpcionesVista) {
    this.#bus = bus;
    this.#opc = { ...opc };
  }

  async montar(contenedor: HTMLElement): Promise<void> {
    if (this.#contenedor !== null) this.desmontar();
    if (!v3d_validarWebgl()) {
      throw new Error('Este navegador no admite WebGL 2: usa la vista liviana (2D).');
    }
    this.#contenedor = contenedor;

    // Quien se monta tarde recupera el último estado publicado.
    this.#ej = this.#bus.obtenerUltimo('ejr:cargado')?.ej ?? V3D_EJ_VACIO;
    this.#esperada = this.#bus.obtenerUltimo('ejr:esperada') ?? null;

    try {
      this.#crearMontaje();
    } catch (err) {
      this.#contenedor = null;
      throw new Error('No se pudo iniciar la autopista Guitar Hero: usa la vista liviana (2D).', { cause: err });
    }
    this.#desuscripciones = [
      this.#bus.suscribir('ejr:cargado', this.#alCargarEjercicio),
      this.#bus.suscribir('ejr:esperada', this.#alCambiarEsperada),
      this.#bus.suscribir('ejr:acierto', this.#alAcertar),
      this.#bus.suscribir('ejr:fallo', this.#alFallar),
      this.#bus.suscribir('aud:onda', this.#alRecibirOnda),
      this.#bus.suscribir('det:nota', this.#alDetectarNota),
      // Al detener, saltar o repetir el loop, las notas vuelven a estar pendientes.
      this.#bus.suscribir('tmp:detencion', this.#alReiniciarTransporte),
      this.#bus.suscribir('tmp:posicion', this.#alReiniciarTransporte),
      this.#bus.suscribir('tmp:loop', this.#alReiniciarTransporte),
    ];

    this.#observador = new ResizeObserver((entradas) => {
      const caja = entradas[0]?.contentRect;
      if (caja !== undefined) this.redimensionar(caja.width, caja.height);
    });
    this.#observador.observe(contenedor);
    this.redimensionar(contenedor.clientWidth, contenedor.clientHeight);
    await Promise.resolve();
  }

  desmontar(): void {
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones = [];
    this.#observador?.disconnect();
    this.#observador = null;
    this.#liberarMontaje();
    this.#contenedor = null;
  }

  dibujar(cuadro: ICorCuadro): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.camara.actualizar(cuadro);
    for (const capa of montaje.capas) capa.actualizar(cuadro);
    montaje.escena.dibujar(montaje.camara.obtenerCamara());
  }

  redimensionar(anchoPx: number, altoPx: number): void {
    this.#anchoPx = anchoPx;
    this.#altoPx = altoPx;
    const montaje = this.#montaje;
    if (montaje === null || anchoPx <= 0 || altoPx <= 0) return;
    montaje.escena.redimensionar(anchoPx, altoPx);
    montaje.camara.redimensionar(anchoPx / altoPx);
  }

  /** Cambios de opciones (zurdo, notación, velocidad, calidad): se reconstruye la escena. Es poco frecuente. */
  actualizarOpciones(opc: ICorOpcionesVista): void {
    this.#opc = { ...opc };
    if (this.#montaje === null) return;
    this.#liberarMontaje();
    this.#crearMontaje();
    this.redimensionar(this.#anchoPx, this.#altoPx);
  }

  #crearMontaje(): void {
    const contenedor = this.#contenedor;
    if (contenedor === null) return;
    const perfil = V3D_PERFILES_CALIDAD[this.#opc.calidad];
    const lienzo = v3d_crearLienzo(contenedor, 'Autopista Guitar Hero');

    let escena: V3dEscena;
    try {
      escena = new V3dEscena(lienzo, perfil);
    } catch (err) {
      lienzo.remove();
      throw err;
    }
    const autopista = new V3dAutopista(this.#opc, perfil);
    const marcasTraste = new V3dMarcasTraste(this.#opc);
    const notas = new V3dNotas(this.#opc, perfil);
    const particulas = new V3dParticulas(perfil);
    const cintaOnda = new V3dCintaOnda(perfil);
    const etiquetas = new V3dEtiquetas(this.#opc);
    const capas: IV3dCapa[] = [autopista, marcasTraste, cintaOnda, notas, etiquetas, particulas];
    for (const capa of capas) escena.agregar(capa);

    this.#montaje = {
      lienzo,
      escena,
      camara: new V3dCamara(),
      autopista,
      marcasTraste,
      notas,
      particulas,
      cintaOnda,
      etiquetas,
      capas,
    };
    this.#cargarEjercicio(this.#ej);
    this.#mostrarEsperada();
  }

  #liberarMontaje(): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.escena.liberar();
    montaje.lienzo.remove();
    this.#montaje = null;
  }

  #cargarEjercicio(ej: IEjercicio): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.autopista.cargar(ej);
    montaje.notas.cargar(ej);
    montaje.etiquetas.cargar(ej);
  }

  #mostrarEsperada(): void {
    const nota = this.#esperada?.nota ?? null;
    this.#montaje?.marcasTraste.fijarTrasteActivo(nota?.trs, nota?.cur);
  }

  #marcarResultado(resultado: IEjrResultado, esAcierto: boolean): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.notas.marcarResultado(resultado.idxNota, esAcierto);
    montaje.etiquetas.marcarResultado(resultado.idxNota, esAcierto);
    montaje.autopista.marcarCarril(resultado.nota.cur, esAcierto);
  }

  readonly #alCargarEjercicio = (cargado: IEjrCargado): void => {
    this.#ej = cargado.ej;
    this.#cargarEjercicio(cargado.ej);
  };

  readonly #alCambiarEsperada = (esperada: IEjrEsperada): void => {
    this.#esperada = esperada;
    this.#mostrarEsperada();
  };

  readonly #alAcertar = (resultado: IEjrResultado): void => {
    this.#marcarResultado(resultado, true);
    const x = v3d_calcularXCarril(resultado.nota.cur, this.#opc.esZurdo);
    this.#montaje?.particulas.crearExplosion(x, V3D_Y_NOTA, 0, COR_COLOR_ACIERTO);
  };

  readonly #alFallar = (resultado: IEjrResultado): void => {
    this.#marcarResultado(resultado, false);
  };

  readonly #alRecibirOnda = (onda: IAudOnda): void => {
    // `fijarMuestras` copia: el buffer del evento se reutiliza.
    this.#montaje?.cintaOnda.fijarMuestras(onda.muestras);
  };

  readonly #alDetectarNota = (detectada: IDetNotaDetectada): void => {
    this.#montaje?.etiquetas.fijarNotaDetectada(detectada);
  };

  readonly #alReiniciarTransporte = (): void => {
    this.#cargarEjercicio(this.#ej);
  };
}

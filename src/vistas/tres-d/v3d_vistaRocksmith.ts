/**
 * Vista Rocksmith (vista por defecto): cuerdas horizontales al frente, trastes 0–24 en X y gemas que
 * vienen desde el fondo (Z) hacia su (traste, cuerda). La cámara sigue la zona de trastes de las próximas notas.
 * Se carga de forma diferida desde `main.ts` (`await import('./vistas/tres-d/v3d_vistaRocksmith')`).
 * Solo consume `core` y eventos del bus; la posición de las notas sale de `cuadro.posPulsos`.
 */
import { COR_COLOR_ACIERTO, COR_COLORES_CUERDA } from '../../core/cor_colores';
import type { ICorBus, ICorCuadro, ICorOpcionesVista, ICorVista } from '../../core/cor_contratos';
import type { IEjrCargado, IEjrEsperada, IEjrResultado } from '../../core/cor_eventos';
import { COR_CANT_CUERDAS } from '../../core/cor_notas';
import type { IEjercicio } from '../../core/tipos';
import { V3dBandasNota } from './v3d_bandasNota';
import { V3D_PERFILES_CALIDAD } from './v3d_calidad';
import { V3dCamaraRocksmith } from './v3d_camaraRocksmith';
import { V3dColas } from './v3d_colas';
import { V3D_EJ_VACIO } from './v3d_constantes';
import { V3D_PULSOS_ANTICIPO_ZONA } from './v3d_constantesRocksmith';
import { V3dCuerdas } from './v3d_cuerdas';
import { V3dEscena } from './v3d_escena';
import { V3dGemas } from './v3d_gemas';
import { v3d_ordenarNotas } from './v3d_geometria';
import {
  v3d_calcularXCasilla,
  v3d_calcularYCuerda,
  v3d_calcularZonaTrastes,
  v3d_validarPosMastil,
} from './v3d_geometriaRocksmith';
import { V3dGuias } from './v3d_guias';
import { v3d_crearLienzo } from './v3d_lienzo';
import { V3dParticulas } from './v3d_particulas';
import { V3dReglaTrastes } from './v3d_reglaTrastes';
import type { IV3dCapa, IV3dZonaTrastes } from './v3d_tipos';
import { v3d_validarWebgl } from './v3d_webgl';

/** Objetos que dependen de las opciones: se recrean juntos al cambiarlas. */
interface IV3dMontajeRocksmith {
  lienzo: HTMLCanvasElement;
  escena: V3dEscena;
  camara: V3dCamaraRocksmith;
  cuerdas: V3dCuerdas;
  reglaTrastes: V3dReglaTrastes;
  gemas: V3dGemas;
  colas: V3dColas;
  guias: V3dGuias;
  bandasNota: V3dBandasNota;
  particulas: V3dParticulas;
  capas: readonly IV3dCapa[];
}

export class V3dVistaRocksmith implements ICorVista {
  readonly #bus: ICorBus;
  #opc: ICorOpcionesVista;
  #contenedor: HTMLElement | null = null;
  #montaje: IV3dMontajeRocksmith | null = null;
  #observador: ResizeObserver | null = null;
  #desuscripciones: (() => void)[] = [];
  #ej: IEjercicio = V3D_EJ_VACIO;
  #orden = new Uint32Array(0);
  /** Zona de la próxima nota esperada: respaldo cuando no hay notas en la ventana de anticipo. */
  #zonaEsperada: IV3dZonaTrastes | null = null;
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
    this.#fijarEjercicio(this.#bus.obtenerUltimo('ejr:cargado')?.ej ?? V3D_EJ_VACIO);
    this.#fijarEsperada(this.#bus.obtenerUltimo('ejr:esperada') ?? null);

    try {
      this.#crearMontaje();
    } catch (err) {
      this.#contenedor = null;
      throw new Error('No se pudo iniciar la vista Rocksmith: usa la vista liviana (2D).', { cause: err });
    }
    this.#desuscripciones = [
      this.#bus.suscribir('ejr:cargado', this.#alCargarEjercicio),
      this.#bus.suscribir('ejr:esperada', this.#alCambiarEsperada),
      this.#bus.suscribir('ejr:acierto', this.#alAcertar),
      this.#bus.suscribir('ejr:fallo', this.#alFallar),
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
    const zona =
      v3d_calcularZonaTrastes(this.#ej.notas, this.#orden, cuadro.posPulsos, V3D_PULSOS_ANTICIPO_ZONA) ??
      this.#zonaEsperada;
    montaje.camara.fijarZona(zona);
    montaje.reglaTrastes.fijarZona(zona);
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
    const lienzo = v3d_crearLienzo(contenedor, 'Autopista Rocksmith 3D de notas');

    let escena: V3dEscena;
    try {
      escena = new V3dEscena(lienzo, perfil);
    } catch (err) {
      lienzo.remove();
      throw err;
    }
    const reglaTrastes = new V3dReglaTrastes(this.#opc);
    const cuerdas = new V3dCuerdas(this.#opc);
    const guias = new V3dGuias(this.#opc);
    const colas = new V3dColas(this.#opc, perfil);
    const bandasNota = new V3dBandasNota(this.#opc);
    const gemas = new V3dGemas(this.#opc, perfil);
    const particulas = new V3dParticulas(perfil);
    const capas: IV3dCapa[] = [reglaTrastes, cuerdas, guias, colas, bandasNota, gemas, particulas];
    for (const capa of capas) escena.agregar(capa);

    this.#montaje = {
      lienzo,
      escena,
      camara: new V3dCamaraRocksmith(this.#opc),
      cuerdas,
      reglaTrastes,
      gemas,
      colas,
      guias,
      bandasNota,
      particulas,
      capas,
    };
    this.#cargarEjercicio(this.#ej);
  }

  #liberarMontaje(): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.escena.liberar();
    montaje.lienzo.remove();
    this.#montaje = null;
  }

  #fijarEjercicio(ej: IEjercicio): void {
    this.#ej = ej;
    this.#orden = v3d_ordenarNotas(ej.notas);
  }

  #fijarEsperada(esperada: IEjrEsperada | null): void {
    const nota = esperada?.nota ?? null;
    this.#zonaEsperada = nota === null ? null : v3d_calcularZonaTrastes([nota], [0], nota.tiempo, 0);
  }

  #cargarEjercicio(ej: IEjercicio): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.gemas.cargar(ej);
    montaje.colas.cargar(ej);
    montaje.guias.cargar(ej);
    montaje.bandasNota.cargar(ej);
  }

  #marcarResultado(resultado: IEjrResultado, esAcierto: boolean): void {
    const montaje = this.#montaje;
    if (montaje === null) return;
    montaje.gemas.marcarResultado(resultado.idxNota, esAcierto);
    montaje.colas.marcarResultado(resultado.idxNota, esAcierto);
    montaje.bandasNota.marcarResultado(resultado.idxNota, esAcierto);
    const nota = resultado.nota;
    if (v3d_validarPosMastil(nota)) montaje.cuerdas.marcarCuerda(nota.cur, esAcierto);
  }

  readonly #alCargarEjercicio = (cargado: IEjrCargado): void => {
    this.#fijarEjercicio(cargado.ej);
    this.#cargarEjercicio(cargado.ej);
  };

  readonly #alCambiarEsperada = (esperada: IEjrEsperada): void => {
    this.#fijarEsperada(esperada);
  };

  readonly #alAcertar = (resultado: IEjrResultado): void => {
    this.#marcarResultado(resultado, true);
    const montaje = this.#montaje;
    if (montaje === null) return;
    const nota = resultado.nota;
    if (v3d_validarPosMastil(nota)) {
      const color = COR_COLORES_CUERDA[nota.cur - 1] ?? COR_COLOR_ACIERTO;
      const x = v3d_calcularXCasilla(nota.trs, this.#opc.esZurdo);
      montaje.particulas.crearExplosion(x, v3d_calcularYCuerda(nota.cur), 0, color);
    } else {
      // Banda sin posición: la explosión sale frente a la cámara, a media altura de las cuerdas.
      const yMedia = (v3d_calcularYCuerda(1) + v3d_calcularYCuerda(COR_CANT_CUERDAS)) / 2;
      montaje.particulas.crearExplosion(montaje.camara.obtenerCamara().position.x, yMedia, 0, COR_COLOR_ACIERTO);
    }
  };

  readonly #alFallar = (resultado: IEjrResultado): void => {
    this.#marcarResultado(resultado, false);
  };

  readonly #alReiniciarTransporte = (): void => {
    this.#cargarEjercicio(this.#ej);
  };
}

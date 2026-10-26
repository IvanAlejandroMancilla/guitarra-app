/** Composición de la app: único lugar que instancia implementaciones concretas. */
import './ui/ui_estilos.css';

import { CorBus } from './core/cor_bus';
import { CorBucle } from './core/cor_bucle';
import type { ICorBus, ICorOpcionesVista, ICorVista } from './core/cor_contratos';
import type { IConfig, TCfgVista } from './core/tipos';

import { aud_crearContexto, aud_reanudarContexto } from './audio/aud_contexto';
import { AudCaptura } from './audio/aud_captura';
import { AudObservadorDispositivos } from './audio/aud_dispositivos';
import { AudMonitor } from './audio/aud_monitor';
import { DetDetectorYin } from './deteccion/det_yin';
import { DetEstimadorPitchy } from './deteccion/det_pitchy';
import { AfnAfinador } from './afinador/afn_afinador';
import { AFN_AFINACIONES, afn_obtenerAfinacion } from './afinador/afn_afinaciones';
import { AFN_TOL_CENTS } from './afinador/afn_constantes';
import { EjrSesion } from './ejercicios/ejr_sesion';
import { EjrPuntaje } from './ejercicios/ejr_puntaje';
import { EjrControlador } from './ejercicios/ejr_controlador';
import { EjrImportadorJson } from './ejercicios/ejr_importadorJson';
import { EscControlador } from './escalas/esc_controlador';
import { TmpReloj } from './timing/tmp_reloj';
import { TmpProgramador } from './timing/tmp_programador';
import { TmpMetronomo } from './timing/tmp_metronomo';
import { TmpProgresivo } from './timing/tmp_progresivo';
import { TmpLoop } from './timing/tmp_loop';
import { TmpCalibrador } from './timing/tmp_calibrador';
import { TmpControlador } from './timing/tmp_controlador';
import { TMP_PULSOS_COMPAS_DEF } from './timing/tmp_constantes';
import { Vc2Vista } from './vistas/canvas2d/vc2_vista';
import { Vc2VistaAfinador } from './vistas/canvas2d/vc2_vistaAfinador';
import { v3d_validarWebgl } from './vistas/tres-d/v3d_webgl';
import { GprControlador } from './guitar-pro/gpr_controlador';
import { GprImportador } from './guitar-pro/gpr_importador';
import { AcpReproductor } from './acompanamiento/acp_reproductor';
import { ACP_RUTA_SOUNDFONT } from './acompanamiento/acp_constantes';
import { CfgAlmacen } from './configuracion/cfg_almacen';
import { CfgEstado } from './configuracion/cfg_estado';
import { CfgPantalla } from './configuracion/cfg_pantalla';
import type { ICfgAlmacen } from './configuracion/cfg_tipos';
import { UiNavegador } from './ui/ui_navegador';
import { UiMenu } from './ui/ui_menu';
import { UiPantallaPractica } from './ui/ui_pantallaPractica';
import { UiPantallaAfinador } from './ui/ui_pantallaAfinador';
import { UiBarraTransporte } from './ui/ui_transporte';
import { UiMarcador } from './ui/ui_marcador';
import { UiPanelPistas } from './ui/ui_panelPistas';
import { UiAtajos } from './ui/ui_atajos';
import { UiMedidorCoincidencia } from './ui/ui_medidorCoincidencia';
import { UiPantallaMezclador } from './ui/ui_pantallaMezclador';
import { EjrMedidorCoincidencia } from './ejercicios/ejr_medidorCoincidencia';
import { Vc2VistaMastil } from './vistas/canvas2d/vc2_vistaMastil';
import { efx_crearBloques } from './efectos/efx_fabrica';
import { EfxCadena } from './efectos/efx_cadena';
import { EfxMonitor } from './efectos/efx_monitor';
import { EfxControlador } from './efectos/efx_controlador';
import { EfxBiblioteca } from './efectos/efx_biblioteca';
import { EfxAlmacenPresets } from './efectos/efx_almacenPresets';
import { EfxAlmacenIr } from './efectos/efx_almacenIr';
import { EFX_PRESETS_FABRICA } from './efectos/efx_presetsFabrica';
import type { IEfxAlmacenIr, IEfxAlmacenPresets, IEfxIr } from './efectos/efx_tipos';
import type { IEfxPreset } from './core/cor_efectos';

interface IAppModulos {
  ctx: AudioContext;
  captura: AudCaptura;
  detector: DetDetectorYin;
  afinador: AfnAfinador;
  sesion: EjrSesion;
  reloj: TmpReloj;
  metronomo: TmpMetronomo;
  progresivo: TmpProgresivo;
  loop: TmpLoop;
  acp: AcpReproductor;
  bucle: CorBucle;
  monitor: EfxMonitor;
  medidor: EjrMedidorCoincidencia;
  vistaMastil: Vc2VistaMastil;
  vistaAfinador: ICorVista;
  vistaActual: ICorVista | null;
}

/** Crea la vista pedida; si la 3D no está disponible cae a la Canvas 2D y avisa por el bus. */
async function app_crearVista(tipo: TCfgVista, bus: ICorBus, opc: ICorOpcionesVista): Promise<ICorVista> {
  if (tipo === 'guitarHero' || tipo === 'rocksmith') {
    if (v3d_validarWebgl()) {
      try {
        if (tipo === 'rocksmith') {
          const { V3dVistaRocksmith } = await import('./vistas/tres-d/v3d_vistaRocksmith');
          return new V3dVistaRocksmith(bus, opc);
        }
        const { V3dVistaGuitarHero } = await import('./vistas/tres-d/v3d_vistaGuitarHero');
        return new V3dVistaGuitarHero(bus, opc);
      } catch (err) {
        console.error('[app] No se pudo cargar la vista 3D:', err);
      }
    }
    bus.emitir('cor:error', { origen: 'app', msj: 'La vista 3D no está disponible en este navegador; se usa la vista 2D.' });
  }
  return new Vc2Vista(bus, opc);
}

function app_crearOpcionesVista(cfg: Readonly<IConfig>): ICorOpcionesVista {
  return { esZurdo: cfg.esZurdo, notacion: cfg.notacion, velocidadAutopista: cfg.velocidadAutopista, calidad: cfg.calidad };
}

/** localStorage puede lanzar (modo privado o sitio bloqueado): en ese caso la config vive solo en memoria. */
function app_crearAlmacen(): ICfgAlmacen {
  try {
    return new CfgAlmacen(window.localStorage);
  } catch {
    return { cargar: () => null, guardar: () => undefined, borrar: () => undefined };
  }
}

/** Presets del usuario en localStorage; si no está disponible, viven solo en memoria durante la sesión. */
function app_crearAlmacenPresets(): IEfxAlmacenPresets {
  try {
    return new EfxAlmacenPresets(window.localStorage);
  } catch {
    let presets: IEfxPreset[] = [];
    return { cargar: () => presets, guardar: (lista) => { presets = [...lista]; } };
  }
}

/** IR de gabinete en IndexedDB; si el navegador no lo ofrece, se guardan solo en memoria. */
function app_crearAlmacenIr(): IEfxAlmacenIr {
  if (typeof window.indexedDB !== 'undefined') return new EfxAlmacenIr(window.indexedDB);
  const irs = new Map<string, IEfxIr>();
  return {
    guardarIr: (ir) => { irs.set(ir.id, ir); return Promise.resolve(); },
    cargarIr: (id) => Promise.resolve(irs.get(id) ?? null),
    listarIrs: () => Promise.resolve([...irs.values()].map(({ id, nombre, durSeg, fechaMs }) => ({ id, nombre, durSeg, fechaMs }))),
  };
}

/** Traduce los campos cambiados de `IConfig` a llamadas sobre cada módulo. */
function app_aplicarConfig(cfg: Readonly<IConfig>, modulos: IAppModulos, claves: readonly (keyof IConfig)[]): void {
  const cambio = new Set(claves);
  const validarCambio = (...lista: (keyof IConfig)[]): boolean => lista.some((clave) => cambio.has(clave));

  if (validarCambio('idDispEntrada') && modulos.captura.esActivo()) void modulos.captura.iniciar(cfg.idDispEntrada);
  if (validarCambio('ganEntrada')) modulos.captura.fijarGanancia(cfg.ganEntrada);
  if (validarCambio('latEntradaMs', 'latSalidaMs')) modulos.reloj.fijarLatencia(cfg.latEntradaMs, cfg.latSalidaMs);
  if (validarCambio('claridadMin', 'framesEstables', 'frecA4Hz')) {
    modulos.detector.actualizarOpciones({ claridadMin: cfg.claridadMin, framesEstables: cfg.framesEstables, frecA4Hz: cfg.frecA4Hz });
  }
  if (validarCambio('frecA4Hz', 'idAfinacion')) {
    modulos.afinador.actualizarOpciones({ afinacion: afn_obtenerAfinacion(cfg.idAfinacion), frecA4Hz: cfg.frecA4Hz, tolCents: AFN_TOL_CENTS });
  }
  if (validarCambio('modoValidacion', 'tolMs')) modulos.sesion.actualizarOpciones({ modo: cfg.modoValidacion, tolMs: cfg.tolMs });
  if (validarCambio('modoValidacion', 'frecA4Hz')) modulos.medidor.actualizarOpciones({ modo: cfg.modoValidacion, frecA4Hz: cfg.frecA4Hz });
  if (validarCambio('idAfinacion')) modulos.vistaMastil.fijarAfinacion(afn_obtenerAfinacion(cfg.idAfinacion));
  if (validarCambio('bpm') && modulos.reloj.obtenerBpmBase() !== cfg.bpm) modulos.reloj.fijarBpm(cfg.bpm);
  if (validarCambio('velocidad')) {
    modulos.reloj.fijarVelocidad(cfg.velocidad);
    modulos.acp.fijarVelocidad(cfg.velocidad);
  }
  if (validarCambio('esProgresivo', 'incBpmProgresivo', 'bpmMaxProgresivo')) {
    modulos.progresivo.fijarOpciones(cfg.esProgresivo, cfg.incBpmProgresivo, cfg.bpmMaxProgresivo);
  }
  if (validarCambio('esLoop')) modulos.loop.fijarActivo(cfg.esLoop);
  if (validarCambio('esMetronomoActivo')) modulos.metronomo.fijarActivo(cfg.esMetronomoActivo);
  if (validarCambio('volMetronomo')) modulos.metronomo.fijarVol(cfg.volMetronomo);
  if (validarCambio('volAcp')) modulos.acp.fijarVolGeneral(cfg.volAcp);
  if (validarCambio('esMonitorActivo')) modulos.monitor.fijarActivo(cfg.esMonitorActivo);
  if (validarCambio('volMonitor')) modulos.monitor.fijarVol(cfg.volMonitor);
  if (validarCambio('esZurdo', 'notacion', 'velocidadAutopista', 'calidad')) {
    const opc = app_crearOpcionesVista(cfg);
    modulos.vistaActual?.actualizarOpciones(opc);
    modulos.vistaAfinador.actualizarOpciones(opc);
    modulos.vistaMastil.actualizarOpciones(opc);
  }
}

/** Pide el micrófono / interfaz. Debe llamarse dentro de un gesto del usuario. */
async function app_activarAudio(modulos: IAppModulos, idDisp: string): Promise<void> {
  await aud_reanudarContexto(modulos.ctx);
  if (!modulos.captura.esActivo()) await modulos.captura.iniciar(idDisp);
}

async function app_iniciar(): Promise<void> {
  const raiz = document.querySelector<HTMLElement>('#app');
  if (raiz === null) throw new Error('No se encontró el elemento #app.');

  const bus = new CorBus();
  const editor = new CfgEstado(bus, app_crearAlmacen());
  const cfg = editor.obtenerConfig();
  const opcVista = app_crearOpcionesVista(cfg);

  // Audio y detección
  const ctx = aud_crearContexto();
  const reloj = new TmpReloj(ctx, bus);
  const captura = new AudCaptura(ctx, bus);
  void new AudObservadorDispositivos(bus).iniciar();
  new AudMonitor(captura, bus).iniciar();
  const detector = new DetDetectorYin(captura, new DetEstimadorPitchy(captura.obtenerTamBuf()), bus, {
    claridadMin: cfg.claridadMin,
    framesEstables: cfg.framesEstables,
    frecA4Hz: cfg.frecA4Hz,
  });
  void detector.iniciar();
  const afinador = new AfnAfinador(bus, { afinacion: afn_obtenerAfinacion(cfg.idAfinacion), frecA4Hz: cfg.frecA4Hz, tolCents: AFN_TOL_CENTS });
  afinador.iniciar();

  // Ejercicios y timing (la sesión debe existir antes que el controlador de ejercicios)
  const sesion = new EjrSesion(bus, reloj, new EjrPuntaje(), { modo: cfg.modoValidacion, tolMs: cfg.tolMs });
  new TmpProgramador(reloj, bus, TMP_PULSOS_COMPAS_DEF).iniciar();
  const metronomo = new TmpMetronomo(ctx, bus);
  const progresivo = new TmpProgresivo(bus, reloj);
  const loop = new TmpLoop(reloj, bus);
  const calibrador = new TmpCalibrador(ctx, bus);
  new TmpControlador(bus, reloj, editor).iniciar();
  new EscControlador(bus, editor, AFN_AFINACIONES).iniciar();
  new GprControlador(bus, new GprImportador()).iniciar();

  // Efectos y monitoreo: la detección sigue leyendo la señal limpia; los efectos solo se escuchan
  const cadena = new EfxCadena(ctx, await efx_crearBloques(ctx));
  captura.obtenerSalidaLimpia().connect(cadena.entrada);
  const monitor = new EfxMonitor(ctx, cadena.salida, ctx.destination);
  await new EfxControlador(
    bus, editor, cadena, new EfxBiblioteca(app_crearAlmacenPresets(), EFX_PRESETS_FABRICA), app_crearAlmacenIr(), ctx,
  ).iniciar();

  // Acompañamiento (alphaTab se descarga con el primer archivo Guitar Pro)
  const elemHostAcp = document.createElement('div');
  document.body.append(elemHostAcp);
  const acp = new AcpReproductor(bus, reloj, { urlSoundfont: import.meta.env.BASE_URL + ACP_RUTA_SOUNDFONT, elemHost: elemHostAcp });

  // Vistas y bucle de dibujo
  const bucle = new CorBucle(reloj);
  const vistaAfinador = new Vc2VistaAfinador(bus, opcVista);
  const vistaMastil = new Vc2VistaMastil(bus, opcVista, afn_obtenerAfinacion(cfg.idAfinacion));
  const medidor = new EjrMedidorCoincidencia(bus, { modo: cfg.modoValidacion, frecA4Hz: cfg.frecA4Hz });
  medidor.iniciar();
  const modulos: IAppModulos = {
    ctx, captura, detector, afinador, sesion, reloj, metronomo, progresivo, loop, acp, bucle,
    monitor, medidor, vistaMastil, vistaAfinador, vistaActual: null,
  };
  bucle.registrarActualizable(sesion);
  bucle.registrarActualizable(loop);
  bucle.registrarActualizable(acp.obtenerSincronizador());
  bucle.registrarDibujable(vistaAfinador);
  bucle.registrarDibujable(vistaMastil);

  // Configuración inicial completa (todas las claves)
  app_aplicarConfig(cfg, modulos, Object.keys(cfg) as (keyof IConfig)[]);

  // Interfaz
  const navegador = new UiNavegador(bus, raiz);
  const practica = new UiPantallaPractica(
    bus, new UiBarraTransporte(bus, editor), new UiMarcador(bus), new UiPanelPistas(bus), new UiMedidorCoincidencia(bus, editor),
  );
  const contenedorVista = practica.obtenerContenedorVista();
  await vistaMastil.montar(practica.obtenerContenedorMastil());
  navegador.registrar('menu', new UiMenu(bus, editor, {
    alActivarAudio: () => app_activarAudio(modulos, editor.obtenerConfig().idDispEntrada),
  }));
  navegador.registrar('practica', practica);
  navegador.registrar('afinador', new UiPantallaAfinador(bus, editor, vistaAfinador));
  navegador.registrar('configuracion', new CfgPantalla(bus, editor, calibrador));
  navegador.registrar('mezclador', new UiPantallaMezclador(bus, editor));
  new UiAtajos(bus, window).iniciar();

  // La vista de práctica vive en un contenedor persistente; se recrea solo al cambiar el tipo de vista.
  let desuscribirDibujable: (() => void) | null = null;
  let tipoVistaAct: TCfgVista | null = null;
  const montarVista = async (tipo: TCfgVista): Promise<void> => {
    if (tipo === tipoVistaAct) return;
    tipoVistaAct = tipo;
    desuscribirDibujable?.();
    modulos.vistaActual?.desmontar();
    contenedorVista.replaceChildren();
    const vista = await app_crearVista(tipo, bus, app_crearOpcionesVista(editor.obtenerConfig()));
    try {
      await vista.montar(contenedorVista);
    } catch (err) {
      console.error('[app] Error al montar la vista:', err);
      bus.emitir('cor:error', { origen: 'app', msj: 'No se pudo abrir la vista elegida; se usa la vista 2D.' });
      tipoVistaAct = null;
      if (tipo !== '2d') await montarVista('2d');
      return;
    }
    modulos.vistaActual = vista;
    desuscribirDibujable = bucle.registrarDibujable(vista);
  };

  bus.suscribir('cfg:cambio', ({ cfg: cfgNueva, claves }) => {
    app_aplicarConfig(cfgNueva, modulos, claves);
    if (claves.includes('vista')) void montarVista(cfgNueva.vista);
  });

  // El navegador exige un gesto del usuario para el audio: el primer clic o tecla lo activa.
  const activarConGesto = (): void => {
    window.removeEventListener('pointerdown', activarConGesto);
    window.removeEventListener('keydown', activarConGesto);
    app_activarAudio(modulos, editor.obtenerConfig().idDispEntrada).catch((err: unknown) => {
      console.error('[app] No se pudo activar el audio:', err);
    });
  };
  window.addEventListener('pointerdown', activarConGesto);
  window.addEventListener('keydown', activarConGesto);

  await montarVista(cfg.vista);
  bucle.iniciar();
  await new EjrControlador(bus, new EjrImportadorJson(), import.meta.env.BASE_URL).iniciar();
  bus.emitir('ui:pantalla', { pantalla: 'menu' });
}

app_iniciar().catch((err: unknown) => {
  console.error('[app] Error al iniciar:', err);
  document.body.textContent = 'No se pudo iniciar la aplicación. Revisa la consola del navegador.';
});

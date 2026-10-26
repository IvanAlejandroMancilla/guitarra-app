# Firmas aprobadas (fases 1–5 + plan de cambios 2)

> Definidas por `nomenclatura-solid` el 2026-10-21; ampliadas el 2026-10-25 para `docs/plan-cambios-2.md` (sección 15 al final).
> Es el contrato que siguen todos los especialistas.
> El registro oficial de nombres sigue siendo `docs/convenciones-nombres.md` §6.

```
CONVENCIONES TRANSVERSALES
- Octava científica: La4=440 Hz, Do4=MIDI 60, Mi2=cuerda 6 al aire. Cuerda 1 = Mi agudo, 6 = Mi grave.
- INota.tiempo y dur en PULSOS. La posición de transporte se maneja en pulsos; los ms se derivan con el bpm efectivo.
- IEventoTemporal.tiempoMs = AudioContext.currentTime*1000 (tiempo absoluto del contexto, no la posición de transporte).
- Prefijo de evento = módulo que lo EMITE. Todo evento lleva un payload objeto (nunca void).
- ESLint: toda declaración `function` (también las locales y las de main.ts) debe ser <abrev>_<verbo>…; para callbacks, funciones flecha.
  No declarar constantes globales booleanas (la regla de booleanos las rechaza).
- Dependencias: cada módulo importa solo de src/core/; excepción: cfg puede importar componentes de src/ui/. main.ts compone.
- Tipos internos de módulo en <abrev>_tipos.ts.
- Verbos extra aprobados: fijar (setter), pausar, listar, emitir, suscribir, desuscribir, montar, desmontar, generar, importar,
  exportar, guardar, borrar, migrar, completar, acotar, suavizar, estimar, programar, compensar, elegir, leer, marcar, mostrar,
  liberar, redimensionar, restablecer, calibrar, cancelar, descargar, vaciar, limpiar, reiniciar,
  renombrar, conectar, desconectar, formatear, redondear, aplicar, agregar, normalizar (2026-10-25).

== 1. CORE (src/core/) ==
- Archivo: src/core/tipos.ts — tipos de datos centrales (no importa nada)
  type TNombreNota = 'Do'|'Do#'|'Re'|'Re#'|'Mi'|'Fa'|'Fa#'|'Sol'|'Sol#'|'La'|'La#'|'Si'
  type TNombreNotaAnglo = 'C'|'C#'|'D'|'D#'|'E'|'F'|'F#'|'G'|'G#'|'A'|'A#'|'B'
  type TIdAfinacion = 'estandar'|'dropD'|'medioTonoAbajo'|'dropC'|'dadgad'|'openG'
  type TEjrModoValidacion = 'estricto'|'flexible'
  type TCfgModoValidacion = TEjrModoValidacion | 'ejercicio'      // 'ejercicio' = usar IEjercicio.modo
  type TCfgVista = '2d'|'guitarHero'|'rocksmith'                  // 2026-10-25 (antes '2d'|'3d'; '3d' se migra a 'guitarHero')
  type TCfgCalidad = 'baja'|'media'|'alta'
  type TCfgNotacion = 'latina'|'anglosajona'
  type TCorResultado<TValor> = { esValido: true; valor: TValor } | { esValido: false; errores: readonly string[] }
  interface IAfinacion { id: TIdAfinacion | 'personalizada'; nombre: string; midiCuerdas: readonly number[] } // idx0 = cuerda 1
  interface INota { nombre: TNombreNota; oct: number; cur?: number; trs?: number; tiempo: number; dur?: number;
                    dedo?: number }   // 2026-10-25: 0 = al aire, 1 índice, 2 medio, 3 anular, 4 meñique
  interface ICorPosMastil { cur: number; trs: number }              // 2026-10-25
  interface IEjercicio { titulo: string; bpm: number; modo: TEjrModoValidacion; notas: INota[];
                         descripcion?: string; afinacion?: IAfinacion; pulsosPorCompas?: number }
  interface IEventoTemporal { tiempoMs: number }
  interface ICorAltura { nombre: TNombreNota; oct: number; midi: number }
  interface ICorNotaFrec extends ICorAltura { frecHz: number; cents: number }
  interface IConfig {
    idDispEntrada: string;            // '' = predeterminado
    ganEntrada: number;               // 0–4, def 1
    latEntradaMs: number;             // 0–500, def 0 (se resta a las detecciones)
    latSalidaMs: number;              // 0–500, def 0 (retraso audible de metrónomo/acp; desplaza la vista)
    claridadMin: number;              // 0.5–0.99, def 0.9
    framesEstables: number;           // 1–10, def 3
    frecA4Hz: number;                 // 430–450, def 440
    modoValidacion: TCfgModoValidacion; // def 'ejercicio'
    tolMs: number;                    // 20–300, def 100
    bpm: number;                      // 30–300, def 80
    velocidad: number;                // 0.5–1, def 1
    esProgresivo: boolean;            // def false
    incBpmProgresivo: number;         // 1–20, def 5
    bpmMaxProgresivo: number;         // 30–300, def 160
    esLoop: boolean;                  // def false
    esMetronomoActivo: boolean;       // def true
    idAfinacion: TIdAfinacion;        // def 'estandar'
    volMetronomo: number;             // 0–1, def 0.7
    volAcp: number;                   // 0–1, def 0.8
    vista: TCfgVista;                 // def 'rocksmith' (2026-10-25; antes '2d')
    calidad: TCfgCalidad;             // def 'media'
    velocidadAutopista: number;       // 0.5–3, def 1
    esZurdo: boolean;                 // def false
    notacion: TCfgNotacion;           // def 'latina'
    esMonitorActivo: boolean;         // def false (2026-10-25) — escuchar la guitarra por la cadena de efectos
    volMonitor: number;               // 0–1, paso 0.01, def 0.5 (2026-10-25)
    idPresetEfx: string;              // def 'fabrica:limpioBrillante' (2026-10-25) — preset activo del mezclador
  }
  (La mezcla por pista NO está en IConfig: es estado de acp.)

- Archivo: src/core/cor_eventos.ts — mapa de eventos y payloads
  interface ICorError { origen: string; msj: string }
  type TAudEstado = 'inactivo'|'solicitando'|'activo'|'denegado'|'error'
  interface IAudEstado { estado: TAudEstado; idDisp: string; msjError: string | null }
  interface IAudDispositivo { id: string; etiqueta: string; esPredeterminado: boolean }
  interface IAudListaDispositivos { disps: readonly IAudDispositivo[] }
  interface IAudNivel extends IEventoTemporal { rms: number; rmsDb: number; picoDb: number; esSaturado: boolean }
  interface IAudOnda extends IEventoTemporal { muestras: Float32Array; frecMuestreoHz: number } // buffer reutilizado: copiar si se guarda
  interface IDetTono extends IEventoTemporal { frecHz: number; claridad: number }
  interface IDetNotaDetectada extends IEventoTemporal, ICorNotaFrec { claridad: number }
  interface IAfnLectura extends IEventoTemporal { nombre: TNombreNota; oct: number; frecHz: number; cents: number;
      curCercana: number; frecRefHz: number; centsCuerda: number; esAfinado: boolean; idAfinacion: TIdAfinacion }
  interface IEjrEntradaCatalogo { id: string; titulo: string; archivo: string; nivel: number; descripcion?: string }
  interface IEjrCatalogo { entradas: readonly IEjrEntradaCatalogo[] }
  type TEjrOrigen = 'json'|'escala'|'gpr'
  interface IEjrCargado { ej: IEjercicio; origen: TEjrOrigen }
  interface IEjrEsperada { nota: INota | null; idxNota: number }
  type TEjrMotivoFallo = 'nota'|'octava'|'temprano'|'tarde'|'omitida'
  interface IEjrMarcador { ptj: number; racha: number; rachaMax: number; aciertos: number; fallos: number; multiplicador: number }
  interface IEjrResultado extends IEventoTemporal { nota: INota; idxNota: number; desvioMs: number;
      motivo: TEjrMotivoFallo | null; detectada: IDetNotaDetectada | null; puntos: number; marcador: IEjrMarcador }
  interface IEjrResumen { titulo: string; marcador: IEjrMarcador; precision: number /*0..1*/; durMs: number }
  type TEscTipoEscala = 'mayor'|'menorNatural'|'pentatonicaMenor'|'pentatonicaMayor'
  interface IEscGenerada { ej: IEjercicio; tonica: TNombreNota; tipo: TEscTipoEscala }
  interface ITmpTransporte extends IEventoTemporal { posPulsos: number; posMs: number; bpm: number; velocidad: number }
  interface ITmpPulso extends IEventoTemporal { idxPulso: number; idxCompas: number; idxPulsoCompas: number; esAcento: boolean }
      // tiempoMs = instante PROGRAMADO del click (llega con TMP_ANTICIPACION_MS de adelanto)
  interface ITmpBpm { bpm: number; bpmAnt: number; esProgresivo: boolean }
  interface ITmpLoop { idxVuelta: number; inicioPulsos: number; finPulsos: number }
  interface IGprPista { idx: number; nombre: string; esPercusion: boolean; esGuitarra: boolean; cantCuerdas: number;
      afinacion: IAfinacion | null; programaMidi: number }
  interface IGprCargado { titulo: string; artista: string; buf: ArrayBuffer; pistas: readonly IGprPista[];
      idxPstGuitarra: number; bpm: number; ej: IEjercicio }
  interface IGprPistaConvertida { idxPst: number; ej: IEjercicio }
  type TAcpEstado = 'sinCargar'|'cargando'|'listo'|'reproduciendo'|'pausado'|'error'
  interface IAcpEstado { estado: TAcpEstado; progresoCarga: number /*0..1*/; msjError: string | null }
  interface IAcpPosicion { posMs: number; posPulsos: number; durTotalMs: number; derivaMs: number }
  interface IAcpMezclaPista { idxPst: number; vol: number; esSolo: boolean; esMute: boolean }
  interface IAcpMezcla { pistas: readonly IAcpMezclaPista[]; idxPstGuitarra: number }
  interface ICfgCambio { cfg: Readonly<IConfig>; claves: readonly (keyof IConfig)[] }
  type TUiPantalla = 'menu'|'practica'|'afinador'|'configuracion'|'mezclador'   // 'mezclador' 2026-10-25
  type TUiAccionTransporte = 'reproducir'|'pausar'|'alternar'|'reiniciar'|'subirBpm'|'bajarBpm'|'alternarLoop'
  interface IUiPantallaSolicitada { pantalla: TUiPantalla }
  interface IUiTransporte { accion: TUiAccionTransporte }
  interface IUiEjercicioElegido { ruta: string }            // relativa a public/ejercicios/
  interface IUiEscalaElegida { tonica: TNombreNota; tipo: TEscTipoEscala; oct: number }
  interface IUiArchivoElegido { archivo: File }
  interface IUiPistaElegida { idxPst: number }

  interface ICorMapaEventos {
    'cor:error': ICorError;
    'aud:estado': IAudEstado;
    'aud:dispositivos': IAudListaDispositivos;
    'aud:nivel': IAudNivel;
    'aud:onda': IAudOnda;
    'det:tono': IDetTono;                 // cada frame con claridad suficiente (lo usa el afinador)
    'det:nota': IDetNotaDetectada;        // tras el filtro de estabilidad (lo usa ejr)
    'det:silencio': IEventoTemporal;
    'afn:lectura': IAfnLectura;
    'ejr:catalogo': IEjrCatalogo;
    'ejr:cargado': IEjrCargado;           // único emisor: EjrControlador
    'ejr:esperada': IEjrEsperada;
    'ejr:acierto': IEjrResultado;
    'ejr:fallo': IEjrResultado;
    'ejr:fin': IEjrResumen;
    'esc:generada': IEscGenerada;
    'tmp:inicio': ITmpTransporte;
    'tmp:pausa': ITmpTransporte;
    'tmp:detencion': ITmpTransporte;      // stop + vuelta a 0
    'tmp:posicion': ITmpTransporte;       // salto (seek o vuelta de loop)
    'tmp:pulso': ITmpPulso;
    'tmp:bpm': ITmpBpm;
    'tmp:loop': ITmpLoop;
    'gpr:cargado': IGprCargado;
    'gpr:pistaConvertida': IGprPistaConvertida;
    'acp:estado': IAcpEstado;
    'acp:posicion': IAcpPosicion;
    'acp:mezcla': IAcpMezcla;
    'cfg:cambio': ICfgCambio;
    'cfg:mezclaPista': IAcpMezclaPista;
    'ui:pantalla': IUiPantallaSolicitada;
    'ui:transporte': IUiTransporte;
    'ui:ejercicio': IUiEjercicioElegido;
    'ui:escala': IUiEscalaElegida;
    'ui:archivoGp': IUiArchivoElegido;
    'ui:pistaGp': IUiPistaElegida;
  }
  type TCorNombreEvento = keyof ICorMapaEventos
  type TCorOyente<TClave extends TCorNombreEvento> = (payload: ICorMapaEventos[TClave]) => void

- Archivo: src/core/cor_contratos.ts
  interface ICorBus {
    emitir<TClave extends TCorNombreEvento>(nombre: TClave, payload: ICorMapaEventos[TClave]): void;
    suscribir<TClave extends TCorNombreEvento>(nombre: TClave, oyente: TCorOyente<TClave>): () => void;
    desuscribir<TClave extends TCorNombreEvento>(nombre: TClave, oyente: TCorOyente<TClave>): void;
    obtenerUltimo<TClave extends TCorNombreEvento>(nombre: TClave): ICorMapaEventos[TClave] | undefined;
  }
  interface ICorCuadro { tiempoCtxMs: number; posPulsos: number; posMs: number; deltaMs: number; bpm: number }
  interface ICorActualizable { actualizar(cuadro: ICorCuadro): void }
  interface ICorDibujable { dibujar(cuadro: ICorCuadro): void }
  interface ICorMontable { montar(contenedor: HTMLElement): Promise<void>; desmontar(): void }
  interface ICorOpcionesVista { esZurdo: boolean; notacion: TCfgNotacion; velocidadAutopista: number; calidad: TCfgCalidad }
  interface ICorVista extends ICorMontable, ICorDibujable {
    redimensionar(anchoPx: number, altoPx: number): void;
    actualizarOpciones(opc: ICorOpcionesVista): void;
  }
  interface ICorReloj {
    obtenerTiempoCtxMs(): number;
    obtenerPosPulsos(): number;                          // posición audible (ya resta latSalidaMs)
    obtenerPosMs(): number;
    obtenerBpm(): number;                                // bpm efectivo = bpm * velocidad
    convertirCtxAPosPulsos(tiempoCtxMs: number): number; // para detecciones (ya resta latEntradaMs)
    esReproduciendo(): boolean;
  }
  interface ICorReproducible { reproducir(): void; pausar(): void; detener(): void }
  interface ICorPosicionable { fijarPosPulsos(posPulsos: number): void }
  interface ICorFuenteAudio {
    obtenerCtx(): AudioContext; leerMuestras(buf: Float32Array): void;
    obtenerFrecMuestreoHz(): number; obtenerTamBuf(): number; esActivo(): boolean;
  }
  interface ICorDetector { iniciar(): Promise<void>; detener(): void; esActivo(): boolean }
  interface ICorImportador {
    readonly extensiones: readonly string[];
    esCompatible(nombreArchivo: string): boolean;
    importar(fuente: ArrayBuffer, nombreArchivo: string): Promise<IEjercicio>;
  }
  interface ICorFuenteConfig { obtenerConfig(): Readonly<IConfig> }
  interface ICorEditorConfig extends ICorFuenteConfig { actualizarConfig(parcial: Partial<IConfig>): void; restablecerConfig(): void }
  interface ICorResultadoCalibracion { latMs: number; desvioMs: number; cantMuestras: number; esConfiable: boolean }
  interface ICorCalibradorLatencia { calibrar(cantClicks: number): Promise<ICorResultadoCalibracion>; cancelar(): void }

- src/core/cor_bus.ts — Clase CorBus implements ICorBus (+ limpiar(): void)
- src/core/cor_bucle.ts — Clase CorBucle(reloj: ICorReloj): registrarActualizable(act): () => void; registrarDibujable(dib): () => void; iniciar(); detener()
- src/core/cor_notas.ts
  COR_NOMBRES_NOTA, COR_NOMBRES_ANGLO, COR_FREC_A4_DEF = 440, COR_MIDI_A4 = 69, COR_CANT_CUERDAS = 6
  cor_frecAMidi(frecHz: number, frecA4Hz?: number): number              // fraccionario
  cor_midiAFrec(midi: number, frecA4Hz?: number): number
  cor_midiANota(midi: number): ICorAltura
  cor_notaAMidi(nombre: TNombreNota, oct: number): number
  cor_frecANota(frecHz: number, frecA4Hz?: number): ICorNotaFrec
  cor_notaAFrec(nombre: TNombreNota, oct: number, frecA4Hz?: number): number
  cor_convertirAAnglo(nombre: TNombreNota): TNombreNotaAnglo
  cor_convertirALatina(nombre: TNombreNotaAnglo): TNombreNota
  cor_convertirTextoANota(texto: string): TNombreNota | null
  cor_calcularMidiCuerda(cur: number, trs: number, afin: IAfinacion): number
  cor_calcularNotaCuerda(cur: number, trs: number, afin: IAfinacion): ICorAltura
  cor_obtenerEtiquetaNota(nombre: TNombreNota, oct: number | undefined, notacion: TCfgNotacion): string
- src/core/cor_tiempo.ts — cor_convertirPulsosAMs(pulsos, bpm), cor_convertirMsAPulsos(ms, bpm)
- src/core/cor_colores.ts — COR_COLORES_CUERDA (idx = cur-1), COR_COLOR_ACIERTO, COR_COLOR_FALLO

== 2. AUD (src/audio/) ==
- aud_constantes.ts: AUD_TAM_FFT = 2048; AUD_GAN_DEF = 1; AUD_GAN_MAX = 4; AUD_INTERVALO_MONITOR_MS = 33; AUD_DB_MIN = -100; AUD_UMBRAL_SATURACION = 0.98
- aud_contexto.ts: aud_crearContexto(): AudioContext (latencyHint 'interactive'; contexto ÚNICO compartido con tmp); aud_reanudarContexto(ctx): Promise<void>
- aud_restricciones.ts: aud_crearRestricciones(idDisp?: string): MediaStreamConstraints (echoCancellation/noiseSuppression/autoGainControl = false, channelCount 1)
- aud_dispositivos.ts: aud_listarDispositivos(): Promise<IAudDispositivo[]>; Clase AudObservadorDispositivos(bus) — iniciar(): Promise<void>; detener() — emite 'aud:dispositivos'
- aud_captura.ts: Clase AudCaptura implements ICorFuenteAudio(ctx, bus) — iniciar(idDisp?): Promise<void>; detener(); fijarGanancia(gan); obtenerAnalizador(): AnalyserNode; emite 'aud:estado'
    + obtenerSalidaLimpia(): AudioNode   (2026-10-25: GainNode de entrada, antes de cualquier efecto; det sigue leyendo el analizador)
- aud_nivel.ts: aud_calcularRms(buf), aud_calcularPico(buf), aud_convertirADb(amp)
- aud_monitor.ts: Clase AudMonitor(fuente: ICorFuenteAudio, bus) — iniciar(); detener(); emite 'aud:onda' y 'aud:nivel'

== 3. DET (src/deteccion/) ==
- det_constantes.ts: DET_FREC_MIN_HZ = 61.74 (Si1: cubre Drop C con margen; sin DET_MARGEN_GRAVE_CENTS); DET_FREC_MAX_HZ = 1318.51; DET_CLARIDAD_DEF = 0.9; DET_FRAMES_ESTABLES_DEF = 3; DET_FRAMES_SILENCIO = 5; DET_RMS_MIN = 0.01; DET_INTERVALO_MS = 20
- det_tipos.ts: IDetOpciones { claridadMin; framesEstables; frecA4Hz }; IDetEstimacion { frecHz; claridad }; IDetEstimador { estimar(buf, frecMuestreoHz): IDetEstimacion }
- det_pitchy.ts: Clase DetEstimadorPitchy implements IDetEstimador(tamBuf) — adaptador único de Pitchy
- det_filtros.ts: det_validarRango(frecHz, minHz, maxHz): boolean; det_validarClaridad(claridad, claridadMin): boolean
- det_estabilidad.ts: Clase DetFiltroEstabilidad(framesEstables) — registrar(midi: number | null): number | null; fijarFramesEstables(cant); reiniciar()
- det_yin.ts: Clase DetDetectorYin implements ICorDetector(fuente: ICorFuenteAudio, estimador: IDetEstimador, bus, opc: IDetOpciones) — actualizarOpciones(opc); emite 'det:tono', 'det:nota', 'det:silencio'

== 4. AFN (src/afinador/) ==
- afn_constantes.ts: AFN_TOL_CENTS = 5; AFN_RANGO_CENTS = 50; AFN_FACTOR_SUAVIZADO = 0.3
- afn_afinaciones.ts: AFN_AFINACIONES: Readonly<Record<TIdAfinacion, IAfinacion>> (midiCuerdas desde la cuerda 1):
     estandar [64,59,55,50,45,40]; dropD [64,59,55,50,45,38]; medioTonoAbajo [63,58,54,49,44,39];
     dropC [62,57,53,48,43,36]; dadgad [62,57,55,50,45,38]; openG [62,59,55,50,43,38]
  AFN_ID_AFINACION_DEF = 'estandar'; afn_obtenerAfinacion(id): IAfinacion
- afn_cents.ts: afn_calcularCents(frecHz, frecRefHz); afn_validarAfinado(cents, tolCents); afn_suavizarCents(centsAnt, centsNuevo, factor)
- afn_tipos.ts: IAfnOpciones { afinacion; frecA4Hz; tolCents }; IAfnCuerdaCercana { cur; midi; frecRefHz; cents }
- afn_cuerdas.ts: afn_obtenerCuerdaCercana(frecHz, afin, frecA4Hz): IAfnCuerdaCercana
- afn_afinador.ts: Clase AfnAfinador(bus, opc: IAfnOpciones) — iniciar(); detener(); actualizarOpciones(opc); escucha 'det:tono', emite 'afn:lectura'

== 5. EJR (src/ejercicios/) ==
- ejr_constantes.ts: EJR_PTS_BASE = 100; EJR_RACHA_POR_MULT = 10; EJR_MULT_MAX = 4; EJR_TOL_MS_DEF = 100; EJR_RUTA_BASE = 'ejercicios/'; EJR_RUTA_CATALOGO = 'ejercicios/indice.json' (relativas a import.meta.env.BASE_URL)
- ejr_tipos.ts: IEjrOpciones { modo: TCfgModoValidacion; tolMs }; IEjrEvaluacion { esAcierto; motivo: TEjrMotivoFallo | null }
- ejr_esquema.ts: ejr_validarEjercicio(valor: unknown): TCorResultado<IEjercicio>
- ejr_importadorJson.ts: Clase EjrImportadorJson implements ICorImportador (extensiones ['json'])
- ejr_validador.ts: ejr_obtenerModo(modoCfg, modoEj); ejr_validarNota(esperada, detectada: ICorAltura, modo); ejr_validarTiempo(desvioMs, tolMs); ejr_validarIntento(esperada, detectada, desvioMs, modo, tolMs): IEjrEvaluacion
- ejr_puntaje.ts: ejr_calcularMultiplicador(racha); ejr_calcularPuntos(desvioMs, tolMs, racha); Clase EjrPuntaje — registrarAcierto(desvioMs, tolMs): number; registrarFallo(); obtenerMarcador(); reiniciar()
- ejr_sesion.ts: Clase EjrSesion implements ICorActualizable(bus, reloj: ICorReloj, puntaje: EjrPuntaje, opc: IEjrOpciones) — cargar(ej); reiniciar(); actualizarOpciones(opc); obtenerNotaEsperada(); obtenerMarcador(); actualizar(cuadro)
    Escucha 'ejr:cargado', 'det:nota' (pos = reloj.convertirCtxAPosPulsos(tiempoMs)), 'tmp:detencion', 'tmp:posicion', 'tmp:loop'. Emite 'ejr:esperada', 'ejr:acierto', 'ejr:fallo', 'ejr:fin'.
- ejr_catalogo.ts: ejr_cargarCatalogo(urlBase): Promise<IEjrEntradaCatalogo[]>; ejr_cargarArchivo(url): Promise<ArrayBuffer>
- ejr_controlador.ts: Clase EjrControlador(bus, importador: ICorImportador, urlBase) — iniciar(): Promise<void>; detener(). ÚNICO emisor de 'ejr:cargado'; emite 'ejr:catalogo'. Escucha 'ui:ejercicio', 'esc:generada', 'gpr:cargado', 'gpr:pistaConvertida'.

== 6. ESC (src/escalas/) ==
- esc_constantes.ts: ESC_TRS_MAX = 22; ESC_ANCHO_CAJA = 4; ESC_PULSOS_POR_NOTA_DEF = 1; ESC_CANT_OCT_DEF = 1; ESC_NOMBRES_TIPO
- esc_intervalos.ts: ESC_INTERVALOS (mayor [0,2,4,5,7,9,11]; menorNatural [0,2,3,5,7,8,10]; pentatonicaMenor [0,3,5,7,10]; pentatonicaMayor [0,2,4,7,9]); esc_calcularMidisEscala(tonica, tipo, oct, cantOct): number[]
- esc_tipos.ts: IEscOpciones { tonica; tipo; oct; cantOct; esIdaVuelta; bpm; modo; afinacion; trsInicial; pulsosPorNota; notacion }; IEscPosicion { cur; trs }
- esc_digitacion.ts: esc_calcularDigitacion(midis, afin, trsInicial): IEscPosicion[]
- esc_generador.ts: esc_generarEscala(opc): IEjercicio; esc_crearTitulo(tonica, tipo, notacion): string
- esc_controlador.ts: Clase EscControlador(bus, fuenteCfg: ICorFuenteConfig, afinaciones: Readonly<Record<TIdAfinacion, IAfinacion>>) — iniciar(); detener(); esActivo(); 'ui:escala' → 'esc:generada'

== 7. TMP (src/timing/) ==
- tmp_constantes.ts: TMP_BPM_DEF = 80; TMP_BPM_MIN = 30; TMP_BPM_MAX = 300; TMP_PASO_BPM = 5; TMP_PULSOS_COMPAS_DEF = 4; TMP_ANTICIPACION_MS = 100; TMP_INTERVALO_PROG_MS = 25;
  TMP_FREC_CLICK_HZ = 1000; TMP_FREC_ACENTO_HZ = 1500; TMP_DUR_CLICK_MS = 30; TMP_VELOCIDAD_MIN = 0.5; TMP_VELOCIDAD_MAX = 1; TMP_PRECISION_MIN_PROG = 0.9; TMP_CANT_CLICKS_CALIB = 8; TMP_INTERVALO_CALIB_MS = 750
- tmp_latencia.ts: tmp_compensarLatencia(posMs, latMs)
- tmp_reloj.ts: Clase TmpReloj implements ICorReloj, ICorReproducible, ICorPosicionable(ctx, bus) — fijarBpm(bpm, esProgresivo?); fijarVelocidad(factor); fijarLatencia(latEntradaMs, latSalidaMs); convertirPulsosACtxMs(posPulsos); obtenerBpmBase(): number; obtenerVelocidad(): number. Emite 'tmp:inicio', 'tmp:pausa', 'tmp:detencion', 'tmp:posicion', 'tmp:bpm'
- tmp_programador.ts: Clase TmpProgramador(reloj: TmpReloj, bus, pulsosPorCompas) — iniciar(); detener(); fijarPulsosPorCompas(cant); emite 'tmp:pulso'
- tmp_click.ts: tmp_programarClick(ctx, destino, tiempoSeg, esAcento, vol)
- tmp_metronomo.ts: Clase TmpMetronomo(ctx, bus) — fijarVol(vol); fijarActivo(esActivo); detener(); escucha 'tmp:pulso'
- tmp_progresivo.ts: tmp_calcularBpmSiguiente(bpmAct, incBpm, bpmMax); Clase TmpProgresivo(bus, reloj: TmpReloj) — fijarOpciones(esActivo, incBpm, bpmMax); detener()
- tmp_loop.ts: Clase TmpLoop implements ICorActualizable(reloj: ICorPosicionable, bus) — fijarRegion(inicioPulsos, finPulsos); fijarActivo(esActivo); emite 'tmp:loop'
- tmp_calibrador.ts: tmp_calcularLatencia(tiemposClickMs, tiemposGolpeMs): ICorResultadoCalibracion; Clase TmpCalibrador implements ICorCalibradorLatencia(ctx, bus)
- tmp_controlador.ts: Clase TmpControlador(bus, reloj: TmpReloj, editor: ICorEditorConfig) — iniciar(); detener(); 'ui:transporte' → reloj; 'ejr:cargado' → fijar bpm y detener

== 8. VC2 (src/vistas/canvas2d/) ==
- vc2_constantes.ts: VC2_PULSOS_VISIBLES = 8; VC2_Y_GOLPE_REL = 0.85; VC2_MAX_PARTICULAS = 300; VC2_RADIO_NOTA_PX = 14
- vc2_tipos.ts: IVc2Geometria { anchoPx; altoPx; yGolpePx; pxPorPulso; anchoCarrilPx; esZurdo }; IVc2Capa { dibujar(ctx, cuadro, geo) }
- vc2_geometria.ts: vc2_calcularGeometria(anchoPx, altoPx, opc); vc2_calcularXCarril(cur | undefined, geo); vc2_calcularYNota(tiempoPulsos, posPulsos, geo)
- Capas IVc2Capa: Vc2Carriles (+ fijarPulsosPorCompas(cant)), Vc2LineaGolpe, Vc2Notas (+ cargar(ej), marcarResultado(idxNota, esAcierto), fijarNotacion(notacion: TCfgNotacion)), Vc2Particulas (+ crearExplosion(xPx, yPx, color)), Vc2Onda (+ fijarMuestras, fijarColor(color: string)), Vc2PanelAfinador (+ fijarLectura(lectura | null), fijarNotacion(notacion: TCfgNotacion))
- vc2_lienzo.ts: Clase Vc2Lienzo — canvas común con ResizeObserver y devicePixelRatio:
    montar(contenedor: HTMLElement, alRedimensionar: () => void): void; redimensionar(): boolean /*true si cambió*/; obtenerCtx(): CanvasRenderingContext2D; esMontado(): boolean; desmontar(): void
- vc2_vista.ts: Clase Vc2Vista implements ICorVista(bus, opc) — escucha 'ejr:cargado', 'ejr:acierto', 'ejr:fallo', 'aud:onda'
- vc2_vistaAfinador.ts: Clase Vc2VistaAfinador implements ICorVista(bus, opc) — escucha 'afn:lectura', 'aud:onda'

== 9. V3D (src/vistas/tres-d/) — three solo en v3d_*; carga diferida con import() desde main ==
- v3d_constantes.ts: V3D_UNIDADES_POR_PULSO = 4; V3D_PULSOS_VISIBLES = 12; V3D_ANCHO_CARRIL = 1; V3D_MAX_NOTAS = 512; V3D_FOV_GRADOS = 55; V3D_TRASTES_VISIBLES = 24
- v3d_tipos.ts: IV3dCapa extends ICorActualizable { readonly objeto: THREE.Object3D; liberar(): void }; IV3dPerfilCalidad { pixelRatioMax; tieneAntialias; tieneSombras; maxParticulas; segmentosOnda }
- v3d_calidad.ts: V3D_PERFILES_CALIDAD: Readonly<Record<TCfgCalidad, IV3dPerfilCalidad>>
- v3d_webgl.ts: v3d_validarWebgl(): boolean
- v3d_geometria.ts: v3d_calcularXCarril(cur | undefined, esZurdo); v3d_calcularZNota(tiempoPulsos, posPulsos, velocidadAutopista)
- V3dEscena (v3d_escena.ts)(lienzo, perfil) — agregar(capa); dibujar(camara); redimensionar(anchoPx, altoPx); liberar()
- V3dCamara (v3d_camara.ts) implements ICorActualizable — obtenerCamara(); redimensionar(aspecto)
- Capas IV3dCapa: V3dAutopista, V3dMarcasTraste, V3dNotas (InstancedMesh; cargar(ej); marcarResultado(idxNota, esAcierto)), V3dParticulas (crearExplosion(x, y, z, color)), V3dCintaOnda (fijarMuestras), V3dEtiquetas
- v3d_vistaGuitarHero.ts (2026-10-25, antes v3d_vista.ts): Clase V3dVistaGuitarHero implements ICorVista(bus, opc) (antes V3dVista) — escucha los mismos eventos que Vc2Vista
  (vista Rocksmith: ver sección 15.B)

== 10. GPR (src/guitar-pro/) — el modelo alphaTab se LEE solo en gpr_lector.ts y gpr_adaptador.ts (gpr_tipos.ts puede hacer `import type`) ==
- gpr_constantes.ts: GPR_TICKS_POR_PULSO = 960; GPR_EXTENSIONES = ['gp','gp3','gp4','gp5','gpx']; GPR_PROGRAMA_GUITARRA_MIN = 24; GPR_PROGRAMA_GUITARRA_MAX = 31
- gpr_tipos.ts: IGprCargador { cargarPartitura(fuente: ArrayBuffer, nombreArchivo): Promise<IGprCargado>; convertirPista(idxPst): IEjercicio }
  IGprCompasTocado { idxCompas: number; inicioTicks: number }
  IGprPartitura { score: model.Score; compases: readonly IGprCompasTocado[] }   // `import type` de alphaTab
- gpr_lector.ts: gpr_leerPartitura(buf: ArrayBuffer): Promise<IGprPartitura>   // asíncrona por carga diferida de alphaTab
- gpr_adaptador.ts: gpr_listarPistas(score): IGprPista[]; gpr_convertirAfinacion(tunings): IAfinacion;
  gpr_convertirPista(score, idxPst: number, compases?: readonly IGprCompasTocado[]): IEjercicio; gpr_obtenerBpm(score); gpr_convertirTicksAPulsos(ticks)
  (Futuro, no implementar: ICorCambioTempo { tiempo: number; bpm: number } en tipos.ts e IEjercicio.cambiosTempo?: readonly ICorCambioTempo[])
  (Verificar numeración de note.string y orden de staff.tunings → cur 1 = Mi agudo. Ignorar silencios, notas muertas y destinos de ligadura. En acordes, solo la nota más aguda.)
- gpr_pistas.ts: gpr_elegirPistaGuitarra(pistas): number
- gpr_importador.ts: Clase GprImportador implements ICorImportador, IGprCargador
- gpr_controlador.ts: Clase GprControlador(bus, cargador: IGprCargador) — iniciar(); detener(); 'ui:archivoGp' → 'gpr:cargado'; 'ui:pistaGp' → 'gpr:pistaConvertida'

== 11. ACP (src/acompanamiento/) ==
- acp_constantes.ts: ACP_RUTA_SOUNDFONT = 'soundfonts/sonivox.sf2'; ACP_DERIVA_MAX_MS = 40; ACP_VOL_DEF = 0.8; ACP_VELOCIDAD_MIN = 0.5; ACP_VELOCIDAD_MAX = 1;
  ACP_TICKS_POR_PULSO = 960   // debe coincidir con GPR_TICKS_POR_PULSO (acp no importa gpr)
- acp_tipos.ts: IAcpOpciones { urlSoundfont: string; elemHost: HTMLElement }; IAcpMotor (interno: subconjunto de AlphaTabApi que usan mezclador y sincronizador)
- acp_api.ts: acp_crearApi(elem, urlSoundfont): alphaTab.AlphaTabApi
- acp_mezclador.ts: Clase AcpMezclador(api) — reiniciar(pistas: readonly Pick<IGprPista,'idx'>[], idxPstGuitarra: number); fijarVolPista; fijarSoloPista; fijarMutePista; fijarVolGeneral; obtenerMezcla(): IAcpMezcla
- acp_sincronizador.ts: Clase AcpSincronizador implements ICorActualizable, ICorPosicionable(api, reloj: ICorReloj, bus) — reloj maestro; corrige si deriva > ACP_DERIVA_MAX_MS; emite 'acp:posicion'
    fijarPosPulsos(posPulsos); reiniciar(): void; liberar(): void. Escucha 'cfg:cambio' y 'acp:estado'
- acp_reproductor.ts: Clase AcpReproductor implements ICorReproducible(bus, reloj: ICorReloj, opc: IAcpOpciones) — cargar(buf, idxPstGuitarra): Promise<void>; fijarVelocidad; fijarVolGeneral; obtenerSincronizador(): ICorActualizable; liberar()
    Escucha 'gpr:cargado', 'gpr:pistaConvertida', 'tmp:inicio', 'tmp:pausa', 'tmp:detencion', 'tmp:posicion', 'cfg:mezclaPista'; emite 'acp:estado', 'acp:mezcla'

== 12. CFG (src/configuracion/) ==
- cfg_constantes.ts: CFG_VERSION = 2 (2026-10-25; antes 1); CFG_CLAVE_ALMACEN = 'guitarra-app:cfg'; CFG_NOMBRE_EXPORTACION = 'guitarra-app-config.json'
- cfg_tipos.ts: ICfgRango { min; max; paso }; TCfgClaveNumerica; ICfgAlmacenado { version; cfg }; ICfgAlmacen { cargar(); guardar(cfg); borrar() }; TCfgMigracion; ICfgSeccion { readonly titulo; montar(contenedor); actualizar(cfg); desmontar() }
- cfg_valoresDef.ts: CFG_VALORES_DEF
- cfg_rangos.ts: CFG_RANGOS
- cfg_validador.ts: cfg_validarConfig(valor: unknown): TCorResultado<IConfig>; cfg_completarConfig(valor: unknown): IConfig; cfg_acotarValor(valor, rango)
- cfg_migraciones.ts: CFG_MIGRACIONES; cfg_migrarConfig(almacenado: unknown): IConfig
- cfg_almacen.ts: Clase CfgAlmacen implements ICfgAlmacen(almacenamiento: Storage)
- cfg_exportador.ts: cfg_exportarJson(cfg): string; cfg_importarJson(texto): TCorResultado<IConfig>
- cfg_estado.ts: Clase CfgEstado implements ICorEditorConfig(bus, almacen: ICfgAlmacen) — emite 'cfg:cambio'
- cfg_pantalla.ts: Clase CfgPantalla implements ICorMontable(bus, editor, calibrador: ICorCalibradorLatencia)
- Secciones ICfgSeccion (editor, bus): CfgSeccionAudio, CfgSeccionLatencia(editor, bus, calibrador), CfgAsistenteLatencia implements ICorMontable(calibrador, editor), CfgSeccionDeteccion, CfgSeccionValidacion, CfgSeccionPractica, CfgSeccionMezcla ('acp:mezcla' → 'cfg:mezclaPista'), CfgSeccionVista, CfgSeccionRespaldo

== 13. UI (src/ui/) ==
- ui_tipos.ts: TUiVarianteBoton; IUiOpcion<TValor>; IUiOpcionesBoton; IUiOpcionesSlider { etiqueta; min; max; paso; valor; unidad?; formatear?; alCambiar }; IUiOpcionesSelector<TValor>; IUiOpcionesInterruptor
- ui_dom.ts: ui_crearElemento(etiqueta, clases?, texto?); ui_vaciarElemento(elem)
- ui_boton.ts: ui_crearBoton(opc)
- UiSlider (ui_slider.ts) — elem; fijarValor. UiSelector<TValor> (ui_selector.ts) — elem; fijarValor; fijarOpciones. UiInterruptor (ui_interruptor.ts) — elem; fijarEstado
- ui_panel.ts: ui_crearPanel(titulo, hijos?)
- ui_archivos.ts: ui_descargarTexto(texto, nombreArchivo, tipoMime); ui_elegirArchivo(aceptar): Promise<File | null>
- UiNavegador (ui_navegador.ts)(bus, contenedor) — registrar(pantalla, montable); mostrar(pantalla)
- UiMenu (ui_menu.ts) implements ICorMontable(bus, fuenteCfg) — emite 'ui:ejercicio', 'ui:escala', 'ui:archivoGp', 'ui:pantalla'
- UiPanelPistas (ui_panelPistas.ts)(bus) — elem; 'gpr:cargado' → 'ui:pistaGp'
- UiPantallaPractica (ui_pantallaPractica.ts) implements ICorMontable(bus, transporte, marcador, panelPistas, medidor: UiMedidorCoincidencia) — obtenerContenedorVista(); obtenerContenedorMastil() (2026-10-25)
- UiPantallaAfinador (ui_pantallaAfinador.ts) implements ICorMontable(editor, vistaAfinador: ICorVista)
- UiBarraTransporte (ui_transporte.ts)(bus, fuenteCfg) — elem; emite 'ui:transporte'
- UiMarcador (ui_marcador.ts)(bus) — elem
- ui_atajos.ts: UI_ATAJOS; Clase UiAtajos(bus, objetivo: Window) — iniciar(); detener()

== 14. APP (src/main.ts) ==
- interface IAppModulos { ctx: AudioContext; captura; detector; afinador; sesion; reloj; metronomo; progresivo; loop; acp; bucle;
    vistaActual: ICorVista | null; vistaAfinador: ICorVista }
- app_iniciar(): Promise<void>
- app_crearVista(tipo: TCfgVista, bus, opc): Promise<ICorVista>  // 2026-10-25: '2d' → Vc2Vista; 'guitarHero' → import('./vistas/tres-d/v3d_vistaGuitarHero');
                                                                 // 'rocksmith' → import('./vistas/tres-d/v3d_vistaRocksmith'); si falla WebGL/import, cae a Vc2Vista y emite 'cor:error'
- app_crearOpcionesVista(cfg: Readonly<IConfig>): ICorOpcionesVista
- app_aplicarConfig(cfg: Readonly<IConfig>, modulos: IAppModulos, claves: readonly (keyof IConfig)[]): void   // aplica solo lo cambiado
- app_crearAlmacen(): ICfgAlmacen   // CfgAlmacen(localStorage); si localStorage lanza, almacén en memoria
- app_activarAudio(modulos: IAppModulos, idDisp: string): Promise<void>   // gesto "Activar guitarra": reanudar ctx, captura, detector, monitor
- Locales de app_iniciar: montarVista, activarConGesto (flechas), desuscribirDibujable, tipoVistaAct; en app_aplicarConfig: validarCambio (flecha)
- esActivo(): boolean también en AudObservadorDispositivos, AudMonitor, AfnAfinador, EjrControlador, EscControlador, TmpProgramador, TmpMetronomo, TmpProgresivo, TmpLoop, TmpCalibrador

== 15. PLAN DE CAMBIOS 2 (2026-10-25) — docs/plan-cambios-2.md ==

--- 15.A CORE ---
- tipos.ts: INota.dedo?: number (0–4); ICorPosMastil { cur: number; trs: number }; TCfgVista = '2d'|'guitarHero'|'rocksmith';
  IConfig + esMonitorActivo: boolean (def false), volMonitor: number (0–1, paso 0.01, def 0.5), idPresetEfx: string (def 'fabrica:limpioBrillante')
- cor_digitacion.ts (NUEVO): COR_DEDO_AIRE = 0; COR_DEDO_MAX = 4;
  cor_validarDedo(valor: unknown): valor is number      // entero 0..COR_DEDO_MAX
- cor_notas.ts: + cor_listarPosicionesNota(nombre: TNombreNota, afin: IAfinacion, trsMin: number, trsMax: number): ICorPosMastil[]
    // todas las (cur, trs) donde suena ese nombre (cualquier octava), orden cur 6→1 y trs ascendente
- cor_efectos.ts (NUEVO; solo tipos del modelo de efectos + 1 constante):
  type TEfxIdBloque = 'fx1'|'fx2'|'amp'|'cab'|'del'|'mod'|'rev'|'eq'
  COR_ORDEN_BLOQUES_EFX: readonly TEfxIdBloque[] = ['fx1','fx2','amp','cab','del','mod','rev','eq']
  type TEfxModeloFx1 = 'compuerta'|'compresor'
  type TEfxModeloFx2 = 'overdrive'|'distorsion'|'fuzz'|'wahAuto'
  type TEfxModeloAmp = 'limpio'|'crunch'|'altaGanancia'|'bajo'
  type TEfxModeloCab = 'combo1x12'|'britanico2x12'|'cerrado4x12'|'bajo4x10'|'ir'
  type TEfxModeloDel = 'digital'|'analogico'|'modulado'
  type TEfxModeloMod = 'chorus'|'phaser'|'flanger'|'tremolo'|'vibrato'
  type TEfxModeloRev = 'sala'|'placa'|'hall'|'resorte'
  type TEfxModeloEq  = 'tresBandas'
  // Todos los parámetros normalizados 0..1 (0.5 = neutro en graves/medios/agudos). La escala física la decide cada bloque.
  interface IEfxParametrosFx1 { umbral: number; relacion: number; ataque: number; liberacion: number; nivel: number }
  interface IEfxParametrosFx2 { gan: number; tono: number; nivel: number; sensibilidad: number; velocidad: number } // sensibilidad/velocidad: wahAuto
  interface IEfxParametrosAmp { gan: number; graves: number; medios: number; agudos: number; nivel: number }
  interface IEfxParametrosCab { filtroGraves: number; filtroAgudos: number; nivel: number }
  interface IEfxParametrosDel { tiempo: number; realimentacion: number; mezcla: number; profundidad: number; velocidad: number } // profundidad/velocidad: modulado
  interface IEfxParametrosMod { velocidad: number; profundidad: number; realimentacion: number; mezcla: number }
  interface IEfxParametrosRev { decaimiento: number; preRetardo: number; tono: number; mezcla: number }
  interface IEfxParametrosEq  { graves: number; medios: number; agudos: number; nivel: number }   // nivel = volumen de salida del preset
  interface IEfxEstadoBloque<TModelo extends string, TParametros> { esActivo: boolean; modelo: TModelo; parametros: TParametros }
  interface IEfxEstadoCab extends IEfxEstadoBloque<TEfxModeloCab, IEfxParametrosCab> { idIr: string | null }  // idIr solo con modelo 'ir'
  interface IEfxBloques {
    fx1: IEfxEstadoBloque<TEfxModeloFx1, IEfxParametrosFx1>; fx2: IEfxEstadoBloque<TEfxModeloFx2, IEfxParametrosFx2>;
    amp: IEfxEstadoBloque<TEfxModeloAmp, IEfxParametrosAmp>; cab: IEfxEstadoCab;
    del: IEfxEstadoBloque<TEfxModeloDel, IEfxParametrosDel>; mod: IEfxEstadoBloque<TEfxModeloMod, IEfxParametrosMod>;
    rev: IEfxEstadoBloque<TEfxModeloRev, IEfxParametrosRev>; eq: IEfxEstadoBloque<TEfxModeloEq, IEfxParametrosEq>;
  }
  interface IEfxPreset { id: string; nombre: string; bloques: IEfxBloques }   // id 'fabrica:<clave>' o 'usuario:<uuid>'
- cor_eventos.ts (NUEVOS payloads y eventos):
  interface IEjrCoincidencia extends IEventoTemporal {
    pct: number;                 // 0..100 (100 = nota correcta y afinada; 0 = otra nota o silencio)
    cents: number;               // desvío respecto de la nota temperada detectada (−50..50); 0 en silencio
    esNotaCorrecta: boolean;     // según ejr_validarNota con el modo efectivo
    esSilencio: boolean;
    idxNota: number;             // idx de la nota esperada; −1 si no hay
    detectada: ICorAltura | null;
  }
  interface IEfxResumenPreset { id: string; nombre: string; esFabrica: boolean }
  interface IEfxListaPresets { presets: readonly IEfxResumenPreset[] }
  interface IEfxPresetActivo { preset: Readonly<IEfxPreset>; esModificado: boolean }
  interface IEfxCadenaCambiada { idPreset: string; idBloque: TEfxIdBloque; bloques: Readonly<IEfxBloques>; esModificado: boolean }
  interface IEfxIrResumen { id: string; nombre: string; durSeg: number; fechaMs: number }
  interface IEfxListaIr { irs: readonly IEfxIrResumen[] }
  interface IEfxIrCargado { ir: IEfxIrResumen }
  interface IEfxExportacion { texto: string; nombreArchivo: string }
  interface IEfxImportacion { cantImportados: number; errores: readonly string[] }
  interface IUiPresetEfxElegido { id: string }
  type TUiBloqueEfxEditado = { [TId in TEfxIdBloque]: { idBloque: TId; estado: IEfxBloques[TId] } }[TEfxIdBloque]
  type TUiGestionPresetEfx =
    | { accion: 'guardar' }                          // sobrescribe el preset de usuario activo
    | { accion: 'guardarComo'; nombre: string }
    | { accion: 'renombrar'; id: string; nombre: string }
    | { accion: 'borrar'; id: string }
    | { accion: 'exportar' }
    | { accion: 'importar'; texto: string }
  ICorMapaEventos +:
    'ejr:coincidencia': IEjrCoincidencia;     // EjrMedidorCoincidencia, como máximo cada EJR_INTERVALO_COINCIDENCIA_MS
    'efx:presets': IEfxListaPresets;          // EfxControlador
    'efx:presetActivo': IEfxPresetActivo;     // EfxControlador (al elegir, guardar, renombrar o importar)
    'efx:cadena': IEfxCadenaCambiada;         // EfxControlador (cada edición de bloque)
    'efx:irs': IEfxListaIr;                   // EfxControlador
    'efx:irCargado': IEfxIrCargado;           // EfxControlador
    'efx:exportacion': IEfxExportacion;       // EfxControlador → la UI descarga con ui_descargarTexto
    'efx:importacion': IEfxImportacion;       // EfxControlador
    'ui:presetEfx': IUiPresetEfxElegido;      // UiListaPresets
    'ui:bloqueEfx': TUiBloqueEfxEditado;      // UiPantallaMezclador (desde UiBloqueEfecto / UiSelectorIr)
    'ui:gestionPresetEfx': TUiGestionPresetEfx; // UiListaPresets
    'ui:archivoIr': IUiArchivoElegido;        // UiSelectorIr (reutiliza el payload de 'ui:archivoGp')

--- 15.A AUD ---
- AudCaptura + obtenerSalidaLimpia(): AudioNode — devuelve el GainNode de entrada (post ganancia, pre efectos). El analizador sigue
  colgando de ese nodo, así det recibe siempre la señal limpia. Sin monitoreo dentro de aud.

--- 15.A EJR ---
- ejr_esquema.ts: validarNota acepta `dedo` (cor_validarDedo). Errores: dedo fuera de 0..4; dedo sin trs; (trs === 0) !== (dedo === 0).
- ejr_tipos.ts: + IEjrOpcionesCoincidencia { modo: TCfgModoValidacion; frecA4Hz: number }
- ejr_coincidencia.ts (NUEVO, puro): EJR_CENTS_COINCIDENCIA_CERO = 50;
  ejr_calcularPctCoincidencia(cents: number, esNotaCorrecta: boolean): number
    // !esNotaCorrecta → 0; si no: 100 × (1 − |cents| / EJR_CENTS_COINCIDENCIA_CERO), acotado 0..100
  (esNotaCorrecta se obtiene con ejr_validarNota existente; no se crea otra función.)
- ejr_medidorCoincidencia.ts (NUEVO): Clase EjrMedidorCoincidencia(bus: ICorBus, opc: IEjrOpcionesCoincidencia)
    iniciar(): void; detener(): void; esActivo(): boolean; actualizarOpciones(opc: IEjrOpcionesCoincidencia): void
    Escucha 'ejr:cargado' (modo efectivo = ejr_obtenerModo), 'ejr:esperada', 'det:tono' (cor_frecANota con frecA4Hz), 'det:silencio'.
    Emite 'ejr:coincidencia'. Internas: EJR_INTERVALO_COINCIDENCIA_MS = 50; EJR_FACTOR_SUAVIZADO_COINCIDENCIA = 0.35.
- Ejercicios JSON (public/ejercicios/): convención de archivo = kebab-case ASCII en minúsculas, sin tildes ni ñ: `<tema>[-<variante>].json`;
  `id` del catálogo = nombre del archivo sin `.json`; las cuerdas se numeran 1–6 (1 = Mi agudo).
    primera-posicion-cuerda-6.json … primera-posicion-cuerda-1.json   (nivel 1; notas naturales trastes 0–3, una cuerda)
    primera-posicion-todas.json                                          (nivel 1; las seis cuerdas)
    notas-cuerda-6.json … notas-cuerda-1.json                            (nivel 2; naturales del traste 0 al 12)
    encontrar-nota.json                                                  (nivel 3; modo "flexible", notas sin cur/trs/dedo)
  Todas las notas con cur/trs llevan `dedo`. Se recomienda agregar `dedo` también a los JSON existentes con cur/trs.

--- 15.A ESC ---
- esc_tipos.ts: IEscPosicion extends ICorPosMastil { dedo: number }   (antes { cur; trs })
- esc_digitacion.ts: + esc_calcularDedo(trs: number, trsMin: number): number
    // trs 0 → 0; si no: acotar(trs − max(trsMin, 1) + 1, 1, 4). esc_calcularDigitacion completa `dedo` con ella.
- esc_generador.ts: copia `dedo` de IEscPosicion a cada INota.

--- 15.A VC2: mástil con dedeo ---
- vc2_constantes.ts +: VC2_TRS_MAX_MASTIL = 12; VC2_CANT_SIGUIENTES_MASTIL = 3; VC2_ALFA_SIGUIENTE_MASTIL = 0.35
  (internas: VC2_TRASTES_CON_MARCA_MASTIL = [3,5,7,9,12], VC2_RADIO_DEDO_PX, VC2_COLOR_DIAGRAMA)
- vc2_tipos.ts +:
  interface IVc2RangoMastil { trsMin: number; trsMax: number }
  interface IVc2GeoMastil { anchoPx: number; altoPx: number; margenIzqPx: number; margenSupPx: number; anchoTrastePx: number;
                            separacionCuerdasPx: number; trsMin: number; trsMax: number; esZurdo: boolean }
  interface IVc2MarcaMastil extends ICorPosMastil { dedo: number | undefined; etiqueta: string; esPrincipal: boolean }
  interface IVc2CapaMastil { dibujar(ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil): void }
- vc2_geometriaMastil.ts (puro):
  vc2_calcularRangoMastil(trsNotas: readonly number[]): IVc2RangoMastil       // 0..12 si todo cabe; si no, la zona necesaria
  vc2_calcularGeoMastil(anchoPx: number, altoPx: number, rango: IVc2RangoMastil, esZurdo: boolean): IVc2GeoMastil
  vc2_calcularXTrasteMastil(trs: number, geo: IVc2GeoMastil): number         // centro de la casilla; 0 = al aire, antes de la cejuela
  vc2_calcularYCuerdaMastil(cur: number, geo: IVc2GeoMastil): number         // 6.ª arriba, 1.ª abajo (igual que la vista Rocksmith)
- vc2_marcasMastil.ts (puro):
  vc2_crearMarcasMastil(notas: readonly INota[], idxEsperada: number, afin: IAfinacion, notacion: TCfgNotacion): IVc2MarcaMastil[]
    // esperada (esPrincipal) + VC2_CANT_SIGUIENTES_MASTIL siguientes; nota sin cur/trs → todas sus posiciones 0..12 (cor_listarPosicionesNota)
- Capas IVc2CapaMastil: Vc2DiagramaMastil (vc2_diagramaMastil.ts: cuerdas, trastes, marcas de posición, números)
                        Vc2MarcasDedo (vc2_marcasDedo.ts) + fijarMarcas(marcas: readonly IVc2MarcaMastil[]): void
- vc2_vistaMastil.ts: Clase Vc2VistaMastil implements ICorVista(bus: ICorBus, opc: ICorOpcionesVista, afin: IAfinacion)
    + fijarAfinacion(afin: IAfinacion): void   (la afinación del ejercicio, si viene, tiene prioridad)
    Usa Vc2Lienzo. Escucha 'ejr:cargado', 'ejr:esperada'. Redibuja solo si cambió algo (dibujar(cuadro) barato).

--- 15.A EFX (NUEVO MÓDULO, src/efectos/) — Web Audio; solo importa src/core/ ---
- efx_constantes.ts: EFX_ID_PRESET_DEF = 'fabrica:limpioBrillante'; EFX_PREFIJO_FABRICA = 'fabrica:'; EFX_PREFIJO_USUARIO = 'usuario:';
  EFX_CLAVE_ALMACEN = 'guitarra-app:presets'; EFX_NOMBRE_EXPORTACION = 'guitarra-app-presets.json'; EFX_VERSION_PRESETS = 1;
  EFX_NOMBRE_BD_IR = 'guitarra-app-ir'; EFX_VERSION_BD_IR = 1; EFX_NOMBRE_COLECCION_IR = 'ir'; EFX_TAM_MAX_IR_BYTES = 10_485_760;
  EFX_DUR_MAX_IR_SEG = 5; EFX_LARGO_MAX_NOMBRE = 40; EFX_MAX_PRESETS_USUARIO = 100; EFX_DUR_FUNDIDO_SEG = 0.02; EFX_TAM_CURVA = 4096
- efx_tipos.ts (internos del módulo; main.ts puede importar estos tipos):
  type TEfxTipoCurva = 'suave'|'dura'|'asimetrica'|'fuzz'|'valvula'
  interface IEfxBloqueAudio<TModelo extends string, TParametros> {
    readonly entrada: AudioNode; readonly salida: AudioNode;
    fijarModelo(modelo: TModelo): void; fijarParametros(parametros: Readonly<TParametros>): void;
    fijarActivo(esActivo: boolean): void; esActivo(): boolean; liberar(): void;
  }
  interface IEfxBloqueCabAudio extends IEfxBloqueAudio<TEfxModeloCab, IEfxParametrosCab> { fijarIr(buf: AudioBuffer | null): void }
  interface IEfxBloquesAudio { fx1: IEfxBloqueAudio<TEfxModeloFx1, IEfxParametrosFx1>; fx2: …Fx2; amp: …Amp; cab: IEfxBloqueCabAudio;
                               del: …Del; mod: …Mod; rev: …Rev; eq: …Eq }
  interface IEfxCadena {
    readonly entrada: AudioNode; readonly salida: AudioNode;
    fijarBloques(bloques: Readonly<IEfxBloques>): void;
    fijarBloque<TId extends TEfxIdBloque>(id: TId, estado: Readonly<IEfxBloques[TId]>): void;
    fijarIr(buf: AudioBuffer | null): void; liberar(): void;
  }
  interface IEfxArchivoPresets { version: number; presets: IEfxPreset[] }      // formato de localStorage y de exportación
  interface IEfxAlmacenPresets { cargar(): IEfxPreset[]; guardar(presets: readonly IEfxPreset[]): void }
  interface IEfxBiblioteca {
    listarPresets(): IEfxResumenPreset[]; obtenerPreset(id: string): IEfxPreset | null;
    guardarPreset(id: string, bloques: Readonly<IEfxBloques>): IEfxPreset | null;   // null si es de fábrica o no existe
    guardarPresetComo(nombre: string, bloques: Readonly<IEfxBloques>): IEfxPreset;
    renombrarPreset(id: string, nombre: string): boolean; borrarPreset(id: string): boolean;
    importarPresets(presets: readonly IEfxPreset[]): number; exportarPresets(): IEfxPreset[];   // solo los de usuario
  }
  interface IEfxIr extends IEfxIrResumen { buf: ArrayBuffer }                 // .wav original
  interface IEfxAlmacenIr { guardarIr(ir: IEfxIr): Promise<void>; cargarIr(id: string): Promise<IEfxIr | null>; listarIrs(): Promise<IEfxIrResumen[]> }
- efx_escalas.ts (puro): efx_convertirRelALineal(rel, min, max): number; efx_convertirRelAExponencial(rel, min, max): number; efx_convertirDbAGan(db): number
- efx_curvas.ts (puro): efx_crearCurvaSaturacion(tipo: TEfxTipoCurva, ganRel: number, cantMuestras: number): Float32Array<ArrayBuffer>
- efx_aleatorio.ts (puro): efx_crearAleatorio(semilla: number): () => number      // determinista, para impulsos reproducibles
- efx_impulsos.ts (puro):
  efx_generarImpulsoReverb(frecMuestreoHz: number, modelo: TEfxModeloRev, decaimientoRel: number, semilla: number): Float32Array<ArrayBuffer>[]  // 2 canales
  efx_generarImpulsoGabinete(frecMuestreoHz: number, modelo: Exclude<TEfxModeloCab, 'ir'>): Float32Array<ArrayBuffer>
- efx_conmutador.ts: Clase EfxConmutador(ctx: BaseAudioContext) — readonly entrada: GainNode; readonly salida: GainNode;
    conectarEfecto(entradaEfecto: AudioNode, salidaEfecto: AudioNode): void; fijarActivo(esActivo): void; esActivo(): boolean; liberar(): void
    // bypass con fundido EFX_DUR_FUNDIDO_SEG; cada bloque lo usa por composición
- Bloques (cada uno implements IEfxBloqueAudio<…>, constructor (ctx: BaseAudioContext)):
  EfxBloqueFx1 (efx_bloqueFx1.ts), EfxBloqueFx2 (efx_bloqueFx2.ts), EfxBloqueAmp (efx_bloqueAmp.ts),
  EfxBloqueCab (efx_bloqueCab.ts, implements IEfxBloqueCabAudio), EfxBloqueDel (efx_bloqueDel.ts), EfxBloqueMod (efx_bloqueMod.ts),
  EfxBloqueRev (efx_bloqueRev.ts), EfxBloqueEq (efx_bloqueEq.ts)
  (NO USADOS: EfxProcesadorCompuerta, EFX_NOMBRE_PROCESADOR_COMPUERTA, efx_registrarProcesadores — no hizo falta AudioWorklet.)
- efx_rampas.ts: efx_fijarParametro(parametroAudio: AudioParam, valor: number, ctx: BaseAudioContext): void   // rampa sin clics
- efx_convolutor.ts: Clase EfxConvolutor(ctx) — readonly entrada; readonly salida; fijarImpulso(buf: AudioBuffer | null): void; liberar(): void
- efx_curvas.ts +: efx_calcularCompensacionGan(ganRel: number): number; efx_crearCurvaRectificador(cantMuestras: number): Float32Array<ArrayBuffer>;
  EFX_GAN_MAX_CURVA = 200
- efx_fabrica.ts: efx_crearBloques(ctx: AudioContext): Promise<IEfxBloquesAudio>    // async por si hay worklets
- efx_cadena.ts: Clase EfxCadena implements IEfxCadena(ctx: BaseAudioContext, bloques: IEfxBloquesAudio) — conecta en el orden COR_ORDEN_BLOQUES_EFX
- efx_presetsFabrica.ts: EFX_BLOQUES_DEF: Readonly<IEfxBloques> (neutro; base para completar);
  EFX_PRESETS_FABRICA: readonly IEfxPreset[] — ids/nombres:
    'fabrica:limpioBrillante' "Limpio brillante"; 'fabrica:crunchClasico' "Crunch clásico"; 'fabrica:rock' "Rock"; 'fabrica:metal' "Metal";
    'fabrica:soloDelay' "Solo con delay"; 'fabrica:ambiente' "Ambiente"; 'fabrica:funkWah' "Funk con wah"; 'fabrica:blues' "Blues"
- efx_esquema.ts (puro): efx_validarPreset(valor: unknown): TCorResultado<IEfxPreset>   // completa campos faltantes con EFX_BLOQUES_DEF
  efx_validarArchivoIr(nombreArchivo: string, tamBytes: number): TCorResultado<string>       // valor = nombre visible sin extensión
- efx_exportador.ts (puro): efx_exportarPresets(presets: readonly IEfxPreset[]): string; efx_importarPresets(texto: string): TCorResultado<IEfxPreset[]>
- efx_almacenPresets.ts: Clase EfxAlmacenPresets implements IEfxAlmacenPresets(almacenamiento: Storage)
- efx_biblioteca.ts: Clase EfxBiblioteca implements IEfxBiblioteca(almacen: IEfxAlmacenPresets, presetsFabrica: readonly IEfxPreset[])
- efx_almacenIr.ts: Clase EfxAlmacenIr implements IEfxAlmacenIr(fabricaBd: IDBFactory)
- efx_monitor.ts: Clase EfxMonitor(ctx: BaseAudioContext, fuente: AudioNode, destino: AudioNode)
    fijarActivo(esActivo: boolean): void; fijarVol(vol: number): void; esActivo(): boolean; liberar(): void
    // apagado = desconecta de `destino` (no procesa); fundido al encender/apagar
- efx_controlador.ts: Clase EfxControlador(bus: ICorBus, editor: ICorEditorConfig, cadena: IEfxCadena, biblioteca: IEfxBiblioteca,
                                            almacenIr: IEfxAlmacenIr, ctx: BaseAudioContext)
    iniciar(): Promise<void>; detener(): void; esActivo(): boolean
    Escucha 'ui:presetEfx', 'ui:bloqueEfx', 'ui:gestionPresetEfx', 'ui:archivoIr', 'cfg:cambio' (solo idPresetEfx; no-op si ya está activo).
    Emite 'efx:presets', 'efx:presetActivo', 'efx:cadena', 'efx:irs', 'efx:irCargado', 'efx:exportacion', 'efx:importacion', 'cor:error' (origen 'efx').
    Persiste el preset elegido con editor.actualizarConfig({ idPresetEfx }). id desconocido → EFX_ID_PRESET_DEF.

--- 15.B V3D (threejs-autopista) ---
- RENOMBRES: v3d_vista.ts → v3d_vistaGuitarHero.ts; V3dVista → V3dVistaGuitarHero; IV3dMontaje → IV3dMontajeGuitarHero;
  V3D_EJ_VACIO se mueve a v3d_constantes.ts (exportada, la usan ambas vistas). Se conservan V3dAutopista, V3dMarcasTraste, V3dNotas,
  V3dEtiquetas, V3dCamara, V3dCintaOnda (son de la vista Guitar Hero). Textos: "Autopista Guitar Hero". Se quita el re-export de v3d_validarWebgl.
- v3d_lienzo.ts (NUEVO, compartido): v3d_crearLienzo(contenedor: HTMLElement, etiquetaAccesible: string): HTMLCanvasElement
- v3d_texturas.ts (NUEVO, compartido): v3d_crearAtlasNumeros(cantNumeros: number, tamCeldaPx: number): CanvasTexture  // números de traste 0..24
- v3d_tipos.ts +: interface IV3dZonaTrastes { trsMin: number; trsMax: number }
- v3d_constantesRocksmith.ts (NUEVO). Ejes: X = trastes, Y = cuerdas, Z = tiempo (cuerdas en z = 0, futuro z < 0):
  V3D_ANCHO_CASILLA = 1.4; V3D_SEPARACION_CUERDAS = 0.28; V3D_Y_CUERDA_1 = 0.15; V3D_ANCHO_ZONA_MIN = 4; V3D_PULSOS_ANTICIPO_ZONA = 4;
  V3D_CONSTANTE_CAMARA_MS = 400; V3D_DIST_GUIA = 16; V3D_COLOR_ZONA = '#2a3d66'   (se reutilizan V3D_TRASTES_VISIBLES, V3D_UNIDADES_POR_PULSO, V3D_COLOR_SIN_CUERDA)
- v3d_geometriaRocksmith.ts (puro):
  v3d_calcularXCasilla(trs: number, esZurdo: boolean): number          // centro de la casilla (0 = al aire, antes de la cejuela)
  v3d_calcularXBarraTraste(trs: number, esZurdo: boolean): number      // barra metálica al final de la casilla trs
  v3d_calcularYCuerda(cur: number): number                             // 6.ª arriba … 1.ª abajo
  v3d_calcularZonaTrastes(notas: readonly INota[], orden: ArrayLike<number>, posPulsos: number, pulsosAnticipo: number): IV3dZonaTrastes | null
  v3d_calcularXZona(zona: IV3dZonaTrastes, esZurdo: boolean): number
  v3d_suavizarValor(valorAct: number, valorObjetivo: number, deltaMs: number, constanteMs: number): number
  (Z: se reutiliza v3d_calcularZNota; orden/búsqueda: v3d_ordenarNotas, v3d_obtenerIdxPrimeraNota)
- Agregados tras implementar: v3d_validarPosMastil(nota: INota): nota is INota & ICorPosMastil (v3d_geometriaRocksmith.ts);
  V3D_ZONA_DEF: Readonly<IV3dZonaTrastes> (v3d_constantesRocksmith.ts);
  v3d_crearGeoCeldaAtlas(idxCelda, cantNumeros, ancho, alto): PlaneGeometry; v3d_crearTexturaTexto(texto, anchoPx, altoPx, color): CanvasTexture (v3d_texturas.ts)
- V3dCamaraRocksmith (v3d_camaraRocksmith.ts)(opc: ICorOpcionesVista) implements ICorActualizable — obtenerCamara(): PerspectiveCamera; redimensionar(aspecto: number): void;
    fijarZona(zona: IV3dZonaTrastes | null): void   // seguimiento suave en X con v3d_suavizarValor
- Capas IV3dCapa:
  V3dCuerdas (v3d_cuerdas.ts)(opc: ICorOpcionesVista) + marcarCuerda(cur: number, esAcierto: boolean): void
  V3dReglaTrastes (v3d_reglaTrastes.ts)(opc) + fijarZona(zona: IV3dZonaTrastes | null): void    // barras, números 0–24 debajo, resalte de la zona
  V3dGemas (v3d_gemas.ts)(opc, perfil: IV3dPerfilCalidad) + cargar(ej: IEjercicio): void; marcarResultado(idxNota: number, esAcierto: boolean): void
      // InstancedMesh, color de cuerda, número de traste (atlas), destello al acertar, rojo (COR_COLOR_FALLO) al fallar
  V3dColas (v3d_colas.ts)(opc, perfil) + cargar(ej); marcarResultado(idxNota, esAcierto)
  V3dGuias (v3d_guias.ts)(opc) + cargar(ej)                                                      // línea vertical gema → cuerda al acercarse
  V3dBandasNota (v3d_bandasNota.ts)(opc) + cargar(ej); marcarResultado(idxNota, esAcierto)      // notas sin cur/trs: banda con el nombre
  V3dParticulas (reutilizada) — crearExplosion(x, y, z, color)
- v3d_vistaRocksmith.ts: Clase V3dVistaRocksmith implements ICorVista(bus: ICorBus, opc: ICorOpcionesVista)
    Interna: IV3dMontajeRocksmith. Escucha 'ejr:cargado', 'ejr:esperada', 'ejr:acierto', 'ejr:fallo', 'tmp:detencion', 'tmp:posicion', 'tmp:loop'.
    En dibujar: zona = v3d_calcularZonaTrastes(…) → camara.fijarZona(zona); reglaTrastes.fijarZona(zona).

--- 15.C CFG / UI (configuracion-controles) ---
- cfg_constantes.ts: CFG_VERSION = 2
- cfg_migraciones.ts: CFG_MIGRACIONES[1] (v1 → v2): vista '3d' → 'guitarHero' (otros valores se conservan; '2d' sigue '2d'); los campos nuevos los completa cfg_completarConfig.
  cfg_importarJson debe pasar por cfg_migrarConfig para aceptar respaldos v1.
- cfg_valoresDef.ts: vista 'rocksmith'; esMonitorActivo false; volMonitor 0.5; idPresetEfx 'fabrica:limpioBrillante' (literal: cfg no importa efx)
- cfg_rangos.ts: + volMonitor { min: 0, max: 1, paso: 0.01 }
- cfg_validador.ts: idPresetEfx = string no vacío, largo ≤ CFG_LARGO_MAX_ID_PRESET (= 64, interna)
- cfg_seccionVista.ts: CFG_OPCIONES_VISTA = [{ '2d', 'Liviana (Canvas 2D)' }, { 'guitarHero', 'Autopista Guitar Hero (3D)' }, { 'rocksmith', 'Rocksmith (3D)' }]
- cfg_seccionMonitor.ts (NUEVO): Clase CfgSeccionMonitor implements ICfgSeccion(editor, bus) — titulo 'Monitoreo'; reutiliza UiControlMonitor
- cfg_pantalla.ts: registra CfgSeccionMonitor
- ui_pantallaPractica.ts: constructor(bus, transporte, marcador, panelPistas, medidor: UiMedidorCoincidencia); + obtenerContenedorMastil(): HTMLElement
    Layout 100dvh: cabecera / cuerpo (vista flex:1 min-height:0 + lateral [marcador, medidor]) / mástil / transporte (siempre visible).
    Botón "Mezclador" en la cabecera → 'ui:pantalla' { pantalla: 'mezclador' }.
    Clases CSS: ui-practica__lateral, ui-practica__mastil (BEM existente).
- ui_medidorCoincidencia.ts (NUEVO): Clase UiMedidorCoincidencia(bus: ICorBus, fuenteCfg?: ICorFuenteConfig) — readonly elem: HTMLElement; escucha 'ejr:coincidencia'
    Clases CSS: ui-medidor, ui-medidor__barra, ui-medidor__valor
- ui_tipos.ts +:
  interface IUiDescriptorParametroEfx<TClave extends string> { clave: TClave; etiqueta: string; modelos?: readonly string[] }  // visible solo en esos modelos
  interface IUiDescriptorBloqueEfx<TId extends TEfxIdBloque> {
    id: TId; titulo: string;
    modelos: readonly IUiOpcion<IEfxBloques[TId]['modelo']>[];
    parametros: readonly IUiDescriptorParametroEfx<Extract<keyof IEfxBloques[TId]['parametros'], string>>[];
  }
  type TUiDescriptoresEfx = { readonly [TId in TEfxIdBloque]: IUiDescriptorBloqueEfx<TId> }
- ui_bloquesEfx.ts: UI_BLOQUES_EFX: TUiDescriptoresEfx   (títulos, modelos y etiquetas en español; orden visual = COR_ORDEN_BLOQUES_EFX)
- ui_bloqueEfecto.ts: Clase UiBloqueEfecto<TId extends TEfxIdBloque>(descriptor: IUiDescriptorBloqueEfx<TId>, alCambiar: (estado: IEfxBloques[TId]) => void)
    readonly elem: HTMLElement; fijarEstado(estado: Readonly<IEfxBloques[TId]>): void
- ui_selectorIr.ts: Clase UiSelectorIr(bus: ICorBus, alElegir: (idIr: string | null) => void)
    readonly elem; fijarIdIr(idIr: string | null): void; liberar(): void — escucha 'efx:irs', 'efx:irCargado'; botón "Cargar IR (.wav)" → 'ui:archivoIr'
- ui_listaPresets.ts: Clase UiListaPresets(bus: ICorBus) — readonly elem; liberar(): void
    escucha 'efx:presets', 'efx:presetActivo', 'efx:cadena', 'efx:exportacion' (descarga con ui_descargarTexto), 'efx:importacion';
    emite 'ui:presetEfx', 'ui:gestionPresetEfx'
- ui_controlMonitor.ts: Clase UiControlMonitor(editor: ICorEditorConfig, bus: ICorBus) — readonly elem; liberar(): void
    interruptor "Escuchar mi guitarra" (esMonitorActivo), slider volMonitor, aviso UI_MSJ_AVISO_MONITOR (interna): usar audífonos; el navegador agrega latencia
- ui_pantallaMezclador.ts: Clase UiPantallaMezclador implements ICorMontable(bus: ICorBus, editor: ICorEditorConfig)
    Compone UiListaPresets, 8 UiBloqueEfecto, UiSelectorIr (junto al bloque cab), UiControlMonitor. Sin lógica de audio.
    Escucha 'efx:presetActivo' / 'efx:cadena' para fijarEstado; emite 'ui:bloqueEfx'. "← Volver" → pantalla anterior
    (la recuerda suscribiéndose a 'ui:pantalla' desde el constructor; def 'menu'). Clases CSS: ui-mezclador, ui-bloque-efx, ui-presets, ui-monitor
- ui_menu.ts: botón "Mezclador" → 'ui:pantalla' { pantalla: 'mezclador' }

--- 15.D GPR ---
- gpr_adaptador.ts: + gpr_convertirDedo(dedoGp: number, trs: number): number | undefined
    // lee note.leftHandFinger (alphaTab Fingers: Unknown −2, NoOrDead −1, Thumb 0, Index 1 … Little 4)
    // trs 0 → 0; 1..4 → igual; pulgar/desconocido → undefined. gpr_convertirPista asigna INota.dedo si no es undefined.

--- 15.E APP (main.ts) ---
- IAppModulos + monitor: EfxMonitor; medidor: EjrMedidorCoincidencia; vistaMastil: Vc2VistaMastil
- app_crearVista(tipo: TCfgVista, bus, opc): Promise<ICorVista> — '2d' | 'guitarHero' | 'rocksmith' (ver §14)
- app_crearAlmacenPresets(): IEfxAlmacenPresets   // EfxAlmacenPresets(localStorage); si lanza, en memoria
- app_crearAlmacenIr(): IEfxAlmacenIr             // EfxAlmacenIr(indexedDB); si no hay IndexedDB, en memoria
- app_aplicarConfig +: 'esMonitorActivo' → monitor.fijarActivo; 'volMonitor' → monitor.fijarVol;
    'modoValidacion' | 'frecA4Hz' → medidor.actualizarOpciones; 'idAfinacion' → vistaMastil.fijarAfinacion(afn_obtenerAfinacion(…));
    'esZurdo' | 'notacion' | 'velocidadAutopista' | 'calidad' → también vistaMastil.actualizarOpciones. (idPresetEfx lo atiende EfxControlador.)
- Composición: cadena = new EfxCadena(ctx, await efx_crearBloques(ctx)); captura.obtenerSalidaLimpia().connect(cadena.entrada);
    monitor = new EfxMonitor(ctx, cadena.salida, ctx.destination);
    await new EfxControlador(bus, editor, cadena, new EfxBiblioteca(app_crearAlmacenPresets(), EFX_PRESETS_FABRICA), app_crearAlmacenIr(), ctx).iniciar();
    new EjrMedidorCoincidencia(bus, { modo: cfg.modoValidacion, frecA4Hz: cfg.frecA4Hz }).iniciar();
    vistaMastil = new Vc2VistaMastil(bus, opcVista, afn_obtenerAfinacion(cfg.idAfinacion)); await vistaMastil.montar(practica.obtenerContenedorMastil());
    bucle.registrarDibujable(vistaMastil);
    practica = new UiPantallaPractica(bus, transporte, marcador, panelPistas, new UiMedidorCoincidencia(bus));
    navegador.registrar('mezclador', new UiPantallaMezclador(bus, editor)).
  montarVista: si falla una vista 3D se vuelve a '2d' (igual que hoy).
```

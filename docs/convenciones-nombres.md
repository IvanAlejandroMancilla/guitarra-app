# Convenciones de nombres y SOLID

> Archivo mantenido **solo** por el agente `nomenclatura-solid`. Los demás agentes lo leen, no lo editan.
> Fuente de firmas completas (parámetros, tipos de retorno, campos): `docs/firmas-aprobadas.md`. Ante discrepancia de **nombres**, manda este archivo.

## 1. Prefijos de módulo (abreviaturas oficiales)
Cada módulo tiene una abreviatura de 3 letras que antecede a sus nombres públicos.

| Abrev. | Módulo | Carpeta |
|---|---|---|
| `cor` | Núcleo: tipos, bus de eventos, utilidades de notas | `src/core/` |
| `aud` | Captura de audio (getUserMedia, AudioContext) | `src/audio/` |
| `det` | Detección de tono y nota | `src/deteccion/` |
| `afn` | Afinador | `src/afinador/` |
| `ejr` | Ejercicios (carga JSON, validación de aciertos) | `src/ejercicios/` |
| `esc` | Escalas (generación de ejercicios de escalas) | `src/escalas/` |
| `tmp` | Timing, reloj y metrónomo | `src/timing/` |
| `vc2` | Vista liviana Canvas 2D | `src/vistas/canvas2d/` |
| `v3d` | Vista 3D Three.js (autopista) | `src/vistas/tres-d/` |
| `gpr` | Importación Guitar Pro (alphaTab) | `src/guitar-pro/` |
| `acp` | Acompañamiento (pistas de fondo) | `src/acompanamiento/` |
| `efx` | Efectos y monitoreo (cadena estilo Nanocore, presets, IR) | `src/efectos/` |
| `cfg` | Configuración y controles | `src/configuracion/` |
| `ui`  | Componentes de interfaz genéricos (botones, sliders), pantallas, atajos | `src/ui/` |
| `app` | Composición y arranque (único que instancia implementaciones) | `src/main.ts` |

Un módulo nuevo necesita abreviatura aprobada aquí antes de crearse.

Excepciones de nombre de archivo: `src/core/tipos.ts` y `src/main.ts` (históricos, sin prefijo).

## 2. Formato por tipo de identificador

| Identificador | Formato | Ejemplo |
|---|---|---|
| Archivo | `<abrev>_<nombre>.ts` (minúsculas, snake; el `<nombre>` puede ir en camelCase) | `det_yin.ts`, `cfg_seccionAudio.ts` |
| Función exportada | `<abrev>_<verbo><Objeto>` | `det_obtenerFrecuencia()`, `cor_frecANota()` |
| Clase | `<Abrev><Sustantivo>` (PascalCase) | `DetDetectorYin`, `V3dAutopista` |
| Interfaz | `I<Abrev><Sustantivo>`; las del núcleo sin abrev. | `IAfnLectura`; `INota` |
| Tipo / unión | `T<Abrev><Sustantivo>` | `TEjrModoValidacion` |
| Enum | `E<Abrev><Sustantivo>` (preferir uniones de string) | `ECfgVista` |
| Constante de módulo | `<ABREV>_<NOMBRE>` (MAYÚSCULAS) | `DET_FREC_MIN_HZ`, `TMP_BPM_DEF` |
| Evento del bus | `'<abrev>:<accion>'` — `<abrev>` = módulo que **emite** | `'det:nota'`, `'ejr:acierto'` |
| Método / propiedad | camelCase, verbo para métodos | `iniciar()`, `frecActual` |
| Variable local / parámetro | camelCase con abreviaturas del §3 | `frecHz`, `idxNota` |
| Booleano | prefijo `es`, `tiene`, `puede` | `esAcierto`, `tieneAudio` |
| Privado | camelCase con `#` (campos privados de JS) | `#ctxAudio` |
| Parámetro de tipo genérico | `T<Sustantivo>` | `TClave`, `TValor` |

Verbos estándar: `obtener`, `calcular`, `crear`, `cargar`, `validar`, `iniciar`, `detener`, `dibujar`, `actualizar`, `convertir`, `reproducir`, `registrar`,
`fijar` (setter), `pausar`, `listar`, `emitir`, `suscribir`, `desuscribir`, `montar`, `desmontar`, `generar`, `importar`, `exportar`, `guardar`, `borrar`, `migrar`, `completar`, `acotar`, `suavizar`, `estimar`, `programar`, `compensar`, `elegir`, `leer`, `marcar`, `mostrar`, `liberar`, `redimensionar`, `restablecer`, `calibrar`, `cancelar`, `descargar`, `vaciar`, `limpiar`, `reiniciar`, `ordenar`, `activar`, `renombrar`, `conectar`, `desconectar`, `formatear`, `redondear`, `aplicar`, `agregar`, `normalizar`. (Para "buscar" usar `obtener`.)

Clases CSS (no son código TS): BEM en kebab-case con prefijo del módulo, `<abrev>-<bloque>[__<elemento>][--<modificador>]`. Ej.: `ui-medidor__barra`, `ui-perilla--activa`, `v3d-lienzo`.

Archivos de ejercicios (`public/ejercicios/*.json`, no son código): kebab-case ASCII en minúsculas, sin tildes ni ñ, `<tema>[-<variante>].json`; el `id` del catálogo es el nombre sin `.json`; las cuerdas se numeran 1–6 (1 = Mi agudo). Ej.: `notas-cuerda-6.json`.

Notas de ESLint (§7):
- La regla `function` aplica a **toda** declaración `function` (también locales y en `main.ts`): deben ser `<abrev>_<verbo>…`. Para callbacks usar funciones flecha.
- La regla de booleanos aplica también a constantes globales: **no** declarar constantes globales booleanas (`XXX_ES_…` falla). Usar un número/objeto o un campo dentro de un objeto constante.
- Funciones privadas de módulo (no exportadas): funciones flecha asignadas a `const`, en camelCase con verbo estándar y sin prefijo (`const obtenerClaseAltura = (midi: number): number => …`). Las exportadas usan declaración `function` con prefijo `<abrev>_`.
- Constantes y tipos internos no exportados siguen el mismo formato que los públicos (`COR_SEMITONOS_OCT`, `TCorMapaOyentes`).
- Booleanos de estado en clases: método `esActivo(): boolean` (no getter), igual que en `ICorDetector` / `ICorFuenteAudio`.

Tipos compartidos entre módulos (payloads del bus, modelos que cruzan módulos) se alojan en `src/core/` aunque lleven prefijo de dominio (`IAfnLectura`, `IGprPista`), igual que `TEjrModoValidacion`. Los tipos internos de un módulo van en `<abrev>_tipos.ts` dentro del módulo.

## 3. Abreviaturas permitidas en variables
| Abrev. | Significado | Abrev. | Significado |
|---|---|---|---|
| `frec` | frecuencia | `oct` | octava |
| `idx` | índice | `cfg` | configuración |
| `ctx` | contexto | `buf` | buffer |
| `ms` / `seg` | milisegundos / segundos | `hz` | hertz |
| `bpm` | pulsos por minuto | `vol` | volumen |
| `cur` / `trs` | cuerda / traste | `pst` | pista |
| `ej` | ejercicio | `lat` | latencia |
| `tol` | tolerancia | `dur` | duración |
| `ptj` | puntaje | `afin` | afinación |
| `ptc` | partícula | `disp` | dispositivo (de audio) |
| `pos` | posición | `inc` | incremento |
| `tam` | tamaño | `cant` | cantidad |
| `opc` | opciones | `ant` / `act` / `sig` | anterior / actual / siguiente |
| `min` / `max` | mínimo / máximo | `ref` | referencia |
| `gan` | ganancia | `msj` | mensaje |
| `elem` | elemento DOM | `geo` | geometría |
| `mat` | material (Three.js) | `def` | valor por defecto |
| `prog` | progresivo | `rel` | relativo (0..1) |
| `px` | píxeles | `db` | decibeles |
| `pct` | porcentaje | `calib` | calibración |
| `ir` | respuesta al impulso (gabinete) | `bd` | base de datos (IndexedDB) |
| `q` | factor de calidad de un filtro (solo dentro de nombres compuestos, ej. `EFX_Q_WAH`) | | |
| `fx1` `fx2` `amp` `cab` | bloques del mezclador (solo como id de bloque) | `del` `mod` `rev` `eq` | bloques del mezclador (solo como id de bloque) |

Ojo: `db` sigue siendo decibeles; para base de datos usar `bd`.

Prohibido: nombres de una letra (salvo `i`, `j` en bucles), `data`, `info`, `temp`, `aux`, `obj`, `manager`. Ojo: `tmp` es el prefijo del módulo de timing, nunca "temporal".

## 4. Principios SOLID aplicados
- **S – Responsabilidad única:** un archivo = una responsabilidad. `det_yin.ts` detecta; no dibuja ni valida.
- **O – Abierto/cerrado:** las vistas implementan `ICorVista`; agregar una vista nueva no modifica las existentes. Los importadores implementan `ICorImportador` (JSON, Guitar Pro, MusicXML).
- **L – Sustitución de Liskov:** cualquier `ICorDetector` (YIN, MIDI hexafónico) debe poder reemplazar a otro sin cambiar a quien lo usa.
- **I – Segregación de interfaces:** interfaces pequeñas (`ICorReproducible`, `ICorDibujable`) en vez de una gigante.
- **D – Inversión de dependencias:** los módulos reciben dependencias por constructor (interfaces), nunca importan implementaciones concretas de otro módulo. La composición se hace en `src/main.ts`.
- Coordinadores por módulo (`EjrControlador`, `EscControlador`, `GprControlador`, `TmpControlador`) traducen eventos del bus a llamadas del módulo para que `main.ts` solo componga.
- Excepción de dependencia aprobada: `cfg` puede usar los componentes genéricos de `ui` (`ui` solo depende de `core`).

## 5. Interfaces núcleo (aprobadas)
| Nombre | Archivo | Descripción |
|---|---|---|
| `INota` | `src/core/tipos.ts` | Nota esperada: `nombre`, `oct`, `cur?`, `trs?`, `tiempo`, `dur?`, `dedo?` (0 al aire, 1 índice … 4 meñique) |
| `ICorPosMastil` | `src/core/tipos.ts` | Posición en el mástil: `cur`, `trs` |
| `IEfxPreset` / `IEfxBloques` | `src/core/cor_efectos.ts` | Modelo de presets y bloques del mezclador (tipos compartidos efx ↔ ui) |
| `IEjercicio` | `src/core/tipos.ts` | `titulo`, `bpm`, `modo`, `notas: INota[]`, `descripcion?`, `afinacion?`, `pulsosPorCompas?` |
| `IEventoTemporal` | `src/core/tipos.ts` | Evento con marca de tiempo en ms (`tiempoMs`, reloj del AudioContext) |
| `IConfig` | `src/core/tipos.ts` | Configuración global de la app (ver §5.1) |
| `IAfinacion` | `src/core/tipos.ts` | `id`, `nombre`, `midiCuerdas` (idx 0 = cuerda 1, Mi agudo) |
| `ICorAltura` / `ICorNotaFrec` | `src/core/tipos.ts` | Nota con midi / nota con frecuencia y cents |
| `ICorDetector` | `src/core/cor_contratos.ts` | Contrato de detectores de nota |
| `ICorVista` | `src/core/cor_contratos.ts` | Contrato de vistas (Canvas 2D, 3D) |
| `ICorImportador` | `src/core/cor_contratos.ts` | Contrato de importadores de ejercicios |
| `ICorReloj` | `src/core/cor_contratos.ts` | Lectura del tiempo de transporte sin importar `tmp` |
| `ICorBus` / `ICorMapaEventos` | `cor_contratos.ts` / `cor_eventos.ts` | Bus tipado y catálogo de eventos (ver §5.2) |
| `TEjrModoValidacion` | `src/core/tipos.ts` | `'estricto' \| 'flexible'` |

Convención de octava: científica (La4 = 440 Hz, Do4 = MIDI 60, Mi2 = cuerda 6 al aire). Cuerda 1 = Mi agudo, cuerda 6 = Mi grave. `INota.tiempo` y `dur` en pulsos.

### 5.1 `IConfig` (plano, `src/core/tipos.ts`)
| Campo | Tipo | Def. | Rango / valores |
|---|---|---|---|
| `idDispEntrada` | `string` | `''` | `''` = predeterminado |
| `ganEntrada` | `number` | 1 | 0–4, paso 0.05 |
| `latEntradaMs` | `number` | 0 | 0–500, paso 1 |
| `latSalidaMs` | `number` | 0 | 0–500, paso 1 |
| `claridadMin` | `number` | 0.9 | 0.5–0.99, paso 0.01 |
| `framesEstables` | `number` | 3 | 1–10, paso 1 |
| `frecA4Hz` | `number` | 440 | 430–450, paso 0.5 |
| `modoValidacion` | `TCfgModoValidacion` | `'ejercicio'` | `'estricto' \| 'flexible' \| 'ejercicio'` |
| `tolMs` | `number` | 100 | 20–300, paso 5 |
| `bpm` | `number` | 80 | 30–300, paso 1 |
| `velocidad` | `number` | 1 | 0.5–1, paso 0.05 |
| `esProgresivo` | `boolean` | false | |
| `incBpmProgresivo` | `number` | 5 | 1–20, paso 1 |
| `bpmMaxProgresivo` | `number` | 160 | 30–300, paso 1 |
| `esLoop` | `boolean` | false | |
| `esMetronomoActivo` | `boolean` | true | |
| `idAfinacion` | `TIdAfinacion` | `'estandar'` | |
| `volMetronomo` | `number` | 0.7 | 0–1, paso 0.01 |
| `volAcp` | `number` | 0.8 | 0–1, paso 0.01 |
| `vista` | `TCfgVista` | `'rocksmith'` | `'2d' \| 'guitarHero' \| 'rocksmith'` (v2; `'3d'` migra a `'guitarHero'`) |
| `calidad` | `TCfgCalidad` | `'media'` | `'baja' \| 'media' \| 'alta'` |
| `velocidadAutopista` | `number` | 1 | 0.5–3, paso 0.1 |
| `esZurdo` | `boolean` | false | |
| `notacion` | `TCfgNotacion` | `'latina'` | `'latina' \| 'anglosajona'` |
| `esMonitorActivo` | `boolean` | false | escuchar la guitarra por la cadena de efectos |
| `volMonitor` | `number` | 0.5 | 0–1, paso 0.01 |
| `idPresetEfx` | `string` | `'fabrica:limpioBrillante'` | id de preset (`fabrica:…` / `usuario:…`) |

La mezcla por pista **no** está en `IConfig` (es estado de la canción actual): vive en `acp` y se pide con `'cfg:mezclaPista'`.

### 5.2 Mapa de eventos (`ICorMapaEventos`, `src/core/cor_eventos.ts`)
| Evento | Payload | Emite |
|---|---|---|
| `'cor:error'` | `ICorError` | cualquiera |
| `'aud:estado'` | `IAudEstado` | `AudCaptura` |
| `'aud:dispositivos'` | `IAudListaDispositivos` | `AudObservadorDispositivos` |
| `'aud:nivel'` | `IAudNivel` | `AudMonitor` |
| `'aud:onda'` | `IAudOnda` | `AudMonitor` |
| `'det:tono'` | `IDetTono` | `DetDetectorYin` (cada frame con claridad suficiente) |
| `'det:nota'` | `IDetNotaDetectada` | `DetDetectorYin` (tras filtro de estabilidad) |
| `'det:silencio'` | `IEventoTemporal` | `DetDetectorYin` |
| `'afn:lectura'` | `IAfnLectura` | `AfnAfinador` |
| `'ejr:catalogo'` | `IEjrCatalogo` | `EjrControlador` |
| `'ejr:cargado'` | `IEjrCargado` | `EjrControlador` (único emisor) |
| `'ejr:esperada'` | `IEjrEsperada` | `EjrSesion` |
| `'ejr:acierto'` / `'ejr:fallo'` | `IEjrResultado` | `EjrSesion` |
| `'ejr:fin'` | `IEjrResumen` | `EjrSesion` |
| `'esc:generada'` | `IEscGenerada` | `EscControlador` |
| `'tmp:inicio'` / `'tmp:pausa'` / `'tmp:detencion'` / `'tmp:posicion'` | `ITmpTransporte` | `TmpReloj` |
| `'tmp:pulso'` | `ITmpPulso` | `TmpProgramador` |
| `'tmp:bpm'` | `ITmpBpm` | `TmpReloj` |
| `'tmp:loop'` | `ITmpLoop` | `TmpLoop` |
| `'gpr:cargado'` | `IGprCargado` | `GprControlador` |
| `'gpr:pistaConvertida'` | `IGprPistaConvertida` | `GprControlador` |
| `'acp:estado'` | `IAcpEstado` | `AcpReproductor` |
| `'acp:posicion'` | `IAcpPosicion` | `AcpSincronizador` |
| `'acp:mezcla'` | `IAcpMezcla` | `AcpReproductor` |
| `'cfg:cambio'` | `ICfgCambio` | `CfgEstado` |
| `'cfg:mezclaPista'` | `IAcpMezclaPista` | `CfgSeccionMezcla` |
| `'ui:pantalla'` | `IUiPantallaSolicitada` | `ui` |
| `'ui:transporte'` | `IUiTransporte` | `UiBarraTransporte`, `UiAtajos` |
| `'ui:ejercicio'` | `IUiEjercicioElegido` | `UiMenu` |
| `'ui:escala'` | `IUiEscalaElegida` | `UiMenu` |
| `'ui:archivoGp'` | `IUiArchivoElegido` | `UiMenu` |
| `'ui:pistaGp'` | `IUiPistaElegida` | `UiPanelPistas` |
| `'ejr:coincidencia'` | `IEjrCoincidencia` | `EjrMedidorCoincidencia` |
| `'efx:presets'` | `IEfxListaPresets` | `EfxControlador` |
| `'efx:presetActivo'` | `IEfxPresetActivo` | `EfxControlador` |
| `'efx:cadena'` | `IEfxCadenaCambiada` | `EfxControlador` |
| `'efx:irs'` | `IEfxListaIr` | `EfxControlador` |
| `'efx:irCargado'` | `IEfxIrCargado` | `EfxControlador` |
| `'efx:exportacion'` | `IEfxExportacion` | `EfxControlador` |
| `'efx:importacion'` | `IEfxImportacion` | `EfxControlador` |
| `'ui:presetEfx'` | `IUiPresetEfxElegido` | `UiListaPresets` |
| `'ui:bloqueEfx'` | `TUiBloqueEfxEditado` | `UiPantallaMezclador` |
| `'ui:gestionPresetEfx'` | `TUiGestionPresetEfx` | `UiListaPresets` |
| `'ui:archivoIr'` | `IUiArchivoElegido` | `UiSelectorIr` |

`tiempoMs` de todo `IEventoTemporal` = `AudioContext.currentTime * 1000` (tiempo absoluto del contexto, no posición de transporte).

## 6. Registro de nombres aprobados
Cada fila la agrega `nomenclatura-solid`. Estado: `APROBADO` o `RECHAZADO (→ alternativa)`.

| Nombre | Tipo | Módulo | Archivo | Estado | Fecha |
|---|---|---|---|---|---|
| `cor_frecANota` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_notaAFrec` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `CorBus` | clase | cor | `src/core/cor_bus.ts` | APROBADO | 2026-10-21 |
| `src/core/bus.ts` | archivo | cor | — | RECHAZADO (→ `src/core/cor_bus.ts`) | 2026-10-21 |
| `TNombreNota` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TNombreNotaAnglo` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TIdAfinacion` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TCfgVista` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TCfgCalidad` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TCfgNotacion` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TCfgModoValidacion` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TEjrModoValidacion` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `TCorResultado` | tipo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `INota` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `IEjercicio` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `IEventoTemporal` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `IConfig` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `IAfinacion` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `ICorAltura` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `ICorNotaFrec` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-21 |
| `ICorMapaEventos` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TCorNombreEvento` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TCorOyente` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ICorError` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TAudEstado` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAudEstado` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAudDispositivo` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAudListaDispositivos` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAudNivel` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAudOnda` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IDetTono` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IDetNota` | interfaz | cor | — | RECHAZADO (→ `IDetNotaDetectada`, se confunde con `INota`) | 2026-10-21 |
| `IDetNotaDetectada` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAfnLectura` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrEntradaCatalogo` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrCatalogo` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TEjrOrigen` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrCargado` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrEsperada` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TEjrMotivoFallo` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrMarcador` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrResultado` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEjrResumen` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TEscTipoEscala` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IEscGenerada` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ITmpTransporte` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ITmpPulso` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ITmpBpm` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ITmpLoop` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IGprPista` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IGprCargado` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IGprPistaConvertida` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TAcpEstado` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAcpEstado` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAcpPosicion` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAcpMezclaPista` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IAcpMezcla` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ICfgCambio` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TUiPantalla` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TUiAccionTransporte` | tipo | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiPantallaSolicitada` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiTransporte` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiEjercicioElegido` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiEscalaElegida` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiArchivoElegido` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiPistaElegida` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ICorBus` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorCuadro` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorActualizable` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorDibujable` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorMontable` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorOpcionesVista` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorVista` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorReloj` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorReproducible` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorPosicionable` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorFuenteAudio` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorDetector` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorImportador` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorFuenteConfig` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorEditorConfig` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorCalibradorLatencia` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `ICorResultadoCalibracion` | interfaz | cor | `src/core/cor_contratos.ts` | APROBADO | 2026-10-21 |
| `CorBucle` | clase | cor | `src/core/cor_bucle.ts` | APROBADO | 2026-10-21 |
| `COR_DELTA_MAX_MS` | constante | cor | `src/core/cor_bucle.ts` | APROBADO | 2026-10-21 |
| `CorBucle.crearCuadro(marcaMs: number): ICorCuadro` | método | cor | `src/core/cor_bucle.ts` | APROBADO | 2026-10-21 |
| `CorBucle.ejecutar` | método | cor | `src/core/cor_bucle.ts` | RECHAZADO (→ `actualizarCuadro(marcaMs: number): void`, verbo estándar) | 2026-10-21 |
| `CorBucle.esActivo` (getter) | método | cor | `src/core/cor_bucle.ts` | RECHAZADO (→ método `esActivo(): boolean`, consistente con contratos) | 2026-10-21 |
| `CorBucle.esActivo(): boolean` | método | cor | `src/core/cor_bucle.ts` | APROBADO | 2026-10-21 |
| `COR_SEMITONOS_OCT` | constante interna | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_IDX_LATINA` | constante interna | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_IDX_ANGLO` | constante interna | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_MS_POR_MINUTO` | constante interna | cor | `src/core/cor_tiempo.ts` | APROBADO | 2026-10-21 |
| `TMapaOyentes` | tipo interno | cor | `src/core/cor_bus.ts` | RECHAZADO (→ `TCorMapaOyentes`, lleva abrev. de módulo) | 2026-10-21 |
| `TCorMapaOyentes` | tipo interno | cor | `src/core/cor_bus.ts` | APROBADO | 2026-10-21 |
| `obtenerClaseAltura` | flecha privada | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `obtenerNombrePorIdx` | flecha privada | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `validarBpm` | flecha privada | cor | `src/core/cor_tiempo.ts` | APROBADO | 2026-10-21 |
| `COR_NOMBRES_NOTA` | constante | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_NOMBRES_ANGLO` | constante | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_FREC_A4_DEF` | constante | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_MIDI_A4` | constante | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `COR_CANT_CUERDAS` | constante | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_frecAMidi` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_midiAFrec` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_midiANota` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_notaAMidi` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_convertirAAnglo` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_convertirALatina` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_convertirTextoANota` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_calcularMidiCuerda` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_calcularNotaCuerda` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_obtenerEtiquetaNota` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-21 |
| `cor_convertirPulsosAMs` | función | cor | `src/core/cor_tiempo.ts` | APROBADO | 2026-10-21 |
| `cor_convertirMsAPulsos` | función | cor | `src/core/cor_tiempo.ts` | APROBADO | 2026-10-21 |
| `COR_COLORES_CUERDA` | constante | cor | `src/core/cor_colores.ts` | APROBADO | 2026-10-21 |
| `COR_COLOR_ACIERTO` | constante | cor | `src/core/cor_colores.ts` | APROBADO | 2026-10-21 |
| `COR_COLOR_FALLO` | constante | cor | `src/core/cor_colores.ts` | APROBADO | 2026-10-21 |
| `'cor:error'` | evento | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `AUD_TAM_FFT` | constante | aud | `src/audio/aud_constantes.ts` | APROBADO | 2026-10-21 |
| `AUD_GAN_DEF` | constante | aud | `src/audio/aud_constantes.ts` | APROBADO | 2026-10-21 |
| `AUD_GAN_MAX` | constante | aud | `src/audio/aud_constantes.ts` | APROBADO | 2026-10-21 |
| `AUD_INTERVALO_MONITOR_MS` | constante | aud | `src/audio/aud_constantes.ts` | APROBADO | 2026-10-21 |
| `AUD_DB_MIN` | constante | aud | `src/audio/aud_constantes.ts` | APROBADO | 2026-10-21 |
| `AUD_UMBRAL_SATURACION` | constante | aud | `src/audio/aud_constantes.ts` | APROBADO | 2026-10-21 |
| `aud_crearContexto` | función | aud | `src/audio/aud_contexto.ts` | APROBADO | 2026-10-21 |
| `aud_reanudarContexto` | función | aud | `src/audio/aud_contexto.ts` | APROBADO | 2026-10-21 |
| `aud_crearRestricciones` | función | aud | `src/audio/aud_restricciones.ts` | APROBADO | 2026-10-21 |
| `aud_listarDispositivos` | función | aud | `src/audio/aud_dispositivos.ts` | APROBADO | 2026-10-21 |
| `AudObservadorDispositivos` | clase | aud | `src/audio/aud_dispositivos.ts` | APROBADO | 2026-10-21 |
| `AudCaptura` | clase | aud | `src/audio/aud_captura.ts` | APROBADO | 2026-10-21 |
| `aud_calcularRms` | función | aud | `src/audio/aud_nivel.ts` | APROBADO | 2026-10-21 |
| `aud_calcularPico` | función | aud | `src/audio/aud_nivel.ts` | APROBADO | 2026-10-21 |
| `aud_convertirADb` | función | aud | `src/audio/aud_nivel.ts` | APROBADO | 2026-10-21 |
| `AudMonitor` | clase | aud | `src/audio/aud_monitor.ts` | APROBADO | 2026-10-21 |
| `'aud:estado'` | evento | aud | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'aud:dispositivos'` | evento | aud | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'aud:nivel'` | evento | aud | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'aud:onda'` | evento | aud | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `DET_FREC_MIN_HZ` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `DET_FREC_MAX_HZ` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `DET_CLARIDAD_DEF` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `DET_FRAMES_ESTABLES_DEF` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `DET_FRAMES_SILENCIO` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `DET_RMS_MIN` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `DET_INTERVALO_MS` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO | 2026-10-21 |
| `IDetOpciones` | interfaz | det | `src/deteccion/det_tipos.ts` | APROBADO | 2026-10-21 |
| `IDetEstimacion` | interfaz | det | `src/deteccion/det_tipos.ts` | APROBADO | 2026-10-21 |
| `IDetEstimador` | interfaz | det | `src/deteccion/det_tipos.ts` | APROBADO | 2026-10-21 |
| `DetEstimadorPitchy` | clase | det | `src/deteccion/det_pitchy.ts` | APROBADO | 2026-10-21 |
| `det_validarRango` | función | det | `src/deteccion/det_filtros.ts` | APROBADO | 2026-10-21 |
| `det_validarClaridad` | función | det | `src/deteccion/det_filtros.ts` | APROBADO | 2026-10-21 |
| `DetFiltroEstabilidad` | clase | det | `src/deteccion/det_estabilidad.ts` | APROBADO | 2026-10-21 |
| `DetDetectorYin` | clase | det | `src/deteccion/det_yin.ts` | APROBADO | 2026-10-21 |
| `'det:tono'` | evento | det | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'det:nota'` | evento | det | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'det:silencio'` | evento | det | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `AFN_TOL_CENTS` | constante | afn | `src/afinador/afn_constantes.ts` | APROBADO | 2026-10-21 |
| `AFN_RANGO_CENTS` | constante | afn | `src/afinador/afn_constantes.ts` | APROBADO | 2026-10-21 |
| `AFN_FACTOR_SUAVIZADO` | constante | afn | `src/afinador/afn_constantes.ts` | APROBADO | 2026-10-21 |
| `AFN_AFINACIONES` | constante | afn | `src/afinador/afn_afinaciones.ts` | APROBADO | 2026-10-21 |
| `AFN_ID_AFINACION_DEF` | constante | afn | `src/afinador/afn_afinaciones.ts` | APROBADO | 2026-10-21 |
| `afn_obtenerAfinacion` | función | afn | `src/afinador/afn_afinaciones.ts` | APROBADO | 2026-10-21 |
| `afn_calcularCents` | función | afn | `src/afinador/afn_cents.ts` | APROBADO | 2026-10-21 |
| `afn_esAfinado` | función | afn | — | RECHAZADO (→ `afn_validarAfinado`, verbo estándar) | 2026-10-21 |
| `afn_validarAfinado` | función | afn | `src/afinador/afn_cents.ts` | APROBADO | 2026-10-21 |
| `afn_suavizarCents` | función | afn | `src/afinador/afn_cents.ts` | APROBADO | 2026-10-21 |
| `afn_obtenerCuerdaCercana` | función | afn | `src/afinador/afn_cuerdas.ts` | APROBADO | 2026-10-21 |
| `IAfnOpciones` | interfaz | afn | `src/afinador/afn_tipos.ts` | APROBADO | 2026-10-21 |
| `IAfnCuerdaCercana` | interfaz | afn | `src/afinador/afn_tipos.ts` | APROBADO | 2026-10-21 |
| `AfnAfinador` | clase | afn | `src/afinador/afn_afinador.ts` | APROBADO | 2026-10-21 |
| `'afn:lectura'` | evento | afn | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `EJR_PTS_BASE` | constante | ejr | `src/ejercicios/ejr_constantes.ts` | APROBADO | 2026-10-21 |
| `EJR_RACHA_POR_MULT` | constante | ejr | `src/ejercicios/ejr_constantes.ts` | APROBADO | 2026-10-21 |
| `EJR_MULT_MAX` | constante | ejr | `src/ejercicios/ejr_constantes.ts` | APROBADO | 2026-10-21 |
| `EJR_TOL_MS_DEF` | constante | ejr | `src/ejercicios/ejr_constantes.ts` | APROBADO | 2026-10-21 |
| `EJR_RUTA_CATALOGO` | constante | ejr | `src/ejercicios/ejr_constantes.ts` | APROBADO | 2026-10-21 |
| `EJR_RUTA_BASE` | constante | ejr | `src/ejercicios/ejr_constantes.ts` | APROBADO | 2026-10-21 |
| `IEjrOpciones` | interfaz | ejr | `src/ejercicios/ejr_tipos.ts` | APROBADO | 2026-10-21 |
| `IEjrEvaluacion` | interfaz | ejr | `src/ejercicios/ejr_tipos.ts` | APROBADO | 2026-10-21 |
| `ejr_validarEjercicio` | función | ejr | `src/ejercicios/ejr_esquema.ts` | APROBADO | 2026-10-21 |
| `EjrImportadorJson` | clase | ejr | `src/ejercicios/ejr_importadorJson.ts` | APROBADO | 2026-10-21 |
| `ejr_obtenerModo` | función | ejr | `src/ejercicios/ejr_validador.ts` | APROBADO | 2026-10-21 |
| `ejr_validarNota` | función | ejr | `src/ejercicios/ejr_validador.ts` | APROBADO | 2026-10-21 |
| `ejr_validarTiempo` | función | ejr | `src/ejercicios/ejr_validador.ts` | APROBADO | 2026-10-21 |
| `ejr_validarIntento` | función | ejr | `src/ejercicios/ejr_validador.ts` | APROBADO | 2026-10-21 |
| `ejr_calcularPuntos` | función | ejr | `src/ejercicios/ejr_puntaje.ts` | APROBADO | 2026-10-21 |
| `ejr_calcularMultiplicador` | función | ejr | `src/ejercicios/ejr_puntaje.ts` | APROBADO | 2026-10-21 |
| `EjrPuntaje` | clase | ejr | `src/ejercicios/ejr_puntaje.ts` | APROBADO | 2026-10-21 |
| `EjrSesion` | clase | ejr | `src/ejercicios/ejr_sesion.ts` | APROBADO | 2026-10-21 |
| `ejr_cargarCatalogo` | función | ejr | `src/ejercicios/ejr_catalogo.ts` | APROBADO | 2026-10-21 |
| `ejr_cargarArchivo` | función | ejr | `src/ejercicios/ejr_catalogo.ts` | APROBADO | 2026-10-21 |
| `EjrControlador` | clase | ejr | `src/ejercicios/ejr_controlador.ts` | APROBADO | 2026-10-21 |
| `'ejr:catalogo'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ejr:cargado'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ejr:esperada'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ejr:acierto'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ejr:fallo'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ejr:fin'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ESC_INTERVALOS` | constante | esc | `src/escalas/esc_intervalos.ts` | APROBADO | 2026-10-21 |
| `esc_calcularMidisEscala` | función | esc | `src/escalas/esc_intervalos.ts` | APROBADO | 2026-10-21 |
| `ESC_TRS_MAX` | constante | esc | `src/escalas/esc_constantes.ts` | APROBADO | 2026-10-21 |
| `ESC_ANCHO_CAJA` | constante | esc | `src/escalas/esc_constantes.ts` | APROBADO | 2026-10-21 |
| `ESC_NOMBRES_TIPO` | constante | esc | `src/escalas/esc_constantes.ts` | APROBADO | 2026-10-21 |
| `ESC_PULSOS_POR_NOTA_DEF` | constante | esc | `src/escalas/esc_constantes.ts` | APROBADO | 2026-10-21 |
| `ESC_CANT_OCT_DEF` | constante | esc | `src/escalas/esc_constantes.ts` | APROBADO | 2026-10-21 |
| `IEscOpciones` | interfaz | esc | `src/escalas/esc_tipos.ts` | APROBADO | 2026-10-21 |
| `IEscPosicion` | interfaz | esc | `src/escalas/esc_tipos.ts` | APROBADO | 2026-10-21 |
| `esc_calcularDigitacion` | función | esc | `src/escalas/esc_digitacion.ts` | APROBADO | 2026-10-21 |
| `esc_generarEscala` | función | esc | `src/escalas/esc_generador.ts` | APROBADO | 2026-10-21 |
| `esc_crearTitulo` | función | esc | `src/escalas/esc_generador.ts` | APROBADO | 2026-10-21 |
| `EscControlador` | clase | esc | `src/escalas/esc_controlador.ts` | APROBADO | 2026-10-21 |
| `'esc:generada'` | evento | esc | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TMP_BPM_DEF` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_BPM_MIN` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_BPM_MAX` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_PASO_BPM` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_PULSOS_COMPAS_DEF` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_ANTICIPACION_MS` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_INTERVALO_PROG_MS` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_FREC_CLICK_HZ` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_FREC_ACENTO_HZ` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_DUR_CLICK_MS` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_VELOCIDAD_MIN` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_VELOCIDAD_MAX` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_PRECISION_MIN_PROG` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_CANT_CLICKS_CALIB` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TMP_INTERVALO_CALIB_MS` | constante | tmp | `src/timing/tmp_constantes.ts` | APROBADO | 2026-10-21 |
| `TmpReloj` | clase | tmp | `src/timing/tmp_reloj.ts` | APROBADO | 2026-10-21 |
| `tmp_compensarLatencia` | función | tmp | `src/timing/tmp_latencia.ts` | APROBADO | 2026-10-21 |
| `TmpProgramador` | clase | tmp | `src/timing/tmp_programador.ts` | APROBADO | 2026-10-21 |
| `tmp_programarClick` | función | tmp | `src/timing/tmp_click.ts` | APROBADO | 2026-10-21 |
| `TmpMetronomo` | clase | tmp | `src/timing/tmp_metronomo.ts` | APROBADO | 2026-10-21 |
| `tmp_calcularBpmSiguiente` | función | tmp | `src/timing/tmp_progresivo.ts` | APROBADO | 2026-10-21 |
| `TmpProgresivo` | clase | tmp | `src/timing/tmp_progresivo.ts` | APROBADO | 2026-10-21 |
| `TmpLoop` | clase | tmp | `src/timing/tmp_loop.ts` | APROBADO | 2026-10-21 |
| `tmp_calcularLatencia` | función | tmp | `src/timing/tmp_calibrador.ts` | APROBADO | 2026-10-21 |
| `TmpCalibrador` | clase | tmp | `src/timing/tmp_calibrador.ts` | APROBADO | 2026-10-21 |
| `TmpControlador` | clase | tmp | `src/timing/tmp_controlador.ts` | APROBADO | 2026-10-21 |
| `'tmp:inicio'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'tmp:pausa'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'tmp:detencion'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'tmp:posicion'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'tmp:pulso'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'tmp:bpm'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'tmp:loop'` | evento | tmp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `VC2_PULSOS_VISIBLES` | constante | vc2 | `src/vistas/canvas2d/vc2_constantes.ts` | APROBADO | 2026-10-21 |
| `VC2_Y_GOLPE_REL` | constante | vc2 | `src/vistas/canvas2d/vc2_constantes.ts` | APROBADO | 2026-10-21 |
| `VC2_MAX_PARTICULAS` | constante | vc2 | `src/vistas/canvas2d/vc2_constantes.ts` | APROBADO | 2026-10-21 |
| `VC2_RADIO_NOTA_PX` | constante | vc2 | `src/vistas/canvas2d/vc2_constantes.ts` | APROBADO | 2026-10-21 |
| `IVc2Geometria` | interfaz | vc2 | `src/vistas/canvas2d/vc2_tipos.ts` | APROBADO | 2026-10-21 |
| `IVc2Capa` | interfaz | vc2 | `src/vistas/canvas2d/vc2_tipos.ts` | APROBADO | 2026-10-21 |
| `vc2_calcularGeometria` | función | vc2 | `src/vistas/canvas2d/vc2_geometria.ts` | APROBADO | 2026-10-21 |
| `vc2_calcularXCarril` | función | vc2 | `src/vistas/canvas2d/vc2_geometria.ts` | APROBADO | 2026-10-21 |
| `vc2_calcularYNota` | función | vc2 | `src/vistas/canvas2d/vc2_geometria.ts` | APROBADO | 2026-10-21 |
| `Vc2Carriles` | clase | vc2 | `src/vistas/canvas2d/vc2_carriles.ts` | APROBADO | 2026-10-21 |
| `Vc2LineaGolpe` | clase | vc2 | `src/vistas/canvas2d/vc2_lineaGolpe.ts` | APROBADO | 2026-10-21 |
| `Vc2Notas` | clase | vc2 | `src/vistas/canvas2d/vc2_notas.ts` | APROBADO | 2026-10-21 |
| `Vc2Particulas` | clase | vc2 | `src/vistas/canvas2d/vc2_particulas.ts` | APROBADO | 2026-10-21 |
| `Vc2Onda` | clase | vc2 | `src/vistas/canvas2d/vc2_onda.ts` | APROBADO | 2026-10-21 |
| `Vc2PanelAfinador` | clase | vc2 | `src/vistas/canvas2d/vc2_panelAfinador.ts` | APROBADO | 2026-10-21 |
| `Vc2Vista` | clase | vc2 | `src/vistas/canvas2d/vc2_vista.ts` | APROBADO | 2026-10-21 |
| `Vc2VistaAfinador` | clase | vc2 | `src/vistas/canvas2d/vc2_vistaAfinador.ts` | APROBADO | 2026-10-21 |
| `V3D_UNIDADES_POR_PULSO` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-21 |
| `V3D_PULSOS_VISIBLES` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-21 |
| `V3D_ANCHO_CARRIL` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-21 |
| `V3D_MAX_NOTAS` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-21 |
| `V3D_FOV_GRADOS` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-21 |
| `V3D_TRASTES_VISIBLES` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-21 |
| `IV3dCapa` | interfaz | v3d | `src/vistas/tres-d/v3d_tipos.ts` | APROBADO | 2026-10-21 |
| `IV3dPerfilCalidad` | interfaz | v3d | `src/vistas/tres-d/v3d_tipos.ts` | APROBADO | 2026-10-21 |
| `V3D_PERFILES_CALIDAD` | constante | v3d | `src/vistas/tres-d/v3d_calidad.ts` | APROBADO | 2026-10-21 |
| `v3d_validarWebgl` | función | v3d | `src/vistas/tres-d/v3d_webgl.ts` | APROBADO | 2026-10-21 |
| `v3d_calcularXCarril` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-21 |
| `v3d_calcularZNota` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-21 |
| `V3dEscena` | clase | v3d | `src/vistas/tres-d/v3d_escena.ts` | APROBADO | 2026-10-21 |
| `V3dCamara` | clase | v3d | `src/vistas/tres-d/v3d_camara.ts` | APROBADO | 2026-10-21 |
| `V3dAutopista` | clase | v3d | `src/vistas/tres-d/v3d_autopista.ts` | APROBADO | 2026-10-21 |
| `V3dMarcasTraste` | clase | v3d | `src/vistas/tres-d/v3d_marcasTraste.ts` | APROBADO | 2026-10-21 |
| `V3dNotas` | clase | v3d | `src/vistas/tres-d/v3d_notas.ts` | APROBADO | 2026-10-21 |
| `V3dParticulas` | clase | v3d | `src/vistas/tres-d/v3d_particulas.ts` | APROBADO | 2026-10-21 |
| `V3dCintaOnda` | clase | v3d | `src/vistas/tres-d/v3d_cintaOnda.ts` | APROBADO | 2026-10-21 |
| `V3dEtiquetas` | clase | v3d | `src/vistas/tres-d/v3d_etiquetas.ts` | APROBADO | 2026-10-21 |
| `V3dVista` | clase | v3d | `src/vistas/tres-d/v3d_vista.ts` | APROBADO | 2026-10-21 |
| `V3D_ANCHO_AUTOPISTA` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `V3D_LARGO_AUTOPISTA` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `V3D_MARGEN_ATRAS` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `V3D_Y_NOTA` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `V3D_MAX_ETIQUETAS` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `V3D_COLOR_FONDO` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `V3D_COLOR_SIN_CUERDA` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO | 2026-10-22 |
| `v3d_convertirUnidadesAPulsos` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-22 |
| `v3d_calcularPulsosVisibles` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-22 |
| `v3d_calcularXTraste` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-22 |
| `v3d_calcularAnchoRegla` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-22 |
| `v3d_buscarPrimeraNota` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | RECHAZADO (→ `v3d_obtenerIdxPrimeraNota`, verbo estándar; devuelve índice) | 2026-10-22 |
| `v3d_obtenerIdxPrimeraNota` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-22 |
| `v3d_ordenarNotas` | función | v3d | `src/vistas/tres-d/v3d_geometria.ts` | APROBADO | 2026-10-22 |
| `V3dAutopista.cargar` / `.marcarCarril` | método | v3d | `src/vistas/tres-d/v3d_autopista.ts` | APROBADO | 2026-10-22 |
| `V3dMarcasTraste.fijarTrasteActivo` | método | v3d | `src/vistas/tres-d/v3d_marcasTraste.ts` | APROBADO | 2026-10-22 |
| `V3dEtiquetas.cargar` / `.marcarResultado` / `.fijarNotaDetectada` | método | v3d | `src/vistas/tres-d/v3d_etiquetas.ts` | APROBADO | 2026-10-22 |
| `IV3dMontaje` | interfaz interna | v3d | `src/vistas/tres-d/v3d_vista.ts` | APROBADO | 2026-10-22 |
| `IV3dLienzoTexto` | interfaz interna | v3d | `src/vistas/tres-d/v3d_etiquetas.ts` | APROBADO | 2026-10-22 |
| `TV3dGeoAutopista` | tipo interno | v3d | `src/vistas/tres-d/v3d_autopista.ts` | APROBADO | 2026-10-22 |
| `TV3dMatAutopista` | tipo interno | v3d | `src/vistas/tres-d/v3d_autopista.ts` | APROBADO | 2026-10-22 |
| `V3D_MAX_LINEAS_PULSO`, `V3D_PULSOS_COMPAS_DEF`, `V3D_DERIVA_REPOSO`, `V3D_DUR_DESTELLO_MS`, `V3D_IDX_CENTRAL` | constantes internas | v3d | `src/vistas/tres-d/v3d_autopista.ts` | APROBADO | 2026-10-22 |
| `V3D_ESTADO_PENDIENTE`, `V3D_ESTADO_ACIERTO`, `V3D_ESTADO_FALLO`, `V3D_DUR_ACIERTO_MS`, `V3D_DUR_HUNDIMIENTO_MS`, `V3D_DIST_APROXIMACION` | constantes internas | v3d | `src/vistas/tres-d/v3d_notas.ts` | APROBADO | 2026-10-22 |
| `V3D_VIDA_PTC_MS`, `V3D_GRAVEDAD`, `V3D_PTC_POR_EXPLOSION_MAX` | constantes internas | v3d | `src/vistas/tres-d/v3d_particulas.ts` | APROBADO | 2026-10-22 |
| `V3D_ANCHO_ONDA`, `V3D_AMPLITUD_ONDA`, `V3D_GROSOR_ONDA`, `V3D_GAN_ONDA`, `V3D_CAIDA_ONDA` | constantes internas | v3d | `src/vistas/tres-d/v3d_cintaOnda.ts` | APROBADO | 2026-10-22 |
| `V3D_PROF_REGLA` | constante interna | v3d | `src/vistas/tres-d/v3d_marcasTraste.ts` | RECHAZADO (→ `V3D_PROFUNDIDAD_REGLA`, `prof` no está en §3) | 2026-10-22 |
| `V3D_PROFUNDIDAD_REGLA`, `V3D_Z_REGLA`, `V3D_TRASTES_CON_MARCA`, `V3D_ANCHO_TEXTURA_REGLA`, `V3D_ALTO_TEXTURA_REGLA` | constantes internas | v3d | `src/vistas/tres-d/v3d_marcasTraste.ts` | APROBADO | 2026-10-22 |
| `V3D_TAM_TEXTURA_ETIQUETA`, `V3D_ESCALA_ETIQUETA`, `V3D_Y_ETIQUETA`, `V3D_DUR_DETECTADA_MS`, `V3D_DUR_DESVANECER_MS`, `V3D_MSJ_SIN_EJERCICIO` | constantes internas | v3d | `src/vistas/tres-d/v3d_etiquetas.ts` | APROBADO | 2026-10-22 |
| `V3D_POS_CAMARA`, `V3D_MIRA_CAMARA`, `V3D_ASPECTO_REF`, `V3D_ALEJAMIENTO_MAX` | constantes internas | v3d | `src/vistas/tres-d/v3d_camara.ts` | APROBADO | 2026-10-22 |
| `V3D_EJ_VACIO` | constante interna | v3d | `src/vistas/tres-d/v3d_vista.ts` | APROBADO | 2026-10-22 |
| `obtenerIdxColor`, `crearTexturaPunto`, `crearTexturaRegla`, `crearLienzoTexto`, `dibujarEtiquetaNota`, `dibujarTextoCentrado` | flechas privadas | v3d | `src/vistas/tres-d/` | APROBADO | 2026-10-22 |
| `GPR_TICKS_POR_PULSO` | constante | gpr | `src/guitar-pro/gpr_constantes.ts` | APROBADO | 2026-10-21 |
| `GPR_EXTENSIONES` | constante | gpr | `src/guitar-pro/gpr_constantes.ts` | APROBADO | 2026-10-21 |
| `GPR_PROGRAMA_GUITARRA_MIN` | constante | gpr | `src/guitar-pro/gpr_constantes.ts` | APROBADO | 2026-10-21 |
| `GPR_PROGRAMA_GUITARRA_MAX` | constante | gpr | `src/guitar-pro/gpr_constantes.ts` | APROBADO | 2026-10-21 |
| `IGprCargador` | interfaz | gpr | `src/guitar-pro/gpr_tipos.ts` | APROBADO | 2026-10-21 |
| `gpr_leerPartitura` | función | gpr | `src/guitar-pro/gpr_lector.ts` | APROBADO | 2026-10-21 |
| `gpr_listarPistas` | función | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-21 |
| `gpr_convertirAfinacion` | función | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-21 |
| `gpr_convertirPista` | función | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-21 |
| `gpr_obtenerBpm` | función | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-21 |
| `gpr_convertirTicksAPulsos` | función | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-21 |
| `gpr_elegirPistaGuitarra` | función | gpr | `src/guitar-pro/gpr_pistas.ts` | APROBADO | 2026-10-21 |
| `GprImportador` | clase | gpr | `src/guitar-pro/gpr_importador.ts` | APROBADO | 2026-10-21 |
| `GprControlador` | clase | gpr | `src/guitar-pro/gpr_controlador.ts` | APROBADO | 2026-10-21 |
| `'gpr:cargado'` | evento | gpr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'gpr:pistaConvertida'` | evento | gpr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `ACP_RUTA_SOUNDFONT` | constante | acp | `src/acompanamiento/acp_constantes.ts` | APROBADO | 2026-10-21 |
| `ACP_DERIVA_MAX_MS` | constante | acp | `src/acompanamiento/acp_constantes.ts` | APROBADO | 2026-10-21 |
| `ACP_VOL_DEF` | constante | acp | `src/acompanamiento/acp_constantes.ts` | APROBADO | 2026-10-21 |
| `ACP_VELOCIDAD_MIN` | constante | acp | `src/acompanamiento/acp_constantes.ts` | APROBADO | 2026-10-21 |
| `ACP_VELOCIDAD_MAX` | constante | acp | `src/acompanamiento/acp_constantes.ts` | APROBADO | 2026-10-21 |
| `IAcpOpciones` | interfaz | acp | `src/acompanamiento/acp_tipos.ts` | APROBADO | 2026-10-21 |
| `acp_crearApi` | función | acp | `src/acompanamiento/acp_api.ts` | APROBADO | 2026-10-21 |
| `AcpMezclador` | clase | acp | `src/acompanamiento/acp_mezclador.ts` | APROBADO | 2026-10-21 |
| `AcpSincronizador` | clase | acp | `src/acompanamiento/acp_sincronizador.ts` | APROBADO | 2026-10-21 |
| `AcpReproductor` | clase | acp | `src/acompanamiento/acp_reproductor.ts` | APROBADO | 2026-10-21 |
| `'acp:estado'` | evento | acp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'acp:posicion'` | evento | acp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'acp:mezcla'` | evento | acp | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `CFG_VERSION` | constante | cfg | `src/configuracion/cfg_constantes.ts` | APROBADO | 2026-10-21 |
| `CFG_CLAVE_ALMACEN` | constante | cfg | `src/configuracion/cfg_constantes.ts` | APROBADO | 2026-10-21 |
| `CFG_NOMBRE_EXPORTACION` | constante | cfg | `src/configuracion/cfg_constantes.ts` | APROBADO | 2026-10-21 |
| `CFG_VALORES_DEF` | constante | cfg | `src/configuracion/cfg_valoresDef.ts` | APROBADO | 2026-10-21 |
| `CFG_RANGOS` | constante | cfg | `src/configuracion/cfg_rangos.ts` | APROBADO | 2026-10-21 |
| `ICfgRango` | interfaz | cfg | `src/configuracion/cfg_tipos.ts` | APROBADO | 2026-10-21 |
| `TCfgClaveNumerica` | tipo | cfg | `src/configuracion/cfg_tipos.ts` | APROBADO | 2026-10-21 |
| `ICfgAlmacenado` | interfaz | cfg | `src/configuracion/cfg_tipos.ts` | APROBADO | 2026-10-21 |
| `ICfgAlmacen` | interfaz | cfg | `src/configuracion/cfg_tipos.ts` | APROBADO | 2026-10-21 |
| `TCfgMigracion` | tipo | cfg | `src/configuracion/cfg_tipos.ts` | APROBADO | 2026-10-21 |
| `ICfgSeccion` | interfaz | cfg | `src/configuracion/cfg_tipos.ts` | APROBADO | 2026-10-21 |
| `cfg_validarConfig` | función | cfg | `src/configuracion/cfg_validador.ts` | APROBADO | 2026-10-21 |
| `cfg_completarConfig` | función | cfg | `src/configuracion/cfg_validador.ts` | APROBADO | 2026-10-21 |
| `cfg_acotarValor` | función | cfg | `src/configuracion/cfg_validador.ts` | APROBADO | 2026-10-21 |
| `CFG_MIGRACIONES` | constante | cfg | `src/configuracion/cfg_migraciones.ts` | APROBADO | 2026-10-21 |
| `cfg_migrarConfig` | función | cfg | `src/configuracion/cfg_migraciones.ts` | APROBADO | 2026-10-21 |
| `CfgAlmacen` | clase | cfg | `src/configuracion/cfg_almacen.ts` | APROBADO | 2026-10-21 |
| `cfg_exportarJson` | función | cfg | `src/configuracion/cfg_exportador.ts` | APROBADO | 2026-10-21 |
| `cfg_importarJson` | función | cfg | `src/configuracion/cfg_exportador.ts` | APROBADO | 2026-10-21 |
| `CfgEstado` | clase | cfg | `src/configuracion/cfg_estado.ts` | APROBADO | 2026-10-21 |
| `CfgPantalla` | clase | cfg | `src/configuracion/cfg_pantalla.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionAudio` | clase | cfg | `src/configuracion/cfg_seccionAudio.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionLatencia` | clase | cfg | `src/configuracion/cfg_seccionLatencia.ts` | APROBADO | 2026-10-21 |
| `CfgAsistenteLatencia` | clase | cfg | `src/configuracion/cfg_asistenteLatencia.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionDeteccion` | clase | cfg | `src/configuracion/cfg_seccionDeteccion.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionValidacion` | clase | cfg | `src/configuracion/cfg_seccionValidacion.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionPractica` | clase | cfg | `src/configuracion/cfg_seccionPractica.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionMezcla` | clase | cfg | `src/configuracion/cfg_seccionMezcla.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionVista` | clase | cfg | `src/configuracion/cfg_seccionVista.ts` | APROBADO | 2026-10-21 |
| `CfgSeccionRespaldo` | clase | cfg | `src/configuracion/cfg_seccionRespaldo.ts` | APROBADO | 2026-10-21 |
| `cfg_atajos` (atajos en cfg) | archivo | cfg | — | RECHAZADO (→ `src/ui/ui_atajos.ts`, emiten `'ui:transporte'`) | 2026-10-21 |
| `'cfg:cambio'` | evento | cfg | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'cfg:mezclaPista'` | evento | cfg | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `TUiVarianteBoton` | tipo | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-21 |
| `IUiOpcion` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-21 |
| `IUiOpcionesBoton` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-21 |
| `IUiOpcionesSlider` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-21 |
| `IUiOpcionesSelector` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-21 |
| `IUiOpcionesInterruptor` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-21 |
| `ui_crearElemento` | función | ui | `src/ui/ui_dom.ts` | APROBADO | 2026-10-21 |
| `ui_vaciarElemento` | función | ui | `src/ui/ui_dom.ts` | APROBADO | 2026-10-21 |
| `ui_crearBoton` | función | ui | `src/ui/ui_boton.ts` | APROBADO | 2026-10-21 |
| `UiSlider` | clase | ui | `src/ui/ui_slider.ts` | APROBADO | 2026-10-21 |
| `UiSelector` | clase | ui | `src/ui/ui_selector.ts` | APROBADO | 2026-10-21 |
| `UiInterruptor` | clase | ui | `src/ui/ui_interruptor.ts` | APROBADO | 2026-10-21 |
| `ui_crearPanel` | función | ui | `src/ui/ui_panel.ts` | APROBADO | 2026-10-21 |
| `ui_descargarTexto` | función | ui | `src/ui/ui_archivos.ts` | APROBADO | 2026-10-21 |
| `ui_elegirArchivo` | función | ui | `src/ui/ui_archivos.ts` | APROBADO | 2026-10-21 |
| `UiNavegador` | clase | ui | `src/ui/ui_navegador.ts` | APROBADO | 2026-10-21 |
| `UiMenu` | clase | ui | `src/ui/ui_menu.ts` | APROBADO | 2026-10-21 |
| `UiPanelPistas` | clase | ui | `src/ui/ui_panelPistas.ts` | APROBADO | 2026-10-21 |
| `UiPantallaPractica` | clase | ui | `src/ui/ui_pantallaPractica.ts` | APROBADO | 2026-10-21 |
| `UiPantallaAfinador` | clase | ui | `src/ui/ui_pantallaAfinador.ts` | APROBADO | 2026-10-21 |
| `UiBarraTransporte` | clase | ui | `src/ui/ui_transporte.ts` | APROBADO | 2026-10-21 |
| `UiMarcador` | clase | ui | `src/ui/ui_marcador.ts` | APROBADO | 2026-10-21 |
| `UI_ATAJOS` | constante | ui | `src/ui/ui_atajos.ts` | APROBADO | 2026-10-21 |
| `UiAtajos` | clase | ui | `src/ui/ui_atajos.ts` | APROBADO | 2026-10-21 |
| `'ui:pantalla'` | evento | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ui:transporte'` | evento | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ui:ejercicio'` | evento | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ui:escala'` | evento | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ui:archivoGp'` | evento | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `'ui:pistaGp'` | evento | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-21 |
| `IUiOpcionesMenu` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-22 |
| `UiMenu(bus, fuenteCfg, opc?: IUiOpcionesMenu)` | firma | ui | `src/ui/ui_menu.ts` | APROBADO | 2026-10-22 |
| `IUiAtajo` | interfaz | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-22 |
| `UI_ATAJOS: readonly IUiAtajo[]` | firma | ui | `src/ui/ui_atajos.ts` | APROBADO (reemplaza `Record<string, TUiAccionTransporte>`) | 2026-10-22 |
| `UiPantallaAfinador(bus, editor, vistaAfinador)` | firma | ui | `src/ui/ui_pantallaAfinador.ts` | APROBADO | 2026-10-22 |
| `cfg_completarConfig(valor: unknown, base?: Readonly<IConfig>)` | firma | cfg | `src/configuracion/cfg_validador.ts` | APROBADO | 2026-10-22 |
| `UiNavegador.obtenerPantalla(): TUiPantalla \| null` | método | ui | `src/ui/ui_navegador.ts` | APROBADO | 2026-10-22 |
| `TUiVarianteBoton` + `'destacado'`, `'fantasma'` | tipo | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-22 |
| `CFG_CANT_CLICKS_CALIB`, `CFG_DB_MIN_MEDIDOR`, `CFG_LARGO_MAX_ID_DISP`, `CFG_TAM_MAX_ARCHIVO` | constantes internas | cfg | `src/configuracion/` | APROBADO | 2026-10-22 |
| `ICfgControlesPractica`, `ICfgControlesVista`, `ICfgControlesPista`, `TCfgFaseAsistente` | tipos internos | cfg | `src/configuracion/` | APROBADO | 2026-10-22 |
| `UI_EXTENSIONES_GP`, `UI_PULSOS_COMPAS_DEF` | constantes internas | ui | `src/ui/` | APROBADO | 2026-10-22 |
| `validarDestinoEdicion` | flecha privada | cfg | `src/configuracion/` | APROBADO | 2026-10-22 |
| `esRegistro` (flecha duplicada ×3) | flecha privada | cfg | `src/configuracion/` | RECHAZADO (→ `cor_validarRegistro` exportada, sin duplicados) | 2026-10-22 |
| `cfg_esRegistro` | función | cfg | — | RECHAZADO (→ `cor_validarRegistro`; "es" no es verbo y la utilidad es transversal) | 2026-10-22 |
| `cor_validarRegistro(valor: unknown): valor is Record<string, unknown>` | función | cor | `src/core/cor_validacion.ts` | APROBADO | 2026-10-22 |
| `IConfig.idDispSalida: string` | campo (futuro, no implementar aún) | cor | `src/core/tipos.ts` | APROBADO | 2026-10-22 |
| `gpr_leerPartitura(buf): Promise<IGprPartitura>` | firma | gpr | `src/guitar-pro/gpr_lector.ts` | APROBADO | 2026-10-22 |
| `IGprPartitura` | interfaz | gpr | `src/guitar-pro/gpr_tipos.ts` | APROBADO (`import type` de alphaTab permitido en `gpr_tipos.ts`) | 2026-10-22 |
| `IGprCompasTocado` | interfaz | gpr | `src/guitar-pro/gpr_tipos.ts` | APROBADO | 2026-10-22 |
| `gpr_convertirPista(score, idxPst, compases?)` | firma | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-22 |
| `ACP_TICKS_POR_PULSO` | constante | acp | `src/acompanamiento/acp_constantes.ts` | APROBADO (= `GPR_TICKS_POR_PULSO`) | 2026-10-22 |
| `AcpSincronizador` + `ICorPosicionable`, `reiniciar()`, `liberar()` | firma | acp | `src/acompanamiento/acp_sincronizador.ts` | APROBADO | 2026-10-22 |
| `AcpMezclador.reiniciar(pistas: readonly Pick<IGprPista,'idx'>[], idxPstGuitarra)` | firma | acp | `src/acompanamiento/acp_mezclador.ts` | APROBADO | 2026-10-22 |
| `GPR_CANAL_PERCUSION`, `GPR_PULSOS_REDONDA`, `GPR_TITULO_DEF`, `GPR_EXT_ROCKSMITH`, `GPR_ORIGEN` | constantes internas | gpr | `src/guitar-pro/` | APROBADO | 2026-10-22 |
| `ACP_VOL_PISTA_DEF`, `ACP_ESPERA_CORRECCION_MS`, `ACP_VIGENCIA_POS_MS`, `ACP_TOL_VELOCIDAD`, `ACP_ORIGEN` | constantes internas | acp | `src/acompanamiento/` | APROBADO | 2026-10-22 |
| `IGprCandidata` | interfaz interna | gpr | `src/guitar-pro/` | APROBADO | 2026-10-22 |
| `IAcpMotor` | interfaz interna | acp | `src/acompanamiento/acp_tipos.ts` | APROBADO | 2026-10-22 |
| `TGprScore`, `TGprTrack`, `TGprStaff`, `TGprBeat`, `TGprNote` | tipos internos | gpr | `src/guitar-pro/` | APROBADO | 2026-10-22 |
| `obtenerPentagrama`, `validarPercusion`, `calcularDurTicks`, `crearCandidata`, `elegirNotaAguda`, `listarCompasesLineales`, `crearNombreAfinacion`, `obtenerExtension`, `obtenerMensaje`, `acotarVol` | flechas privadas | gpr/acp | `src/guitar-pro/`, `src/acompanamiento/` | APROBADO | 2026-10-22 |
| `ICorCambioTempo` | interfaz (futuro, no implementar aún) | cor | `src/core/tipos.ts` | APROBADO | 2026-10-22 |
| `IEjercicio.cambiosTempo?: readonly ICorCambioTempo[]` | campo (futuro, no implementar aún) | cor | `src/core/tipos.ts` | APROBADO | 2026-10-22 |
| `TmpReloj.obtenerBpmBase()` / `.obtenerVelocidad()` | método | tmp | `src/timing/tmp_reloj.ts` | APROBADO | 2026-10-22 |
| `EscControlador(bus, fuenteCfg, afinaciones)` | firma | esc | `src/escalas/esc_controlador.ts` | APROBADO | 2026-10-22 |
| `Vc2Lienzo` | clase | vc2 | `src/vistas/canvas2d/vc2_lienzo.ts` | APROBADO | 2026-10-22 |
| `Vc2Carriles.fijarPulsosPorCompas`, `Vc2Notas.fijarNotacion`, `Vc2PanelAfinador.fijarNotacion`, `Vc2Onda.fijarColor` | método | vc2 | `src/vistas/canvas2d/` | APROBADO | 2026-10-22 |
| `esActivo()` en AudObservadorDispositivos, AudMonitor, AfnAfinador, EjrControlador, EscControlador, TmpProgramador, TmpMetronomo, TmpProgresivo, TmpLoop, TmpCalibrador | método | varios | — | APROBADO | 2026-10-22 |
| `aud_restricciones.test.ts`, `det_yin.test.ts`, `ejr_sesion.test.ts`, `tmp_reloj.test.ts` | archivos de prueba | aud/det/ejr/tmp | junto al archivo probado | APROBADO (formato `<archivo>.test.ts`) | 2026-10-22 |
| `DET_MARGEN_GRAVE_CENTS` | constante interna | det | — | RECHAZADO (→ bajar `DET_FREC_MIN_HZ` a 61.74 Hz, Si1) | 2026-10-22 |
| `DET_FREC_MIN_HZ = 61.74` | constante | det | `src/deteccion/det_constantes.ts` | APROBADO (reemplaza 82.41) | 2026-10-22 |
| `DET_FACTOR_ATAQUE` | constante interna | det | `src/deteccion/` | APROBADO | 2026-10-22 |
| `EJR_FACTOR_CAPTURA`, `EJR_TRS_MAX`, `EJR_OCT_MIN`, `EJR_OCT_MAX`, `EJR_PULSOS_COMPAS_MAX`, `EJR_IDS_AFINACION`, `TEjrRegistro` | internos | ejr | `src/ejercicios/` | APROBADO | 2026-10-22 |
| `ESC_PULSOS_ENTRADA`, `ESC_PULSOS_POR_COMPAS`, `ESC_DESPLAZAMIENTO_CAJA` | constantes internas | esc | `src/escalas/` | APROBADO | 2026-10-22 |
| `TMP_EPSILON_PULSOS`, `TMP_MARGEN_FIN_PULSOS` | constantes internas | tmp | `src/timing/` | APROBADO | 2026-10-22 |
| `VC2_ANCHO_CARRIL_MAX_PX`, `VC2_FRACCION_ANCHO_AUTOPISTA`, `VC2_DPR_MAX`, `VC2_ESTADO_PENDIENTE`, `VC2_ESTADO_ACIERTO`, `VC2_ESTADO_FALLO`, `VC2_COLOR_SIN_CUERDA`, `VC2_DUR_MIN_COLA`, `VC2_PTC_POR_EXPLOSION`, `VC2_GRAVEDAD_PX_MS2`, `VC2_MAX_ANILLOS`, `VC2_VIDA_ANILLO_MS`, `VC2_COLOR_ONDA`, `VC2_COLOR_ONDA_AFINADOR`, `VC2_RANGO_CENTS`, `VC2_ZONA_AFINADA_CENTS`, `VC2_COLOR_DESAFINADO`, `VC2_COLOR_REPOSO`, `VC2_DUR_DESTELLO_MS`, `VC2_DUR_RESALTE_MS`, `VC2_COLOR_TEXTO`, `VC2_COLOR_TEXTO_SUAVE`, `VC2_VIGENCIA_LECTURA_MS` | constantes internas | vc2 | `src/vistas/canvas2d/` | APROBADO | 2026-10-22 |
| `app_crearAlmacen(): ICfgAlmacen` | función | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `app_activarAudio(modulos: IAppModulos): Promise<void>` | función | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `IAppModulos` | interfaz | app | `src/main.ts` | APROBADO | 2026-10-21 |
| `IAppModulos` + `ctx: AudioContext`, `vistaAfinador: ICorVista` | campos | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `app_aplicarConfig(cfg, modulos, claves: readonly (keyof IConfig)[])` | firma | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `app_activarAudio(modulos: IAppModulos, idDisp: string)` | firma | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `app_crearOpcionesVista(cfg: Readonly<IConfig>): ICorOpcionesVista` | función | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `montarVista`, `activarConGesto`, `tipoVistaAct` | locales | app | `src/main.ts` | APROBADO | 2026-10-22 |
| `quitarDibujable` | local | app | `src/main.ts` | RECHAZADO (→ `desuscribirDibujable`, verbo estándar) | 2026-10-22 |
| `tieneAlguna` (flecha) | local | app | `src/main.ts` | RECHAZADO (→ `validarCambio`; las flechas llevan verbo, `tiene` es para valores booleanos) | 2026-10-22 |
| `app_iniciar` | función | app | `src/main.ts` | APROBADO | 2026-10-21 |
| `app_crearVista` | función | app | `src/main.ts` | APROBADO | 2026-10-21 |
| `app_aplicarConfig` | función | app | `src/main.ts` | APROBADO | 2026-10-21 |
| `efx` (abreviatura, `src/efectos/`) | módulo | efx | — | APROBADO | 2026-10-25 |
| `renombrar`, `conectar`, `desconectar` | verbos estándar | — | — | APROBADO | 2026-10-25 |
| `ir`, `bd`, `fx1`, `fx2`, `amp`, `cab`, `del`, `mod`, `rev`, `eq` | abreviaturas §3 | — | — | APROBADO | 2026-10-25 |
| `idb` / `db` para base de datos | abreviatura | — | — | RECHAZADO (→ `bd`; `db` = decibeles) | 2026-10-25 |
| `params` / `IEfxParams*` | abreviatura | efx | — | RECHAZADO (→ `parametros` / `IEfxParametros*`, `params` no está en §3) | 2026-10-25 |
| `TCfgVista = '2d' \| 'guitarHero' \| 'rocksmith'` | tipo (valores) | cor | `src/core/tipos.ts` | APROBADO (reemplaza `'2d' \| '3d'`) | 2026-10-25 |
| `INota.dedo?: number` | campo | cor | `src/core/tipos.ts` | APROBADO | 2026-10-25 |
| `ICorPosMastil` | interfaz | cor | `src/core/tipos.ts` | APROBADO | 2026-10-25 |
| `IConfig.esMonitorActivo`, `IConfig.volMonitor`, `IConfig.idPresetEfx` | campos | cor | `src/core/tipos.ts` | APROBADO | 2026-10-25 |
| `COR_DEDO_AIRE`, `COR_DEDO_MAX` | constantes | cor | `src/core/cor_digitacion.ts` | APROBADO | 2026-10-25 |
| `cor_validarDedo` | función | cor | `src/core/cor_digitacion.ts` | APROBADO | 2026-10-25 |
| `cor_listarPosicionesNota` | función | cor | `src/core/cor_notas.ts` | APROBADO | 2026-10-25 |
| `COR_ORDEN_BLOQUES_EFX` | constante | cor | `src/core/cor_efectos.ts` | APROBADO | 2026-10-25 |
| `TEfxIdBloque`, `TEfxModeloFx1`, `TEfxModeloFx2`, `TEfxModeloAmp`, `TEfxModeloCab`, `TEfxModeloDel`, `TEfxModeloMod`, `TEfxModeloRev`, `TEfxModeloEq` | tipos | cor | `src/core/cor_efectos.ts` | APROBADO | 2026-10-25 |
| `IEfxParametrosFx1`, `IEfxParametrosFx2`, `IEfxParametrosAmp`, `IEfxParametrosCab`, `IEfxParametrosDel`, `IEfxParametrosMod`, `IEfxParametrosRev`, `IEfxParametrosEq` | interfaces | cor | `src/core/cor_efectos.ts` | APROBADO | 2026-10-25 |
| `IEfxEstadoBloque<TModelo, TParametros>`, `IEfxEstadoCab`, `IEfxBloques`, `IEfxPreset` | interfaces | cor | `src/core/cor_efectos.ts` | APROBADO | 2026-10-25 |
| `IEfxPreset.esFabrica` | campo | cor | — | RECHAZADO (→ derivado del prefijo del id; solo en `IEfxResumenPreset`) | 2026-10-25 |
| `IEfxPreset.vol` | campo | cor | — | RECHAZADO (→ `eq.parametros.nivel` es el volumen de salida) | 2026-10-25 |
| `IEjrCoincidencia` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `IEfxResumenPreset`, `IEfxListaPresets`, `IEfxPresetActivo`, `IEfxCadenaCambiada`, `IEfxIrResumen`, `IEfxListaIr`, `IEfxIrCargado`, `IEfxExportacion`, `IEfxImportacion` | interfaces | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `IUiPresetEfxElegido` | interfaz | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `TUiBloqueEfxEditado`, `TUiGestionPresetEfx` | tipos | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `TUiPantalla` + `'mezclador'` | tipo (valor) | cor | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `'ejr:coincidencia'` | evento | ejr | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `'efx:presets'`, `'efx:presetActivo'`, `'efx:cadena'`, `'efx:irs'`, `'efx:irCargado'`, `'efx:exportacion'`, `'efx:importacion'` | eventos | efx | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `'ui:presetEfx'`, `'ui:bloqueEfx'`, `'ui:gestionPresetEfx'`, `'ui:archivoIr'` | eventos | ui | `src/core/cor_eventos.ts` | APROBADO | 2026-10-25 |
| `'ui:volverPantalla'` / `IUiPantallaSolicitada.origen` | evento / campo | ui | — | RECHAZADO (→ `UiPantallaMezclador` recuerda la pantalla anterior escuchando `'ui:pantalla'`) | 2026-10-25 |
| `AudCaptura.obtenerSalidaLimpia(): AudioNode` | método | aud | `src/audio/aud_captura.ts` | APROBADO | 2026-10-25 |
| `AudCaptura.obtenerNodoSalida` | método | aud | — | RECHAZADO (→ `obtenerSalidaLimpia`, explicita que es pre-efectos) | 2026-10-25 |
| `IEjrOpcionesCoincidencia` | interfaz | ejr | `src/ejercicios/ejr_tipos.ts` | APROBADO | 2026-10-25 |
| `EJR_CENTS_COINCIDENCIA_CERO` | constante | ejr | `src/ejercicios/ejr_coincidencia.ts` | APROBADO | 2026-10-25 |
| `ejr_calcularPctCoincidencia(cents, esNotaCorrecta): number` | función | ejr | `src/ejercicios/ejr_coincidencia.ts` | APROBADO | 2026-10-25 |
| `EjrMedidorCoincidencia` | clase | ejr | `src/ejercicios/ejr_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `EJR_INTERVALO_COINCIDENCIA_MS`, `EJR_FACTOR_SUAVIZADO_COINCIDENCIA` | constantes internas | ejr | `src/ejercicios/ejr_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `primera-posicion-cuerda-{1..6}.json`, `primera-posicion-todas.json`, `notas-cuerda-{1..6}.json`, `encontrar-nota.json` | archivos JSON | ejr | `public/ejercicios/` | APROBADO | 2026-10-25 |
| `IEscPosicion extends ICorPosMastil { dedo }` | interfaz | esc | `src/escalas/esc_tipos.ts` | APROBADO | 2026-10-25 |
| `esc_calcularDedo(trs, trsMin): number` | función | esc | `src/escalas/esc_digitacion.ts` | APROBADO | 2026-10-25 |
| `VC2_TRS_MAX_MASTIL`, `VC2_CANT_SIGUIENTES_MASTIL`, `VC2_ALFA_SIGUIENTE_MASTIL` | constantes | vc2 | `src/vistas/canvas2d/vc2_constantes.ts` | APROBADO | 2026-10-25 |
| `VC2_TRASTES_CON_MARCA_MASTIL`, `VC2_RADIO_DEDO_PX`, `VC2_COLOR_DIAGRAMA` | constantes internas | vc2 | `src/vistas/canvas2d/` | APROBADO | 2026-10-25 |
| `IVc2RangoMastil`, `IVc2GeoMastil`, `IVc2MarcaMastil`, `IVc2CapaMastil` | interfaces | vc2 | `src/vistas/canvas2d/vc2_tipos.ts` | APROBADO | 2026-10-25 |
| `vc2_calcularRangoMastil`, `vc2_calcularGeoMastil`, `vc2_calcularXTrasteMastil`, `vc2_calcularYCuerdaMastil` | funciones | vc2 | `src/vistas/canvas2d/vc2_geometriaMastil.ts` | APROBADO | 2026-10-25 |
| `vc2_crearMarcasMastil` | función | vc2 | `src/vistas/canvas2d/vc2_marcasMastil.ts` | APROBADO | 2026-10-25 |
| `Vc2DiagramaMastil` | clase | vc2 | `src/vistas/canvas2d/vc2_diagramaMastil.ts` | APROBADO | 2026-10-25 |
| `Vc2MarcasDedo` (+ `fijarMarcas`) | clase | vc2 | `src/vistas/canvas2d/vc2_marcasDedo.ts` | APROBADO | 2026-10-25 |
| `Vc2VistaMastil` (+ `fijarAfinacion`) | clase | vc2 | `src/vistas/canvas2d/vc2_vistaMastil.ts` | APROBADO | 2026-10-25 |
| `EFX_ID_PRESET_DEF`, `EFX_PREFIJO_FABRICA`, `EFX_PREFIJO_USUARIO`, `EFX_CLAVE_ALMACEN`, `EFX_NOMBRE_EXPORTACION`, `EFX_VERSION_PRESETS`, `EFX_NOMBRE_BD_IR`, `EFX_VERSION_BD_IR`, `EFX_NOMBRE_COLECCION_IR`, `EFX_TAM_MAX_IR_BYTES`, `EFX_DUR_MAX_IR_SEG`, `EFX_LARGO_MAX_NOMBRE`, `EFX_MAX_PRESETS_USUARIO`, `EFX_DUR_FUNDIDO_SEG`, `EFX_TAM_CURVA` | constantes | efx | `src/efectos/efx_constantes.ts` | APROBADO | 2026-10-25 |
| `EFX_ORDEN_BLOQUES` | constante | efx | — | RECHAZADO (→ `COR_ORDEN_BLOQUES_EFX`, la necesitan efx y ui) | 2026-10-25 |
| `TEfxTipoCurva`, `IEfxBloqueAudio`, `IEfxBloqueCabAudio`, `IEfxBloquesAudio`, `IEfxCadena`, `IEfxArchivoPresets`, `IEfxAlmacenPresets`, `IEfxBiblioteca`, `IEfxIr`, `IEfxAlmacenIr` | tipos | efx | `src/efectos/efx_tipos.ts` | APROBADO | 2026-10-25 |
| `efx_convertirRelALineal`, `efx_convertirRelAExponencial`, `efx_convertirDbAGan` | funciones | efx | `src/efectos/efx_escalas.ts` | APROBADO | 2026-10-25 |
| `efx_crearCurvaSaturacion` | función | efx | `src/efectos/efx_curvas.ts` | APROBADO | 2026-10-25 |
| `efx_crearAleatorio` | función | efx | `src/efectos/efx_aleatorio.ts` | APROBADO | 2026-10-25 |
| `efx_generarImpulsoReverb`, `efx_generarImpulsoGabinete` | funciones | efx | `src/efectos/efx_impulsos.ts` | APROBADO | 2026-10-25 |
| `EfxConmutador` | clase | efx | `src/efectos/efx_conmutador.ts` | APROBADO | 2026-10-25 |
| `EfxBloqueFx1`, `EfxBloqueFx2`, `EfxBloqueAmp`, `EfxBloqueCab`, `EfxBloqueDel`, `EfxBloqueMod`, `EfxBloqueRev`, `EfxBloqueEq` | clases | efx | `src/efectos/efx_bloque<Id>.ts` | APROBADO | 2026-10-25 |
| `EfxProcesadorCompuerta`, `EFX_NOMBRE_PROCESADOR_COMPUERTA`, `efx_registrarProcesadores` | opcionales (solo si se usa AudioWorklet) | efx | `src/efectos/efx_procesadorCompuerta.ts`, `efx_fabrica.ts` | APROBADO | 2026-10-25 |
| `efx_crearBloques(ctx): Promise<IEfxBloquesAudio>` | función | efx | `src/efectos/efx_fabrica.ts` | APROBADO | 2026-10-25 |
| `EfxCadena` | clase | efx | `src/efectos/efx_cadena.ts` | APROBADO | 2026-10-25 |
| `EFX_BLOQUES_DEF`, `EFX_PRESETS_FABRICA` | constantes | efx | `src/efectos/efx_presetsFabrica.ts` | APROBADO | 2026-10-25 |
| `efx_validarPreset`, `efx_validarArchivoIr` | funciones | efx | `src/efectos/efx_esquema.ts` | APROBADO | 2026-10-25 |
| `efx_exportarPresets`, `efx_importarPresets` | funciones | efx | `src/efectos/efx_exportador.ts` | APROBADO | 2026-10-25 |
| `EfxAlmacenPresets` | clase | efx | `src/efectos/efx_almacenPresets.ts` | APROBADO | 2026-10-25 |
| `EfxBiblioteca` | clase | efx | `src/efectos/efx_biblioteca.ts` | APROBADO | 2026-10-25 |
| `EfxGestorPresets` / `EfxPresetManager` | clase | efx | — | RECHAZADO (→ `EfxBiblioteca`; "gestor"/"manager" genéricos) | 2026-10-25 |
| `EfxAlmacenIr` | clase | efx | `src/efectos/efx_almacenIr.ts` | APROBADO | 2026-10-25 |
| `EfxMonitor` | clase | efx | `src/efectos/efx_monitor.ts` | APROBADO | 2026-10-25 |
| `EfxControlador` | clase | efx | `src/efectos/efx_controlador.ts` | APROBADO | 2026-10-25 |
| `src/vistas/tres-d/v3d_vista.ts` / `V3dVista` / `IV3dMontaje` | archivo / clase / interfaz interna | v3d | — | RECHAZADO (→ renombre a `v3d_vistaGuitarHero.ts` / `V3dVistaGuitarHero` / `IV3dMontajeGuitarHero`; hay dos vistas 3D) | 2026-10-25 |
| `V3dVistaGuitarHero`, `IV3dMontajeGuitarHero` | clase / interfaz interna | v3d | `src/vistas/tres-d/v3d_vistaGuitarHero.ts` | APROBADO | 2026-10-25 |
| `V3D_EJ_VACIO` | constante | v3d | `src/vistas/tres-d/v3d_constantes.ts` | APROBADO (se mueve desde `v3d_vista.ts`, exportada) | 2026-10-25 |
| `v3d_crearLienzo` | función | v3d | `src/vistas/tres-d/v3d_lienzo.ts` | APROBADO | 2026-10-25 |
| `v3d_crearAtlasNumeros` | función | v3d | `src/vistas/tres-d/v3d_texturas.ts` | APROBADO | 2026-10-25 |
| `IV3dZonaTrastes` | interfaz | v3d | `src/vistas/tres-d/v3d_tipos.ts` | APROBADO | 2026-10-25 |
| `V3D_ANCHO_CASILLA`, `V3D_SEPARACION_CUERDAS`, `V3D_Y_CUERDA_1`, `V3D_ANCHO_ZONA_MIN`, `V3D_PULSOS_ANTICIPO_ZONA`, `V3D_CONSTANTE_CAMARA_MS`, `V3D_DIST_GUIA`, `V3D_COLOR_ZONA` | constantes | v3d | `src/vistas/tres-d/v3d_constantesRocksmith.ts` | APROBADO | 2026-10-25 |
| `v3d_calcularXCasilla`, `v3d_calcularXBarraTraste`, `v3d_calcularYCuerda`, `v3d_calcularZonaTrastes`, `v3d_calcularXZona`, `v3d_suavizarValor` | funciones | v3d | `src/vistas/tres-d/v3d_geometriaRocksmith.ts` | APROBADO | 2026-10-25 |
| `V3dCamaraRocksmith` (+ `fijarZona`) | clase | v3d | `src/vistas/tres-d/v3d_camaraRocksmith.ts` | APROBADO | 2026-10-25 |
| `V3dCuerdas` (+ `marcarCuerda`) | clase | v3d | `src/vistas/tres-d/v3d_cuerdas.ts` | APROBADO | 2026-10-25 |
| `V3dReglaTrastes` (+ `fijarZona`) | clase | v3d | `src/vistas/tres-d/v3d_reglaTrastes.ts` | APROBADO | 2026-10-25 |
| `V3dGemas` (+ `cargar`, `marcarResultado`) | clase | v3d | `src/vistas/tres-d/v3d_gemas.ts` | APROBADO | 2026-10-25 |
| `V3dColas` (+ `cargar`, `marcarResultado`) | clase | v3d | `src/vistas/tres-d/v3d_colas.ts` | APROBADO | 2026-10-25 |
| `V3dGuias` (+ `cargar`) | clase | v3d | `src/vistas/tres-d/v3d_guias.ts` | APROBADO | 2026-10-25 |
| `V3dBandasNota` (+ `cargar`, `marcarResultado`) | clase | v3d | `src/vistas/tres-d/v3d_bandasNota.ts` | APROBADO | 2026-10-25 |
| `V3dVistaRocksmith`, `IV3dMontajeRocksmith` | clase / interfaz interna | v3d | `src/vistas/tres-d/v3d_vistaRocksmith.ts` | APROBADO | 2026-10-25 |
| `gpr_convertirDedo(dedoGp, trs): number \| undefined` | función | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-25 |
| `CFG_VERSION = 2`, `CFG_MIGRACIONES[1]` | constante | cfg | `src/configuracion/` | APROBADO | 2026-10-25 |
| `CFG_LARGO_MAX_ID_PRESET` | constante interna | cfg | `src/configuracion/cfg_validador.ts` | APROBADO | 2026-10-25 |
| `CfgSeccionMonitor` | clase | cfg | `src/configuracion/cfg_seccionMonitor.ts` | APROBADO | 2026-10-25 |
| `CfgPantallaMezclador` / `src/configuracion/cfg_mezclador.ts` | clase / archivo | cfg | — | RECHAZADO (→ `UiPantallaMezclador` en `src/ui/`: no edita `IConfig`, habla con efx solo por el bus) | 2026-10-25 |
| `UiPantallaPractica(bus, transporte, marcador, panelPistas, medidor)` + `obtenerContenedorMastil(): HTMLElement` | firma / método | ui | `src/ui/ui_pantallaPractica.ts` | APROBADO | 2026-10-25 |
| `UiMedidorCoincidencia` | clase | ui | `src/ui/ui_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `IUiDescriptorParametroEfx`, `IUiDescriptorBloqueEfx`, `TUiDescriptoresEfx` | tipos | ui | `src/ui/ui_tipos.ts` | APROBADO | 2026-10-25 |
| `UI_BLOQUES_EFX` | constante | ui | `src/ui/ui_bloquesEfx.ts` | APROBADO | 2026-10-25 |
| `UiBloqueEfecto` (+ `fijarEstado`) | clase | ui | `src/ui/ui_bloqueEfecto.ts` | APROBADO | 2026-10-25 |
| `UiSelectorIr` (+ `fijarIdIr`, `liberar`) | clase | ui | `src/ui/ui_selectorIr.ts` | APROBADO | 2026-10-25 |
| `UiListaPresets` (+ `liberar`) | clase | ui | `src/ui/ui_listaPresets.ts` | APROBADO | 2026-10-25 |
| `UiControlMonitor` (+ `liberar`), `UI_MSJ_AVISO_MONITOR` (interna) | clase / constante | ui | `src/ui/ui_controlMonitor.ts` | APROBADO | 2026-10-25 |
| `UiPantallaMezclador` | clase | ui | `src/ui/ui_pantallaMezclador.ts` | APROBADO | 2026-10-25 |
| `IAppModulos` + `monitor`, `medidor`, `vistaMastil` | campos | app | `src/main.ts` | APROBADO | 2026-10-25 |
| `app_crearAlmacenPresets(): IEfxAlmacenPresets`, `app_crearAlmacenIr(): IEfxAlmacenIr` | funciones | app | `src/main.ts` | APROBADO | 2026-10-25 |
| `app_crearVista(tipo: TCfgVista, …)` con `'2d' \| 'guitarHero' \| 'rocksmith'` | firma | app | `src/main.ts` | APROBADO | 2026-10-25 |
| `v3d_validarPosMastil(nota: INota): nota is INota & ICorPosMastil` | función | v3d | `src/vistas/tres-d/v3d_geometriaRocksmith.ts` | APROBADO | 2026-10-25 |
| `V3D_ZONA_DEF: Readonly<IV3dZonaTrastes>` | constante | v3d | `src/vistas/tres-d/v3d_constantesRocksmith.ts` | APROBADO | 2026-10-25 |
| `v3d_crearGeoCeldaAtlas(idxCelda, cantNumeros, ancho, alto): PlaneGeometry`, `v3d_crearTexturaTexto(texto, anchoPx, altoPx, color): CanvasTexture` | funciones | v3d | `src/vistas/tres-d/v3d_texturas.ts` | APROBADO | 2026-10-25 |
| `V3dCamaraRocksmith(opc: ICorOpcionesVista)` | firma | v3d | `src/vistas/tres-d/v3d_camaraRocksmith.ts` | APROBADO | 2026-10-25 |
| `obtenerColumnasAtlas`, `crearTextura`, `acotarTraste`, `crearMatBanda` | flechas privadas | v3d | `src/vistas/tres-d/` | APROBADO | 2026-10-25 |
| `V3D_POS_CAMARA`, `V3D_MIRA_CAMARA`, `V3D_ALEJAMIENTO_MAX` (redefinidas localmente), `V3D_MARGEN_ZONA_CASILLAS` | constantes internas | v3d | `src/vistas/tres-d/v3d_camaraRocksmith.ts` | APROBADO | 2026-10-25 |
| `V3D_DUR_VIBRACION_MS`, `V3D_AMPLITUD_VIBRACION`, `V3D_RADIO_CUERDA_MIN`, `V3D_RADIO_CUERDA_MAX`, `V3D_OPACIDAD_BRILLO_BASE` | constantes internas | v3d | `src/vistas/tres-d/v3d_cuerdas.ts` | APROBADO | 2026-10-25 |
| `V3D_TAM_CELDA_NUMERO_PX`, `V3D_TAM_NUMERO_REGLA`, `V3D_Z_NUMEROS`, `V3D_OPACIDAD_ZONA`, `V3D_COLOR_NUMERO`, `V3D_COLOR_NUMERO_ZONA`, `TV3dGeoRegla`, `TV3dMatRegla` | internos | v3d | `src/vistas/tres-d/v3d_reglaTrastes.ts` | APROBADO | 2026-10-25 |
| `V3D_ANCHO_GEMA`, `V3D_ALTO_GEMA`, `V3D_PROFUNDIDAD_GEMA`, `V3D_TAM_CARA_NUMERO`, `V3D_ESCALA_DEDO`, `V3D_REALCE_COLOR`, `V3D_CANT_NUMEROS` (+ reutiliza `V3D_ESTADO_*`, `V3D_DUR_ACIERTO_MS`, `V3D_MSJ_SIN_EJERCICIO`, `obtenerIdxColor`) | constantes internas | v3d | `src/vistas/tres-d/v3d_gemas.ts` | APROBADO | 2026-10-25 |
| `V3D_MAX_POR_NUMERO` | constante interna | v3d | — | RECHAZADO (→ `V3D_MAX_INSTANCIAS_POR_NUMERO`, explicita qué se limita) | 2026-10-25 |
| `V3D_MAX_INSTANCIAS_POR_NUMERO` | constante interna | v3d | `src/vistas/tres-d/v3d_gemas.ts` | APROBADO | 2026-10-25 |
| `V3D_ANCHO_COLA`, `V3D_ALTO_COLA` | constantes internas | v3d | `src/vistas/tres-d/v3d_colas.ts` | APROBADO | 2026-10-25 |
| `V3D_GROSOR_GUIA` | constante interna | v3d | `src/vistas/tres-d/v3d_guias.ts` | APROBADO | 2026-10-25 |
| `V3D_MAX_BANDAS`, `V3D_ALTO_BANDA`, `V3D_ALTO_NOMBRE_BANDA`, `V3D_ANCHO_REPETICION_NOMBRE` | constantes internas | v3d | `src/vistas/tres-d/v3d_bandasNota.ts` | APROBADO | 2026-10-25 |
| `GPR_DEDO_INDICE`, `GPR_DEDO_MENIQUE` | constantes internas | gpr | `src/guitar-pro/gpr_adaptador.ts` | APROBADO | 2026-10-25 |
| `formatear`, `redondear` | verbos estándar | — | — | APROBADO | 2026-10-25 |
| Convención BEM de clases CSS `<abrev>-<bloque>[__<elemento>][--<modificador>]` | convención | — | §2 | APROBADO | 2026-10-25 |
| `UiMedidorCoincidencia(bus: ICorBus, fuenteCfg?: ICorFuenteConfig)` | firma | ui | `src/ui/ui_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `leerIdPreset` | flecha privada | cfg | `src/configuracion/cfg_validador.ts` | APROBADO | 2026-10-25 |
| `UI_GIRO_MAX_PERILLA`, `UI_PX_RECORRIDO_PERILLA`, `UI_PASO_PERILLA`, `IUiPerilla`, `crearPerilla`, `acotarRel`, `redondearPaso`, `formatearPerilla`, `validarParametroVisible` | internos | ui | `src/ui/ui_bloqueEfecto.ts` | APROBADO | 2026-10-25 |
| `UI_LARGO_MAX_NOMBRE_PRESET` (= `EFX_LARGO_MAX_NOMBRE`, 40), `UI_TAM_MAX_ARCHIVO_PRESETS`, `mostrarDialogoNombre`, `mostrarDialogoConfirmacion` | internos | ui | `src/ui/ui_listaPresets.ts` | APROBADO | 2026-10-25 |
| `UI_EXTENSIONES_IR`, `crearOpcionesIr` | internos | ui | `src/ui/ui_selectorIr.ts` | APROBADO | 2026-10-25 |
| `UI_DB_MIN_MEDIDOR`, `UI_NOMBRES_PANTALLA`, `convertirDbARel` | internos | ui | `src/ui/ui_pantallaMezclador.ts` | APROBADO | 2026-10-25 |
| `TUiBloquesUi` | tipo interno | ui | — | RECHAZADO (→ `TUiControlesBloques`; "BloquesUi" redundante y vago) | 2026-10-25 |
| `TUiControlesBloques` | tipo interno | ui | `src/ui/ui_pantallaMezclador.ts` | APROBADO | 2026-10-25 |
| `UI_PCT_VERDE`, `UI_PCT_AMARILLO`, `UI_CENTS_AFINADO`, `UI_CENTS_ESCALA`, `UI_RUTA_ARCO`, `TUiNivelCoincidencia`, `obtenerNivel`, `formatearCents`, `crearSvg` | internos | ui | `src/ui/ui_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `UI_NS_SVG` | constante interna | ui | — | RECHAZADO (→ `UI_ESPACIO_NOMBRES_SVG`; `ns` no está en §3) | 2026-10-25 |
| `UI_ESPACIO_NOMBRES_SVG` | constante interna | ui | `src/ui/ui_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `describirEstado` | flecha privada | ui | — | RECHAZADO (→ `obtenerTextoEstado`; `describir` no es verbo estándar) | 2026-10-25 |
| `obtenerTextoEstado` | flecha privada | ui | `src/ui/ui_medidorCoincidencia.ts` | APROBADO | 2026-10-25 |
| `formatearPct` | flecha privada | ui | `src/ui/ui_controlMonitor.ts` | APROBADO | 2026-10-25 |
| `aplicar`, `agregar`, `normalizar` | verbos estándar | — | — | APROBADO (`aplicar` y `agregar` ya se usaban en `app_aplicarConfig` y `V3dEscena.agregar`) | 2026-10-25 |
| `q` | abreviatura §3 | — | — | APROBADO (solo dentro de nombres compuestos) | 2026-10-25 |
| `efx_fijarParametro(param, valor, ctx)` | firma | efx | — | RECHAZADO (→ parámetro `parametroAudio`; `param` no está en §3) | 2026-10-25 |
| `efx_fijarParametro(parametroAudio: AudioParam, valor: number, ctx: BaseAudioContext): void` | función | efx | `src/efectos/efx_rampas.ts` | APROBADO | 2026-10-25 |
| `EfxConvolutor.fijarBuffer` | método | efx | — | RECHAZADO (→ `fijarImpulso(buf: AudioBuffer \| null)`; dice qué es y evita el inglés) | 2026-10-25 |
| `EfxConvolutor` (`entrada`, `salida`, `fijarImpulso(buf: AudioBuffer \| null)`, `liberar()`) | clase | efx | `src/efectos/efx_convolutor.ts` | APROBADO | 2026-10-25 |
| `efx_calcularCompensacionGan(ganRel: number): number`, `efx_crearCurvaRectificador(cantMuestras: number): Float32Array<ArrayBuffer>`, `EFX_GAN_MAX_CURVA = 200` | función / constante | efx | `src/efectos/efx_curvas.ts` | APROBADO | 2026-10-25 |
| `EfxProcesadorCompuerta`, `EFX_NOMBRE_PROCESADOR_COMPUERTA`, `efx_registrarProcesadores` | opcionales | efx | — | NO USADOS (no hizo falta AudioWorklet; no crear) | 2026-10-25 |
| `IEfxCoefBiquad` / `calcularCoefBiquad` | interna | efx | — | RECHAZADO (→ `IEfxCoeficientesBiquad` / `calcularCoeficientesBiquad`; `coef` no está en §3) | 2026-10-25 |
| `EFX_NOMBRE_SIN_NOMBRE` | constante interna | efx | — | RECHAZADO (→ `EFX_NOMBRE_DEF`) | 2026-10-25 |
| `recortarDuro` | flecha privada | efx | — | RECHAZADO (→ `acotarMuestra`; verbo estándar) | 2026-10-25 |
| `EFX_SESGO_VALVULA`, `EFX_LIMITE_NEG_FUZZ`, `EFX_CODO_DURA`, `TEfxTipoBiquad`, `IEfxCoeficientesBiquad`, `IEfxFiltroImpulso`, `IEfxModeloReverb`, `IEfxModeloGabinete`, `EFX_MODELOS_REVERB`, `EFX_MODELOS_GABINETE`, `EFX_PERIODO_RESORTE_SEG`, `EFX_DUR_CHIRRIDO_SEG`, `EFX_GAN_CHIRRIDO`, `EFX_PISO_COMPUERTA_DB`, `EFX_Q_CONTROL_DB`, `IEfxModeloDrive`, `EFX_MODELOS_DRIVE`, `EFX_Q_WAH`, `EFX_GAN_WAH`, `IEfxModeloAmp`, `EFX_MODELOS_AMP`, `EFX_RANGO_TONO_DB`, `TEfxModeloCabSimulado`, `EFX_MODELO_CAB_RESPALDO`, `IEfxModeloDelay`, `EFX_MODELOS_DELAY`, `EFX_RETARDO_MAX_SEG`, `EFX_REALIMENTACION_MAX`, `EFX_PROFUNDIDAD_MAX_SEG`, `IEfxModeloModulacion`, `EFX_MODELOS_MOD`, `EFX_CANT_ETAPAS_PHASER`, `EFX_FREC_BASE_PHASER_HZ`, `EFX_REALIMENTACION_MAX_FLANGER`, `EFX_SEMILLA_REVERB`, `EFX_DEMORA_REGENERAR_MS`, `EFX_PRE_RETARDO_MAX_SEG`, `EFX_RANGO_EQ_DB`, `TEfxAplicadores`, `IEfxRanuraConvolucion`, `EFX_VOL_MONITOR_INICIAL`, `TEfxModelosPorBloque`, `EFX_MODELOS_POR_BLOQUE`, `EFX_EXTENSION_IR`, `EFX_NOMBRE_DEF`, `EFX_MSJ_SIN_BD` | internos | efx | `src/efectos/` | APROBADO | 2026-10-25 |
| `acotarRel`, `acotarMuestra`, `calcularMuestra`, `calcularCoeficientesBiquad`, `aplicarBiquad`, `normalizarPico`, `agregarReflexionesResorte`, `generarCanalReverb`, `crearCurvaUmbral`, `crearCurvaColor`, `convertirTonoADb`, `aplicarEstado`, `validarBloque`, `validarCab`, `validarBloques`, `acotarNombre`, `crearIdUsuario`, `crearResumen`, `convertirSolicitud`, `validarIr`, `obtenerMsj`, `crearIdIr`, `fijarEstadoBloque` | flechas privadas | efx | `src/efectos/` | APROBADO | 2026-10-25 |
| `ui-medidor__*`, `ui-mezclador__*`, `ui-bloque-efx__*`, `ui-perilla*`, `ui-presets__*`, `ui-selector-ir*`, `ui-monitor__aviso`, `ui-dialogo*`, `ui-campo__entradaTexto`, `ui-practica__mezclador` | clases CSS | ui | `src/ui/ui_estilos.css` | APROBADO (`ui-campo__entradaTexto` se acepta por consistencia con el CSS existente; las nuevas, en kebab-case) | 2026-10-25 |

## 7. Regla ESLint de referencia
```js
'@typescript-eslint/naming-convention': [
  'error',
  { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
  { selector: 'typeAlias', format: ['PascalCase'], prefix: ['T'] },
  { selector: 'enum', format: ['PascalCase'], prefix: ['E'] },
  { selector: 'class', format: ['PascalCase'] },
  { selector: 'function', format: null, custom: { regex: '^[a-z0-9]{2,3}_[a-z][a-zA-Z0-9]*$', match: true } },
  { selector: 'variable', modifiers: ['const', 'global'], format: ['UPPER_CASE', 'camelCase'] },
  { selector: 'variable', types: ['boolean'], format: ['PascalCase'], prefix: ['es', 'tiene', 'puede'] },
]
```

# App de guitarra estilo Rocksmith — Contexto para Claude Code

Antes de escribir código, lee:
- `docs/proyecto.md`: visión, requerimientos, decisiones y fases.
- `docs/convenciones-nombres.md`: nomenclatura obligatoria y registro de nombres aprobados.
- `docs/arquitectura.md`: módulos, carpetas y cómo se comunican.

## Stack
- 100% web, sin backend. Uso en localhost; posible publicación futura como sitio estático.
- Vite + TypeScript en modo `strict` + ESLint (regla `@typescript-eslint/naming-convention`).
- Web Audio API + `getUserMedia` para captura; detección de tono monofónica (YIN con Pitchy).
- Dos vistas: liviana (Canvas 2D, sin librerías) y completa (autopista 3D con Three.js).
- alphaTab para leer Guitar Pro y reproducir el acompañamiento.

## Agentes (`.claude/agents/`)
| # | Agente | Responsabilidad |
|---|---|---|
| 1 | `nomenclatura-solid` | Dueño de las convenciones de nombres y de SOLID. **Único** que modifica `docs/convenciones-nombres.md`. |
| 2 | `guitar-pro` | Importar Guitar Pro con alphaTab, convertir al modelo interno y reproducir el acompañamiento de fondo. |
| 3 | `threejs-autopista` | Vista 3D (autopista de notas) con Three.js. |
| 4 | `caracteristicas-basicas` | Captura de audio, detección de notas, afinador, ejercicios JSON, escalas, timing, metrónomo y vista Canvas 2D. |
| 5 | `configuracion-controles` | Pantalla y controles de configuración (dispositivo, latencia, validación, volúmenes, BPM, vista). |

## Regla de orquestación (obligatoria)
Los subagentes **no pueden llamarse entre sí**; el que coordina eres tú (la sesión principal):

1. Antes de delegar a los agentes 2, 3, 4 o 5, revisa si la tarea necesita **nombres nuevos** (módulos, archivos, clases, interfaces, tipos, funciones, constantes o variables públicas).
2. Si los necesita, delega **primero** a `nomenclatura-solid` con la descripción de la tarea. Él define los nombres y los registra.
3. Después delega al especialista, pegándole la lista de nombres aprobados.
4. Si el especialista devuelve nombres marcados como `PROPUESTO`, pásalos a `nomenclatura-solid` para aprobarlos o corregirlos, y aplica las correcciones antes de dar la tarea por terminada.
5. Al terminar, `npm run lint` y `npm run typecheck` deben pasar sin errores.

Ejemplo:
> Tarea: "hacer el afinador" → `nomenclatura-solid` define `afn_calcularCents`, `AfnAfinador`, `IAfnLectura`… → `caracteristicas-basicas` implementa con esos nombres → si propone `afn_suavizarAguja`, vuelve a `nomenclatura-solid`.

## Reglas generales
- Ningún `any`, ningún `// @ts-ignore`, ningún `!` (non-null assertion) sin comentario que lo justifique.
- Tipos centrales en `src/core/tipos.ts` (`INota`, `IEjercicio`, `IEventoTemporal`, `IConfig`).
- Módulos desacoplados: la detección no conoce la vista; las vistas consumen eventos del bus (`src/core/bus.ts`).
- Todo texto visible para el usuario va en español.
- No usar archivos de Rocksmith (`.psarc`) por riesgo de copyright.

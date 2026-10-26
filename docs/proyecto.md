# App de guitarra estilo Rocksmith — Proyecto y decisiones

## Visión
Aplicación 100% web para aprender guitarra eléctrica. La guitarra entra por una interfaz de audio (Behringer UMC22/UMC202HD, Livtra Nanocore como interfaz USB) o micrófono. La app detecta en tiempo real la nota tocada y la compara con la esperada, con timing, mostrando las notas en una autopista estilo Rocksmith. Uso inicial en localhost; posible publicación y monetización futura.

## Requerimientos
1. Captura de audio desde interfaz o micrófono.
2. Detección de notas sueltas por nombre (ej. cualquier Do), sin importar cuerda ni traste.
   - Modo estricto: nombre + octava exacta. Modo flexible: solo nombre.
3. Validación con timing: acierto / fallo según nota y momento.
4. Afinador integrado (estándar y afinaciones alternativas).
5. Ejercicios de escalas (Do mayor, Re mayor...) con metrónomo y velocidad progresiva.
6. Ejercicios y canciones en archivos JSON (nota, octava, cuerda, traste, tiempo, bpm).
7. Dos vistas: liviana (Canvas 2D, onda en vivo, partículas al acertar) y completa (autopista 3D Three.js en perspectiva oblicua).
8. Importar tablaturas Guitar Pro con alphaTab (a futuro MusicXML).
9. Acompañamiento: reproducir las demás pistas (batería, bajo...) de fondo, silenciando la guitarra.
10. Carga de canciones WAV/MP3/FLAC con separación de pistas (Demucs vía ONNX Runtime Web/WebGPU) y transcripción (Basic Pitch). Fase avanzada.
11. Fase futura: acordes (detección polifónica).
12. Fase futura: efectos (distorsión, delay, modulación, reverb, EQ, IR con ConvolverNode, perfiles NAM vía WASM), inspirados en el Livtra Nanocore.
13. Hardware opcional: pastilla hexafónica (Fishman TriplePlay) vía Web MIDI para saber la cuerda exacta.

## Decisiones
| # | Decisión | Motivo |
|---|---|---|
| D1 | 100% web, sin backend | Sin costo de servidores; el audio no sale del equipo |
| D2 | Web Audio API + getUserMedia | Estándar para captura en tiempo real |
| D3 | YIN (Pitchy) monofónico | Más confiable que FFT simple en graves |
| D4 | Validar por nombre de nota, octava configurable | Tocar "un Do" en cualquier parte del mástil |
| D5 | Three.js para la autopista 3D | Perspectiva y animación fluida |
| D6 | Demucs 6 pistas vía ONNX/WebGPU | Separación en navegador; MIT |
| D7 | Basic Pitch | Transcripción en navegador; Apache 2.0 |
| D8 | El usuario sube sus propias canciones | Menor riesgo legal |
| D9 | Acordes en segunda etapa | Polifonía más compleja |
| D10 | Vite + TS strict + ESLint, tipos centrales definidos | El compilador valida el código generado con IA |
| D11 | No usar archivos de Rocksmith (.psarc) | Riesgo de copyright (caso Slopsmith, 2026); usar Guitar Pro |

## Fases (≈1 hora diaria)
| Fase | Contenido | Estimación |
|---|---|---|
| 1 | Afinador: captura + detección + nombre de nota | 1–2 semanas |
| 2 | Ejercicios de escalas desde JSON con validación (vista Canvas) | 2 semanas |
| 3 | Timing y metrónomo | 1–2 semanas |
| 4 | Autopista 3D con Three.js | 3–4 semanas |
| 5 | Guitar Pro + acompañamiento | 3–4 semanas |
| 6 | Carga de audio + separación + transcripción | 4–6 semanas |
| 7 | Acordes y efectos | 4+ semanas |

## Alojamiento
Sitio estático: GitHub Pages, Netlify, Vercel o Cloudflare Pages (gratis). Dominio opcional ~10–15 USD/año. Modelo de ~80 MB servido desde Cloudflare y cacheado en el navegador.

## Referencias open source
- GuitarPicker (MIT, web sin dependencias): autopista, afinador, banda sintetizada.
- StringTheory (GPL-3.0, Unity): importa Guitar Pro/MusicXML, modo nota por nota.
- ChartPlayer (VST): autopista 3D, multi-instrumento.

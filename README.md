# guitarra-app

App web para aprender guitarra eléctrica con tu guitarra real, al estilo Rocksmith. Conectas la guitarra a una interfaz de audio (o al micrófono), la app escucha qué nota tocas en tiempo real y la compara con la nota esperada y su tiempo, sobre una autopista de notas en 3D.

Funciona 100 % en el navegador, sin servidor: el audio nunca sale de tu equipo.

**Pruébala en línea:** <https://ivanalejandromancilla.github.io/guitarra-app/>

## Publicación

El sitio se publica solo con GitHub Actions ([`.github/workflows/pages.yml`](.github/workflows/pages.yml)): en cada push a `main` se ejecutan lint, pruebas y build, y el contenido de `dist/` se sube a GitHub Pages. La app compilada vive en `/guitarra-app/` (ver `base` en `vite.config.ts`).

## Qué incluye

- **Afinador** con aguja de cents y afinaciones estándar, Drop D, medio tono abajo, Drop C, DADGAD y Open G.
- **Ejercicios** en tres niveles: notas de primera posición, notas de cada cuerda del traste 0 al 12, "encontrar la nota" en cualquier lugar del mástil, escalas y melodías.
- **Generador de escalas**: mayor, menor natural y pentatónicas, en cualquier tónica.
- **Tres vistas**: autopista 3D estilo Rocksmith (por defecto), autopista 3D estilo Guitar Hero y una vista 2D liviana.
- **Mástil con dedeo** bajo la autopista: la nota a tocar, su cuerda, su traste y el dedo a usar.
- **Medidor de coincidencia**: porcentaje en vivo de qué tan cerca estás de la nota pedida.
- **Timing**: metrónomo, velocidad progresiva, loop, puntaje y rachas; validación estricta (nota y octava) o flexible (solo el nombre).
- **Guitar Pro** (`.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`): toca la pista de guitarra mientras la app reproduce el resto de la banda.
- **Mezclador de efectos** inspirado en el Livtra Nanocore: 8 bloques (dinámica, drive/wah, amplificador, gabinete, delay, modulación, reverb y ecualizador), 8 presets de fábrica, presets propios, carga de IR de gabinete (`.wav`) y monitoreo para escuchar tu guitarra con efectos.
- **Configuración** guardada en el navegador: dispositivo de entrada, calibración de latencia, detección, vista, notación latina o anglosajona, modo zurdo y atajos de teclado.

## Requisitos

- [Node.js](https://nodejs.org/) 20.19 o superior (probado con 22).
- Chrome o Edge de escritorio (Web Audio, micrófono y WebGL 2).
- Una guitarra eléctrica conectada a una interfaz de audio USB (por ejemplo Behringer UMC22 / UMC202HD con el modo **INST** activado) o, en su defecto, a la entrada de línea o al micrófono del PC.

## Instalación y uso

```bash
git clone https://github.com/IvanAlejandroMancilla/guitarra-app.git
cd guitarra-app
npm install
npm run dev
```

Abre <http://localhost:5173> y luego:

1. Pulsa **Activar guitarra** y acepta el permiso de micrófono.
2. En **Configuración → Audio**, elige tu interfaz y ajusta la ganancia hasta que el medidor se mueva al tocar.
3. Empieza por el **Afinador** y después por los ejercicios de nivel 1.
4. Si los aciertos te salen tarde, usa **Configuración → Latencia → Calibrar**.

Para escuchar tu guitarra con efectos, entra al **Mezclador** y activa "Escuchar mi guitarra". Usa audífonos para evitar acoples.

En la carpeta [`ejemplos-guitar-pro/`](ejemplos-guitar-pro/) hay cuatro archivos Guitar Pro de ejemplo, con guitarra, bajo y batería, para probar el acompañamiento.

### Atajos de teclado (pantalla de práctica)

| Tecla | Acción |
| --- | --- |
| Espacio | Reproducir / pausar |
| R | Reiniciar |
| + / − | Subir / bajar BPM |
| L | Activar / desactivar loop |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `localhost:5173` |
| `npm run build` | Compila para producción en `dist/` |
| `npm run preview` | Sirve la versión compilada |
| `npm run typecheck` | Verifica tipos (TypeScript estricto) |
| `npm run lint` | ESLint, incluida la convención de nombres |
| `npm test` | Pruebas con Vitest |

## Agregar ejercicios

Los ejercicios son archivos JSON en `public/ejercicios/`, listados en `public/ejercicios/indice.json`. El `tiempo` va en pulsos; cuerda 1 = Mi agudo, 6 = Mi grave; `dedo` 0 = al aire, 1 índice … 4 meñique.

```json
{
  "titulo": "Escala de Do mayor",
  "bpm": 80,
  "modo": "flexible",
  "notas": [
    { "nombre": "Do", "oct": 3, "cur": 5, "trs": 3, "dedo": 3, "tiempo": 0 },
    { "nombre": "Re", "oct": 3, "cur": 4, "trs": 0, "dedo": 0, "tiempo": 1 }
  ]
}
```

## Tecnología

- [Vite](https://vite.dev/) + TypeScript en modo estricto, ESLint y Vitest.
- Web Audio API y `getUserMedia` para la captura; detección de tono monofónica con [Pitchy](https://github.com/ianprime0509/pitchy) (algoritmo McLeod).
- [Three.js](https://threejs.org/) para las autopistas 3D; Canvas 2D para la vista liviana, el afinador y el mástil.
- [alphaTab](https://www.alphatab.net/) para leer Guitar Pro y reproducir el acompañamiento.

La documentación de diseño está en [`docs/`](docs/): visión y fases (`proyecto.md`), arquitectura (`arquitectura.md`) y convenciones de nombres (`convenciones-nombres.md`).

## Limitaciones actuales

- Detecta una nota a la vez; todavía no reconoce acordes.
- Si una canción de Guitar Pro cambia de tempo, se reproduce entera al tempo inicial.
- No admite archivos de Rocksmith (`.psarc`).

## Licencia

El código de este proyecto es de dominio público ([Unlicense](LICENSE)).

Las dependencias conservan sus propias licencias: alphaTab (MPL-2.0), Three.js (MIT) y Pitchy (MIT). El SoundFont `public/soundfonts/sonivox.sf2` es © Sonic Network Inc., bajo licencia Apache 2.0.

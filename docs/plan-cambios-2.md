# Plan de cambios 2 (2026-10-25)

Pedido del usuario, ya aclarado con él. No agregar nada fuera de esta lista.

## 1. Pantalla de práctica sin desplazamiento
- La pantalla de práctica (cabecera, vista, panel lateral, mástil y barra de transporte) debe caber en la ventana (`100dvh`), sin barra de desplazamiento vertical, desde 1280×720 hacia arriba. La vista ocupa el espacio restante (`flex: 1; min-height: 0`).
- En pantallas angostas se permite apilar, pero la barra de transporte siempre visible.

## 1b. Autopista estilo Rocksmith (vista por defecto)
- Referencia: Rocksmith 2014. Las 6 cuerdas son líneas **horizontales** de color abajo/al frente (6.ª roja arriba … 1.ª violeta abajo, como en la referencia), el eje X son los **trastes** (0–24) con números debajo, y las notas vienen desde el fondo (eje Z) hacia la posición (traste, cuerda) donde se tocan.
- Cada nota: gema del color de su cuerda con el número de traste; cola para notas largas; línea vertical que baja desde la gema hasta su cuerda al acercarse; destello y partículas al acertar, rojo al fallar.
- Cámara que se desplaza suavemente en X para encuadrar la zona de trastes de las próximas notas (como el "anchor" de Rocksmith); resalta los trastes de esa zona.
- Notas sin cuerda/traste (ejercicio "encontrar la nota"): se muestran como una banda con el nombre de la nota.
- La autopista actual se conserva como vista "Guitar Hero". Opciones de vista: `2d`, `guitarHero`, `rocksmith`; por defecto `rocksmith`. Migrar la configuración guardada (`'3d'` → `'guitarHero'`).

## 2. Ejercicios básicos, medidor de coincidencia y dedeo
- Ejercicios nuevos (JSON en `public/ejercicios/` + catálogo), progresión para aprender:
  1. Notas naturales en primera posición (trastes 0–3), una cuerda a la vez y luego todas.
  2. Notas por cuerda: las notas naturales de cada cuerda del traste 0 al 12 (6 ejercicios).
  3. Encontrar la nota: se pide el nombre (sin cuerda/traste); vale en cualquier lugar del mástil (modo flexible).
- Cada nota de los ejercicios lleva **dedo** (0 = al aire, 1 índice, 2 medio, 3 anular, 4 meñique). `INota` gana `dedo?: number`. Las escalas generadas calculan el dedo; Guitar Pro lo toma del archivo si viene (digitación de mano izquierda).
- **Medidor de coincidencia**: porcentaje en vivo de qué tan cerca está lo que suena de la nota esperada (100 % = misma nota y afinada; baja con los cents de desvío; 0 % si es otra nota). Se muestra en la pantalla de práctica junto al marcador.
- **Mástil con dedeo**: diagrama 2D del mástil (6 cuerdas × trastes 0–12, o la zona necesaria) bajo la vista, que marca la nota esperada (y las 2–3 siguientes, más tenues) con el número de dedo y su nombre. Para "encontrar la nota" marca todas las posiciones válidas de esa nota en trastes 0–12.

## 3. Mezclador estilo Livtra Nanocore
- Módulo nuevo de efectos con Web Audio, cadena fija como el Nanocore: FX1 (compuerta/compresor) → FX2 (overdrive, distorsión, fuzz, wah automático) → AMP (modelos: limpio, crunch, alta ganancia, bajo; ganancia, graves, medios, agudos, nivel) → CAB (gabinetes simulados o IR .wav cargado por el usuario) → DEL (digital, analógico, con modulación) → MOD (chorus, phaser, flanger, trémolo, vibrato) → REV (sala, placa, hall, resorte) → EQ (3 bandas). Cada bloque con encendido/apagado.
- Presets de fábrica creados por nosotros interpretando el estilo del Nanocore (p. ej. Limpio brillante, Crunch clásico, Rock, Metal, Solo con delay, Ambiente, Funk con wah, Blues).
- Presets del usuario: guardar como, renombrar, borrar; persistentes (localStorage); exportar/importar JSON.
- IR de gabinete: cargar .wav (se guarda en IndexedDB para no perderlo al recargar).
- Pantalla "Mezclador" accesible desde el menú y desde la práctica.

## 4. Escuchar mi guitarra (monitoreo)
- La señal de entrada pasa por la cadena de efectos y sale por los altavoces/audífonos, con volumen de monitoreo y encendido/apagado (apagado por defecto para evitar acoples).
- La detección de notas sigue usando la señal **limpia** (antes de los efectos).
- Aviso en pantalla: usar audífonos y que el navegador agrega algo de latencia.

/**
 * Creación de la instancia de alphaTab para el acompañamiento.
 * Este es el ÚNICO archivo de acp que importa alphaTab en tiempo de ejecución; `AcpReproductor`
 * lo carga con `import('./acp_api')` la primera vez que hay que preparar una canción (carga diferida).
 */
import { AlphaTabApi } from '@coderline/alphatab';

/**
 * Crea un `AlphaTabApi` con el sintetizador habilitado y render mínimo.
 * `elem` se oculta: con ancho 0 alphaTab omite el render de la partitura, pero igual genera el MIDI
 * y reproduce. Cursor, resaltado, scroll e interacción quedan desactivados.
 */
export function acp_crearApi(elem: HTMLElement, urlSoundfont: string): AlphaTabApi {
  elem.hidden = true;
  elem.setAttribute('aria-hidden', 'true');
  return new AlphaTabApi(elem, {
    core: {
      // Sin worker de render (no se dibuja nada). El sintetizador sigue usando su propio worker.
      useWorkers: false,
      enableLazyLoading: true,
      logLevel: 'warning',
      // La fuente la copia el plugin de Vite a <base>/font/; sin esto alphaTab la busca en la raíz del dominio
      // y falla en GitHub Pages, donde la app vive en /guitarra-app/.
      fontDirectory: `${import.meta.env.BASE_URL}font/`,
    },
    display: { staveProfile: 'Tab', layoutMode: 'Horizontal' },
    player: {
      playerMode: 'EnabledSynthesizer',
      soundFont: urlSoundfont,
      enableCursor: false,
      enableAnimatedBeatCursor: false,
      enableElementHighlighting: false,
      enableUserInteraction: false,
      scrollMode: 'Off',
    },
  });
}

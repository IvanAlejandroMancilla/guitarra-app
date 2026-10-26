/** Descarga y selección de archivos locales (sin servidor). */
import { ui_crearElemento } from './ui_dom';

/** Ofrece `texto` como archivo descargable. */
export function ui_descargarTexto(texto: string, nombreArchivo: string, tipoMime: string): void {
  const url = URL.createObjectURL(new Blob([texto], { type: tipoMime }));
  const enlace = ui_crearElemento('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.hidden = true;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Se libera después para no cortar la descarga en navegadores lentos.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Abre el selector de archivos del sistema. `aceptar` = valor del atributo `accept` (ej. `'.json'`).
 * Resuelve con el archivo elegido o `null` si el usuario cancela.
 * Debe llamarse desde un gesto del usuario (clic o tecla).
 */
export function ui_elegirArchivo(aceptar: string): Promise<File | null> {
  return new Promise((resolver) => {
    const entrada = ui_crearElemento('input');
    entrada.type = 'file';
    entrada.accept = aceptar;
    entrada.addEventListener(
      'change',
      () => {
        resolver(entrada.files?.[0] ?? null);
      },
      { once: true },
    );
    entrada.addEventListener(
      'cancel',
      () => {
        resolver(null);
      },
      { once: true },
    );
    entrada.click();
  });
}

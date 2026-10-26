/** Sección Respaldo: exportar, importar y restablecer la configuración. */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import { ui_crearBoton } from '../ui/ui_boton';
import { ui_descargarTexto, ui_elegirArchivo } from '../ui/ui_archivos';
import { ui_crearElemento, ui_vaciarElemento } from '../ui/ui_dom';
import { ui_crearPanel } from '../ui/ui_panel';
import { CFG_NOMBRE_EXPORTACION } from './cfg_constantes';
import { cfg_exportarJson, cfg_importarJson } from './cfg_exportador';
import type { ICfgSeccion } from './cfg_tipos';

/** Tamaño máximo aceptado de un archivo de configuración (las reales pesan ~1 KB). */
const CFG_TAM_MAX_ARCHIVO = 64 * 1024;

export class CfgSeccionRespaldo implements ICfgSeccion {
  readonly titulo = 'Respaldo';
  #editor: ICorEditorConfig;
  #bus: ICorBus;
  #panel: HTMLElement | null = null;
  #msj: HTMLElement | null = null;

  constructor(editor: ICorEditorConfig, bus: ICorBus) {
    this.#editor = editor;
    this.#bus = bus;
  }

  montar(contenedor: HTMLElement): void {
    this.desmontar();
    const msj = ui_crearElemento('div', 'cfg-respaldo__msj');
    msj.setAttribute('role', 'status');
    this.#msj = msj;
    const botones = ui_crearElemento('div', 'cfg-seccion__botones');
    botones.append(
      ui_crearBoton({
        texto: 'Exportar configuración',
        alPulsar: () => {
          ui_descargarTexto(cfg_exportarJson(this.#editor.obtenerConfig()), CFG_NOMBRE_EXPORTACION, 'application/json');
          this.#mostrar(['Configuración exportada.'], false);
        },
      }),
      ui_crearBoton({
        texto: 'Importar configuración…',
        alPulsar: () => {
          void this.#importar();
        },
      }),
      ui_crearBoton({
        texto: 'Restablecer valores por defecto',
        variante: 'peligro',
        alPulsar: () => {
          if (!window.confirm('¿Restablecer toda la configuración a los valores por defecto?')) return;
          this.#editor.restablecerConfig();
          this.#mostrar(['Se restablecieron los valores por defecto.'], false);
        },
      }),
    );
    const ayuda = ui_crearElemento(
      'p',
      'cfg-seccion__nota',
      'La configuración se guarda automáticamente en este navegador. Exporta un archivo para llevarla a otro equipo.',
    );
    this.#panel = ui_crearPanel(this.titulo, [ayuda, botones, msj]);
    contenedor.append(this.#panel);
  }

  actualizar(): void {
    // Sin controles que reflejen valores de IConfig.
  }

  desmontar(): void {
    this.#panel?.remove();
    this.#panel = null;
    this.#msj = null;
  }

  async #importar(): Promise<void> {
    const archivo = await ui_elegirArchivo('.json,application/json');
    if (archivo === null) return;
    if (archivo.size > CFG_TAM_MAX_ARCHIVO) {
      this.#informarError(['El archivo es demasiado grande para ser una configuración.']);
      return;
    }
    let texto: string;
    try {
      texto = await archivo.text();
    } catch {
      this.#informarError(['No se pudo leer el archivo.']);
      return;
    }
    const resultado = cfg_importarJson(texto);
    if (!resultado.esValido) {
      this.#informarError(resultado.errores);
      return;
    }
    this.#editor.actualizarConfig(resultado.valor);
    this.#mostrar([`Configuración importada desde "${archivo.name}".`], false);
  }

  #informarError(errores: readonly string[]): void {
    this.#mostrar(['No se pudo importar la configuración:', ...errores], true);
    this.#bus.emitir('cor:error', { origen: 'cfg', msj: 'No se pudo importar la configuración.' });
  }

  #mostrar(lineas: readonly string[], esError: boolean): void {
    const msj = this.#msj;
    if (msj === null) return;
    ui_vaciarElemento(msj);
    msj.classList.toggle('cfg-respaldo__msj--error', esError);
    const [primera, ...resto] = lineas;
    if (primera !== undefined) msj.append(ui_crearElemento('p', [], primera));
    if (resto.length > 0) {
      const lista = ui_crearElemento('ul');
      for (const linea of resto) lista.append(ui_crearElemento('li', [], linea));
      msj.append(lista);
    }
  }
}

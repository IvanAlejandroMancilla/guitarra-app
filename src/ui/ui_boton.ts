import { ui_crearElemento } from './ui_dom';
import type { IUiOpcionesBoton } from './ui_tipos';

/** Botón nativo (`type="button"`): operable con Enter/Espacio y con foco visible por CSS. */
export function ui_crearBoton(opc: IUiOpcionesBoton): HTMLButtonElement {
  const boton = ui_crearElemento('button', ['ui-boton', `ui-boton--${opc.variante ?? 'secundario'}`], opc.texto);
  boton.type = 'button';
  if (opc.titulo !== undefined) boton.title = opc.titulo;
  if (opc.etiquetaAccesible !== undefined) boton.setAttribute('aria-label', opc.etiquetaAccesible);
  boton.addEventListener('click', () => {
    opc.alPulsar();
  });
  return boton;
}

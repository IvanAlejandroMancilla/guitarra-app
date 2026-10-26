import { ui_crearElemento } from './ui_dom';

/** Panel con título (`section` + `h2`). */
export function ui_crearPanel(titulo: string, hijos: readonly HTMLElement[] = []): HTMLElement {
  const panel = ui_crearElemento('section', 'ui-panel');
  panel.append(ui_crearElemento('h2', 'ui-panel__titulo', titulo), ...hijos);
  return panel;
}

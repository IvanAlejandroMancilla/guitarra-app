/** Utilidades mínimas de DOM. */

/** Crea un elemento con clases (separadas por espacio o en lista) y texto opcionales. */
export function ui_crearElemento<TEtiqueta extends keyof HTMLElementTagNameMap>(
  etiqueta: TEtiqueta,
  clases?: string | readonly string[],
  texto?: string,
): HTMLElementTagNameMap[TEtiqueta] {
  const elem = document.createElement(etiqueta);
  if (clases !== undefined) {
    const lista = typeof clases === 'string' ? clases.split(' ') : clases;
    elem.classList.add(...lista.filter((clase) => clase !== ''));
  }
  if (texto !== undefined) elem.textContent = texto;
  return elem;
}

/** Quita todos los hijos de `elem`. */
export function ui_vaciarElemento(elem: Element): void {
  elem.replaceChildren();
}

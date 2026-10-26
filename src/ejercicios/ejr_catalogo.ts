/** Carga del catálogo de ejercicios y de archivos de `public/`. */
import type { IEjrEntradaCatalogo } from '../core/cor_eventos';
import { EJR_RUTA_CATALOGO } from './ejr_constantes';

const unirUrl = (urlBase: string, ruta: string): string => (urlBase.endsWith('/') ? urlBase : `${urlBase}/`) + ruta;

const convertirEntrada = (valor: unknown): IEjrEntradaCatalogo | null => {
  if (typeof valor !== 'object' || valor === null) return null;
  const registro: Readonly<Record<string, unknown>> = { ...valor };
  const { id, titulo, archivo, nivel, descripcion } = registro;
  if (typeof id !== 'string' || typeof titulo !== 'string' || typeof archivo !== 'string') return null;
  const entrada: IEjrEntradaCatalogo = {
    id,
    titulo,
    archivo,
    nivel: typeof nivel === 'number' && Number.isFinite(nivel) ? nivel : 1,
  };
  if (typeof descripcion === 'string') entrada.descripcion = descripcion;
  return entrada;
};

/**
 * Carga `EJR_RUTA_CATALOGO` relativo a `urlBase` (normalmente `import.meta.env.BASE_URL`).
 * Formato oficial: `{ "entradas": [...] }`; también acepta una lista directa.
 * Las entradas mal formadas se descartan con un aviso en consola.
 */
export async function ejr_cargarCatalogo(urlBase: string): Promise<IEjrEntradaCatalogo[]> {
  const respuesta = await fetch(unirUrl(urlBase, EJR_RUTA_CATALOGO));
  if (!respuesta.ok) throw new Error(`No se pudo cargar el catálogo de ejercicios (HTTP ${respuesta.status}).`);
  const valor: unknown = await respuesta.json();
  let lista: unknown = null;
  if (Array.isArray(valor)) lista = valor;
  else if (typeof valor === 'object' && valor !== null && 'entradas' in valor) lista = valor.entradas;
  if (!Array.isArray(lista)) throw new Error('El catálogo de ejercicios no tiene el formato esperado.');
  const entradas: IEjrEntradaCatalogo[] = [];
  for (const crudo of lista) {
    const entrada = convertirEntrada(crudo);
    if (entrada === null) console.warn('[ejr] Entrada de catálogo inválida, se omite:', crudo);
    else entradas.push(entrada);
  }
  return entradas;
}

/** Descarga un archivo como `ArrayBuffer`. Rechaza con un mensaje en español. */
export async function ejr_cargarArchivo(url: string): Promise<ArrayBuffer> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url);
  } catch {
    throw new Error(`No se pudo descargar "${url}".`);
  }
  if (!respuesta.ok) throw new Error(`No se encontró el archivo "${url}" (HTTP ${respuesta.status}).`);
  return respuesta.arrayBuffer();
}

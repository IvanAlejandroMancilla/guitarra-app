/** Constantes de ejercicios (contrato: docs/firmas-aprobadas.md §5). */

/** Puntos de un acierto perfecto con multiplicador 1. */
export const EJR_PTS_BASE = 100;
/** Aciertos seguidos para subir un nivel de multiplicador. */
export const EJR_RACHA_POR_MULT = 10;
export const EJR_MULT_MAX = 4;
/** Ventana de tolerancia (±ms) por defecto. */
export const EJR_TOL_MS_DEF = 100;
/** Carpeta de ejercicios, relativa a `import.meta.env.BASE_URL`. */
export const EJR_RUTA_BASE = 'ejercicios/';
/** Catálogo, relativo a `import.meta.env.BASE_URL`. Formato: `{ "entradas": IEjrEntradaCatalogo[] }`. */
export const EJR_RUTA_CATALOGO = 'ejercicios/indice.json';

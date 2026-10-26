/** Validaciones genéricas de datos no confiables (JSON, localStorage). */

/** `true` si `valor` es un objeto no nulo y no es un array. */
export function cor_validarRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

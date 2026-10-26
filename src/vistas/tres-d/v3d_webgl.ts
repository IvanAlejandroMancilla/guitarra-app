/**
 * Comprobación de soporte WebGL sin cargar Three.js (este archivo NO importa `three`,
 * así `main.ts` puede importarlo de forma estática y decidir si carga la vista 3D).
 */

/** `true` si el navegador puede crear un contexto WebGL 2 (Three.js r163+ ya no soporta WebGL 1). */
export function v3d_validarWebgl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const lienzo = document.createElement('canvas');
    const ctx = lienzo.getContext('webgl2');
    if (ctx === null) return false;
    // Libera el contexto de prueba de inmediato: los navegadores limitan los contextos activos.
    ctx.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

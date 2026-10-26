/** Importador de ejercicios en JSON (formato de docs/arquitectura.md). */
import type { ICorImportador } from '../core/cor_contratos';
import type { IEjercicio } from '../core/tipos';
import { ejr_validarEjercicio } from './ejr_esquema';

export class EjrImportadorJson implements ICorImportador {
  readonly extensiones: readonly string[] = ['json'];

  esCompatible(nombreArchivo: string): boolean {
    const idxPunto = nombreArchivo.lastIndexOf('.');
    if (idxPunto < 0) return false;
    return this.extensiones.includes(nombreArchivo.slice(idxPunto + 1).toLowerCase());
  }

  importar(fuente: ArrayBuffer, nombreArchivo: string): Promise<IEjercicio> {
    let valor: unknown;
    try {
      // TextDecoder quita la marca BOM inicial por defecto.
      const texto = new TextDecoder('utf-8').decode(fuente);
      valor = JSON.parse(texto);
    } catch {
      return Promise.reject(new Error(`El archivo "${nombreArchivo}" no es un JSON válido.`));
    }
    const resultado = ejr_validarEjercicio(valor);
    if (!resultado.esValido) {
      return Promise.reject(new Error(`El ejercicio "${nombreArchivo}" no es válido: ${resultado.errores.join(' ')}`));
    }
    return Promise.resolve(resultado.valor);
  }
}

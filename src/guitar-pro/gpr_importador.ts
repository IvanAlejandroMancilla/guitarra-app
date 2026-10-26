/**
 * Importador de Guitar Pro. Implementa `ICorImportador` (para quien solo necesita el ejercicio)
 * e `IGprCargador` (para `GprControlador`, que además publica pistas y buffer para `acp`).
 * alphaTab se carga en diferido dentro de `gpr_leerPartitura`.
 */
import type { ICorImportador } from '../core/cor_contratos';
import type { IGprCargado } from '../core/cor_eventos';
import type { IEjercicio } from '../core/tipos';
import { gpr_convertirPista, gpr_listarPistas, gpr_obtenerBpm } from './gpr_adaptador';
import { GPR_EXTENSIONES } from './gpr_constantes';
import { gpr_leerPartitura } from './gpr_lector';
import { gpr_elegirPistaGuitarra } from './gpr_pistas';
import type { IGprCargador, IGprPartitura } from './gpr_tipos';

const GPR_EXT_ROCKSMITH = 'psarc';

const obtenerExtension = (nombreArchivo: string): string => {
  const idxPunto = nombreArchivo.lastIndexOf('.');
  return idxPunto < 0 ? '' : nombreArchivo.slice(idxPunto + 1).trim().toLowerCase();
};

export class GprImportador implements ICorImportador, IGprCargador {
  readonly extensiones: readonly string[] = GPR_EXTENSIONES;
  #partitura: IGprPartitura | null = null;

  esCompatible(nombreArchivo: string): boolean {
    return this.extensiones.includes(obtenerExtension(nombreArchivo));
  }

  async importar(fuente: ArrayBuffer, nombreArchivo: string): Promise<IEjercicio> {
    const cargado = await this.cargarPartitura(fuente, nombreArchivo);
    return cargado.ej;
  }

  async cargarPartitura(fuente: ArrayBuffer, nombreArchivo: string): Promise<IGprCargado> {
    const ext = obtenerExtension(nombreArchivo);
    if (ext === GPR_EXT_ROCKSMITH) {
      throw new Error('Los archivos de Rocksmith (.psarc) no están soportados. Usa un archivo Guitar Pro.');
    }
    if (!this.esCompatible(nombreArchivo)) {
      throw new Error(`Formato no soportado: «${nombreArchivo}». Usa un archivo ${GPR_EXTENSIONES.map((e) => `.${e}`).join(', ')}.`);
    }
    const partitura = await gpr_leerPartitura(fuente);
    const pistas = gpr_listarPistas(partitura.score);
    const idxPstGuitarra = gpr_elegirPistaGuitarra(pistas);
    if (idxPstGuitarra < 0) throw new Error('El archivo Guitar Pro no contiene pistas.');
    const ej = gpr_convertirPista(partitura.score, idxPstGuitarra, partitura.compases);
    this.#partitura = partitura;
    return {
      titulo: partitura.score.title.trim(),
      artista: partitura.score.artist.trim(),
      buf: fuente,
      pistas,
      idxPstGuitarra,
      bpm: gpr_obtenerBpm(partitura.score),
      ej,
    };
  }

  convertirPista(idxPst: number): IEjercicio {
    if (this.#partitura === null) throw new Error('Primero carga un archivo Guitar Pro.');
    return gpr_convertirPista(this.#partitura.score, idxPst, this.#partitura.compases);
  }
}

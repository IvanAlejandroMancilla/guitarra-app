/**
 * IR de gabinete del usuario en IndexedDB (sobreviven a recargar la página).
 * Recibe la `IDBFactory` por constructor (en la app, `window.indexedDB`). Los errores se rechazan con
 * un `Error` de mensaje en español.
 */
import type { IEfxIrResumen } from '../core/cor_eventos';
import { cor_validarRegistro } from '../core/cor_validacion';
import { EFX_NOMBRE_BD_IR, EFX_NOMBRE_COLECCION_IR, EFX_VERSION_BD_IR } from './efx_constantes';
import type { IEfxAlmacenIr, IEfxIr } from './efx_tipos';

const EFX_MSJ_SIN_BD = 'No se pudo abrir el almacenamiento de IR del navegador (IndexedDB). El IR se usará solo en esta sesión.';

const convertirSolicitud = <TValor>(solicitud: IDBRequest<TValor>, msjError: string): Promise<TValor> =>
  new Promise((resolver, rechazar) => {
    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => rechazar(new Error(msjError));
  });

const validarIr = (valor: unknown): IEfxIr | null => {
  if (!cor_validarRegistro(valor)) return null;
  const { id, nombre, durSeg, fechaMs, buf } = valor;
  if (typeof id !== 'string' || typeof nombre !== 'string' || typeof durSeg !== 'number' || typeof fechaMs !== 'number') return null;
  if (!(buf instanceof ArrayBuffer)) return null;
  return { id, nombre, durSeg, fechaMs, buf };
};

export class EfxAlmacenIr implements IEfxAlmacenIr {
  readonly #fabricaBd: IDBFactory;
  #bd: Promise<IDBDatabase> | null = null;

  constructor(fabricaBd: IDBFactory) {
    this.#fabricaBd = fabricaBd;
  }

  async guardarIr(ir: IEfxIr): Promise<void> {
    const almacen = await this.#abrirColeccion('readwrite');
    await convertirSolicitud(almacen.put({ ...ir }), `No se pudo guardar el IR "${ir.nombre}" en el navegador.`);
  }

  async cargarIr(id: string): Promise<IEfxIr | null> {
    const almacen = await this.#abrirColeccion('readonly');
    const valor: unknown = await convertirSolicitud(almacen.get(id), 'No se pudo leer el IR guardado.');
    return validarIr(valor);
  }

  /** Más recientes primero. */
  async listarIrs(): Promise<IEfxIrResumen[]> {
    const almacen = await this.#abrirColeccion('readonly');
    const valores: unknown[] = await convertirSolicitud(almacen.getAll(), 'No se pudo leer la lista de IR guardados.');
    const irs: IEfxIrResumen[] = [];
    for (const valor of valores) {
      const ir = validarIr(valor);
      if (ir !== null) irs.push({ id: ir.id, nombre: ir.nombre, durSeg: ir.durSeg, fechaMs: ir.fechaMs });
    }
    return irs.sort((irA, irB) => irB.fechaMs - irA.fechaMs);
  }

  readonly #abrirColeccion = async (modo: IDBTransactionMode): Promise<IDBObjectStore> => {
    const bd = await this.#abrirBd();
    return bd.transaction(EFX_NOMBRE_COLECCION_IR, modo).objectStore(EFX_NOMBRE_COLECCION_IR);
  };

  readonly #abrirBd = (): Promise<IDBDatabase> => {
    if (this.#bd !== null) return this.#bd;
    const promesa = new Promise<IDBDatabase>((resolver, rechazar) => {
      let solicitud: IDBOpenDBRequest;
      try {
        solicitud = this.#fabricaBd.open(EFX_NOMBRE_BD_IR, EFX_VERSION_BD_IR);
      } catch {
        rechazar(new Error(EFX_MSJ_SIN_BD));
        return;
      }
      solicitud.onupgradeneeded = () => {
        const bd = solicitud.result;
        if (!bd.objectStoreNames.contains(EFX_NOMBRE_COLECCION_IR)) bd.createObjectStore(EFX_NOMBRE_COLECCION_IR, { keyPath: 'id' });
      };
      solicitud.onsuccess = () => resolver(solicitud.result);
      solicitud.onerror = () => rechazar(new Error(EFX_MSJ_SIN_BD));
      solicitud.onblocked = () => rechazar(new Error(EFX_MSJ_SIN_BD));
    });
    // Si falla, se olvida la promesa para reintentar en la próxima llamada.
    promesa.catch(() => {
      this.#bd = null;
    });
    this.#bd = promesa;
    return promesa;
  };
}

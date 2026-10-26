import type { ICorBus } from './cor_contratos';
import type { ICorMapaEventos, TCorNombreEvento, TCorOyente } from './cor_eventos';

type TCorMapaOyentes = { [TClave in TCorNombreEvento]?: Set<TCorOyente<TClave>> };

/** Bus de eventos tipado y síncrono. Guarda el último payload de cada evento. */
export class CorBus implements ICorBus {
  #oyentes: TCorMapaOyentes = {};
  #ultimos: Partial<ICorMapaEventos> = {};

  emitir<TClave extends TCorNombreEvento>(nombre: TClave, payload: ICorMapaEventos[TClave]): void {
    this.#ultimos[nombre] = payload;
    const conjunto: TCorMapaOyentes[TClave] = this.#oyentes[nombre];
    if (conjunto === undefined) return;
    // Copia: un oyente puede desuscribirse (o suscribir otro) durante la emisión.
    for (const oyente of [...conjunto]) {
      try {
        oyente(payload);
      } catch (err) {
        console.error(`[cor] Error en un oyente de '${nombre}':`, err);
      }
    }
  }

  suscribir<TClave extends TCorNombreEvento>(nombre: TClave, oyente: TCorOyente<TClave>): () => void {
    const conjunto = this.#oyentes[nombre];
    if (conjunto === undefined) {
      // TS no puede probar que Set<TCorOyente<TClave>> encaja en el mapeado indexado por un genérico;
      // es correcto porque la clave y el tipo del oyente son el mismo TClave.
      this.#oyentes[nombre] = new Set([oyente]) as TCorMapaOyentes[TClave];
    } else {
      conjunto.add(oyente);
    }
    return () => {
      this.desuscribir(nombre, oyente);
    };
  }

  desuscribir<TClave extends TCorNombreEvento>(nombre: TClave, oyente: TCorOyente<TClave>): void {
    this.#oyentes[nombre]?.delete(oyente);
  }

  obtenerUltimo<TClave extends TCorNombreEvento>(nombre: TClave): ICorMapaEventos[TClave] | undefined {
    return this.#ultimos[nombre];
  }

  /** Quita todos los oyentes y olvida los últimos payloads. */
  limpiar(): void {
    this.#oyentes = {};
    this.#ultimos = {};
  }
}

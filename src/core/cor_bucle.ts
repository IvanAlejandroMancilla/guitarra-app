import type { ICorActualizable, ICorCuadro, ICorDibujable, ICorReloj } from './cor_contratos';

/** Tope de `deltaMs` por cuadro (evita saltos al volver de una pestaña inactiva). */
export const COR_DELTA_MAX_MS = 100;

/**
 * Bucle de animación único basado en `requestAnimationFrame`.
 * En cada cuadro arma un `ICorCuadro` desde el reloj y llama primero a todos
 * los actualizables y después a todos los dibujables.
 */
export class CorBucle {
  readonly #reloj: ICorReloj;
  readonly #actualizables = new Set<ICorActualizable>();
  readonly #dibujables = new Set<ICorDibujable>();
  #idCuadro: number | null = null;
  #marcaAntMs: number | null = null;

  constructor(reloj: ICorReloj) {
    this.#reloj = reloj;
  }

  esActivo(): boolean {
    return this.#idCuadro !== null;
  }

  /** Devuelve una función que lo quita del bucle. */
  registrarActualizable(actualizable: ICorActualizable): () => void {
    this.#actualizables.add(actualizable);
    return () => {
      this.#actualizables.delete(actualizable);
    };
  }

  /** Devuelve una función que lo quita del bucle. */
  registrarDibujable(dibujable: ICorDibujable): () => void {
    this.#dibujables.add(dibujable);
    return () => {
      this.#dibujables.delete(dibujable);
    };
  }

  iniciar(): void {
    if (this.#idCuadro !== null) return;
    this.#marcaAntMs = null;
    this.#idCuadro = requestAnimationFrame(this.#ejecutarCuadro);
  }

  detener(): void {
    if (this.#idCuadro !== null) cancelAnimationFrame(this.#idCuadro);
    this.#idCuadro = null;
    this.#marcaAntMs = null;
  }

  /** Arma el cuadro actual. Público para pruebas y para forzar un redibujado. */
  crearCuadro(marcaMs: number): ICorCuadro {
    const deltaCrudo = this.#marcaAntMs === null ? 0 : marcaMs - this.#marcaAntMs;
    this.#marcaAntMs = marcaMs;
    return {
      tiempoCtxMs: this.#reloj.obtenerTiempoCtxMs(),
      posPulsos: this.#reloj.obtenerPosPulsos(),
      posMs: this.#reloj.obtenerPosMs(),
      deltaMs: Math.min(Math.max(deltaCrudo, 0), COR_DELTA_MAX_MS),
      bpm: this.#reloj.obtenerBpm(),
    };
  }

  /** Ejecuta un cuadro completo (actualizar y luego dibujar). */
  actualizarCuadro(marcaMs: number): void {
    const cuadro = this.crearCuadro(marcaMs);
    for (const actualizable of this.#actualizables) actualizable.actualizar(cuadro);
    for (const dibujable of this.#dibujables) dibujable.dibujar(cuadro);
  }

  readonly #ejecutarCuadro = (marcaMs: number): void => {
    // Se agenda primero: un error en un dibujable no detiene el bucle.
    this.#idCuadro = requestAnimationFrame(this.#ejecutarCuadro);
    this.actualizarCuadro(marcaMs);
  };
}

/**
 * Cadena fija estilo Nanocore: entrada → FX1 → FX2 → AMP → CAB → DEL → MOD → REV → EQ → limitador → salida.
 * La entrada se mezcla a mono (una interfaz estéreo suele traer la guitarra en un solo canal).
 * El limitador final es una protección: evita que un preset o un IR saturen la salida.
 */
import { COR_ORDEN_BLOQUES_EFX } from '../core/cor_efectos';
import type { IEfxBloques, IEfxEstadoBloque, TEfxIdBloque } from '../core/cor_efectos';
import type { IEfxBloqueAudio, IEfxBloquesAudio, IEfxCadena } from './efx_tipos';

type TEfxAplicadores = { [TId in TEfxIdBloque]: (estado: Readonly<IEfxBloques[TId]>) => void };

const aplicarEstado = <TModelo extends string, TParametros>(
  bloque: IEfxBloqueAudio<TModelo, TParametros>,
  estado: Readonly<IEfxEstadoBloque<TModelo, TParametros>>,
): void => {
  bloque.fijarModelo(estado.modelo);
  bloque.fijarParametros(estado.parametros);
  bloque.fijarActivo(estado.esActivo);
};

export class EfxCadena implements IEfxCadena {
  readonly entrada: AudioNode;
  readonly salida: AudioNode;
  readonly #bloques: IEfxBloquesAudio;
  readonly #limitador: DynamicsCompressorNode;
  readonly #aplicadores: TEfxAplicadores;

  constructor(ctx: BaseAudioContext, bloques: IEfxBloquesAudio) {
    this.#bloques = bloques;
    const entrada = ctx.createGain();
    entrada.channelCount = 1;
    entrada.channelCountMode = 'explicit';
    entrada.channelInterpretation = 'speakers';
    this.entrada = entrada;
    this.#limitador = ctx.createDynamicsCompressor();
    this.#limitador.threshold.value = -3;
    this.#limitador.knee.value = 0;
    this.#limitador.ratio.value = 20;
    this.#limitador.attack.value = 0.002;
    this.#limitador.release.value = 0.1;
    this.salida = ctx.createGain();

    let anterior: AudioNode = this.entrada;
    for (const id of COR_ORDEN_BLOQUES_EFX) {
      const bloque = bloques[id];
      anterior.connect(bloque.entrada);
      anterior = bloque.salida;
    }
    anterior.connect(this.#limitador).connect(this.salida);

    this.#aplicadores = {
      fx1: (estado) => aplicarEstado(bloques.fx1, estado),
      fx2: (estado) => aplicarEstado(bloques.fx2, estado),
      amp: (estado) => aplicarEstado(bloques.amp, estado),
      cab: (estado) => aplicarEstado(bloques.cab, estado),
      del: (estado) => aplicarEstado(bloques.del, estado),
      mod: (estado) => aplicarEstado(bloques.mod, estado),
      rev: (estado) => aplicarEstado(bloques.rev, estado),
      eq: (estado) => aplicarEstado(bloques.eq, estado),
    };
  }

  fijarBloques(bloques: Readonly<IEfxBloques>): void {
    for (const id of COR_ORDEN_BLOQUES_EFX) this.fijarBloque(id, bloques[id]);
  }

  /** `idIr` del gabinete no se aplica aquí: el IR lo resuelve quien llama y lo pasa con `fijarIr`. */
  fijarBloque<TId extends TEfxIdBloque>(id: TId, estado: Readonly<IEfxBloques[TId]>): void {
    const aplicar: TEfxAplicadores[TId] = this.#aplicadores[id];
    aplicar(estado);
  }

  fijarIr(buf: AudioBuffer | null): void {
    this.#bloques.cab.fijarIr(buf);
  }

  liberar(): void {
    this.entrada.disconnect();
    for (const id of COR_ORDEN_BLOQUES_EFX) this.#bloques[id].liberar();
    this.#limitador.disconnect();
    this.salida.disconnect();
  }
}

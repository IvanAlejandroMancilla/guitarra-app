/**
 * Reproductor del acompañamiento: suena las demás pistas del Guitar Pro con el sintetizador de alphaTab
 * (SoundFont de `public/soundfonts/`) y silencia la pista que toca el usuario.
 *
 * El reloj de `tmp` es el maestro: el reproductor no tiene reloj propio, sigue los eventos
 * `'tmp:inicio' | 'tmp:pausa' | 'tmp:detencion' | 'tmp:posicion'` y `AcpSincronizador` corrige la deriva
 * en cada cuadro (registrar `obtenerSincronizador()` en el bucle).
 *
 * Carga diferida: alphaTab se importa con `import('./acp_api')` recién en el primer `cargar()`.
 * Importar este archivo NO carga alphaTab (solo usa sus tipos).
 */
import type { AlphaTabApi } from '@coderline/alphatab';
import type { ICorActualizable, ICorBus, ICorCuadro, ICorReloj, ICorReproducible } from '../core/cor_contratos';
import type { IAcpMezclaPista, IGprCargado, IGprPistaConvertida, TAcpEstado } from '../core/cor_eventos';
import { ACP_VELOCIDAD_MAX, ACP_VELOCIDAD_MIN, ACP_VOL_DEF } from './acp_constantes';
import { AcpMezclador } from './acp_mezclador';
import { AcpSincronizador } from './acp_sincronizador';
import type { IAcpOpciones } from './acp_tipos';

const ACP_ORIGEN = 'acp';

const obtenerMensaje = (err: unknown, msjDef: string): string =>
  err instanceof Error && err.message !== '' ? `${msjDef} (${err.message})` : msjDef;

/** Partes que existen solo después de cargar alphaTab. */
interface IAcpMotor {
  api: AlphaTabApi;
  mezclador: AcpMezclador;
  sincronizador: AcpSincronizador;
}

export class AcpReproductor implements ICorReproducible {
  readonly #bus: ICorBus;
  readonly #reloj: ICorReloj;
  readonly #opc: IAcpOpciones;
  readonly #desuscripciones: (() => void)[];
  #motor: IAcpMotor | null = null;
  #promesaMotor: Promise<IAcpMotor> | null = null;
  #estado: TAcpEstado = 'sinCargar';
  #progresoCarga = 0;
  #volGeneral = ACP_VOL_DEF;
  /** Descarta cargas viejas si llega otra canción antes de terminar. */
  #idCarga = 0;
  /** Delegado estable para el bucle: existe antes de que alphaTab esté cargado. */
  readonly #actualizable: ICorActualizable = {
    actualizar: (cuadro: ICorCuadro): void => {
      if (this.#estado === 'reproduciendo') this.#motor?.sincronizador.actualizar(cuadro);
    },
  };

  constructor(bus: ICorBus, reloj: ICorReloj, opc: IAcpOpciones) {
    this.#bus = bus;
    this.#reloj = reloj;
    this.#opc = opc;
    this.#desuscripciones = [
      bus.suscribir('gpr:cargado', this.#alCargarGpr),
      bus.suscribir('gpr:pistaConvertida', this.#alConvertirPista),
      bus.suscribir('tmp:inicio', this.#alIniciarTransporte),
      bus.suscribir('tmp:pausa', this.#alPausarTransporte),
      bus.suscribir('tmp:detencion', this.#alDetenerTransporte),
      bus.suscribir('tmp:posicion', this.#alPosicionarTransporte),
      bus.suscribir('cfg:mezclaPista', this.#alCambiarMezclaPista),
    ];
  }

  /**
   * Prepara el acompañamiento de un archivo Guitar Pro y silencia la pista `idxPstGuitarra`.
   * Resuelve cuando el SoundFont y el MIDI están listos. Si el reloj ya corre, arranca alineado.
   * Los errores se informan con `'acp:estado'` (`'error'`) y `'cor:error'`, y la promesa se rechaza.
   */
  async cargar(buf: ArrayBuffer, idxPstGuitarra: number): Promise<void> {
    const idCarga = ++this.#idCarga;
    this.#emitirEstado('cargando', null);
    try {
      const motor = await this.#obtenerMotor();
      if (idCarga !== this.#idCarga) return;
      motor.api.stop();
      await this.#cargarPartitura(motor.api, buf, idxPstGuitarra);
      if (idCarga !== this.#idCarga) return;
      const pistas = (motor.api.score?.tracks ?? []).map((track) => ({ idx: track.index }));
      motor.mezclador.reiniciar(pistas, idxPstGuitarra);
      motor.mezclador.fijarVolGeneral(this.#volGeneral);
      motor.sincronizador.reiniciar();
      this.#progresoCarga = 1;
      this.#emitirEstado('listo', null);
      this.#bus.emitir('acp:mezcla', motor.mezclador.obtenerMezcla());
      if (this.#reloj.esReproduciendo()) this.reproducir();
    } catch (err) {
      if (idCarga !== this.#idCarga) return;
      const msj = obtenerMensaje(err, 'No se pudo preparar el acompañamiento.');
      this.#emitirEstado('error', msj);
      this.#bus.emitir('cor:error', { origen: ACP_ORIGEN, msj });
      throw err instanceof Error ? err : new Error(msj);
    }
  }

  /** Arranca (o reanuda) el acompañamiento en la posición actual del reloj. */
  reproducir(): void {
    const motor = this.#motor;
    if (motor === null || !this.#esCargado()) return;
    motor.sincronizador.fijarPosPulsos(this.#reloj.obtenerPosPulsos());
    motor.api.play();
    this.#emitirEstado('reproduciendo', null);
  }

  pausar(): void {
    const motor = this.#motor;
    if (motor === null || !this.#esCargado()) return;
    motor.api.pause();
    this.#emitirEstado('pausado', null);
  }

  /** Detiene y vuelve al inicio. */
  detener(): void {
    const motor = this.#motor;
    if (motor === null || !this.#esCargado()) return;
    motor.api.stop();
    this.#emitirEstado('listo', null);
  }

  /**
   * Factor de velocidad (se acota a [`ACP_VELOCIDAD_MIN`, `ACP_VELOCIDAD_MAX`]) aplicado al sintetizador.
   * Mientras el reloj corre, `AcpSincronizador` recalcula la velocidad en cada cuadro a partir del BPM
   * efectivo del reloj (que ya incluye la velocidad de práctica), así que normalmente basta con
   * `TmpReloj.fijarVelocidad`; este método sirve para aplicar el cambio sin esperar al próximo cuadro.
   */
  fijarVelocidad(factor: number): void {
    const velocidad = Math.min(ACP_VELOCIDAD_MAX, Math.max(ACP_VELOCIDAD_MIN, factor));
    if (this.#motor !== null && Number.isFinite(velocidad)) this.#motor.api.playbackSpeed = velocidad;
  }

  /** Volumen general del acompañamiento (0..1); corresponde a `IConfig.volAcp`. */
  fijarVolGeneral(vol: number): void {
    this.#volGeneral = vol;
    this.#motor?.mezclador.fijarVolGeneral(vol);
  }

  /** Actualizable para el bucle (`CorBucle`). Es estable: se puede registrar antes de cargar alphaTab. */
  obtenerSincronizador(): ICorActualizable {
    return this.#actualizable;
  }

  /** Quita suscripciones y destruye alphaTab. */
  liberar(): void {
    this.#idCarga++;
    for (const desuscribir of this.#desuscripciones) desuscribir();
    this.#desuscripciones.length = 0;
    if (this.#motor !== null) {
      this.#motor.sincronizador.liberar();
      this.#motor.api.destroy();
    }
    this.#motor = null;
    this.#promesaMotor = null;
    this.#emitirEstado('sinCargar', null);
  }

  #esCargado(): boolean {
    return this.#estado === 'listo' || this.#estado === 'pausado' || this.#estado === 'reproduciendo';
  }

  /** Crea alphaTab una sola vez (import dinámico). */
  #obtenerMotor(): Promise<IAcpMotor> {
    this.#promesaMotor ??= import('./acp_api').then(({ acp_crearApi }) => {
      const api = acp_crearApi(this.#opc.elemHost, this.#opc.urlSoundfont);
      api.soundFontLoad.on((args) => {
        this.#progresoCarga = args.total > 0 ? args.loaded / args.total : 0;
        if (this.#estado === 'cargando') this.#emitirEstado('cargando', null);
      });
      api.error.on((err) => {
        // Los errores durante una carga los informa `cargar()`; aquí, los que ocurren después.
        if (this.#estado === 'cargando') return;
        const msj = obtenerMensaje(err, 'Error en el acompañamiento.');
        this.#emitirEstado('error', msj);
        this.#bus.emitir('cor:error', { origen: ACP_ORIGEN, msj });
      });
      const motor: IAcpMotor = {
        api,
        mezclador: new AcpMezclador(api),
        sincronizador: new AcpSincronizador(api, this.#reloj, this.#bus),
      };
      this.#motor = motor;
      return motor;
    });
    return this.#promesaMotor;
  }

  /** Carga la partitura en alphaTab y espera a que SoundFont + MIDI estén listos para sonar. */
  #cargarPartitura(api: AlphaTabApi, buf: ArrayBuffer, idxPstGuitarra: number): Promise<void> {
    return new Promise<void>((resolver, rechazar) => {
      const desuscribirListo = api.playerReady.on(() => {
        desuscribirListo();
        desuscribirError();
        resolver();
      });
      const desuscribirError = api.error.on((err) => {
        desuscribirListo();
        desuscribirError();
        rechazar(err);
      });
      // Solo se "renderiza" la pista del usuario; el host está oculto, así que no se dibuja nada.
      // El MIDI se genera con TODAS las pistas.
      api.load(new Uint8Array(buf), [Math.max(0, idxPstGuitarra)]);
    });
  }

  #emitirEstado(estado: TAcpEstado, msjError: string | null): void {
    this.#estado = estado;
    this.#bus.emitir('acp:estado', { estado, progresoCarga: this.#progresoCarga, msjError });
  }

  readonly #alCargarGpr = (cargado: IGprCargado): void => {
    this.#progresoCarga = 0;
    // El error ya se informó por el bus dentro de `cargar()`.
    this.cargar(cargado.buf, cargado.idxPstGuitarra).catch(() => undefined);
  };

  /** El usuario eligió tocar otra pista: se silencia esa y vuelve a sonar la anterior. */
  readonly #alConvertirPista = (convertida: IGprPistaConvertida): void => {
    const motor = this.#motor;
    if (motor === null || !this.#esCargado()) return;
    const pistas = (motor.api.score?.tracks ?? []).map((track) => ({ idx: track.index }));
    motor.mezclador.reiniciar(pistas, convertida.idxPst);
    this.#bus.emitir('acp:mezcla', motor.mezclador.obtenerMezcla());
  };

  readonly #alIniciarTransporte = (): void => {
    this.reproducir();
  };

  readonly #alPausarTransporte = (): void => {
    this.pausar();
  };

  readonly #alDetenerTransporte = (): void => {
    this.detener();
  };

  readonly #alPosicionarTransporte = (): void => {
    const motor = this.#motor;
    if (motor === null || !this.#esCargado()) return;
    motor.sincronizador.fijarPosPulsos(this.#reloj.obtenerPosPulsos());
    // Si alphaTab llegó al final antes que el reloj (vuelta de loop), se relanza.
    if (this.#estado === 'reproduciendo') motor.api.play();
  };

  readonly #alCambiarMezclaPista = (mezclaPista: IAcpMezclaPista): void => {
    const motor = this.#motor;
    if (motor === null) return;
    motor.mezclador.fijarVolPista(mezclaPista.idxPst, mezclaPista.vol);
    motor.mezclador.fijarSoloPista(mezclaPista.idxPst, mezclaPista.esSolo);
    motor.mezclador.fijarMutePista(mezclaPista.idxPst, mezclaPista.esMute);
    this.#bus.emitir('acp:mezcla', motor.mezclador.obtenerMezcla());
  };
}

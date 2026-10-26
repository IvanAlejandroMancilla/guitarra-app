import type { AlphaTabApi, synth } from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { CorBus } from '../core/cor_bus';
import type { ICorCuadro, ICorReloj } from '../core/cor_contratos';
import type { IAcpPosicion } from '../core/cor_eventos';
import type { IConfig } from '../core/tipos';
import { ACP_TICKS_POR_PULSO } from './acp_constantes';
import { AcpMezclador } from './acp_mezclador';
import { AcpSincronizador } from './acp_sincronizador';

type TAcpOyentePos = (args: synth.PositionChangedEventArgs) => void;

/** Doble mínimo de `AlphaTabApi` con lo que usan el sincronizador y el mezclador. */
class AcpApiFalsa {
  tickPosition = 0;
  playbackSpeed = 1;
  masterVolume = 1;
  endTime = 60000;
  oyentes = new Set<TAcpOyentePos>();
  llamadas: string[] = [];
  score = { tempo: 120, tracks: [{ index: 0 }, { index: 1 }, { index: 2 }] };
  tickCache = {
    masterBars: [
      { tempoChanges: [{ tick: 0, tempo: 120 }] },
      // Cambio de tempo en el pulso 8.
      { tempoChanges: [{ tick: 8 * ACP_TICKS_POR_PULSO, tempo: 60 }] },
    ],
  };
  playerPositionChanged = {
    on: (oyente: TAcpOyentePos): (() => void) => {
      this.oyentes.add(oyente);
      return () => this.oyentes.delete(oyente);
    },
  };

  informarTick(currentTick: number): void {
    for (const oyente of this.oyentes) oyente({ currentTick } as synth.PositionChangedEventArgs);
  }

  changeTrackVolume(tracks: { index: number }[], vol: number): void {
    this.llamadas.push(`vol ${tracks.map((t) => t.index).join()} ${vol}`);
  }

  changeTrackSolo(tracks: { index: number }[], esSolo: boolean): void {
    this.llamadas.push(`solo ${tracks.map((t) => t.index).join()} ${esSolo}`);
  }

  changeTrackMute(tracks: { index: number }[], esMute: boolean): void {
    this.llamadas.push(`mute ${tracks.map((t) => t.index).join()} ${esMute}`);
  }

  comoApi(): AlphaTabApi {
    // Doble de prueba: implementa solo los miembros que usa acp.
    return this as unknown as AlphaTabApi;
  }
}

class AcpRelojFalso implements ICorReloj {
  tiempoCtxMs = 0;
  posPulsos = 0;
  bpm = 120;
  esCorriendo = true;
  obtenerTiempoCtxMs(): number {
    return this.tiempoCtxMs;
  }
  obtenerPosPulsos(): number {
    return this.posPulsos;
  }
  obtenerPosMs(): number {
    return (this.posPulsos * 60000) / this.bpm;
  }
  obtenerBpm(): number {
    return this.bpm;
  }
  convertirCtxAPosPulsos(): number {
    return this.posPulsos;
  }
  esReproduciendo(): boolean {
    return this.esCorriendo;
  }
}

const crearCuadro = (reloj: AcpRelojFalso): ICorCuadro => ({
  tiempoCtxMs: reloj.tiempoCtxMs,
  posPulsos: reloj.posPulsos,
  posMs: reloj.obtenerPosMs(),
  deltaMs: 16,
  bpm: reloj.bpm,
});

const crearEscenario = (): {
  api: AcpApiFalsa;
  reloj: AcpRelojFalso;
  bus: CorBus;
  sinc: AcpSincronizador;
  posiciones: IAcpPosicion[];
} => {
  const api = new AcpApiFalsa();
  const reloj = new AcpRelojFalso();
  const bus = new CorBus();
  const sinc = new AcpSincronizador(api.comoApi(), reloj, bus);
  sinc.reiniciar();
  const posiciones: IAcpPosicion[] = [];
  bus.suscribir('acp:posicion', (pos) => posiciones.push(pos));
  bus.emitir('acp:estado', { estado: 'reproduciendo', progresoCarga: 1, msjError: null });
  return { api, reloj, bus, sinc, posiciones };
};

describe('AcpSincronizador', () => {
  it('no hace nada si el acompañamiento no está reproduciendo', () => {
    const { api, reloj, bus, sinc, posiciones } = crearEscenario();
    bus.emitir('acp:estado', { estado: 'pausado', progresoCarga: 1, msjError: null });
    api.informarTick(0);
    reloj.posPulsos = 10;
    sinc.actualizar(crearCuadro(reloj));
    expect(posiciones).toHaveLength(0);
    expect(api.tickPosition).toBe(0);
  });

  it('sin deriva no reposiciona y emite la posición', () => {
    const { api, reloj, sinc, posiciones } = crearEscenario();
    reloj.tiempoCtxMs = 1000;
    reloj.posPulsos = 2;
    api.informarTick(2 * ACP_TICKS_POR_PULSO);
    reloj.tiempoCtxMs = 1100;
    reloj.posPulsos = 2.2; // 100 ms a 120 bpm = 0.2 pulsos
    api.tickPosition = -1;
    sinc.actualizar(crearCuadro(reloj));
    expect(api.tickPosition).toBe(-1);
    expect(posiciones[0]?.posPulsos).toBeCloseTo(2.2, 6);
    expect(posiciones[0]?.derivaMs).toBeCloseTo(0, 6);
  });

  it('corrige cuando la deriva supera ACP_DERIVA_MAX_MS', () => {
    const { api, reloj, sinc, posiciones } = crearEscenario();
    reloj.tiempoCtxMs = 1000;
    api.informarTick(4 * ACP_TICKS_POR_PULSO);
    reloj.posPulsos = 3; // alphaTab va 1 pulso (500 ms) adelantado
    sinc.actualizar(crearCuadro(reloj));
    expect(posiciones[0]?.derivaMs).toBeCloseTo(500, 6);
    expect(api.tickPosition).toBe(3 * ACP_TICKS_POR_PULSO);
  });

  it('compensa la latencia de salida leída de cfg:cambio', () => {
    const { api, reloj, bus, sinc } = crearEscenario();
    bus.emitir('cfg:cambio', { cfg: { latSalidaMs: 250 } as IConfig, claves: ['latSalidaMs'] });
    sinc.fijarPosPulsos(1);
    // 250 ms a 120 bpm = 0.5 pulsos por delante de la posición audible.
    expect(api.tickPosition).toBe(1.5 * ACP_TICKS_POR_PULSO);
    reloj.posPulsos = 1;
    sinc.actualizar(crearCuadro(reloj));
    expect(api.tickPosition).toBe(1.5 * ACP_TICKS_POR_PULSO);
  });

  it('deriva la velocidad del BPM del reloj y de los cambios de tempo de la partitura', () => {
    const { api, reloj, sinc } = crearEscenario();
    reloj.bpm = 90; // usuario al 75 %
    reloj.posPulsos = 1;
    sinc.actualizar(crearCuadro(reloj));
    expect(api.playbackSpeed).toBeCloseTo(0.75, 6);
    reloj.posPulsos = 9; // pasado el cambio a 60 bpm
    sinc.actualizar(crearCuadro(reloj));
    expect(api.playbackSpeed).toBeCloseTo(1.5, 6);
  });

  it('liberar quita las suscripciones', () => {
    const { api, sinc } = crearEscenario();
    expect(api.oyentes.size).toBe(1);
    sinc.liberar();
    expect(api.oyentes.size).toBe(0);
  });
});

describe('AcpMezclador', () => {
  it('silencia la pista del usuario y aplica volumen, solo y mute', () => {
    const api = new AcpApiFalsa();
    const mezclador = new AcpMezclador(api.comoApi());
    expect(api.masterVolume).toBe(0.8);
    mezclador.reiniciar([{ idx: 0 }, { idx: 1 }, { idx: 2 }], 1);
    expect(mezclador.obtenerMezcla()).toEqual({
      idxPstGuitarra: 1,
      pistas: [
        { idxPst: 0, vol: 1, esSolo: false, esMute: false },
        { idxPst: 1, vol: 1, esSolo: false, esMute: true },
        { idxPst: 2, vol: 1, esSolo: false, esMute: false },
      ],
    });
    expect(api.llamadas).toContain('mute 1 true');

    mezclador.fijarVolPista(2, 1.7);
    mezclador.fijarSoloPista(0, true);
    mezclador.fijarMutePista(1, false);
    mezclador.fijarVolGeneral(-3);
    expect(api.llamadas.slice(-3)).toEqual(['vol 2 1', 'solo 0 true', 'mute 1 false']);
    expect(api.masterVolume).toBe(0);
    expect(mezclador.obtenerMezcla().pistas[2]?.vol).toBe(1);
  });

  it('ignora pistas inexistentes', () => {
    const api = new AcpApiFalsa();
    const mezclador = new AcpMezclador(api.comoApi());
    mezclador.reiniciar([{ idx: 0 }], 0);
    const cantLlamadas = api.llamadas.length;
    mezclador.fijarVolPista(9, 0.5);
    expect(api.llamadas).toHaveLength(cantLlamadas);
  });
});

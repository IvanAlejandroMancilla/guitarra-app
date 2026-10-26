/**
 * Mezcla por pista del acompañamiento (volumen, solo, mute) sobre el sintetizador de alphaTab.
 * La pista que toca el usuario arranca silenciada.
 */
import type { AlphaTabApi, model } from '@coderline/alphatab';
import type { IAcpMezcla, IAcpMezclaPista, IGprPista } from '../core/cor_eventos';
import { ACP_VOL_DEF } from './acp_constantes';

const ACP_VOL_PISTA_DEF = 1;

const acotarVol = (vol: number): number => (Number.isFinite(vol) ? Math.min(1, Math.max(0, vol)) : ACP_VOL_PISTA_DEF);

export class AcpMezclador {
  readonly #api: AlphaTabApi;
  #pistas: IAcpMezclaPista[] = [];
  #idxPstGuitarra = -1;
  #volGeneral = ACP_VOL_DEF;

  constructor(api: AlphaTabApi) {
    this.#api = api;
    this.#api.masterVolume = this.#volGeneral;
  }

  /** Mezcla inicial de una canción nueva: todo a volumen pleno, sin solo, y la pista del usuario en mute. */
  reiniciar(pistas: readonly Pick<IGprPista, 'idx'>[], idxPstGuitarra: number): void {
    this.#idxPstGuitarra = idxPstGuitarra;
    this.#pistas = pistas.map((pista) => ({
      idxPst: pista.idx,
      vol: ACP_VOL_PISTA_DEF,
      esSolo: false,
      esMute: pista.idx === idxPstGuitarra,
    }));
    for (const mezclaPista of this.#pistas) {
      const tracks = this.#obtenerTracks(mezclaPista.idxPst);
      if (tracks.length === 0) continue;
      this.#api.changeTrackVolume(tracks, mezclaPista.vol);
      this.#api.changeTrackSolo(tracks, mezclaPista.esSolo);
      this.#api.changeTrackMute(tracks, mezclaPista.esMute);
    }
  }

  /** Volumen de una pista (0..1, se acota). */
  fijarVolPista(idxPst: number, vol: number): void {
    const mezclaPista = this.#obtenerMezclaPista(idxPst);
    if (mezclaPista === undefined) return;
    mezclaPista.vol = acotarVol(vol);
    this.#api.changeTrackVolume(this.#obtenerTracks(idxPst), mezclaPista.vol);
  }

  fijarSoloPista(idxPst: number, esSolo: boolean): void {
    const mezclaPista = this.#obtenerMezclaPista(idxPst);
    if (mezclaPista === undefined) return;
    mezclaPista.esSolo = esSolo;
    this.#api.changeTrackSolo(this.#obtenerTracks(idxPst), esSolo);
  }

  fijarMutePista(idxPst: number, esMute: boolean): void {
    const mezclaPista = this.#obtenerMezclaPista(idxPst);
    if (mezclaPista === undefined) return;
    mezclaPista.esMute = esMute;
    this.#api.changeTrackMute(this.#obtenerTracks(idxPst), esMute);
  }

  /** Volumen general del acompañamiento (0..1, se acota). */
  fijarVolGeneral(vol: number): void {
    this.#volGeneral = acotarVol(vol);
    this.#api.masterVolume = this.#volGeneral;
  }

  obtenerMezcla(): IAcpMezcla {
    return { pistas: this.#pistas.map((mezclaPista) => ({ ...mezclaPista })), idxPstGuitarra: this.#idxPstGuitarra };
  }

  #obtenerMezclaPista(idxPst: number): IAcpMezclaPista | undefined {
    return this.#pistas.find((mezclaPista) => mezclaPista.idxPst === idxPst);
  }

  #obtenerTracks(idxPst: number): model.Track[] {
    const track = this.#api.score?.tracks[idxPst];
    return track === undefined ? [] : [track];
  }
}

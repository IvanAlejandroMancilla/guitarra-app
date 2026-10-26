/**
 * Coordinador de transporte:
 * - `'ui:transporte'` → reloj (reproducir, pausar, alternar, reiniciar) y configuración
 *   (subir/bajar BPM, alternar loop).
 * - `'ejr:cargado'` → detiene el reloj y aplica el BPM del ejercicio.
 * - `'tmp:bpm'` → mantiene `IConfig.bpm` sincronizado (p. ej. tras el modo progresivo).
 * - `'ejr:fin'` sin loop → pausa al terminar.
 */
import type { ICorBus, ICorEditorConfig } from '../core/cor_contratos';
import type { IUiTransporte } from '../core/cor_eventos';
import { TMP_BPM_MAX, TMP_BPM_MIN, TMP_PASO_BPM } from './tmp_constantes';
import type { TmpReloj } from './tmp_reloj';

export class TmpControlador {
  readonly #bus: ICorBus;
  readonly #reloj: TmpReloj;
  readonly #editor: ICorEditorConfig;
  #cancelaciones: (() => void)[] = [];

  constructor(bus: ICorBus, reloj: TmpReloj, editor: ICorEditorConfig) {
    this.#bus = bus;
    this.#reloj = reloj;
    this.#editor = editor;
  }

  esActivo(): boolean {
    return this.#cancelaciones.length > 0;
  }

  iniciar(): void {
    if (this.esActivo()) return;
    this.#cancelaciones = [
      this.#bus.suscribir('ui:transporte', this.#procesarAccion),
      this.#bus.suscribir('ejr:cargado', (cargado) => {
        this.#reloj.detener();
        this.#fijarBpm(cargado.ej.bpm);
      }),
      this.#bus.suscribir('tmp:bpm', (cambio) => {
        if (this.#editor.obtenerConfig().bpm !== cambio.bpm) this.#editor.actualizarConfig({ bpm: cambio.bpm });
      }),
      this.#bus.suscribir('ejr:fin', () => {
        if (!this.#editor.obtenerConfig().esLoop && this.#reloj.esReproduciendo()) this.#reloj.pausar();
      }),
    ];
  }

  detener(): void {
    for (const cancelar of this.#cancelaciones) cancelar();
    this.#cancelaciones = [];
  }

  readonly #procesarAccion = (transporte: IUiTransporte): void => {
    const cfg = this.#editor.obtenerConfig();
    switch (transporte.accion) {
      case 'reproducir':
        this.#reloj.reproducir();
        break;
      case 'pausar':
        this.#reloj.pausar();
        break;
      case 'alternar':
        if (this.#reloj.esReproduciendo()) this.#reloj.pausar();
        else this.#reloj.reproducir();
        break;
      case 'reiniciar': {
        const esReproduciendo = this.#reloj.esReproduciendo();
        this.#reloj.detener();
        if (esReproduciendo) this.#reloj.reproducir();
        break;
      }
      case 'subirBpm':
        this.#fijarBpm(cfg.bpm + TMP_PASO_BPM);
        break;
      case 'bajarBpm':
        this.#fijarBpm(cfg.bpm - TMP_PASO_BPM);
        break;
      case 'alternarLoop':
        this.#editor.actualizarConfig({ esLoop: !cfg.esLoop });
        break;
    }
  };

  readonly #fijarBpm = (bpm: number): void => {
    const bpmAcotado = Math.min(Math.max(Math.round(bpm), TMP_BPM_MIN), TMP_BPM_MAX);
    this.#reloj.fijarBpm(bpmAcotado);
    if (this.#editor.obtenerConfig().bpm !== bpmAcotado) this.#editor.actualizarConfig({ bpm: bpmAcotado });
  };
}

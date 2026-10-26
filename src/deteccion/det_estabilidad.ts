/**
 * Filtro de estabilidad: una nota se confirma cuando llega `framesEstables`
 * frames seguidos con el mismo MIDI. Cada nota se confirma UNA vez; para volver
 * a confirmarla (nota repetida) hay que pasar por silencio (`registrar(null)`)
 * o `reiniciar()` (ataque nuevo).
 */
export class DetFiltroEstabilidad {
  #framesEstables: number;
  #midiAct: number | null = null;
  #cant = 0;
  #midiConfirmado: number | null = null;

  constructor(framesEstables: number) {
    this.#framesEstables = Math.max(1, Math.round(framesEstables));
  }

  /**
   * Registra el MIDI del frame (`null` = silencio). Devuelve el MIDI en el frame
   * en que se confirma; `null` en los demás.
   */
  registrar(midi: number | null): number | null {
    if (midi === null) {
      this.reiniciar();
      return null;
    }
    if (midi === this.#midiAct) {
      this.#cant++;
    } else {
      this.#midiAct = midi;
      this.#cant = 1;
    }
    if (this.#cant >= this.#framesEstables && this.#midiConfirmado !== midi) {
      this.#midiConfirmado = midi;
      return midi;
    }
    return null;
  }

  fijarFramesEstables(cant: number): void {
    this.#framesEstables = Math.max(1, Math.round(cant));
  }

  reiniciar(): void {
    this.#midiAct = null;
    this.#cant = 0;
    this.#midiConfirmado = null;
  }
}

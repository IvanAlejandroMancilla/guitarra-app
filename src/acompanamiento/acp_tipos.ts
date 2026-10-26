/** Tipos internos del módulo acp. */

export interface IAcpOpciones {
  /** URL absoluta o relativa del SoundFont (ej. `import.meta.env.BASE_URL + ACP_RUTA_SOUNDFONT`). */
  urlSoundfont: string;
  /** Elemento donde alphaTab se monta. Debe estar oculto (`display: none`) para que no renderice partitura. */
  elemHost: HTMLElement;
}

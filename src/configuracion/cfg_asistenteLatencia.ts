/** Asistente de calibración de latencia: tocar al ritmo de los clicks y medir el desfase. */
import type { ICorCalibradorLatencia, ICorEditorConfig, ICorMontable, ICorResultadoCalibracion } from '../core/cor_contratos';
import { ui_crearBoton } from '../ui/ui_boton';
import { ui_crearElemento, ui_vaciarElemento } from '../ui/ui_dom';

/** Igual a `TMP_CANT_CLICKS_CALIB` (cfg no importa de tmp). */
const CFG_CANT_CLICKS_CALIB = 8;

type TCfgFaseAsistente = 'inicio' | 'midiendo' | 'resultado' | 'error';

/**
 * Diálogo modal (`<dialog>`): Escape cancela, el foco queda atrapado dentro y vuelve al
 * elemento previo al cerrar. Se desmonta solo al cerrarse.
 */
export class CfgAsistenteLatencia implements ICorMontable {
  #calibrador: ICorCalibradorLatencia;
  #editor: ICorEditorConfig;
  #dialogo: HTMLDialogElement | null = null;
  #cuerpo: HTMLElement | null = null;
  #acciones: HTMLElement | null = null;
  #fase: TCfgFaseAsistente = 'inicio';
  #focoAnt: Element | null = null;

  constructor(calibrador: ICorCalibradorLatencia, editor: ICorEditorConfig) {
    this.#calibrador = calibrador;
    this.#editor = editor;
  }

  montar(contenedor: HTMLElement): Promise<void> {
    this.desmontar();
    this.#focoAnt = document.activeElement;
    const dialogo = ui_crearElemento('dialog', 'cfg-asistente');
    dialogo.setAttribute('aria-labelledby', 'cfg-asistente-titulo');
    const titulo = ui_crearElemento('h2', 'cfg-asistente__titulo', 'Calibrar latencia');
    titulo.id = 'cfg-asistente-titulo';
    this.#cuerpo = ui_crearElemento('div', 'cfg-asistente__cuerpo');
    this.#cuerpo.setAttribute('aria-live', 'polite');
    this.#acciones = ui_crearElemento('div', 'cfg-asistente__acciones');
    dialogo.append(titulo, this.#cuerpo, this.#acciones);
    // Escape dispara 'cancel': se trata igual que el botón Cancelar.
    dialogo.addEventListener('cancel', (evento) => {
      evento.preventDefault();
      this.desmontar();
    });
    this.#dialogo = dialogo;
    contenedor.append(dialogo);
    dialogo.showModal();
    this.#mostrarInicio();
    return Promise.resolve();
  }

  desmontar(): void {
    if (this.#fase === 'midiendo') this.#calibrador.cancelar();
    this.#fase = 'inicio';
    const dialogo = this.#dialogo;
    if (dialogo === null) return;
    this.#dialogo = null;
    this.#cuerpo = null;
    this.#acciones = null;
    if (dialogo.open) dialogo.close();
    dialogo.remove();
    if (this.#focoAnt instanceof HTMLElement) this.#focoAnt.focus();
    this.#focoAnt = null;
  }

  #mostrar(parrafos: readonly string[], botones: readonly HTMLButtonElement[]): void {
    if (this.#cuerpo === null || this.#acciones === null) return;
    ui_vaciarElemento(this.#cuerpo);
    ui_vaciarElemento(this.#acciones);
    for (const texto of parrafos) this.#cuerpo.append(ui_crearElemento('p', [], texto));
    this.#acciones.append(...botones);
    botones[0]?.focus();
  }

  #crearCancelar(texto = 'Cancelar'): HTMLButtonElement {
    return ui_crearBoton({ texto, alPulsar: () => this.desmontar() });
  }

  #mostrarInicio(): void {
    this.#fase = 'inicio';
    this.#mostrar(
      [
        `Vas a escuchar ${CFG_CANT_CLICKS_CALIB} clicks del metrónomo.`,
        'Toca una nota (o golpea las cuerdas apagadas) exactamente con cada click.',
        'La guitarra debe estar activada y conviene usar auriculares.',
      ],
      [
        ui_crearBoton({ texto: 'Comenzar', variante: 'primario', alPulsar: () => void this.#medir() }),
        this.#crearCancelar(),
      ],
    );
  }

  async #medir(): Promise<void> {
    this.#fase = 'midiendo';
    this.#mostrar(['Escuchando… toca con cada click.'], [this.#crearCancelar('Detener')]);
    let resultado: ICorResultadoCalibracion;
    try {
      resultado = await this.#calibrador.calibrar(CFG_CANT_CLICKS_CALIB);
    } catch (err) {
      if (this.#fase !== 'midiendo') return; // Cancelado por el usuario.
      console.error('[cfg] Error de calibración:', err);
      this.#fase = 'error';
      const msj = err instanceof Error && err.message !== '' ? err.message : 'No se pudo completar la calibración.';
      this.#mostrar(
        [msj, '¿Está activada la guitarra?'],
        [ui_crearBoton({ texto: 'Reintentar', variante: 'primario', alPulsar: () => void this.#medir() }), this.#crearCancelar('Cerrar')],
      );
      return;
    }
    if (this.#fase !== 'midiendo') return;
    this.#mostrarResultado(resultado);
  }

  #mostrarResultado(resultado: ICorResultadoCalibracion): void {
    this.#fase = 'resultado';
    const latMs = Math.max(0, Math.round(resultado.latMs));
    const parrafos = [
      `Latencia estimada: ${latMs} ms (desvío ±${resultado.desvioMs.toFixed(1)} ms, ${resultado.cantMuestras} de ${CFG_CANT_CLICKS_CALIB} golpes detectados).`,
      `Valor actual de latencia de entrada: ${this.#editor.obtenerConfig().latEntradaMs} ms.`,
    ];
    if (!resultado.esConfiable) parrafos.push('La medición no es confiable: los golpes fueron irregulares o hubo pocos. Conviene repetirla.');
    this.#mostrar(parrafos, [
      ui_crearBoton({
        texto: `Aplicar ${latMs} ms`,
        variante: resultado.esConfiable ? 'primario' : 'secundario',
        alPulsar: () => {
          this.#editor.actualizarConfig({ latEntradaMs: latMs });
          this.desmontar();
        },
      }),
      ui_crearBoton({ texto: 'Repetir', alPulsar: () => void this.#medir() }),
      this.#crearCancelar('Descartar'),
    ]);
  }
}

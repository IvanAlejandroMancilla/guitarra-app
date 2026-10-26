/**
 * Etiquetas de texto con sprites: traste + nombre de nota sobre cada nota visible, nota detectada
 * junto a la línea de golpe y mensaje cuando no hay ejercicio.
 * Los sprites salen de un pool fijo (`V3D_MAX_ETIQUETAS`) y los materiales/texturas se cachean por texto.
 */
import { CanvasTexture, Group, Sprite, SpriteMaterial, SRGBColorSpace } from 'three';
import type { ICorCuadro, ICorOpcionesVista } from '../../core/cor_contratos';
import type { IDetNotaDetectada } from '../../core/cor_eventos';
import { cor_obtenerEtiquetaNota } from '../../core/cor_notas';
import type { IEjercicio, INota } from '../../core/tipos';
import {
  V3D_ANCHO_AUTOPISTA,
  V3D_MARGEN_ATRAS,
  V3D_MAX_ETIQUETAS,
  V3D_MSJ_SIN_EJERCICIO,
  V3D_Y_NOTA,
} from './v3d_constantes';
import {
  v3d_obtenerIdxPrimeraNota,
  v3d_calcularPulsosVisibles,
  v3d_calcularXCarril,
  v3d_calcularZNota,
  v3d_convertirUnidadesAPulsos,
  v3d_ordenarNotas,
} from './v3d_geometria';
import type { IV3dCapa } from './v3d_tipos';

const V3D_TAM_TEXTURA_ETIQUETA = 128;
const V3D_ESCALA_ETIQUETA = 0.62;
const V3D_Y_ETIQUETA = V3D_Y_NOTA + 0.58;
const V3D_DUR_DETECTADA_MS = 900;
const V3D_DUR_DESVANECER_MS = 400;

interface IV3dLienzoTexto {
  lienzo: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  textura: CanvasTexture;
}

const crearLienzoTexto = (anchoPx: number, altoPx: number): IV3dLienzoTexto => {
  const lienzo = document.createElement('canvas');
  lienzo.width = anchoPx;
  lienzo.height = altoPx;
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  return { lienzo, ctx: lienzo.getContext('2d'), textura };
};

/** Dibuja el texto de una nota: traste grande arriba y nombre abajo (o solo el nombre). */
const dibujarEtiquetaNota = (ctx: CanvasRenderingContext2D, trs: number | undefined, nombre: string): void => {
  const tam = V3D_TAM_TEXTURA_ETIQUETA;
  ctx.clearRect(0, 0, tam, tam);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.fillStyle = '#ffffff';
  if (trs !== undefined) {
    ctx.font = 'bold 66px system-ui, sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeText(String(trs), tam / 2, 46);
    ctx.fillText(String(trs), tam / 2, 46);
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeText(nombre, tam / 2, 104);
    ctx.fillText(nombre, tam / 2, 104);
  } else {
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.lineWidth = 8;
    ctx.strokeText(nombre, tam / 2, tam / 2);
    ctx.fillText(nombre, tam / 2, tam / 2);
  }
};

const dibujarTextoCentrado = (sup: IV3dLienzoTexto, texto: string, tamFuentePx: number, color: string): void => {
  const { ctx, lienzo } = sup;
  if (ctx === null) return;
  ctx.clearRect(0, 0, lienzo.width, lienzo.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${tamFuentePx}px system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, tamFuentePx / 7);
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(texto, lienzo.width / 2, lienzo.height / 2);
  ctx.fillStyle = color;
  ctx.fillText(texto, lienzo.width / 2, lienzo.height / 2);
  sup.textura.needsUpdate = true;
};

export class V3dEtiquetas implements IV3dCapa {
  readonly objeto = new Group();
  readonly #opc: ICorOpcionesVista;
  /** Material por texto de etiqueta (cada uno con su textura). */
  readonly #cacheMats = new Map<string, SpriteMaterial>();
  readonly #sprites: Sprite[] = [];
  /** Material compartido de los sprites del pool antes de recibir texto (evita uno por sprite). */
  readonly #matVacio = new SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false });
  readonly #supDetectada: IV3dLienzoTexto;
  readonly #matDetectada: SpriteMaterial;
  readonly #spriteDetectada: Sprite;
  readonly #supMensaje: IV3dLienzoTexto;
  readonly #matMensaje: SpriteMaterial;
  readonly #spriteMensaje: Sprite;
  #notas: readonly INota[] = [];
  #orden = new Uint32Array(0);
  /** 1 = acertada (su etiqueta se oculta). */
  #acertadas = new Uint8Array(0);
  /** Material resuelto por índice de nota (evita armar la clave de texto en cada cuadro). */
  #matsPorNota: (SpriteMaterial | undefined)[] = [];
  #durMax = 0;
  #relojMs = 0;
  /** Reloj de cuadros al recibir la última nota detectada; `NaN` = recibida, aún sin cuadro. */
  #marcaDetectadaMs = Number.NEGATIVE_INFINITY;

  constructor(opc: ICorOpcionesVista) {
    this.#opc = { ...opc };
    for (let i = 0; i < V3D_MAX_ETIQUETAS; i++) {
      const sprite = new Sprite(this.#matVacio);
      sprite.scale.setScalar(V3D_ESCALA_ETIQUETA);
      sprite.visible = false;
      this.#sprites.push(sprite);
      this.objeto.add(sprite);
    }

    this.#supDetectada = crearLienzoTexto(512, 128);
    this.#matDetectada = new SpriteMaterial({ map: this.#supDetectada.textura, transparent: true, depthWrite: false });
    this.#spriteDetectada = new Sprite(this.#matDetectada);
    this.#spriteDetectada.scale.set(3.2, 0.8, 1);
    const ladoDetectada = this.#opc.esZurdo ? -1 : 1;
    this.#spriteDetectada.position.set(ladoDetectada * (V3D_ANCHO_AUTOPISTA / 2 + 1.9), 0.9, 0);
    this.#spriteDetectada.visible = false;
    this.objeto.add(this.#spriteDetectada);

    this.#supMensaje = crearLienzoTexto(1024, 128);
    dibujarTextoCentrado(this.#supMensaje, V3D_MSJ_SIN_EJERCICIO, 56, '#d6dcf0');
    this.#matMensaje = new SpriteMaterial({ map: this.#supMensaje.textura, transparent: true, depthWrite: false });
    this.#spriteMensaje = new Sprite(this.#matMensaje);
    this.#spriteMensaje.scale.set(8, 1, 1);
    this.#spriteMensaje.position.set(0, 1.6, -12);
    this.objeto.add(this.#spriteMensaje);
  }

  cargar(ej: IEjercicio): void {
    this.#notas = ej.notas;
    this.#orden = v3d_ordenarNotas(ej.notas);
    this.#acertadas = new Uint8Array(ej.notas.length);
    this.#matsPorNota = new Array<SpriteMaterial | undefined>(ej.notas.length);
    this.#durMax = ej.notas.reduce((max, nota) => Math.max(max, nota.dur ?? 0), 0);
    this.#spriteMensaje.visible = ej.notas.length === 0;
  }

  marcarResultado(idxNota: number, esAcierto: boolean): void {
    if (idxNota < 0 || idxNota >= this.#acertadas.length) return;
    this.#acertadas[idxNota] = esAcierto ? 1 : 0;
  }

  /** Muestra la última nota detectada junto a la línea de golpe; se desvanece sola. */
  fijarNotaDetectada(detectada: IDetNotaDetectada): void {
    const texto = cor_obtenerEtiquetaNota(detectada.nombre, detectada.oct, this.#opc.notacion);
    dibujarTextoCentrado(this.#supDetectada, `Detectada: ${texto}`, 60, '#9ff5c4');
    this.#marcaDetectadaMs = Number.NaN;
  }

  actualizar(cuadro: ICorCuadro): void {
    this.#relojMs += cuadro.deltaMs;
    this.#actualizarDetectada();
    if (this.#spriteMensaje.visible) {
      this.#matMensaje.opacity = 0.65 + 0.25 * Math.sin(this.#relojMs / 700);
    }

    const vel = this.#opc.velocidadAutopista;
    const pos = cuadro.posPulsos;
    const inicioPulsos = pos - v3d_convertirUnidadesAPulsos(V3D_MARGEN_ATRAS * 0.5, vel);
    const finPulsos = pos + v3d_calcularPulsosVisibles(vel);
    let cant = 0;
    let idxOrden = v3d_obtenerIdxPrimeraNota(this.#notas, this.#orden, inicioPulsos - this.#durMax);
    for (; idxOrden < this.#orden.length && cant < this.#sprites.length; idxOrden++) {
      const idxNota = this.#orden[idxOrden] ?? 0;
      const nota = this.#notas[idxNota];
      if (nota === undefined) continue;
      if (nota.tiempo > finPulsos) break;
      if (nota.tiempo < inicioPulsos || this.#acertadas[idxNota] === 1) continue;
      const sprite = this.#sprites[cant];
      if (sprite === undefined) break;
      let mat = this.#matsPorNota[idxNota];
      if (mat === undefined) {
        mat = this.#obtenerMaterial(nota);
        this.#matsPorNota[idxNota] = mat;
      }
      sprite.material = mat;
      sprite.position.set(
        v3d_calcularXCarril(nota.cur, this.#opc.esZurdo),
        V3D_Y_ETIQUETA,
        v3d_calcularZNota(nota.tiempo, pos, vel),
      );
      sprite.visible = true;
      cant++;
    }
    for (let i = cant; i < this.#sprites.length; i++) {
      const sprite = this.#sprites[i];
      if (sprite === undefined || !sprite.visible) continue;
      sprite.visible = false;
    }
  }

  liberar(): void {
    for (const mat of this.#cacheMats.values()) {
      mat.map?.dispose();
      mat.dispose();
    }
    this.#cacheMats.clear();
    this.#matsPorNota = [];
    this.#supDetectada.textura.dispose();
    this.#matDetectada.dispose();
    this.#supMensaje.textura.dispose();
    this.#matMensaje.dispose();
    this.#matVacio.dispose();
    this.#sprites.length = 0;
    // Sprite comparte una geometría estática de Three.js: no se libera.
    this.objeto.clear();
  }

  #actualizarDetectada(): void {
    if (Number.isNaN(this.#marcaDetectadaMs)) this.#marcaDetectadaMs = this.#relojMs;
    const transcurridoMs = this.#relojMs - this.#marcaDetectadaMs;
    const total = V3D_DUR_DETECTADA_MS + V3D_DUR_DESVANECER_MS;
    const esVisible = transcurridoMs >= 0 && transcurridoMs < total;
    this.#spriteDetectada.visible = esVisible;
    if (esVisible) {
      const rel = (transcurridoMs - V3D_DUR_DETECTADA_MS) / V3D_DUR_DESVANECER_MS;
      this.#matDetectada.opacity = rel <= 0 ? 1 : 1 - rel;
    }
  }

  #obtenerMaterial(nota: INota): SpriteMaterial {
    const nombre = cor_obtenerEtiquetaNota(nota.nombre, nota.oct, this.#opc.notacion);
    const clave = `${nota.trs ?? '-'}|${nombre}`;
    const enCache = this.#cacheMats.get(clave);
    if (enCache !== undefined) return enCache;
    // Solo se crea la primera vez que aparece cada texto (cantidad acotada: trastes × alturas).
    const sup = crearLienzoTexto(V3D_TAM_TEXTURA_ETIQUETA, V3D_TAM_TEXTURA_ETIQUETA);
    if (sup.ctx !== null) dibujarEtiquetaNota(sup.ctx, nota.trs, nombre);
    sup.textura.needsUpdate = true;
    const mat = new SpriteMaterial({ map: sup.textura, transparent: true, depthWrite: false });
    this.#cacheMats.set(clave, mat);
    return mat;
  }
}

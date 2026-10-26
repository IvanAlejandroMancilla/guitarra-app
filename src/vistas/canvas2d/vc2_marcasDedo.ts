/**
 * Capa de marcas de digitación: la nota esperada grande, con brillo neón, el número de dedo dentro
 * y su nombre al lado; las siguientes más pequeñas y tenues.
 */
import { COR_COLORES_CUERDA } from '../../core/cor_colores';
import { VC2_ALFA_SIGUIENTE_MASTIL } from './vc2_constantes';
import { vc2_calcularXTrasteMastil, vc2_calcularYCuerdaMastil } from './vc2_geometriaMastil';
import type { IVc2CapaMastil, IVc2GeoMastil, IVc2MarcaMastil } from './vc2_tipos';

/** Radio máximo de una marca principal (se reduce si no entra entre cuerdas o trastes). */
const VC2_RADIO_DEDO_PX = 13;
const VC2_FACTOR_RADIO_SIGUIENTE = 0.78;
const VC2_COLOR_SIN_CUERDA_MASTIL = '#dfe6f5';
const VC2_COLOR_TEXTO_DEDO = '#0a0d16';
const VC2_COLOR_FONDO_ETIQUETA = 'rgba(5, 7, 13, 0.82)';

export class Vc2MarcasDedo implements IVc2CapaMastil {
  #marcas: readonly IVc2MarcaMastil[] = [];

  fijarMarcas(marcas: readonly IVc2MarcaMastil[]): void {
    this.#marcas = marcas;
  }

  dibujar(ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil): void {
    if (this.#marcas.length === 0) return;
    const radio = Math.max(4, Math.min(VC2_RADIO_DEDO_PX, geo.separacionCuerdasPx * 0.58, geo.anchoTrastePx * 0.4));
    // Primero las siguientes (de la más lejana a la más cercana), luego las principales encima.
    for (let idx = this.#marcas.length - 1; idx >= 0; idx--) {
      const marca = this.#marcas[idx];
      if (marca !== undefined && !marca.esPrincipal) this.#dibujarMarca(ctx, geo, marca, radio * VC2_FACTOR_RADIO_SIGUIENTE);
    }
    const principales = this.#marcas.filter((marca) => marca.esPrincipal);
    for (const marca of principales) this.#dibujarMarca(ctx, geo, marca, radio);
    // Con una sola posición, el nombre va al lado; con varias ("encontrar la nota") se nombra una vez.
    const primera = principales[0];
    if (primera !== undefined) this.#dibujarEtiqueta(ctx, geo, primera, radio, principales.length > 1);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  readonly #dibujarMarca = (ctx: CanvasRenderingContext2D, geo: IVc2GeoMastil, marca: IVc2MarcaMastil, radio: number): void => {
    if (marca.trs < geo.trsMin || marca.trs > geo.trsMax) return;
    const x = vc2_calcularXTrasteMastil(marca.trs, geo);
    const y = vc2_calcularYCuerdaMastil(marca.cur, geo);
    const color = COR_COLORES_CUERDA[marca.cur - 1] ?? VC2_COLOR_SIN_CUERDA_MASTIL;

    ctx.globalAlpha = marca.esPrincipal ? 1 : VC2_ALFA_SIGUIENTE_MASTIL;
    if (marca.esPrincipal) {
      ctx.shadowColor = color;
      ctx.shadowBlur = radio * 1.4;
    }
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = marca.esPrincipal ? 2 : 1;
    ctx.strokeStyle = marca.esPrincipal ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)';
    ctx.stroke();

    if (marca.dedo !== undefined) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(radio * 1.2)}px system-ui, sans-serif`;
      ctx.fillStyle = VC2_COLOR_TEXTO_DEDO;
      ctx.fillText(String(marca.dedo), x, y + 1);
    }
  };

  readonly #dibujarEtiqueta = (
    ctx: CanvasRenderingContext2D,
    geo: IVc2GeoMastil,
    marca: IVc2MarcaMastil,
    radio: number,
    esVarias: boolean,
  ): void => {
    const texto = esVarias ? `${marca.etiqueta}: cualquiera de estas posiciones` : marca.etiqueta;
    const tam = Math.round(Math.max(11, Math.min(15, radio * 1.1)));
    ctx.font = `700 ${tam}px system-ui, sans-serif`;
    const anchoTexto = ctx.measureText(texto).width;
    const relleno = 5;
    const altoCaja = tam + relleno * 1.4;
    let xCaja: number;
    let yCaja: number;
    if (esVarias) {
      // Arriba al centro, sobre la 6.ª cuerda.
      xCaja = (geo.anchoPx - anchoTexto) / 2 - relleno;
      yCaja = Math.max(0, geo.margenSupPx - altoCaja - 1);
    } else {
      const x = vc2_calcularXTrasteMastil(marca.trs, geo);
      const y = vc2_calcularYCuerdaMastil(marca.cur, geo);
      const anchoCaja = anchoTexto + relleno * 2;
      xCaja = x + radio + 6;
      if (xCaja + anchoCaja > geo.anchoPx - 2) xCaja = x - radio - 6 - anchoCaja;
      yCaja = Math.min(Math.max(0, y - altoCaja / 2), geo.altoPx - altoCaja);
    }
    const color = esVarias ? VC2_COLOR_SIN_CUERDA_MASTIL : (COR_COLORES_CUERDA[marca.cur - 1] ?? VC2_COLOR_SIN_CUERDA_MASTIL);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.roundRect(xCaja, yCaja, anchoTexto + relleno * 2, altoCaja, altoCaja / 2);
    ctx.fillStyle = VC2_COLOR_FONDO_ETIQUETA;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(texto, xCaja + relleno, yCaja + altoCaja / 2 + 1);
  };
}

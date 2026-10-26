import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { GprImportador } from './gpr_importador';

/** Bajo + guitarra en drop D; el compás 2 se repite (×2). */
const PRUEBA_TEX = String.raw`
\title "Ida y vuelta"
\artist "Autor"
\tempo 90
\track "Bajo"
\instrument 33
\tuning (G2 D2 A1 E1)
0.4.1 | 0.4.1 |
\track "Guitarra"
\instrument 29
\tuning (E4 B3 G3 D3 A2 D2)
0.6.4 2.6.4 0.1.2 | \ro \rc 2 3.2.1 |
`;

/** Genera un .gp (GP7) real con alphaTab para probar la lectura de bytes. */
const crearArchivoGp = (): ArrayBuffer => {
  const score = alphaTab.importer.ScoreLoader.loadAlphaTex(PRUEBA_TEX);
  const bytes = new alphaTab.exporter.Gp7Exporter().export(score, null);
  return bytes.slice().buffer;
};

describe('GprImportador', () => {
  it('acepta solo extensiones Guitar Pro', () => {
    const importador = new GprImportador();
    expect(importador.esCompatible('cancion.gp5')).toBe(true);
    expect(importador.esCompatible('CANCION.GPX')).toBe(true);
    expect(importador.esCompatible('cancion.gp')).toBe(true);
    expect(importador.esCompatible('cancion.psarc')).toBe(false);
    expect(importador.esCompatible('ejercicio.json')).toBe(false);
    expect(importador.esCompatible('sinExtension')).toBe(false);
  });

  it('rechaza .psarc con mensaje en español', async () => {
    await expect(new GprImportador().importar(new ArrayBuffer(8), 'tema.psarc')).rejects.toThrow(/Rocksmith/);
  });

  it('rechaza contenido inválido', async () => {
    await expect(new GprImportador().importar(new Uint8Array([1, 2, 3, 4]).buffer, 'roto.gp5')).rejects.toThrow(
      /no es un Guitar Pro válido/,
    );
  });

  it('carga un .gp, elige la guitarra y convierte con repeticiones y drop D', async () => {
    const importador = new GprImportador();
    const buf = crearArchivoGp();
    const cargado = await importador.cargarPartitura(buf, 'ida.gp');
    expect(cargado.titulo).toBe('Ida y vuelta');
    expect(cargado.artista).toBe('Autor');
    expect(cargado.buf).toBe(buf);
    expect(cargado.bpm).toBe(90);
    expect(cargado.pistas.map((p) => p.esGuitarra)).toEqual([false, true]);
    expect(cargado.idxPstGuitarra).toBe(1);
    expect(cargado.ej.afinacion?.midiCuerdas).toEqual([64, 59, 55, 50, 45, 38]);
    expect(cargado.ej.notas.map((n) => [n.nombre, n.oct, n.cur, n.trs, n.tiempo])).toEqual([
      ['Re', 2, 6, 0, 0],
      ['Mi', 2, 6, 2, 1],
      ['Mi', 4, 1, 0, 2],
      ['Re', 4, 2, 3, 4],
      ['Re', 4, 2, 3, 8],
    ]);

    const bajo = importador.convertirPista(0);
    expect(bajo.notas[0]).toMatchObject({ nombre: 'Mi', oct: 1, cur: 4, trs: 0 });
  });

  it('convertirPista sin partitura cargada lanza error', () => {
    expect(() => new GprImportador().convertirPista(0)).toThrow(/Primero carga/);
  });
});

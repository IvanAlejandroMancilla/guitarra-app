import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import {
  gpr_convertirAfinacion,
  gpr_convertirDedo,
  gpr_convertirPista,
  gpr_convertirTicksAPulsos,
  gpr_listarPistas,
  gpr_obtenerBpm,
} from './gpr_adaptador';
import { GPR_TICKS_POR_PULSO } from './gpr_constantes';
import type { IGprCompasTocado } from './gpr_tipos';

/**
 * Partitura de prueba en AlphaTex (en AlphaTex la cuerda 1 es la más aguda; en el modelo, la más grave).
 * Compás 1: Mi2 (6ª al aire), Sol2 (6ª traste 3), acorde [Mi4, La3] y silencio.
 * Compás 2 (inicio de repetición): La4 blanca ligada a otra blanca.
 * Compás 3: nota muerta, Si3, Mi4 blanca. Compás 4 (3/4): dos Mi4. Compás 5: Mi4, fin de repetición (×2).
 */
const PRUEBA_TEX = String.raw`
\title "Prueba"
\artist "Autor"
\tempo 120
\track "Guitarra"
\instrument 25
\tuning (E4 B3 G3 D3 A2 E2)
0.6.4 3.6.4 (0.1 2.3).4 r.4 | \ro 5.1.2 -.1.2 | :4 x.2 0.2 :2 0.1 | \ts 3 4 0.1.4 0.1.4 | \rc 2 0.1.4 |
\track "Bajo"
\instrument 33
\tuning (G2 D2 A1 E1)
0.4.1 | 0.4.1 | 0.4.1 | 0.4.2. | 0.4.2. |
`;

const crearScore = (): alphaTab.model.Score => alphaTab.importer.ScoreLoader.loadAlphaTex(PRUEBA_TEX);

const listarCompasesTocados = (score: alphaTab.model.Score): IGprCompasTocado[] => {
  const generador = new alphaTab.midi.MidiFileGenerator(
    score,
    new alphaTab.Settings(),
    new alphaTab.midi.AlphaSynthMidiFileHandler(new alphaTab.midi.MidiFile()),
  );
  generador.generate();
  return generador.tickLookup.masterBars.map((lookup) => ({
    idxCompas: lookup.masterBar.index,
    inicioTicks: lookup.start,
  }));
};

describe('gpr_convertirTicksAPulsos', () => {
  it('convierte ticks de alphaTab (960 por negra) a pulsos', () => {
    expect(GPR_TICKS_POR_PULSO).toBe(960);
    expect(gpr_convertirTicksAPulsos(0)).toBe(0);
    expect(gpr_convertirTicksAPulsos(960)).toBe(1);
    expect(gpr_convertirTicksAPulsos(3840)).toBe(4);
    expect(gpr_convertirTicksAPulsos(480)).toBe(0.5);
    expect(gpr_convertirTicksAPulsos(320)).toBeCloseTo(1 / 3, 10);
  });
});

describe('gpr_convertirAfinacion', () => {
  it('conserva el orden de alphaTab (idx 0 = cuerda más aguda = cuerda 1)', () => {
    const afin = gpr_convertirAfinacion([64, 59, 55, 50, 45, 40]);
    expect(afin.id).toBe('personalizada');
    expect(afin.midiCuerdas).toEqual([64, 59, 55, 50, 45, 40]);
    expect(afin.nombre).toBe('Mi La Re Sol Si Mi');
  });

  it('nombra afinaciones alternativas de grave a agudo', () => {
    expect(gpr_convertirAfinacion([64, 59, 55, 50, 45, 38]).nombre).toBe('Re La Re Sol Si Mi');
  });

  it('no comparte el arreglo de entrada', () => {
    const tunings = [64, 59, 55, 50, 45, 40];
    const afin = gpr_convertirAfinacion(tunings);
    tunings[0] = 0;
    expect(afin.midiCuerdas[0]).toBe(64);
  });
});

describe('gpr_listarPistas / gpr_obtenerBpm', () => {
  it('lista pistas con afinación y detecta la guitarra', () => {
    const score = crearScore();
    const pistas = gpr_listarPistas(score);
    expect(pistas).toHaveLength(2);
    expect(pistas[0]).toMatchObject({
      idx: 0,
      nombre: 'Guitarra',
      esGuitarra: true,
      esPercusion: false,
      cantCuerdas: 6,
      programaMidi: 25,
    });
    expect(pistas[0]?.afinacion?.midiCuerdas).toEqual([64, 59, 55, 50, 45, 40]);
    expect(pistas[1]).toMatchObject({ idx: 1, esGuitarra: false, cantCuerdas: 4, programaMidi: 33 });
    expect(gpr_obtenerBpm(score)).toBe(120);
  });
});

describe('gpr_convertirPista', () => {
  it('convierte cuerda/traste a nombre/octava con cur 1 = Mi agudo (orden lineal)', () => {
    const ej = gpr_convertirPista(crearScore(), 0);
    expect(ej.bpm).toBe(120);
    expect(ej.pulsosPorCompas).toBe(4);
    expect(ej.afinacion?.midiCuerdas).toEqual([64, 59, 55, 50, 45, 40]);
    expect(ej.titulo).toBe('Prueba (Guitarra)');
    expect(ej.notas.map((n) => [n.nombre, n.oct, n.cur, n.trs, n.tiempo, n.dur])).toEqual([
      ['Mi', 2, 6, 0, 0, 1],
      ['Sol', 2, 6, 3, 1, 1],
      // Acorde: solo la más aguda (Mi4 en la 1ª al aire; se descarta La3).
      ['Mi', 4, 1, 0, 2, 1],
      // Ligadura: una sola nota de 2 + 2 pulsos; el destino se ignora.
      ['La', 4, 1, 5, 4, 4],
      // La nota muerta (pulso 8) se ignora.
      ['Si', 3, 2, 0, 9, 1],
      ['Mi', 4, 1, 0, 10, 2],
      ['Mi', 4, 1, 0, 12, 1],
      ['Mi', 4, 1, 0, 13, 1],
      ['Mi', 4, 1, 0, 15, 1],
    ]);
  });

  it('despliega repeticiones con el orden de reproducción de alphaTab', () => {
    const score = crearScore();
    const ej = gpr_convertirPista(score, 0, listarCompasesTocados(score));
    const tiempos = ej.notas.map((n) => n.tiempo);
    expect(tiempos).toEqual([0, 1, 2, 4, 9, 10, 12, 13, 15, 18, 23, 24, 26, 27, 29]);
  });

  it('convierte el bajo de 4 cuerdas', () => {
    const ej = gpr_convertirPista(crearScore(), 1);
    expect(ej.notas[0]).toMatchObject({ nombre: 'Mi', oct: 1, cur: 4, trs: 0, tiempo: 0, dur: 4 });
  });

  it('lanza RangeError si la pista no existe', () => {
    expect(() => gpr_convertirPista(crearScore(), 7)).toThrow(RangeError);
  });
});

describe('gpr_convertirDedo', () => {
  it('traste 0 → 0 (al aire) sin importar la digitación', () => {
    expect(gpr_convertirDedo(-2, 0)).toBe(0);
    expect(gpr_convertirDedo(3, 0)).toBe(0);
  });

  it('índice..meñique → 1..4', () => {
    expect(gpr_convertirDedo(alphaTab.model.Fingers.IndexFinger, 5)).toBe(1);
    expect(gpr_convertirDedo(alphaTab.model.Fingers.MiddleFinger, 5)).toBe(2);
    expect(gpr_convertirDedo(alphaTab.model.Fingers.AnnularFinger, 5)).toBe(3);
    expect(gpr_convertirDedo(alphaTab.model.Fingers.LittleFinger, 5)).toBe(4);
  });

  it('pulgar, desconocido o sin dedo → undefined', () => {
    expect(gpr_convertirDedo(alphaTab.model.Fingers.Thumb, 3)).toBeUndefined();
    expect(gpr_convertirDedo(alphaTab.model.Fingers.Unknown, 3)).toBeUndefined();
    expect(gpr_convertirDedo(alphaTab.model.Fingers.NoOrDead, 3)).toBeUndefined();
  });

  it('gpr_convertirPista asigna INota.dedo desde AlphaTex (lf 1 = pulgar … lf 5 = meñique)', () => {
    const score = alphaTab.importer.ScoreLoader.loadAlphaTex(String.raw`
\track "Guitarra"
\instrument 25
\tuning (E4 B3 G3 D3 A2 E2)
:4 0.6 5.6{lf 2} 7.6{lf 5} 3.6{lf 1} | :4 2.6 4.6{lf 4} 6.6{lf 3} r
`);
    const dedos = gpr_convertirPista(score, 0).notas.map((nota) => nota.dedo);
    expect(dedos).toEqual([0, 1, 4, undefined, undefined, 3, 2]);
  });
});

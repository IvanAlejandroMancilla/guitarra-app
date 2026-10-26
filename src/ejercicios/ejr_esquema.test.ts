import { describe, expect, it } from 'vitest';
import { cor_validarDedo } from '../core/cor_digitacion';
import { cor_calcularNotaCuerda } from '../core/cor_notas';
import { cor_validarRegistro } from '../core/cor_validacion';
import type { IAfinacion } from '../core/tipos';
import { ejr_validarEjercicio } from './ejr_esquema';

const afinEstandar: IAfinacion = { id: 'estandar', nombre: 'Estándar', midiCuerdas: [64, 59, 55, 50, 45, 40] };

const ejMinimo = {
  titulo: 'Prueba',
  bpm: 80,
  modo: 'estricto',
  notas: [
    { nombre: 'Re', oct: 3, cur: 4, trs: 0, tiempo: 1 },
    { nombre: 'Do', oct: 3, cur: 5, trs: 3, tiempo: 0 },
  ],
};

describe('ejr_validarEjercicio', () => {
  it('acepta el formato de docs/arquitectura.md y ordena por tiempo', () => {
    const resultado = ejr_validarEjercicio(ejMinimo);
    expect(resultado.esValido).toBe(true);
    if (!resultado.esValido) return;
    expect(resultado.valor.notas.map((nota) => nota.nombre)).toEqual(['Do', 'Re']);
    expect(resultado.valor.modo).toBe('estricto');
  });

  it('normaliza nombres anglosajones y bemoles; modo por defecto flexible', () => {
    const resultado = ejr_validarEjercicio({
      titulo: 'X',
      bpm: 60,
      notas: [
        { nombre: 'Bb', oct: 3, tiempo: 0 },
        { nombre: 'reb', oct: 4, tiempo: 1 },
      ],
    });
    expect(resultado.esValido).toBe(true);
    if (!resultado.esValido) return;
    expect(resultado.valor.modo).toBe('flexible');
    expect(resultado.valor.notas.map((nota) => nota.nombre)).toEqual(['La#', 'Do#']);
  });

  it('rechaza valores inválidos con mensajes en español', () => {
    const resultado = ejr_validarEjercicio({
      titulo: '',
      bpm: 0,
      modo: 'rapido',
      notas: [{ nombre: 'Zeta', oct: 3.5, cur: 7, trs: -1, tiempo: -2, dur: 0 }],
    });
    expect(resultado.esValido).toBe(false);
    if (resultado.esValido) return;
    const texto = resultado.errores.join('\n');
    for (const campo of ['titulo', 'bpm', 'modo', 'notas[0].nombre', 'notas[0].oct', 'notas[0].cur', 'notas[0].trs', 'notas[0].tiempo', 'notas[0].dur']) {
      expect(texto).toContain(campo);
    }
  });

  it('rechaza no-objetos y listas de notas vacías', () => {
    expect(ejr_validarEjercicio(null).esValido).toBe(false);
    expect(ejr_validarEjercicio([1, 2]).esValido).toBe(false);
    expect(ejr_validarEjercicio({ titulo: 'X', bpm: 60, notas: [] }).esValido).toBe(false);
  });

  it('valida la afinación opcional', () => {
    const conAfin = { ...ejMinimo, afinacion: { id: 'dropD', nombre: 'Drop D', midiCuerdas: [64, 59, 55, 50, 45, 38] } };
    const resultado = ejr_validarEjercicio(conAfin);
    expect(resultado.esValido && resultado.valor.afinacion?.id).toBe('dropD');
    expect(ejr_validarEjercicio({ ...ejMinimo, afinacion: { midiCuerdas: [1, 2] } }).esValido).toBe(false);
  });

  it('valida el dedo: 0..4, requiere traste y 0 solo al aire', () => {
    const conDedo = (nota: Record<string, unknown>) => ({ titulo: 'X', bpm: 60, notas: [{ nombre: 'Do', oct: 3, tiempo: 0, ...nota }] });
    const valido = ejr_validarEjercicio(conDedo({ cur: 5, trs: 3, dedo: 3 }));
    expect(valido.esValido && valido.valor.notas[0]?.dedo).toBe(3);
    const alAire = ejr_validarEjercicio({ titulo: 'X', bpm: 60, notas: [{ nombre: 'La', oct: 2, cur: 5, trs: 0, dedo: 0, tiempo: 0 }] });
    expect(alAire.esValido && alAire.valor.notas[0]?.dedo).toBe(0);
    const sinDedo = ejr_validarEjercicio(conDedo({ cur: 5, trs: 3 }));
    expect(sinDedo.esValido && sinDedo.valor.notas[0]?.dedo).toBeUndefined();
    for (const invalido of [
      { cur: 5, trs: 3, dedo: 5 },
      { cur: 5, trs: 3, dedo: -1 },
      { cur: 5, trs: 3, dedo: 1.5 },
      { cur: 5, trs: 3, dedo: '2' },
      { dedo: 2 },
      { cur: 5, trs: 3, dedo: 0 },
      { cur: 5, trs: 0, dedo: 2 },
    ]) {
      const resultado = ejr_validarEjercicio(conDedo(invalido));
      expect(resultado.esValido).toBe(false);
      if (!resultado.esValido) expect(resultado.errores.join('\n')).toContain('notas[0].dedo');
    }
  });

  describe('ejercicios de public/ejercicios', () => {
    const modulos = import.meta.glob<unknown>('../../public/ejercicios/*.json', { eager: true, import: 'default' });
    const ejercicios: Record<string, unknown> = {};
    let indice: unknown = null;
    for (const [ruta, contenido] of Object.entries(modulos)) {
      const archivo = ruta.slice(ruta.lastIndexOf('/') + 1);
      if (archivo === 'indice.json') indice = contenido;
      else ejercicios[archivo] = contenido;
    }
    const entradas: Record<string, unknown>[] = [];
    if (cor_validarRegistro(indice) && Array.isArray(indice.entradas)) {
      for (const entrada of indice.entradas) if (cor_validarRegistro(entrada)) entradas.push(entrada);
    }

    it('el índice lista todos los archivos, con id = nombre de archivo y niveles en orden', () => {
      expect(entradas.length).toBe(Object.keys(ejercicios).length);
      let nivelAnt = -Infinity;
      for (const entrada of entradas) {
        expect(Object.keys(ejercicios)).toContain(entrada.archivo);
        expect(`${String(entrada.id)}.json`).toBe(entrada.archivo);
        expect(String(entrada.id)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(typeof entrada.descripcion).toBe('string');
        expect(typeof entrada.nivel).toBe('number');
        const nivel = Number(entrada.nivel);
        expect(nivel).toBeGreaterThanOrEqual(nivelAnt);
        nivelAnt = nivel;
      }
    });

    for (const [archivo, contenido] of Object.entries(ejercicios)) {
      it(`${archivo} es válido, con dedo, y cuerda/traste coinciden con nombre/octava (afinación estándar)`, () => {
        const resultado = ejr_validarEjercicio(contenido);
        if (!resultado.esValido) throw new Error(resultado.errores.join('\n'));
        for (const nota of resultado.valor.notas) {
          if (nota.cur === undefined || nota.trs === undefined) {
            expect(nota.cur).toBeUndefined();
            expect(nota.trs).toBeUndefined();
            expect(nota.dedo).toBeUndefined();
            continue;
          }
          expect(cor_validarDedo(nota.dedo)).toBe(true);
          const altura = cor_calcularNotaCuerda(nota.cur, nota.trs, afinEstandar);
          expect({ nombre: altura.nombre, oct: altura.oct }).toEqual({ nombre: nota.nombre, oct: nota.oct });
        }
      });
    }

    it('encontrar-nota: modo flexible y notas solo con nombre', () => {
      const resultado = ejr_validarEjercicio(ejercicios['encontrar-nota.json']);
      if (!resultado.esValido) throw new Error(resultado.errores.join('\n'));
      expect(resultado.valor.modo).toBe('flexible');
      expect(new Set(resultado.valor.notas.map((nota) => nota.nombre))).toEqual(new Set(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']));
    });
  });
});

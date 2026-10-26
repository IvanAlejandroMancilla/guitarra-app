/** Descriptores visibles de los 8 bloques del mezclador (orden visual = `COR_ORDEN_BLOQUES_EFX`). */
import type { TUiDescriptoresEfx } from './ui_tipos';

export const UI_BLOQUES_EFX: TUiDescriptoresEfx = Object.freeze({
  fx1: {
    id: 'fx1',
    titulo: 'FX1 · Dinámica',
    modelos: [
      { valor: 'compuerta', etiqueta: 'Compuerta de ruido' },
      { valor: 'compresor', etiqueta: 'Compresor' },
    ],
    parametros: [
      { clave: 'umbral', etiqueta: 'Umbral' },
      { clave: 'relacion', etiqueta: 'Relación', modelos: ['compresor'] },
      { clave: 'ataque', etiqueta: 'Ataque' },
      { clave: 'liberacion', etiqueta: 'Liberación' },
      { clave: 'nivel', etiqueta: 'Nivel' },
    ],
  },
  fx2: {
    id: 'fx2',
    titulo: 'FX2 · Drive / Wah',
    modelos: [
      { valor: 'overdrive', etiqueta: 'Overdrive' },
      { valor: 'distorsion', etiqueta: 'Distorsión' },
      { valor: 'fuzz', etiqueta: 'Fuzz' },
      { valor: 'wahAuto', etiqueta: 'Wah automático' },
    ],
    parametros: [
      { clave: 'gan', etiqueta: 'Ganancia', modelos: ['overdrive', 'distorsion', 'fuzz'] },
      { clave: 'sensibilidad', etiqueta: 'Sensibilidad', modelos: ['wahAuto'] },
      { clave: 'velocidad', etiqueta: 'Velocidad', modelos: ['wahAuto'] },
      { clave: 'tono', etiqueta: 'Tono' },
      { clave: 'nivel', etiqueta: 'Nivel' },
    ],
  },
  amp: {
    id: 'amp',
    titulo: 'AMP · Amplificador',
    modelos: [
      { valor: 'limpio', etiqueta: 'Limpio' },
      { valor: 'crunch', etiqueta: 'Crunch' },
      { valor: 'altaGanancia', etiqueta: 'Alta ganancia' },
      { valor: 'bajo', etiqueta: 'Bajo' },
    ],
    parametros: [
      { clave: 'gan', etiqueta: 'Ganancia' },
      { clave: 'graves', etiqueta: 'Graves' },
      { clave: 'medios', etiqueta: 'Medios' },
      { clave: 'agudos', etiqueta: 'Agudos' },
      { clave: 'nivel', etiqueta: 'Nivel' },
    ],
  },
  cab: {
    id: 'cab',
    titulo: 'CAB · Gabinete',
    modelos: [
      { valor: 'combo1x12', etiqueta: 'Combo 1×12' },
      { valor: 'britanico2x12', etiqueta: 'Británico 2×12' },
      { valor: 'cerrado4x12', etiqueta: 'Cerrado 4×12' },
      { valor: 'bajo4x10', etiqueta: 'Bajo 4×10' },
      { valor: 'ir', etiqueta: 'IR propio (.wav)' },
    ],
    parametros: [
      { clave: 'filtroGraves', etiqueta: 'Corte de graves' },
      { clave: 'filtroAgudos', etiqueta: 'Corte de agudos' },
      { clave: 'nivel', etiqueta: 'Nivel' },
    ],
  },
  del: {
    id: 'del',
    titulo: 'DEL · Delay',
    modelos: [
      { valor: 'digital', etiqueta: 'Digital' },
      { valor: 'analogico', etiqueta: 'Analógico' },
      { valor: 'modulado', etiqueta: 'Con modulación' },
    ],
    parametros: [
      { clave: 'tiempo', etiqueta: 'Tiempo' },
      { clave: 'realimentacion', etiqueta: 'Repeticiones' },
      { clave: 'mezcla', etiqueta: 'Mezcla' },
      { clave: 'profundidad', etiqueta: 'Profundidad', modelos: ['modulado'] },
      { clave: 'velocidad', etiqueta: 'Velocidad', modelos: ['modulado'] },
    ],
  },
  mod: {
    id: 'mod',
    titulo: 'MOD · Modulación',
    modelos: [
      { valor: 'chorus', etiqueta: 'Chorus' },
      { valor: 'phaser', etiqueta: 'Phaser' },
      { valor: 'flanger', etiqueta: 'Flanger' },
      { valor: 'tremolo', etiqueta: 'Trémolo' },
      { valor: 'vibrato', etiqueta: 'Vibrato' },
    ],
    parametros: [
      { clave: 'velocidad', etiqueta: 'Velocidad' },
      { clave: 'profundidad', etiqueta: 'Profundidad' },
      { clave: 'realimentacion', etiqueta: 'Realimentación', modelos: ['phaser', 'flanger'] },
      { clave: 'mezcla', etiqueta: 'Mezcla' },
    ],
  },
  rev: {
    id: 'rev',
    titulo: 'REV · Reverb',
    modelos: [
      { valor: 'sala', etiqueta: 'Sala' },
      { valor: 'placa', etiqueta: 'Placa' },
      { valor: 'hall', etiqueta: 'Hall' },
      { valor: 'resorte', etiqueta: 'Resorte' },
    ],
    parametros: [
      { clave: 'decaimiento', etiqueta: 'Decaimiento' },
      { clave: 'preRetardo', etiqueta: 'Pre-retardo' },
      { clave: 'tono', etiqueta: 'Tono' },
      { clave: 'mezcla', etiqueta: 'Mezcla' },
    ],
  },
  eq: {
    id: 'eq',
    titulo: 'EQ · Ecualizador',
    modelos: [{ valor: 'tresBandas', etiqueta: '3 bandas' }],
    parametros: [
      { clave: 'graves', etiqueta: 'Graves' },
      { clave: 'medios', etiqueta: 'Medios' },
      { clave: 'agudos', etiqueta: 'Agudos' },
      { clave: 'nivel', etiqueta: 'Volumen' },
    ],
  },
});

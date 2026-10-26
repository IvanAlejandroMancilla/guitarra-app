import { describe, expect, it } from 'vitest';
import type { IEfxBloques, IEfxPreset } from '../core/cor_efectos';
import { EfxBiblioteca } from './efx_biblioteca';
import { EFX_ID_PRESET_DEF, EFX_MAX_PRESETS_USUARIO, EFX_PREFIJO_FABRICA, EFX_PREFIJO_USUARIO } from './efx_constantes';
import { EFX_BLOQUES_DEF, EFX_PRESETS_FABRICA } from './efx_presetsFabrica';
import type { IEfxAlmacenPresets } from './efx_tipos';

const crearAlmacenFalso = (iniciales: IEfxPreset[] = []): IEfxAlmacenPresets & { guardados: IEfxPreset[][] } => {
  const guardados: IEfxPreset[][] = [];
  return {
    guardados,
    cargar: () => structuredClone(iniciales),
    guardar: (presets) => {
      guardados.push(structuredClone([...presets]));
    },
  };
};

const crearBloques = (): IEfxBloques => {
  const bloques = structuredClone(EFX_BLOQUES_DEF) as IEfxBloques;
  bloques.amp = { esActivo: true, modelo: 'crunch', parametros: { ...bloques.amp.parametros, gan: 0.8 } };
  return bloques;
};

describe('EfxBiblioteca', () => {
  it('lista fábrica primero y luego los del usuario', () => {
    const propio: IEfxPreset = { id: 'usuario:a', nombre: 'Propio', bloques: crearBloques() };
    const biblioteca = new EfxBiblioteca(crearAlmacenFalso([propio]), EFX_PRESETS_FABRICA);
    const lista = biblioteca.listarPresets();
    expect(lista).toHaveLength(EFX_PRESETS_FABRICA.length + 1);
    expect(lista[0]).toEqual({ id: EFX_ID_PRESET_DEF, nombre: 'Limpio brillante', esFabrica: true });
    expect(lista[lista.length - 1]).toEqual({ id: 'usuario:a', nombre: 'Propio', esFabrica: false });
  });

  it('los de fábrica son de solo lectura', () => {
    const almacen = crearAlmacenFalso();
    const biblioteca = new EfxBiblioteca(almacen, EFX_PRESETS_FABRICA);
    expect(biblioteca.guardarPreset(EFX_ID_PRESET_DEF, crearBloques())).toBeNull();
    expect(biblioteca.renombrarPreset(EFX_ID_PRESET_DEF, 'Otro')).toBe(false);
    expect(biblioteca.borrarPreset(EFX_ID_PRESET_DEF)).toBe(false);
    expect(biblioteca.obtenerPreset(EFX_ID_PRESET_DEF)?.nombre).toBe('Limpio brillante');
    expect(almacen.guardados).toHaveLength(0);
  });

  it('devuelve copias: modificar lo obtenido no cambia la biblioteca', () => {
    const biblioteca = new EfxBiblioteca(crearAlmacenFalso(), EFX_PRESETS_FABRICA);
    const copia = biblioteca.obtenerPreset(EFX_ID_PRESET_DEF);
    if (copia === null) throw new Error('falta el preset');
    copia.bloques.amp.parametros.gan = 0.99;
    expect(biblioteca.obtenerPreset(EFX_ID_PRESET_DEF)?.bloques.amp.parametros.gan).not.toBe(0.99);
  });

  it('guardar como, guardar, renombrar y borrar persisten', () => {
    const almacen = crearAlmacenFalso();
    const biblioteca = new EfxBiblioteca(almacen, EFX_PRESETS_FABRICA);
    const nuevo = biblioteca.guardarPresetComo('  Mi tono  ', crearBloques());
    expect(nuevo.id.startsWith(EFX_PREFIJO_USUARIO)).toBe(true);
    expect(nuevo.nombre).toBe('Mi tono');
    expect(almacen.guardados.at(-1)).toHaveLength(1);

    const bloques = crearBloques();
    bloques.eq.parametros.nivel = 0.3;
    expect(biblioteca.guardarPreset(nuevo.id, bloques)?.bloques.eq.parametros.nivel).toBe(0.3);
    expect(almacen.guardados.at(-1)?.[0]?.bloques.eq.parametros.nivel).toBe(0.3);

    expect(biblioteca.renombrarPreset(nuevo.id, 'Renombrado')).toBe(true);
    expect(biblioteca.obtenerPreset(nuevo.id)?.nombre).toBe('Renombrado');
    expect(biblioteca.renombrarPreset(nuevo.id, '   ')).toBe(false);

    expect(biblioteca.borrarPreset(nuevo.id)).toBe(true);
    expect(biblioteca.obtenerPreset(nuevo.id)).toBeNull();
    expect(almacen.guardados.at(-1)).toEqual([]);
    expect(biblioteca.borrarPreset(nuevo.id)).toBe(false);
  });

  it('evita nombres repetidos (también con los de fábrica)', () => {
    const biblioteca = new EfxBiblioteca(crearAlmacenFalso(), EFX_PRESETS_FABRICA);
    expect(biblioteca.guardarPresetComo('Rock', crearBloques()).nombre).toBe('Rock (2)');
    expect(biblioteca.guardarPresetComo('rock', crearBloques()).nombre).toBe('rock (3)');
    const unico = biblioteca.guardarPresetComo('Único', crearBloques());
    expect(biblioteca.renombrarPreset(unico.id, 'Único')).toBe(true);
    expect(biblioteca.obtenerPreset(unico.id)?.nombre).toBe('Único');
  });

  it('respeta el máximo de presets propios', () => {
    const biblioteca = new EfxBiblioteca(crearAlmacenFalso(), EFX_PRESETS_FABRICA);
    for (let i = 0; i < EFX_MAX_PRESETS_USUARIO; i++) biblioteca.guardarPresetComo(`P${i}`, crearBloques());
    expect(() => biblioteca.guardarPresetComo('Uno más', crearBloques())).toThrow(/borra alguno/);
    expect(biblioteca.importarPresets([{ id: '', nombre: 'X', bloques: crearBloques() }])).toBe(0);
  });

  it('importa con ids nuevos si faltan o chocan y exporta solo los del usuario', () => {
    const existente: IEfxPreset = { id: 'usuario:a', nombre: 'A', bloques: crearBloques() };
    const biblioteca = new EfxBiblioteca(crearAlmacenFalso([existente]), EFX_PRESETS_FABRICA);
    const cant = biblioteca.importarPresets([
      { id: 'usuario:a', nombre: 'A', bloques: crearBloques() },
      { id: `${EFX_PREFIJO_FABRICA}rock`, nombre: 'Rock', bloques: crearBloques() },
      { id: '', nombre: 'Sin id', bloques: crearBloques() },
      { id: 'usuario:b', nombre: 'B', bloques: crearBloques() },
    ]);
    expect(cant).toBe(4);
    const exportados = biblioteca.exportarPresets();
    expect(exportados).toHaveLength(5);
    expect(new Set(exportados.map((preset) => preset.id)).size).toBe(5);
    expect(exportados.every((preset) => preset.id.startsWith(EFX_PREFIJO_USUARIO))).toBe(true);
    expect(exportados.map((preset) => preset.nombre)).toEqual(['A', 'A (2)', 'Rock (2)', 'Sin id', 'B']);
    expect(exportados.some((preset) => preset.id === 'usuario:b')).toBe(true);
  });

  it('repara ids inválidos o repetidos de lo guardado', () => {
    const almacen = crearAlmacenFalso([
      { id: '', nombre: 'Sin id', bloques: crearBloques() },
      { id: 'usuario:x', nombre: 'X', bloques: crearBloques() },
      { id: 'usuario:x', nombre: 'X bis', bloques: crearBloques() },
    ]);
    const biblioteca = new EfxBiblioteca(almacen, EFX_PRESETS_FABRICA);
    const ids = biblioteca.exportarPresets().map((preset) => preset.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => id.startsWith(EFX_PREFIJO_USUARIO))).toBe(true);
    expect(almacen.guardados).toHaveLength(1);
  });
});

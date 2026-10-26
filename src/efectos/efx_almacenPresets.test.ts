import { describe, expect, it, vi } from 'vitest';
import type { IEfxBloques, IEfxPreset } from '../core/cor_efectos';
import { EfxAlmacenPresets } from './efx_almacenPresets';
import { EFX_CLAVE_ALMACEN, EFX_VERSION_PRESETS } from './efx_constantes';
import { EFX_BLOQUES_DEF } from './efx_presetsFabrica';

const crearStorageFalso = (esFallido = false): Storage => {
  const datos = new Map<string, string>();
  const verificar = (): void => {
    if (esFallido) throw new Error('SecurityError simulado');
  };
  return {
    get length(): number {
      return datos.size;
    },
    clear: (): void => {
      verificar();
      datos.clear();
    },
    getItem: (clave: string): string | null => {
      verificar();
      return datos.get(clave) ?? null;
    },
    key: (idx: number): string | null => [...datos.keys()][idx] ?? null,
    removeItem: (clave: string): void => {
      verificar();
      datos.delete(clave);
    },
    setItem: (clave: string, valor: string): void => {
      verificar();
      datos.set(clave, valor);
    },
  };
};

const crearBloques = (): IEfxBloques => {
  const bloques = structuredClone(EFX_BLOQUES_DEF) as IEfxBloques;
  bloques.amp = { esActivo: true, modelo: 'crunch', parametros: { ...bloques.amp.parametros, gan: 0.8 } };
  return bloques;
};

describe('EfxAlmacenPresets', () => {
  it('devuelve [] si no hay nada guardado', () => {
    expect(new EfxAlmacenPresets(crearStorageFalso()).cargar()).toEqual([]);
  });

  it('guarda con versión y vuelve a cargar', () => {
    const storage = crearStorageFalso();
    const almacen = new EfxAlmacenPresets(storage);
    const preset: IEfxPreset = { id: 'usuario:1', nombre: 'Uno', bloques: crearBloques() };
    almacen.guardar([preset]);
    expect(JSON.parse(storage.getItem(EFX_CLAVE_ALMACEN) ?? '')).toMatchObject({ version: EFX_VERSION_PRESETS });
    expect(almacen.cargar()).toEqual([preset]);
  });

  it('descarta solo los presets dañados', () => {
    const storage = crearStorageFalso();
    storage.setItem(EFX_CLAVE_ALMACEN, JSON.stringify({ version: 1, presets: [{ id: 'usuario:1', nombre: 'Bueno' }, 42, { id: 'x' }] }));
    const presets = new EfxAlmacenPresets(storage).cargar();
    expect(presets.map((preset) => preset.nombre)).toEqual(['Bueno']);
  });

  it('JSON dañado o almacenamiento bloqueado: no lanza', () => {
    const avisar = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = crearStorageFalso();
    storage.setItem(EFX_CLAVE_ALMACEN, '{roto');
    expect(new EfxAlmacenPresets(storage).cargar()).toEqual([]);
    const bloqueado = new EfxAlmacenPresets(crearStorageFalso(true));
    expect(bloqueado.cargar()).toEqual([]);
    expect(() => bloqueado.guardar([])).not.toThrow();
    expect(avisar).toHaveBeenCalledTimes(3);
    avisar.mockRestore();
  });
});

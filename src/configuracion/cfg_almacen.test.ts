import { describe, expect, it, vi } from 'vitest';
import { CfgAlmacen } from './cfg_almacen';
import { CFG_CLAVE_ALMACEN, CFG_VERSION } from './cfg_constantes';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

/** Storage en memoria. Con `esFallido` todas las operaciones lanzan (como un localStorage bloqueado). */
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

describe('CfgAlmacen', () => {
  it('devuelve null si no hay nada guardado', () => {
    expect(new CfgAlmacen(crearStorageFalso()).cargar()).toBeNull();
  });

  it('guarda con versión y vuelve a cargar', () => {
    const storage = crearStorageFalso();
    const almacen = new CfgAlmacen(storage);
    almacen.guardar({ ...CFG_VALORES_DEF, bpm: 111 });
    const texto = storage.getItem(CFG_CLAVE_ALMACEN);
    expect(texto).not.toBeNull();
    expect(JSON.parse(texto ?? '')).toMatchObject({ version: CFG_VERSION, cfg: { bpm: 111 } });
    expect(almacen.cargar()?.bpm).toBe(111);
  });

  it('valida lo cargado: acota y descarta valores manipulados', () => {
    const storage = crearStorageFalso();
    storage.setItem(CFG_CLAVE_ALMACEN, JSON.stringify({ version: CFG_VERSION, cfg: { bpm: 5000, vista: 'x' } }));
    const cfg = new CfgAlmacen(storage).cargar();
    expect(cfg?.bpm).toBe(300);
    expect(cfg?.vista).toBe('rocksmith');
  });

  it('migra una configuración v1 guardada con vista "3d"', () => {
    const storage = crearStorageFalso();
    storage.setItem(CFG_CLAVE_ALMACEN, JSON.stringify({ version: 1, cfg: { vista: '3d', bpm: 70 } }));
    const cfg = new CfgAlmacen(storage).cargar();
    expect(cfg?.vista).toBe('guitarHero');
    expect(cfg?.bpm).toBe(70);
    expect(cfg?.volMonitor).toBe(0.5);
  });

  it('devuelve null ante JSON dañado', () => {
    const storage = crearStorageFalso();
    storage.setItem(CFG_CLAVE_ALMACEN, '{roto');
    const avisar = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(new CfgAlmacen(storage).cargar()).toBeNull();
    avisar.mockRestore();
  });

  it('borra lo guardado', () => {
    const storage = crearStorageFalso();
    const almacen = new CfgAlmacen(storage);
    almacen.guardar(CFG_VALORES_DEF);
    almacen.borrar();
    expect(storage.getItem(CFG_CLAVE_ALMACEN)).toBeNull();
  });

  it('no lanza si el almacenamiento falla', () => {
    const avisar = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const almacen = new CfgAlmacen(crearStorageFalso(true));
    expect(() => almacen.guardar(CFG_VALORES_DEF)).not.toThrow();
    expect(() => almacen.borrar()).not.toThrow();
    expect(almacen.cargar()).toBeNull();
    expect(avisar).toHaveBeenCalledTimes(3);
    avisar.mockRestore();
  });
});

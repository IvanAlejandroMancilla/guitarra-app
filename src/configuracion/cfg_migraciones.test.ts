import { describe, expect, it } from 'vitest';
import { CFG_VERSION } from './cfg_constantes';
import { CFG_MIGRACIONES, cfg_migrarConfig } from './cfg_migraciones';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

describe('CFG_MIGRACIONES', () => {
  it('tiene una migración para cada versión anterior a la actual', () => {
    for (let version = 0; version < CFG_VERSION; version++) {
      expect(CFG_MIGRACIONES[version]).toBeTypeOf('function');
    }
  });
});

describe('cfg_migrarConfig', () => {
  it('lee el formato actual con envoltorio', () => {
    const cfg = cfg_migrarConfig({ version: CFG_VERSION, cfg: { ...CFG_VALORES_DEF, bpm: 95 } });
    expect(cfg.bpm).toBe(95);
  });

  it('migra la versión 0 (objeto plano sin envoltorio)', () => {
    const cfg = cfg_migrarConfig({ bpm: 120, esZurdo: true });
    expect(cfg.bpm).toBe(120);
    expect(cfg.esZurdo).toBe(true);
    expect(cfg.tolMs).toBe(CFG_VALORES_DEF.tolMs);
  });

  it('migra v1 → v2: vista "3d" pasa a "guitarHero"', () => {
    const cfg = cfg_migrarConfig({ version: 1, cfg: { vista: '3d', bpm: 101 } });
    expect(cfg.vista).toBe('guitarHero');
    expect(cfg.bpm).toBe(101);
  });

  it('migra v1 → v2 conservando "2d"', () => {
    expect(cfg_migrarConfig({ version: 1, cfg: { vista: '2d' } }).vista).toBe('2d');
  });

  it('migra v1 → v2 completando los campos nuevos con sus valores por defecto', () => {
    const cfg = cfg_migrarConfig({ version: 1, cfg: { esZurdo: true } });
    expect(cfg.esZurdo).toBe(true);
    expect(cfg.esMonitorActivo).toBe(false);
    expect(cfg.volMonitor).toBe(0.5);
    expect(cfg.idPresetEfx).toBe('fabrica:limpioBrillante');
    expect(cfg.vista).toBe('rocksmith');
  });

  it('migra v0 (sin envoltorio) con vista "3d" encadenando hasta la versión actual', () => {
    expect(cfg_migrarConfig({ vista: '3d' }).vista).toBe('guitarHero');
  });

  it('la migración 1 no modifica los datos de entrada', () => {
    const datos = Object.freeze({ vista: '3d' });
    const migracion = CFG_MIGRACIONES[1];
    expect(migracion).toBeTypeOf('function');
    expect(migracion?.(datos)).toEqual({ vista: 'guitarHero' });
    expect(datos.vista).toBe('3d');
  });

  it('en la versión actual no traduce "3d" (valor inválido → valor por defecto)', () => {
    expect(cfg_migrarConfig({ version: CFG_VERSION, cfg: { vista: '3d' } }).vista).toBe(CFG_VALORES_DEF.vista);
  });

  it('conserva los campos reconocibles de una versión futura', () => {
    const cfg = cfg_migrarConfig({ version: CFG_VERSION + 5, cfg: { bpm: 70, campoNuevo: 'x' } });
    expect(cfg.bpm).toBe(70);
  });

  it('devuelve valores por defecto ante datos ilegibles', () => {
    expect(cfg_migrarConfig(null)).toEqual(CFG_VALORES_DEF);
    expect(cfg_migrarConfig('texto')).toEqual(CFG_VALORES_DEF);
  });

  it('acota los valores fuera de rango', () => {
    const cfg = cfg_migrarConfig({ version: CFG_VERSION, cfg: { latEntradaMs: 9000 } });
    expect(cfg.latEntradaMs).toBe(500);
  });
});

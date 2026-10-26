import { describe, expect, it } from 'vitest';
import { CFG_VERSION } from './cfg_constantes';
import { cfg_exportarJson, cfg_importarJson } from './cfg_exportador';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

describe('cfg_exportarJson / cfg_importarJson', () => {
  it('hace un viaje de ida y vuelta sin pérdidas', () => {
    const cfg = { ...CFG_VALORES_DEF, bpm: 133, vista: 'guitarHero' as const, frecA4Hz: 442.5, volMonitor: 0.35, idPresetEfx: 'usuario:abc' };
    const texto = cfg_exportarJson(cfg);
    expect(JSON.parse(texto)).toMatchObject({ version: CFG_VERSION });
    expect(cfg_importarJson(texto)).toEqual({ esValido: true, valor: cfg });
  });

  it('rechaza texto que no es JSON', () => {
    const resultado = cfg_importarJson('{ no es json');
    expect(resultado.esValido).toBe(false);
    if (!resultado.esValido) expect(resultado.errores[0]).toContain('JSON');
  });

  it('rechaza versiones futuras', () => {
    const texto = JSON.stringify({ version: CFG_VERSION + 1, cfg: CFG_VALORES_DEF });
    expect(cfg_importarJson(texto).esValido).toBe(false);
  });

  it('rechaza campos inválidos en la versión actual', () => {
    const texto = JSON.stringify({ version: CFG_VERSION, cfg: { ...CFG_VALORES_DEF, tolMs: 'mucho' } });
    const resultado = cfg_importarJson(texto);
    expect(resultado.esValido).toBe(false);
    if (!resultado.esValido) expect(resultado.errores.join(' ')).toContain('"tolMs"');
  });

  it('migra archivos sin versión completando lo faltante', () => {
    const resultado = cfg_importarJson(JSON.stringify({ bpm: 100 }));
    expect(resultado.esValido).toBe(true);
    if (resultado.esValido) {
      expect(resultado.valor.bpm).toBe(100);
      expect(resultado.valor.tolMs).toBe(CFG_VALORES_DEF.tolMs);
    }
  });

  it('importa respaldos v1 pasando por la migración (vista "3d" → "guitarHero")', () => {
    const cfgV1: Record<string, unknown> = { ...CFG_VALORES_DEF, vista: '3d', bpm: 90 };
    delete cfgV1['esMonitorActivo'];
    delete cfgV1['volMonitor'];
    delete cfgV1['idPresetEfx'];
    const resultado = cfg_importarJson(JSON.stringify({ version: 1, cfg: cfgV1 }));
    expect(resultado.esValido).toBe(true);
    if (!resultado.esValido) return;
    expect(resultado.valor.vista).toBe('guitarHero');
    expect(resultado.valor.bpm).toBe(90);
    expect(resultado.valor.esMonitorActivo).toBe(false);
    expect(resultado.valor.volMonitor).toBe(0.5);
    expect(resultado.valor.idPresetEfx).toBe('fabrica:limpioBrillante');
  });

  it('rechaza "3d" en un archivo de la versión actual', () => {
    const texto = JSON.stringify({ version: CFG_VERSION, cfg: { ...CFG_VALORES_DEF, vista: '3d' } });
    const resultado = cfg_importarJson(texto);
    expect(resultado.esValido).toBe(false);
    if (!resultado.esValido) expect(resultado.errores.join(' ')).toContain('"vista"');
  });

  it('rechaza envoltorios sin "cfg"', () => {
    expect(cfg_importarJson(JSON.stringify({ version: CFG_VERSION })).esValido).toBe(false);
    expect(cfg_importarJson('[1,2,3]').esValido).toBe(false);
  });
});

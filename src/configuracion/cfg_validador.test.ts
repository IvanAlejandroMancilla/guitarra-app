import { describe, expect, it } from 'vitest';
import { CFG_RANGOS } from './cfg_rangos';
import { cfg_acotarValor, cfg_completarConfig, cfg_validarConfig } from './cfg_validador';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

describe('cfg_acotarValor', () => {
  it('acota al rango', () => {
    expect(cfg_acotarValor(1000, CFG_RANGOS.bpm)).toBe(300);
    expect(cfg_acotarValor(-5, CFG_RANGOS.bpm)).toBe(30);
  });

  it('redondea al paso sin errores de coma flotante', () => {
    expect(cfg_acotarValor(1.03, CFG_RANGOS.ganEntrada)).toBe(1.05);
    expect(cfg_acotarValor(440.3, CFG_RANGOS.frecA4Hz)).toBe(440.5);
    expect(cfg_acotarValor(0.7, CFG_RANGOS.velocidad)).toBe(0.7);
    expect(cfg_acotarValor(0.991, CFG_RANGOS.claridadMin)).toBe(0.99);
  });

  it('devuelve el mínimo ante valores no finitos', () => {
    expect(cfg_acotarValor(Number.NaN, CFG_RANGOS.tolMs)).toBe(20);
    expect(cfg_acotarValor(Number.POSITIVE_INFINITY, CFG_RANGOS.tolMs)).toBe(20);
  });
});

describe('cfg_completarConfig', () => {
  it('devuelve los valores por defecto ante datos no objeto', () => {
    expect(cfg_completarConfig(null)).toEqual(CFG_VALORES_DEF);
    expect(cfg_completarConfig('hola')).toEqual(CFG_VALORES_DEF);
    expect(cfg_completarConfig([1, 2])).toEqual(CFG_VALORES_DEF);
  });

  it('descarta tipos incorrectos, acota números y valida opciones', () => {
    const cfg = cfg_completarConfig({
      bpm: 999,
      frecA4Hz: 'cuatrocientos',
      esZurdo: 'si',
      esLoop: true,
      vista: '4d',
      notacion: 'anglosajona',
      idDispEntrada: 42,
      campoDesconocido: 1,
    });
    expect(cfg.bpm).toBe(300);
    expect(cfg.frecA4Hz).toBe(440);
    expect(cfg.esZurdo).toBe(false);
    expect(cfg.esLoop).toBe(true);
    expect(cfg.vista).toBe('rocksmith');
    expect(cfg.notacion).toBe('anglosajona');
    expect(cfg.idDispEntrada).toBe('');
    expect('campoDesconocido' in cfg).toBe(false);
  });

  it('usa la base indicada para los campos inválidos', () => {
    const base = { ...CFG_VALORES_DEF, bpm: 120 };
    expect(cfg_completarConfig({ bpm: Number.NaN }, base).bpm).toBe(120);
  });

  it('valida los campos de monitoreo y el id de preset', () => {
    const cfg = cfg_completarConfig({ esMonitorActivo: true, volMonitor: 1.7, idPresetEfx: 'usuario:123' });
    expect(cfg.esMonitorActivo).toBe(true);
    expect(cfg.volMonitor).toBe(1);
    expect(cfg.idPresetEfx).toBe('usuario:123');
    expect(cfg_completarConfig({ idPresetEfx: '' }).idPresetEfx).toBe(CFG_VALORES_DEF.idPresetEfx);
    expect(cfg_completarConfig({ idPresetEfx: '   ' }).idPresetEfx).toBe(CFG_VALORES_DEF.idPresetEfx);
    expect(cfg_completarConfig({ idPresetEfx: 'x'.repeat(65) }).idPresetEfx).toBe(CFG_VALORES_DEF.idPresetEfx);
    expect(cfg_completarConfig({ idPresetEfx: 7 }).idPresetEfx).toBe(CFG_VALORES_DEF.idPresetEfx);
  });

  it('acepta las tres vistas y descarta "3d" (lo traduce la migración, no el validador)', () => {
    expect(cfg_completarConfig({ vista: 'guitarHero' }).vista).toBe('guitarHero');
    expect(cfg_completarConfig({ vista: '2d' }).vista).toBe('2d');
    expect(cfg_completarConfig({ vista: '3d' }).vista).toBe(CFG_VALORES_DEF.vista);
  });

  it('rechaza ids de dispositivo demasiado largos', () => {
    expect(cfg_completarConfig({ idDispEntrada: 'x'.repeat(600) }).idDispEntrada).toBe('');
  });
});

describe('cfg_validarConfig', () => {
  it('acepta una configuración completa y válida', () => {
    const resultado = cfg_validarConfig({ ...CFG_VALORES_DEF });
    expect(resultado).toEqual({ esValido: true, valor: CFG_VALORES_DEF });
  });

  it('informa cada campo inválido en español', () => {
    const resultado = cfg_validarConfig({ ...CFG_VALORES_DEF, bpm: 10, calidad: 'ultra', esLoop: 1 });
    expect(resultado.esValido).toBe(false);
    if (resultado.esValido) return;
    expect(resultado.errores).toHaveLength(3);
    expect(resultado.errores.join(' ')).toContain('"bpm" debe estar entre 30 y 300');
    expect(resultado.errores.join(' ')).toContain('"calidad"');
    expect(resultado.errores.join(' ')).toContain('"esLoop"');
  });

  it('informa campos faltantes', () => {
    const incompleta: Record<string, unknown> = { ...CFG_VALORES_DEF };
    delete incompleta['tolMs'];
    const resultado = cfg_validarConfig(incompleta);
    expect(resultado.esValido).toBe(false);
  });

  it('informa un id de preset inválido o un volumen de monitoreo fuera de rango', () => {
    const resultado = cfg_validarConfig({ ...CFG_VALORES_DEF, idPresetEfx: '', volMonitor: 2, esMonitorActivo: 'no' });
    expect(resultado.esValido).toBe(false);
    if (resultado.esValido) return;
    expect(resultado.errores).toHaveLength(3);
    expect(resultado.errores.join(' ')).toContain('"idPresetEfx"');
    expect(resultado.errores.join(' ')).toContain('"volMonitor"');
    expect(resultado.errores.join(' ')).toContain('"esMonitorActivo"');
  });

  it('rechaza lo que no es objeto', () => {
    expect(cfg_validarConfig(5).esValido).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { COR_ORDEN_BLOQUES_EFX } from '../core/cor_efectos';
import { EFX_ID_PRESET_DEF } from './efx_constantes';
import { efx_validarPreset } from './efx_esquema';
import { EFX_PRESETS_FABRICA } from './efx_presetsFabrica';

describe('presets de fábrica', () => {
  it('son los 8 aprobados, con prefijo de fábrica y válidos', () => {
    const ids = EFX_PRESETS_FABRICA.map((preset) => preset.id);
    expect(ids).toEqual([
      'fabrica:limpioBrillante',
      'fabrica:crunchClasico',
      'fabrica:rock',
      'fabrica:metal',
      'fabrica:soloDelay',
      'fabrica:ambiente',
      'fabrica:funkWah',
      'fabrica:blues',
    ]);
    expect(ids).toContain(EFX_ID_PRESET_DEF);
    expect(EFX_PRESETS_FABRICA.map((preset) => preset.nombre)).toContain('Solo con delay');
    for (const preset of EFX_PRESETS_FABRICA) {
      const resultado = efx_validarPreset(preset);
      // Validar no cambia nada: todos los campos están completos y en rango.
      expect(resultado).toEqual({ esValido: true, valor: preset });
    }
  });

  it('todos los parámetros están en 0..1 y el EQ está activo (volumen del preset)', () => {
    for (const preset of EFX_PRESETS_FABRICA) {
      expect(preset.bloques.eq.esActivo).toBe(true);
      for (const id of COR_ORDEN_BLOQUES_EFX) {
        for (const valor of Object.values(preset.bloques[id].parametros)) {
          expect(valor).toBeGreaterThanOrEqual(0);
          expect(valor).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

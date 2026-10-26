import { describe, expect, it } from 'vitest';
import type { IEfxBloques, IEfxPreset } from '../core/cor_efectos';
import { EFX_VERSION_PRESETS } from './efx_constantes';
import { efx_exportarPresets, efx_importarPresets } from './efx_exportador';
import { EFX_BLOQUES_DEF } from './efx_presetsFabrica';

const crearBloques = (): IEfxBloques => {
  const bloques = structuredClone(EFX_BLOQUES_DEF) as IEfxBloques;
  bloques.amp = { esActivo: true, modelo: 'crunch', parametros: { ...bloques.amp.parametros, gan: 0.8 } };
  return bloques;
};

describe('efx_exportarPresets / efx_importarPresets', () => {
  const preset: IEfxPreset = { id: 'usuario:1', nombre: 'Uno', bloques: crearBloques() };

  it('ida y vuelta conserva los presets', () => {
    const texto = efx_exportarPresets([preset]);
    expect(JSON.parse(texto)).toMatchObject({ version: EFX_VERSION_PRESETS });
    expect(efx_importarPresets(texto)).toEqual({ esValido: true, valor: [preset] });
  });

  it('acepta un preset suelto', () => {
    expect(efx_importarPresets(JSON.stringify(preset))).toEqual({ esValido: true, valor: [preset] });
  });

  it('informa JSON roto, versión futura, lista ausente o vacía', () => {
    expect(efx_importarPresets('{roto')).toEqual({ esValido: false, errores: ['El archivo no contiene JSON válido.'] });
    const futura = efx_importarPresets(JSON.stringify({ version: EFX_VERSION_PRESETS + 1, presets: [preset] }));
    expect(futura.esValido).toBe(false);
    expect(efx_importarPresets(JSON.stringify({ version: 1 })).esValido).toBe(false);
    expect(efx_importarPresets(JSON.stringify({ version: 1, presets: [] })).esValido).toBe(false);
  });

  it('rechaza el archivo si algún preset es inválido, indicando cuál', () => {
    const resultado = efx_importarPresets(JSON.stringify({ version: 1, presets: [preset, { bloques: {} }] }));
    expect(resultado).toEqual({ esValido: false, errores: ['Preset 2: El preset no tiene nombre.'] });
  });
});

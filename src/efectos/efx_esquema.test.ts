import { describe, expect, it } from 'vitest';
import { EFX_LARGO_MAX_NOMBRE, EFX_TAM_MAX_IR_BYTES } from './efx_constantes';
import { efx_validarArchivoIr, efx_validarPreset } from './efx_esquema';
import { EFX_BLOQUES_DEF } from './efx_presetsFabrica';

describe('efx_validarPreset', () => {
  it('rechaza lo que no es objeto o no tiene nombre', () => {
    expect(efx_validarPreset(null).esValido).toBe(false);
    expect(efx_validarPreset([]).esValido).toBe(false);
    expect(efx_validarPreset({ bloques: {} })).toEqual({ esValido: false, errores: ['El preset no tiene nombre.'] });
    expect(efx_validarPreset({ nombre: '   ' }).esValido).toBe(false);
  });

  it('completa bloques faltantes y corrige valores inválidos', () => {
    const resultado = efx_validarPreset({
      id: 'usuario:abc',
      nombre: '  Mi sonido  ',
      bloques: {
        amp: { esActivo: true, modelo: 'inexistente', parametros: { gan: 7, graves: -1, medios: 'x' } },
        rev: 'roto',
      },
    });
    if (!resultado.esValido) throw new Error('debería ser válido');
    const { valor } = resultado;
    expect(valor.id).toBe('usuario:abc');
    expect(valor.nombre).toBe('Mi sonido');
    expect(valor.bloques.amp).toEqual({
      esActivo: true,
      modelo: EFX_BLOQUES_DEF.amp.modelo,
      parametros: { ...EFX_BLOQUES_DEF.amp.parametros, gan: 1, graves: 0 },
    });
    expect(valor.bloques.rev).toEqual(EFX_BLOQUES_DEF.rev);
    expect(valor.bloques.fx1).toEqual(EFX_BLOQUES_DEF.fx1);
  });

  it('idIr solo se conserva con modelo ir', () => {
    const conIr = efx_validarPreset({ nombre: 'A', bloques: { cab: { esActivo: true, modelo: 'ir', idIr: 'x1' } } });
    const sinIr = efx_validarPreset({ nombre: 'B', bloques: { cab: { esActivo: true, modelo: 'combo1x12', idIr: 'x1' } } });
    expect(conIr.esValido && conIr.valor.bloques.cab.idIr).toBe('x1');
    expect(sinIr.esValido && sinIr.valor.bloques.cab.idIr).toBeNull();
  });

  it('acota el nombre y deja id vacío si falta', () => {
    const resultado = efx_validarPreset({ nombre: 'x'.repeat(100) });
    expect(resultado.esValido && resultado.valor.nombre.length).toBe(EFX_LARGO_MAX_NOMBRE);
    expect(resultado.esValido && resultado.valor.id).toBe('');
  });
});

describe('efx_validarArchivoIr', () => {
  it('acepta .wav y devuelve el nombre sin extensión', () => {
    expect(efx_validarArchivoIr('Mi Gabinete 4x12.WAV', 1000)).toEqual({ esValido: true, valor: 'Mi Gabinete 4x12' });
    expect(efx_validarArchivoIr('.wav', 1000)).toEqual({ esValido: true, valor: 'IR sin nombre' });
  });

  it('rechaza otras extensiones, vacíos y archivos grandes', () => {
    expect(efx_validarArchivoIr('ir.mp3', 1000)).toEqual({ esValido: false, errores: ['El IR debe ser un archivo .wav.'] });
    expect(efx_validarArchivoIr('ir.wav', 0).esValido).toBe(false);
    const grande = efx_validarArchivoIr('ir.wav', EFX_TAM_MAX_IR_BYTES + 1);
    expect(grande.esValido).toBe(false);
    if (!grande.esValido) expect(grande.errores[0]).toContain('máximo es 10 MB');
  });
});

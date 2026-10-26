import { describe, expect, it, vi } from 'vitest';
import { CorBus } from '../core/cor_bus';
import type { IConfig } from '../core/tipos';
import { CfgEstado } from './cfg_estado';
import type { ICfgAlmacen } from './cfg_tipos';
import { CFG_VALORES_DEF } from './cfg_valoresDef';

/** Almacén en memoria que registra cada operación. */
const crearAlmacenFalso = (cargado: unknown = null) => {
  const guardados: IConfig[] = [];
  let cantBorrados = 0;
  const almacen: ICfgAlmacen = {
    // El almacén falso puede devolver basura a propósito para probar la validación de CfgEstado.
    cargar: () => cargado as IConfig | null,
    guardar: (cfg) => {
      guardados.push({ ...cfg });
    },
    borrar: () => {
      cantBorrados++;
    },
  };
  return { almacen, guardados, obtenerCantBorrados: (): number => cantBorrados };
};

describe('CfgEstado', () => {
  it('usa los valores por defecto si el almacén está vacío', () => {
    const { almacen } = crearAlmacenFalso();
    expect(new CfgEstado(new CorBus(), almacen).obtenerConfig()).toEqual(CFG_VALORES_DEF);
  });

  it('valida lo que devuelve el almacén', () => {
    const { almacen } = crearAlmacenFalso({ ...CFG_VALORES_DEF, bpm: -40, calidad: 'ultra' });
    const cfg = new CfgEstado(new CorBus(), almacen).obtenerConfig();
    expect(cfg.bpm).toBe(30);
    expect(cfg.calidad).toBe('media');
  });

  it('emite cfg:cambio solo con las claves cambiadas y persiste', () => {
    const bus = new CorBus();
    const { almacen, guardados } = crearAlmacenFalso();
    const estado = new CfgEstado(bus, almacen);
    const oyente = vi.fn();
    bus.suscribir('cfg:cambio', oyente);

    estado.actualizarConfig({ bpm: 100, esZurdo: false, vista: 'guitarHero' });

    expect(oyente).toHaveBeenCalledTimes(1);
    expect(oyente.mock.calls[0]?.[0]).toMatchObject({ claves: ['bpm', 'vista'] });
    expect(estado.obtenerConfig().bpm).toBe(100);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]?.vista).toBe('guitarHero');
  });

  it('no emite ni persiste si nada cambió', () => {
    const bus = new CorBus();
    const { almacen, guardados } = crearAlmacenFalso();
    const estado = new CfgEstado(bus, almacen);
    const oyente = vi.fn();
    bus.suscribir('cfg:cambio', oyente);
    estado.actualizarConfig({ bpm: CFG_VALORES_DEF.bpm });
    expect(oyente).not.toHaveBeenCalled();
    expect(guardados).toHaveLength(0);
  });

  it('ignora valores inválidos conservando los vigentes y acota rangos', () => {
    const bus = new CorBus();
    const { almacen } = crearAlmacenFalso();
    const estado = new CfgEstado(bus, almacen);
    estado.actualizarConfig({ bpm: 120 });
    estado.actualizarConfig({ bpm: Number.NaN, tolMs: 9999 });
    expect(estado.obtenerConfig().bpm).toBe(120);
    expect(estado.obtenerConfig().tolMs).toBe(300);
  });

  it('entrega una configuración inmutable', () => {
    const { almacen } = crearAlmacenFalso();
    const cfg = new CfgEstado(new CorBus(), almacen).obtenerConfig();
    expect(Object.isFrozen(cfg)).toBe(true);
  });

  it('restablece los valores por defecto, borra el almacén y emite las claves cambiadas', () => {
    const bus = new CorBus();
    const { almacen, obtenerCantBorrados } = crearAlmacenFalso({ ...CFG_VALORES_DEF, bpm: 150, esLoop: true });
    const estado = new CfgEstado(bus, almacen);
    const oyente = vi.fn();
    bus.suscribir('cfg:cambio', oyente);
    estado.restablecerConfig();
    expect(estado.obtenerConfig()).toEqual(CFG_VALORES_DEF);
    expect(obtenerCantBorrados()).toBe(1);
    expect(oyente.mock.calls[0]?.[0]).toMatchObject({ claves: ['bpm', 'esLoop'] });
  });

  it('deja el último cambio disponible con obtenerUltimo', () => {
    const bus = new CorBus();
    const { almacen } = crearAlmacenFalso();
    new CfgEstado(bus, almacen).actualizarConfig({ notacion: 'anglosajona' });
    expect(bus.obtenerUltimo('cfg:cambio')?.cfg.notacion).toBe('anglosajona');
  });
});

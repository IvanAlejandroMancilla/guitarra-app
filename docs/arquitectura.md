# Arquitectura

## Flujo
```
Guitarra → Interfaz (Behringer / Nanocore) → getUserMedia
   → aud (AudioContext, AnalyserNode)
   → det (YIN → frecuencia → nota)          emite 'det:nota'
   → ejr (compara con nota esperada + tmp)  emite 'ejr:acierto' / 'ejr:fallo'
   → vc2 / v3d (dibujan)                    escuchan eventos
gpr (Guitar Pro) → IEjercicio + pistas → acp (alphaTab, de fondo, sincronizado con tmp)
aud (salida limpia) → efx (cadena FX1…EQ) → monitor → altavoces   (det sigue leyendo la señal limpia)
cfg → IConfig → inyectada en todos los módulos
```

## Carpetas
```
src/
  core/            tipos.ts, cor_eventos.ts, cor_contratos.ts, cor_bus.ts, cor_bucle.ts,
                   cor_notas.ts, cor_tiempo.ts, cor_colores.ts, cor_validacion.ts,
                   cor_digitacion.ts, cor_efectos.ts
  audio/           aud_*
  deteccion/       det_*
  afinador/        afn_*
  ejercicios/      ejr_*
  escalas/         esc_*
  timing/          tmp_*
  vistas/canvas2d/ vc2_*
  vistas/tres-d/   v3d_*
  guitar-pro/      gpr_*
  acompanamiento/  acp_*
  efectos/         efx_*  (cadena de efectos, presets, IR, monitoreo)
  configuracion/   cfg_*
  ui/              ui_*
  main.ts          composición (único lugar que instancia implementaciones concretas)
public/
  ejercicios/      *.json, indice.json (catálogo)
  soundfonts/      *.sf2
```

## Reglas de dependencia
- `core` no depende de nadie.
- Los demás dependen solo de `core` (interfaces y bus). Excepción: `cfg` puede usar componentes de `ui`.
- Las vistas nunca importan `det`, `aud` ni `gpr` directamente: reciben datos por eventos.
- `main.ts` arma todo.

## Formato de ejercicio JSON
```json
{
  "titulo": "Escala de Do mayor",
  "bpm": 80,
  "modo": "flexible",
  "notas": [
    { "nombre": "Do", "oct": 3, "cur": 5, "trs": 3, "tiempo": 0 },
    { "nombre": "Re", "oct": 3, "cur": 4, "trs": 0, "tiempo": 1 }
  ]
}
```
`tiempo` está en pulsos (beats); se convierte a ms con el `bpm`.

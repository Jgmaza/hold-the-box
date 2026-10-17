# Mecánicas v2 — issue #13

Rama: `work/jose` · Archivo: `apps/src/config.js`

Pack: **brazos más largos** + **mayor desestabilización** + **mayor mojado**.  
Sigue siendo Overcooked-funny, no Dark Souls.

## Cambios (antes → ahora)

### Brazos largos (`carry`)
| Knob | Antes | Ahora |
|---|---|---|
| `restDistance` | 1.6 | **2.0** |
| `minDistance` | 1.0 | **1.2** |
| `maxDistance` | 2.2 | **2.9** |
| `stiffness` | 14 | **11** |

### Desestabilización (`box.tilt`)
| Knob | Antes | Ahora |
|---|---|---|
| `tiltingDeg` | 12 | **10** |
| `criticalDeg` | 28 | **22** |
| `dropGrace` | 1.0 | **0.7** |
| `heightGain` | 0.85 | **1.1** |
| `dragLeanDeg` | 12 | **18** |
| `twistDeg` | 30 | **40** |
| `tensionDeg` | 36 | **48** |
| `stiffnessLow` | 16 | **12** |
| `inertiaGain` | 0.18 | **0.26** |
| `landKickGain` | 14 | **18** |

### Mojado (`box.wet`)
| Knob | Antes | Ahora |
|---|---|---|
| `fallPenalty` | 30 | **45** |
| `geyserRate` | 38 | **55** |
| `dryRate` | 0.6 | **0.35** |
| `speedPenalty` | 0.25 | **0.4** |
| `jumpPenalty` | 0.1 | **0.2** |
| `gripPenalty` | 0.5 | **0.7** |
| `stabilityPenalty` | 0.7 | **1.0** |
| `disturbanceGain` | 0.5 | **0.75** |

## Cómo playtestear
```bash
cd apps && npm run dev
# opcional: http://localhost:5173/?debug
```
Probar: caminar desync, salto solo de uno, caer al agua, chorro.

## Siguiente
Luis puede retocar números en `BOX_FEEL.md` tras playtest. Danel review en PR a `dev`.

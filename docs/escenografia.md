# Escenografía Kenney

Props 3D (kit pirata) en `apps/public/kenney/*.glb`. Solo decoración: no chocan.

## Datos

Cada nivel puede tener `scenery: [{ art, x, z, top, yaw?, s?, float? }]`.

- `art`: nombre del GLB sin extensión (`palm-straight`, `ship-large`, …)
- `top`: altura del piso (o `-0.15` / `-0.04` para barcos/botes en el agua)
- `float: true`: se anima con el mar (barcos)

## Helpers (`sections.js`)

```js
import { dressLevel, dressIsland, shipsAlong, SCENERY_SETS } from './sections.js';

// Una isla:
dressIsland(platform, { set: 'beach' | 'pirate' | 'fort', seed, density, keepOut });

// Nivel entero (orillas + barcos, evita carteles / props / carpas / peligros):
level.scenery = dressLevel(level, {
  beach: ['inicio', 'isla-easy'],
  pirate: ['salida', 'terraza'],
}, { seed: 1 });
```

Sets:

| set | Contenido típico |
|-----|------------------|
| `beach` | palmeras, hierba, arena, barriles |
| `pirate` | cañones, cofres, banderas, cercas |
| `fort` | murallas, torres, cañones |

## Vista

`LevelView._scenery` cachea un asset por `art` y los libera en `destroy()` al volver al menú.

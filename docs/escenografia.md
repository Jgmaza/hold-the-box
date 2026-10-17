# Escenografía Kenney

Props 3D (kit pirata) en `apps/public/kenney/*.glb`. **Chocan** (barriles, cajas, cañones, murallas, torres, rocas, cercas, troncos de palmera y mástiles); el pasto, la arena, las botellas, las herramientas y los barcos no.

## Colisiones

- Los tamaños salen de los GLB: `node apps/scripts/measure-kenney.mjs` mide cada modelo (vértices reales, con la jerarquía de nodos) y escribe `apps/src/levels/kenneyBounds.js`. **Volver a correrlo al agregar modelos.**
- Qué choca y con qué forma: `apps/src/levels/kenneyColliders.js` (`'box'` modelo entero, `'trunk'` solo tronco, `'pole'` solo mástil, `null` no choca). Se gira con `yaw` y se escala con `s`.
- `World` (`sim/world.js`) los suma a sus colliders: frenan a los jugadores y se puede subir encima.
- `dressIsland` corre cada prop que choca hacia la orilla hasta dejar libre el pasillo central (±2.1 m); si no cabe, no lo pone. `apps/test/props.test.js` revisa que ningún prop tape el pasillo, los spawns ni los checkpoints.
- No se usa el MCP del PlayCanvas Editor para esto: ese MCP solo funciona con un proyecto abierto en el Editor web, y este juego es Vite + engine.

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

# Agua 3D

El mar del juego y del menú es una malla con olas en código (`apps/src/view/water.js`), no un modelo del Editor.

## Qué hace

- Malla de ~200×200 m (200×200 celdas) que sigue a la cámara en Z/X.
- Olas en el vertex shader (suma de ondas en coordenadas de mundo), amplitud ~±0.08 m.
- Color hondo → claro cerca de las orillas; espuma en crestas y alrededor de muelles/islas.
- Orillas: mapa 2D generado desde las plataformas del nivel + islas del backdrop.
- Plano lejano quieto debajo, para que no se vea el borde de la malla.
- **Solo visual**: la física sigue usando `waterLevel` (plano en y = 0).

## Uso

```js
import { Water } from './view/water.js';

const water = new Water(gfx, {
  y: 0,
  shores: [{ x: 0, z: 0, w: 10, d: 12 }, { x: 20, z: -40, w: 14, d: 8, round: true }],
});
// cada frame:
water.update(time, camPos);
```

En el menú: `MenuScenery` usa el mismo `Water` con `center` fijo. En partida: `LevelView._sea()` arma cielo (`backdrop.js`) + agua.

## PlayCanvas MCP (Editor)

El MCP oficial (`@playcanvas/editor-mcp-server`) controla proyectos abiertos en el **PlayCanvas Editor web**, no este repo Vite.

Configurado en [`.cursor/mcp.json`](../.cursor/mcp.json). Requisitos:

1. Node.js ≥ 22.18
2. Reiniciar Cursor para cargar el MCP
3. Abrir un proyecto en [playcanvas.com/editor](https://playcanvas.com/editor), botón **MCP**, puerto `52000`, **Connect**
4. En Chrome, permitir **Apps on device** si lo pide

Sirve para modelar / previsualizar assets en el Editor y exportarlos como GLB a `apps/public/`. El agua jugable queda en código.

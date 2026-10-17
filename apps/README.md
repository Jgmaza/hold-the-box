# apps/ — El juego (PlayCanvas)

**Owner:** Danel ([@danelmott](https://github.com/danelmott)) · **UI:** Zharick · **Review:** Jose

Coop local 2P: los dos cargan una caja que se inclina, gotea por el huequito y se moja.
Motor **PlayCanvas 2.23** (engine en código, no el Editor web) + **Vite**.

---

## Correrlo

Requisito: Node 20.19+ (o 22.12+).

```bash
cd apps
npm install
npm run dev        # → http://localhost:5173  (?debug abre el panel de ajustes)
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor local con recarga automática (también al subir archivos a `deliveries/`) |
| `npm test` | Tests de la simulación (sin navegador) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build |

**Publicar (itch.io):** `npm run build`, comprimir el **contenido** de `dist/` en un .zip y subirlo como HTML5. Las rutas son relativas, funciona en cualquier carpeta.

---

## Controles

| | Mover | Saltar |
|---|---|---|
| **P1** (traje + gafas) | `W A S D` | `Espacio` |
| **P2** (gorra + camiseta) | `↑ ← ↓ →` | `Enter` |

Para empezar, **los dos** pulsan saltar. `P` / `Esc` pausa · `R` reinicia · `F2` o `` ` `` panel de debug.
Tras una derrota: saltar = reintentar desde el último checkpoint, `Esc` = reiniciar el nivel.

> Algunos teclados no registran muchas teclas a la vez (ghosting). Si a uno "se le traba" una tecla, prueben otro teclado.

---

## Cómo funciona (resumen)

- **Unión:** resorte entre jugadores (~**2.0 m** rest, max ~2.9 m — brazos largos v2 / #13). Si uno camina y el otro no, arrastra al otro y van lentos. El que pisa suelo pesa más y puede “rescatar” al que se cae.
- **Sincronía** (0..1): qué tan alineados van los inputs. Más sincronía = más velocidad (×1.15) y la caja se endereza más rápido.
- **Inclinación** (v2 más inestable):
  - Sube con diferencia de altura, arrastre, empujes opuestos, tensión hacia afuera, inercia, aterrizajes y rodillo.
  - Estados: `upright` (< **10°**) · `tilting` · `critical` (≥ **22°**). **~0.7 s** en critical → sueltan la caja (derrota).
- **Huequito:** el contenido baja mientras la caja va inclinada (> 15°) y con los golpes. 0% → derrota.
- **Se moja (v2 más agresivo):** caer al agua ~**+45%**, chorros mojan más rápido, seca lento. Mojada = más lenta, salta menos, resbala más, menos estable. 100% → derrota.
- **Agua:** si alguien cae, los dos reaparecen en el último checkpoint y la caja se moja (castiga sin matar al instante).
- **Meta:** al entrar la caja, victoria con tiempo, contenido %, mojado % y calificación (perfecta / aceptable / dañada).

Todo número ajustable está en [`src/config.js`](./src/config.js). Con `?debug` se cambian en vivo; el botón *Copiar CONFIG* copia los valores para pegarlos en el archivo.

---

## Estructura

```
apps/
  index.html            canvas + capa de UI
  vite.config.js        base relativa, acceso a ../deliveries, recarga al subir entregas
  src/
    main.js             arranque y loop: teclas globales → input → sim → vista → UI
    config.js           TODOS los parámetros ajustables
    input.js            teclado → input de P1/P2 (event.code, sirve en teclado español)
    palette.js          paleta por defecto + lectura de deliveries/luis/PALETTE.md
    debug.js            panel lil-gui (?debug / F2)
    sim/                simulación pura (sin PlayCanvas → se prueba con vitest)
      game.js           GameState: estados, respawn, checkpoints, victoria/derrota, eventos
      box.js            la caja: sincronía, inclinación, estados, huequito, mojado
      player.js         movimiento, salto (coyote + buffer), colisiones
      carry.js          resorte entre los dos jugadores
      hazards.js        plataforma móvil, rodillo, chorro
      world.js          colliders del nivel y triggers
      collision.js      AABB
    levels/level1.js    "El Muelle" descrito como datos
    view/               PlayCanvas: dibuja el estado de la sim
      gameView.js       escena, luz, une todo
      levelView.js      plataformas, agua, obstáculos, carteles, props, meta
      playerView.js     jugadores (o sprite de Juanes)
      boxView.js        caja (orientación, huequito, mojado, texturas de Juanes)
      camera.js  particles.js  signs.js (texturas con canvas)  gfx.js  audio.js
      deliveries.js     qué hay en deliveries/ (import.meta.glob)
    ui/                 UI provisional en HTML/CSS (de Zharick)
  test/                 tests de colisiones, escenarios de juego y paleta
```

---

## Editar el nivel

[`src/levels/level1.js`](./src/levels/level1.js) es solo datos:

- `platforms`: `{ x, z, w, d, top }`. El piso está a la altura `top`; sin `h`, el bloque baja hasta el agua.
- `moving`: igual que una plataforma + `to: { x?, z?, top? }` y `period`.
- `sweepers`: rodillo `{ x, z, top, length, speed }`.
- `geysers`: chorro `{ x, z, baseY, radius, offset }`.
- `checkpoints`: zona + `spawn: { p1, p2 }`.
- `goal`: zona de meta.
- `signs`, `props`: decoración.

El nivel avanza hacia **−Z** y el agua está en `y = 0`. Los tests verifican que los spawns y la meta estén sobre suelo.

---

## Para Zharick (UI)

La UI vive en `src/ui/` y **solo escucha**; no hace falta tocar `sim/`. Se puede rehacer entera mientras use este contrato:

```js
game.state      // 'title' | 'playing' | 'paused' | 'failing' | 'failed' | 'won'
game.runTime    // segundos de partida
game.ready      // { p1, p2 } en el título
game.respawnTimer, game.checkpointIndex, game.failReason, game.result
game.box        // { state, tilt: {roll, pitch, mag}, sync, integrity, wetness, criticalTime, dropped }

game.events.on('game:win', ({ time, integrity, wetness, rating, ratingLabel }) => …)
```

| Evento | Datos |
|---|---|
| `game:ready` | `{ p1, p2 }` |
| `game:start` | `{ restart? }` |
| `game:pause` | `{ paused }` |
| `game:checkpoint` | `{ index }` |
| `game:splash` | `{ player, x, y, z }` |
| `game:respawn` | `{ checkpoint, retry? }` |
| `game:fail` | `{ reason: 'dropped'\|'empty'\|'soaked', label, inWater }` |
| `game:win` | `{ time, integrity, wetness, rating: 'perfect'\|'ok'\|'damaged', ratingLabel }` |
| `player:jump` / `player:land` | `{ player }` / `{ player, speed }` |
| `hazard:hit` | `{ player }` |
| `geyser:hit` | `{}` |
| `box:state` | `{ from, to }` |
| `box:impact` | `{ amount, cause, integrity }` |
| `box:wet` | `{ amount, cause, wetness }` |
| `box:drop` | `{ tilt }` |

Acciones: `game.togglePause()`, `game.retry()`, `game.restart()`. Los colores llegan como variables CSS (`--ui`, `--danger`, `--goal`, `--water`, `--box`) desde la paleta de Luis.

---

## Entregas del equipo (`deliveries/`)

El juego busca estos archivos al arrancar (y se recarga solo cuando aparecen). **Si falta uno, usa un placeholder** y lo lista en la consola del navegador (`[deliveries] … faltan …`).

| Quién | Archivo | Dónde aparece |
|---|---|---|
| Juanes | `juanes/caja-normal.png` · `caja-inclinada.png` · `caja-huequito.png` · `caja-mojada.png` | Textura de la caja según su estado |
| Juanes | `juanes/p1-cargar.png` (o `p1-frente.png`) · `p2-cargar.png` (o `p2-frente.png`) | Reemplaza al muñeco por el dibujo (recorte de papel) |
| Matias | `matias/banner-meta.png` | Banner de la META |
| Matias | `matias/senal-trabajo-equipo.png` · `senal-cuidado-caja.png` · `cartel-ron.png` | Carteles del nivel |
| Matias | `matias/prop-palmera.png` · `prop-rodillo.png` · `prop-plataforma.png` | Palmeras, rodillo, plataformas móviles |
| Matias (opcional) | `matias/billboard-humor.png` | Valla en el agua |
| Luis | `luis/PALETTE.md` | Colores de todo (filas: Cielo, Agua, Madera, Caja, UI, Peligro, Meta) |
| Luis | `luis/audio/musica-loop` · `sfx-salto` · `sfx-inclinacion` · `sfx-mojado` · `sfx-splash` · `sfx-golpe` · `sfx-meta` · `musica-victoria` · `musica-derrota` (`.ogg`/`.mp3`/`.wav`) | Música y efectos |

Los PNG van con fondo transparente (ver [`docs/visual/pipeline-papel.md`](../docs/visual/pipeline-papel.md)).

---

## Tests

`npm test` corre la simulación sin navegador:

- Colisiones, salto y plataforma móvil.
- Escenarios:
  - caminar sincronizados = caja derecha;
  - uno solo = lento e inclinada;
  - saltar solo no la suelta;
  - saltar juntos no la mueve;
  - tirar opuesto = ¡Soltaron la caja!;
  - caer al agua = respawn +30% de mojado;
  - derrotas por contenido y por mojado;
  - reintento desde checkpoint;
  - checkpoints y meta.
- Sanidad del nivel 1 y lectura de la paleta.

---

## Pendiente / ideas (fuera del camino crítico)

- Afinar números jugando 2P (`?debug`): sobre todo `twistDeg`, `dragLeanDeg`, `dropGrace` y `ratePerSec`.
- Soporte de gamepads (dos mandos = P1/P2).
- Capa C (modelos 3D) solo si sobra tiempo: ver [`docs/visual/PLAN.md`](../docs/visual/PLAN.md).

## Si no eres Danel

No inventes estructura aquí: entrega en `deliveries/` y avísale. Para UI, trabaja en `src/ui/` (ver arriba).

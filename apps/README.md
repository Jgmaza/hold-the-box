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
| `npm run dev` → `/?level=muelle\|bahia\|tormenta` | Niveles 1–3 (salta el menú) |
| `npm run dev` → `/?level=bahia` | Entra directo a un mapa (`muelle` / `bahia` / `tormenta`). `&seed=N` repite el mismo azar |
| `npm test` | Tests de la simulación (sin navegador) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Sirve `dist/` para probar el build |

**Publicar (itch.io):** `npm run build`, comprimir el **contenido** de `dist/` en un .zip y subirlo como HTML5. Las rutas son relativas, funciona en cualquier carpeta.

---

## Controles

| | Mover | Saltar |
|---|---|---|
| **P1** | `W A S D` | `Espacio` |
| **P2** | `↑ ← ↓ →` | `Enter` |

**Menú:** Inicio → **Mapa + caja** → **Personajes** → cuenta 3-2-1 → partida. En Personajes cada uno cambia con sus flechas (`A`/`D` · `←`/`→`) y marca LISTO con su salto. Los dos pueden escoger el mismo personaje: P2 sale con color alterno. `Esc` = atrás. También se maneja con mouse.
En partida: `P` / `Esc` pausa · `R` reinicia · `M` menú (en pausa, victoria o derrota) · `F2` o `` ` `` panel de debug.
Tras una derrota: saltar = reintentar desde el último checkpoint, `Esc` = reiniciar el nivel.
`?level=muelle` / `bahia` / `tormenta` salta el menú y entra directo (desarrollo).

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
- **Clima** (islas con `weather`; en el Muelle, una isla de lluvia y otra de viento después de las NPC). Cada zona tiene ritmo: calma → aviso → aguacero / ráfaga:
  - **lluvia**: la llovizna moja **8 %/s** y el **aguacero 40 %/s** (uno entero al descubierto = caja deshecha). El piso resbala. **Bajo las carpas no se moja ni resbala**: con la caja mayormente debajo ya cuenta, la lona se vuelve transparente y la UI dice "A SALVO".
  - **viento**: las ráfagas empujan a la pareja (puede tirarla al agua), inclinan la caja y se llevan contenido; caminar contra la ráfaga compensa y sincronizados pierden menos.
  - **oleaje** (Bahía y Tormenta): una ola cruza la isla de lado a lado; empuja a quien esté en el piso y moja / inclina la caja. Se esquiva detrás de un **rompeolas** del lado de donde viene, o **saltando juntos**.
- **Rieles** (después del rodillo en el Muelle; también en la Bahía y la Tormenta): dos carriles largos con obstáculos **distintos y desfasados** (piedras, hueco dañado, tope). Cada uno salta lo suyo; si no se coordinan, la caja se inclina. Ver [`docs/rieles.md`](../docs/rieles.md).
- **Meta:** al entrar la caja, victoria con tiempo, contenido %, mojado % y calificación (perfecta / aceptable / dañada).
- **NPCs** (en niveles con `npcs`: al inicio del Muelle hay una isla por NPC, unidas por puentes seguros con checkpoint): pasean al azar por su plataforma, ven la caja y la atacan. No hay vida de personaje: el daño va a la caja.
  - **easy** (cangrejo): lento, ve 3 m de frente. Si toca a alguien, pellizca → −contenido. Se salta juntos.
  - **medium** (pistola de agua): ve 6 m, avisa y dispara un chorro en arco → +mojado. Se esquiva moviéndose juntos y rápido.
  - **hard** (perro mojado): persigue **siempre** a la pareja (`alwaysChase`, sin necesidad de verla, dentro de su isla). Espera en el borde y, cuando la caja pisa su isla, avisa y embiste → empujón + −contenido + mojado. Si falla queda aturdido: ahí se pasa.

Todo número ajustable está en [`src/config.js`](./src/config.js). Con `?debug` se cambian en vivo; el botón *Copiar CONFIG* copia los valores para pegarlos en el archivo.

---

## Estructura

```
apps/
  index.html            canvas + capa de UI
  vite.config.js        base relativa, acceso a ../deliveries, recarga al subir entregas
  src/
    main.js             arranque, menú ↔ partida (startRun / backToMenu) y loop: teclas → input → sim → vista → UI
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
      npcs/             NPCs que atacan la caja
        npcService.js   NpcService: único punto de entrada desde game.js (crea, actualiza, aplica daño)
        npc.js          base: paseo aleatorio en su plataforma, visión, estados
        npcEasy.js  npcMedium.js  npcHard.js   cómo ataca cada dificultad
      weather/          clima de las islas
        weatherService.js  WeatherService: único punto de entrada desde game.js (junta los efectos del paso)
        weatherZone.js     base: área de la isla + ritmo calma / aviso / activo
        rain.js  wind.js   lluvia (mojado, carpas, piso resbaloso) y viento (empuje, inclinación, contenido)
      world.js          colliders del nivel y triggers
      collision.js      AABB
    levels/index.js     niveles disponibles + MAPS (tarjetas del selector; ?level=<clave> entra directo)
    levels/level1.js    Nivel 1 "El Muelle"
    levels/level2.js    Nivel 2 "La Bahía"
    levels/level3.js    Nivel 3 "La Tormenta"
    levels/sections.js  rainIsland / windIsland / waveIsland / railsPair / dressLevel
    levels/kenneyBounds.js   tamaños medidos de los GLB Kenney (generado: scripts/measure-kenney.mjs)
    levels/kenneyColliders.js qué props Kenney chocan y con qué forma
    view/               PlayCanvas: dibuja el estado de la sim
      gameView.js       escena, luz, une todo
      levelView.js      plataformas, agua, obstáculos, carteles, props Kenney, meta
      water.js          agua 3D con olas (también en el menú)
      backdrop.js       cielo + islas lejanas del nivel
      playerView.js     jugadores (o sprite de Juanes)
      characters.js     personajes escogibles (Alebarto, Gustambo, Alcázar, Matías, Melith, Manolo): CHARACTERS + buildCharacter()
      charFeatures.js   frijol base en piezas suaves (mangas, manos), cara (ojos, cejas, boca) y rasgos: gafas, gorros, bufanda, chaleco…
      lowpolyHead.js    cabeza low-poly de los personajes: forma con nariz y mandíbula, pelo y barba en casquetes facetados
      menuStage.js      escena 3D del menú: pedestales que giran, latigazo al cambiar, LISTO con salto
      menuScenery.js    escenario del menú: cielo, sol, nubes, mar con espuma, islas, faro, velero, gaviotas, muelle
      nature.js         palmeras, arbustos, rocas e islas por capas (menú y palmeras del nivel)
      boxView.js        caja (orientación, huequito, mojado, texturas de Juanes)
      npcView.js        NPCs (formas por dificultad, cono de visión, "!") y chorros
      weatherView.js    lluvia (nube, gotas, charcos, carpas, relámpagos) y viento (rachas, hojas, manga de viento)
      parts.js          piezas suaves (elipsoides, cápsulas, anillos, ojos) para modelos hechos en código
      camera.js  particles.js  signs.js (texturas con canvas)  gfx.js  audio.js
      deliveries.js     qué hay en deliveries/ (import.meta.glob)
    ui/                 HTML/CSS encima del canvas
      menu.js  menu.css  Inicio, Mapas + caja, Personajes (lee menuState.js, mueve menuStage)
      menuState.js      estado del menú sin DOM (se prueba con vitest)
      ui.js  ui.css     HUD + pausa / victoria / derrota de la partida
      theme.css         colores, fuente (Lilita One), botones .btn y kbd compartidos
  test/                 tests de colisiones, escenarios de juego, NPCs y paleta
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
- **Secciones de clima en una línea** (`levels/sections.js`, guía completa en [`docs/clima.md`](../docs/clima.md)):
  `rainIsland({ id, from, length, shelters? })` → isla de lluvia de cualquier largo con carpas **alternadas izquierda / derecha** repartidas solas; `windIsland({ id, from, length, dir? })` → isla de viento; `...waveIsland({ id, from, length, breakwaters? })` → isla de oleaje + rompeolas (array: spread).
- **Rieles asimétricos** (`...railsPair({ id, from, length?, hazards? })`, guía en [`docs/rieles.md`](../docs/rieles.md)): dos carriles con piedras / huecos / topes **repartidos solos** según el largo (como las carpas de `rainIsland`); devuelve un **array** (usar spread).
- **Escenografía Kenney** (`dressLevel` / `dressIsland`, [`docs/escenografia.md`](../docs/escenografia.md)): props en las orillas con semilla fija; barcos en el agua. Los props **chocan** (tamaños medidos de los GLB con `node scripts/measure-kenney.mjs`).
- **Agua 3D** (`view/water.js`, [`docs/agua.md`](../docs/agua.md)): olas y espuma en código; la física sigue en `waterLevel`.
- `weather` en una plataforma (opcional, a mano): `'rain'` | `'wind'` | `'waves'` o `{ type, strength, dir, shelters, breakwaters }`. Esa isla pasa a tener clima, sin tocar nada más. Números en `CONFIG.weather`.
  - lluvia: `shelters: [{ x, z, w, d }]` = carpas donde no se moja (que entre la pareja: `w` ≥ 3.2).
  - viento: `dir: 'alternate'` (izq./der. alternado) | `'random'` | grados (0 = hacia +X).
- `npcs` (opcional): `{ difficulty: 'easy' | 'medium' | 'hard', platform: '<id>', x, z }`. Pasea solo dentro de esa plataforma. Números en `CONFIG.npcs`.
- `signs`, `props`: decoración.

El nivel avanza hacia **−Z** y el agua está en `y = 0`. Los tests verifican que los spawns y la meta estén sobre suelo.

---

## Para Zharick (UI)

La UI vive en `src/ui/` y **solo escucha**; no hace falta tocar `sim/`. El menú (`menu.js`) arma la selección y `main.js` crea una partida nueva por cada "Jugar" (al volver al menú se borra entera: `UI.destroy()`, `GameView.destroy()`). La partida arranca ya en `'playing'`; el estado `'title'` solo existe en la sim (tests). Botones: clase `.btn` de `theme.css` (`.big`, `.go`, `.light`, `.bad`, `.icon`). Se puede rehacer entera mientras use este contrato:

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
| `game:win` | `{ time, integrity, wetness, bombHealth, rating: 'perfect'\|'ok'\|'damaged', ratingLabel }` (`bombHealth`: % de la bomba al llegar, `null` sin bomba) |
| `bomb:beep` / `bomb:warn` / `bomb:explode` | `{ health }` / `{ health }` / `{}` |
| `bomb:hit` | `{ amount, cause, health }` (con la caja bomba, un golpe o agua le quitó `amount` %) |
| `bomb:desync` | `{}` (con la caja bomba, empezaron a ir desincronizados y la bomba pierde % por segundo) |
| `player:jump` / `player:land` | `{ player }` / `{ player, speed }` |
| `hazard:hit` | `{ player }` |
| `geyser:hit` | `{}` |
| `box:state` | `{ from, to }` |
| `box:impact` | `{ amount, cause, integrity }` |
| `box:wet` | `{ amount, cause, wetness }` |
| `box:drop` | `{ tilt }` |
| `npc:alert` / `npc:windup` | `{ id, difficulty }` (vio la caja / va a atacar) |
| `npc:shoot` | `{ id, x, y, z }` (medium disparó) |
| `npc:hit` | `{ id, difficulty, player, x, y, z }` (+ `box:impact` / `box:wet` con `cause: 'npc-easy' \| 'npc-medium' \| 'npc-hard'`) |
| `npc:splash` | `{ x, y, z }` (un chorro cayó al piso) |
| `weather:enter` / `weather:exit` | `{ type: 'rain' \| 'wind' \| 'waves', zone }` (la caja entra / sale de una isla con clima) |
| `weather:warn` / `weather:start` / `weather:end` | `{ type, zone, dir }` (aviso / empieza / termina el aguacero o la ráfaga; `dir` = `{x, z}` del viento) |
| `weather:shelter` | `{ type, zone, inside }` (la caja entra / sale de una carpa) |

Acciones: `game.togglePause()`, `game.retry()`, `game.restart()`, y `onMenu()` (opción del constructor de `UI`) para volver al menú. Los colores llegan como variables CSS (`--ui`, `--danger`, `--goal`, `--water`, `--box`) desde la paleta de Luis.

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
- NPCs: paseo dentro de su plataforma, semilla, visión, los 3 ataques y esquivar (arena de prueba en `test/fixtures/`).
- Clima: zonas desde `weather`, lluvia (aguacero empapa, carpas cubren, resbala), viento (empuje, inclinación, contenido, sincronía), ritmo con semilla.
- Oleaje: la cresta empuja y moja, el rompeolas del lado correcto tapa, saltar juntos esquiva, el rompeolas choca.
- Props Kenney: bounds medidos para cada modelo usado, forma por modelo, giro, choques, subir encima y que no tapen pasillo / spawns.
- Rieles: `railsPair` (carriles, huecos, piedras), bloqueo/salto, arena de prueba (`test/fixtures/`) y tramo del Muelle.
- Sanidad del nivel 1 y lectura de la paleta.

---

## Pendiente / ideas (fuera del camino crítico)

- Afinar números jugando 2P (`?debug`): sobre todo `twistDeg`, `dragLeanDeg`, `dropGrace` y `ratePerSec`.
- Soporte de gamepads (dos mandos = P1/P2).
- Capa C (modelos 3D) solo si sobra tiempo: ver [`docs/visual/PLAN.md`](../docs/visual/PLAN.md).

## Si no eres Danel

No inventes estructura aquí: entrega en `deliveries/` y avísale. Para UI, trabaja en `src/ui/` (ver arriba).

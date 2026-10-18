# Mecánicas

Fuente: código en `apps/src/sim/` + `apps/src/config.js`.  
Feel / perfiles: **Luis** · Código: **Danel** · Scope: `MVP_SCOPE.md`

## Core (ya en el build)
- Caja compartida (resorte, no soltar)
- Sincronía → velocidad / estabilidad
- Inclinación + critical → drop
- **Huequito** → baja integridad/contenido
- **Mojado** → penalizaciones; chorros; fall al agua
- Checkpoints, meta con rating (perfect / ok / dañada)
- **3 vidas por partida** (`CONFIG.respawn.lives`), con corazones en el panel de la izquierda del HUD (debajo de Sincronía):
  - **Caer al agua / al vacío** gasta una vida: la caja se moja (+45 %) y reaparecen en el último checkpoint con la caja como iba.
  - **Perder la caja** (suelta, vacía, empapada o explotada) gasta una vida: se la ve caer y reaparecen **solos** en el último checkpoint con la caja como estaba al pasar por él.
  - Si una caída además deshace la caja, cuenta como **una sola** vida (vuelve como estaba en el checkpoint).
  - **Sin vidas** sale la pantalla "¡Se acabaron las vidas!" y **Empezar de nuevo** reinicia el nivel desde la salida con las 3 vidas. **Reiniciar nivel** (pausa) también las devuelve.
- **Estaciones de recuperación** (`level.recovery`): aparatos **sueltos** a los lados del pasillo, con **borde verde** para marcar que se puede entrar. Cada uno hace una sola cosa y el jugador prueba cuál le sirve: fuente de cerveza (VIP), galletas (gato), mesa de taller (bomba), abanicos de piso (secan mojado **sin vaciar**). No reemplazan checkpoints. Knobs en `CONFIG.recovery`. Smoke en **El Muelle** (al spawn) y en La Aldea (checkpoint del vidrio).

## Trabajo de Luis
Tunear knobs y definir **perfiles** en `deliveries/luis/BOX_VARIANTS.md` — no rehacer el motor.

## Después (opcional)
Burla al fallar · mods/skins · más perfiles de caja

## Obstáculos del nivel
- Huecos entre plataformas
- Rodillos giratorios
- Plataformas móviles
- Agua debajo (castigo permanente)
- Clima: isla de **lluvia** (el aguacero empapa la caja; hay que meterse bajo las carpas) e isla de **viento** (ráfagas que empujan, inclinan y se llevan contenido). Se agrega a cualquier isla con `weather` en la plataforma, o en una línea con `rainIsland()` / `windIsland()`: ver [`clima.md`](./clima.md).
- **Rieles asimétricos**: dos tablones largos (uno por jugador) con piedras, huecos y topes **desfasados** — hay que coordinar saltos. `railsPair()` en `levels/sections.js`. Ver [`rieles.md`](./rieles.md).
- **Mapas de campaña** (menú): Nivel 1 El Muelle → Nivel 2 La Bahía → Nivel 3 La Tormenta (`?level=muelle|bahia|tormenta`). Misma caja y controles; crecen en largo, peligros apilados y checkpoints más separados. **Pista de selva** (no entra al ranking): La Aldea → El Templo → El Puente (`?level=aldea|templo|puente`).
- **Escenografía**: modelos Kenney en las orillas (`dressLevel`); ver [`escenografia.md`](./escenografia.md). Agua con olas en [`agua.md`](./agua.md).
- **Leaderboard arcade**: nombre + rol una vez al empezar a jugar; al ganar un mapa de campaña se envía el score. Hay ranking general y por mapa. Ver [`leaderboard.md`](./leaderboard.md).
- NPCs easy / medium / hard que botan contenido o mojan la caja. Al inicio del Muelle hay **una isla por NPC** (easy → medium → hard) unidas por puentes seguros con checkpoint,. Ver `apps/README.md`.

## Controles
Ver `docs/controls.md`.

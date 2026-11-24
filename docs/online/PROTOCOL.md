# Protocolo — Hold the Box online

Contrato entre el cliente (`frontend/`) y el servidor. Fuente de verdad del código: `backend/src/ws/protocol.js` (C→S) y `backend/src/match/snapshot.js` (snapshots).
**Si cambias un mensaje, actualiza este archivo en el mismo PR.**

- Estado: **MVP** = ya implementado. **#N** = lo implementa esa issue (épica #2).
- Todos los tiempos en segundos salvo que diga `Ms`. Posiciones en metros, mundo de la sim (avanzar = −Z).

---

## 1. REST

Base: `http(s)://<host>:<port>`. Errores: `{ "error": { "code": "ROOM_NOT_FOUND", "message": "…" } }` (también el 404 de una ruta que no existe: `NOT_FOUND`).
Límites por IP: **100 peticiones/min** en todo el API y **10/min** sumando todas las rutas `/auth/*` → `429 RATE_LIMITED`. En desarrollo y tests no se aplican a `127.0.0.1` (`RATE_LIMIT_SKIP_LOCAL`).
Rutas con 🔒 piden `Authorization: Bearer <token>`.

| Método | Ruta | Body | Respuesta | Estado |
|---|---|---|---|---|
| GET | `/health` | — | `{ ok, gameVersion, uptime, connections, rooms, matches, tickMs, db, redis }` (`db`/`redis`: `ok`·`down`·`disabled`) | MVP |
| GET | `/meta` | — | `{ gameVersion, levels:[{key,name}], boxes:[{id,name,blurb}] }` | MVP |
| POST | `/auth/guest` | `{ nickname }` (3–16, letras/números/espacio/_) | `201 { token, user }` | MVP |
| GET | `/rooms` | — | `{ rooms: RoomSummary[] }` (solo públicas) | MVP |
| GET | `/rooms/:code` | — | `{ room: RoomSummary }` · 404 `ROOM_NOT_FOUND` | MVP |
| POST | `/auth/register` | `{ username, password, displayName? }` | `201 { token, refreshToken, user }` · 409 `USERNAME_TAKEN` | MVP |
| POST | `/auth/login` | `{ username, password }` | `{ token, refreshToken, user }` · 401 `INVALID_CREDENTIALS` | MVP |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ token, refreshToken }` (el viejo queda revocado) · 401 `UNAUTHORIZED` | MVP |
| POST | `/auth/logout` 🔒 | `{ refreshToken }` | `204` | MVP |
| POST | `/auth/upgrade` 🔒 | `{ username, password }` (solo invitados) | `{ token, refreshToken, user }` mismo `id` · 409 `USERNAME_TAKEN` · 400 si ya es cuenta | MVP |
| GET/PATCH | `/me` 🔒 | `{ displayName }` | `{ user }` | MVP |
| GET | `/users/search?q=&limit=10` 🔒 | — | `{ users: [PublicUser & { isFriend, requestPending: 'in'\|'out'\|null }] }` (prefijo de username, ≥ 2 chars, sin ti, máx 20) | MVP |
| GET | `/friends` 🔒 | — | `{ friends: [{ user: PublicUser, since, presence: { status, roomCode? } }] }` | MVP |
| GET | `/friends/requests` 🔒 | — | `{ incoming: FriendRequest[], outgoing: FriendRequest[] }` (solo pendientes) | MVP |
| POST | `/friends/requests` 🔒 | `{ username }` | `201 { request }` · si el otro ya te la había enviado, se acepta: `201 { friend }` · 404 `USER_NOT_FOUND` · 400 a ti mismo · 409 `ALREADY_FRIENDS` / `REQUEST_PENDING` | MVP |
| POST | `/friends/requests/:id/accept` 🔒 | — | `{ friend: { user, since } }` (solo el destinatario) · 404 `REQUEST_NOT_FOUND` · 403 `FORBIDDEN` | MVP |
| POST | `/friends/requests/:id/decline` 🔒 | — | `204` (solo el destinatario) · 404 · 403 | MVP |
| DELETE | `/friends/requests/:id` 🔒 | — | `204` cancela la enviada (solo el remitente) · 404 · 403 | MVP |
| DELETE | `/friends/:userId` 🔒 | — | `204` · 404 `NOT_FRIENDS` | MVP |
| POST | `/rooms/:code/invite` 🔒 | `{ userId }` | `201 { invite: Invite }` (tienes que estar en esa sala; mismos errores que `room:invite`) | MVP |
| GET | `/me/invites` 🔒 | — | `{ invites: Invite[] }` (vigentes, para ti) | MVP |
| POST | `/friends/:userId/join` 🔒 | — | `{ code }` te une a la sala del amigo si está en un lobby · 403 `NOT_FRIENDS` · 409 `FRIEND_NOT_IN_LOBBY` · errores de `room:join` | MVP |
| GET | `/me/matches` 🔒 | `?limit=20&before=<iso>` (máx 50; `before` = `endedAt` del último de la página) | `{ matches: MatchHistory[] }` (más reciente primero) | hecho (#8) |
| GET | `/users/:id/stats` 🔒 | — | `{ played, wins, podiums, finishes, bestTimes:{level:sec}, favoriteLevel }` · 404 `USER_NOT_FOUND` | hecho (#8) |

`user` = `{ id, username|null, displayName, isGuest, createdAt }`.
`MatchHistory` = `{ id, level, boxProfile, endedAt, durationS, placement, status, finishTime|null, rating|null, teammates:[{id,displayName}] }` (dúo de sofá: una entrada y sin compañeros). Stats: `wins` = puesto 1 llegando a la meta · `podiums` = puesto ≤ 3 · `finishes` = llegó a la meta. Las partidas cortadas en la cuenta atrás no se guardan.
`PublicUser` = `{ id, username, displayName }` · `FriendRequest` = `{ id, from: PublicUser, to: PublicUser, createdAt }`.
Amigos: todas las rutas `/friends*` y `/users/search` piden **cuenta**; con token de invitado → 403 `ACCOUNT_REQUIRED`.
Presencia: `offline` (desconectado) · `online` (conectado, sin sala) · `in_lobby` (sala en lobby o resultados) · `in_match` (cuenta atrás o partida). Vive en Redis con TTL 60 s que renueva el heartbeat; si el servidor muere, pasa sola a `offline`. Los invitados no publican presencia.
Invitaciones a sala: duran **120 s** (Redis `invite:{id}` con TTL, o memoria). Se cancelan solas si la sala empieza la partida o se cierra. Unirse por REST sin WebSocket abierto te deja en la sala como desconectado: si no conectas dentro de la gracia de reconexión, sales.
Cuentas: `username` `^[a-z0-9_]{3,16}$` (se guarda en minúsculas; el login no distingue mayúsculas), `password` 8–72.
Tokens: `token` (JWT `{ sub, name, guest }`) dura **15 min** en cuentas y **1 día** en invitados (no tienen refresh). `refreshToken` dura 30 d y sirve **una sola vez**: `/auth/refresh` devuelve uno nuevo.
`RoomSummary` = `{ code, state, level, boxProfile, players, spectators, capacity, maxDuos, host }` (`players` = con puesto; las salas en partida o llenas se pueden mirar con `room:spectate`).

---

## 2. WebSocket

Conexión: `GET /ws?token=<JWT>` (mismo puerto). `?bin=1` negocia **snapshots en binario** (msgpack); el resto de mensajes siguen en JSON. Si no pides `bin`, todo va en JSON. Rechazos en el upgrade: token inválido → **401** · más de 3 conexiones/s desde la misma IP → **429** · servidor lleno (`MAX_CONNECTIONS`) → **503** · `Origin` fuera de `CORS_ORIGIN` (si no es `*`) → **403**.
Una sola conexión por usuario: si abres otra, la vieja se cierra con código **4001 `replaced`**.
Límite de mensajes por conexión: `input` 90/s (ráfaga 120), lo que sobra **se descarta sin aviso**; el resto 20/s (ráfaga 40) → `error RATE_LIMITED`; si se sigue pasando durante 5 s, se cierra con **4008 `rate limited`**.

**Reconexión (#14):** si se corta, el usuario sigue en su sala durante `RECONNECT_GRACE_MS` (30 s) con `online: false`. Si vuelve a conectar con **el mismo token** dentro de la gracia: conserva dúo y puesto (en lobby pierde el "listo") y, si hay partida, recibe `room:state` + `match:start { resume: true }` + un `match:snapshot` completo al instante. Si no vuelve: en lobby/resultados sale de la sala (si era anfitrión, lo hereda el más antiguo); en partida su puesto sigue con input neutro, queda `abandoned: true` en el ranking y sale al volver al lobby. Si vuelve tarde pero la partida sigue, retoma y deja de estar `abandoned`.
Heartbeat: el servidor manda `ping` de protocolo cada 15 s; si no hay `pong`, cierra.

### Envoltura

```json
{ "t": "room:join", "d": { "code": "AB12CD" }, "rid": 7 }
```
- `t` tipo, `d` datos (opcional), `rid` id de petición (opcional, string|number).
- Si mandas `rid`, el servidor contesta **`ack`** `{ t, ...extra }` o **`error`** `{ code, message }` con el mismo `rid`.
- Máximo 4 KB por mensaje. JSON de texto (binario → issue de optimización).

### Cliente → Servidor

| `t` | `d` | ack extra | Notas |
|---|---|---|---|
| `room:create` | `{ level='muelle', maxDuos=4 (1–8), isPrivate=false, boxProfile='vip' }` | `{ code }` | Sale de la sala actual. El creador es host y se sienta en dúo 0 / P1. |
| `room:join` | `{ code }` (6 chars, mayús/minús) | `{ code }` | Se sienta solo: primero completa dúos a medias. |
| `room:leave` | `{}` | — | Si la sala queda vacía se destruye. Host → hereda el más antiguo. |
| `room:setTeam` | `{ teamId (0–7), slots: [1] \| [2] \| [1,2] }` o `{ teamId: null }` | — | `[1,2]` = **dúo de sofá** (2 personas en un teclado, una conexión). `teamId: null` = levantarse y **mirar** (espectador). Quita el “listo”. Solo en lobby. |
| `room:ready` | `{ ready }` | — | |
| `room:settings` | `{ level?, maxDuos?, isPrivate?, boxProfile? }` | — | Solo host, solo en lobby. Quita el “listo” a todos. |
| `room:setChars` | `{ p1?, p2? }` (ids de `frontend/src/characterIds.js`) | — | Igual que el menú: `p1` = tu personaje (el de tu slot); `p2` = el del slot 2 si eres dúo de sofá. Sin escoger → el de siempre de ese slot. Solo en lobby. |
| `room:kick` | `{ userId }` | — | Solo host. Al echado le llega `room:kicked`. |
| `room:start` | `{}` | `{ matchId }` | Solo host. Requiere: ≥1 dúo, todos los dúos ocupados completos, todos listos (el host no). |
| `input` | `{ seq, slot=1, x, z, jump=false, jumpHeld=false }` | — | **Hot path**, sin `rid`. `x,z ∈ [-1,1]` (W = z −1). `jump` = se pulsó desde el último input (flanco). `seq` creciente por slot (se descartan repetidos/viejos). Enviar ~30 Hz o al cambiar. |
| `ping` | `{ t: Date.now() }` | — | Responde `pong { t, serverTime }` → RTT y offset de reloj. |
| `room:invite` | `{ userId }` | `{ inviteId, expiresAt }` | MVP. Solo a amigos; re-invitar devuelve la vigente. Errores: `NOT_IN_ROOM` `NOT_FRIENDS` `ALREADY_IN_ROOM` `ROOM_FULL` `ROOM_IN_GAME` `RATE_LIMITED` (10/min). |
| `invite:accept` | `{ inviteId }` | `{ code }` + `room:state` | MVP. `INVITE_EXPIRED` (vencida o no es para ti) y errores de `room:join`. |
| `invite:decline` | `{ inviteId }` | `{}` | MVP. `INVITE_EXPIRED`. |
| `room:spectate` | `{ code }` | `{ code }` | Entra a **mirar**, también con la partida en curso (si hay, llega `match:start { spectate: true }` + snapshot). No ocupa puesto; máx. `MAX_SPECTATORS` (8) → `ROOM_FULL`. `room:join` a una sala en partida da `ROOM_IN_GAME`. |
| `match:watch` | `{ duo }` | `{ duo }` (el que de verdad recibes) | Elige qué dúo mirar: cambia el `own` y los eventos privados que recibes. Vale para espectadores y para jugadores cuyo dúo ya llegó o se quedó sin vidas; mientras tu dúo corre, siempre recibes el tuyo. |
| `queue:join` | `{ mode: 'duo' \| 'solo', level? }` | — | MVP · `solo` = me emparejan con otro; `duo` = entro con mi dúo de sofá. Saca de la sala actual. |
| `queue:leave` | `{}` | — | MVP · salgo de la cola. |
| `emote` | `{ id }` | — | MVP · `id` de una lista cerrada (ver `backend/src/social/emotes.js`). Rate limit 1/1,5 s (el resto se descarta, sin error). |

### Servidor → Cliente

| `t` | `d` | Cuándo |
|---|---|---|
| `welcome` | `{ user:{id,name,guest}, serverTime, gameVersion, tickHz, snapshotHz, binary }` | Al conectar. El cliente compara `gameVersion` con la suya (`import.meta.env.VITE_GIT_SHA` o la versión de `frontend/package.json`) y avisa si no coinciden. `binary: true` si pediste `?bin=1` (los `match:snapshot` llegan en msgpack). |
| `ack` / `error` | ver arriba | Respuesta a mensajes con `rid`. `error` también sin `rid` (mensaje inválido). |
| `pong` | `{ t, serverTime }` | |
| `room:state` | `RoomState` | Cada cambio de la sala (entra/sale alguien, listo, dúos, estado). Siempre estado completo. |
| `room:kicked` | `{ code }` | Te echó el host. |
| `match:start` | `MatchStart` | Al arrancar (empieza la cuenta atrás) y al reconectar (`resume: true`). |
| `match:snapshot` | `Snapshot` | ~20 Hz durante `playing` (y uno al reconectar). Puede descartarse si tu socket va atrasado. `own` es distinto para cada dúo. |
| `match:events` | `{ events: MatchEvent[] }` | Junto a cada snapshot, si hubo eventos. Nunca se descartan. Incluye los públicos de todos + los privados de tu dúo. |
| `match:end` | `MatchEnd` | Fin de partida. La sala pasa a `results` y ~10 s después a `lobby`. |
| `friend:request` | `{ request: FriendRequest }` (al destinatario) | MVP |
| `friend:accepted` | `{ friend: { user, since } }` (al remitente; `user` = quien aceptó) | MVP |
| `friend:declined` | `{ requestId }` (al remitente) | MVP |
| `friend:removed` | `{ userId }` (al otro; `userId` = quien lo eliminó) | MVP |
| `friend:presence` | `{ userId, status: 'offline'\|'online'\|'in_lobby'\|'in_match', roomCode? }` (a los amigos conectados, solo cuando cambia; `roomCode` en `in_lobby`/`in_match`) | MVP |
| `invite:received` | `Invite` = `{ inviteId, from:{id,displayName}, roomCode, level, expiresAt }` (al invitado) | MVP |
| `invite:declined` | `{ inviteId, userId }` (al que invitó) | MVP |
| `invite:cancelled` | `{ inviteId }` (al invitado: la sala empezó la partida o se cerró) | MVP |
| `emote` | `{ userId, duo|null, slot|null, id, t }` | MVP · a toda la sala. En partida, `duo`/`slot` para pintarlo sobre el personaje; en lobby, `null`. |
| `queue:status` | `{ mode, level, position, waiting, etaSec }` | MVP · cada 2 s mientras estás en cola (y al entrar). |
| `queue:matched` | `{ code }` | MVP · te emparejaron: sigue el `room:state` normal de la sala automática. |

### Tipos

```ts
RoomState = {
  code, hostId, state: 'lobby'|'countdown'|'playing'|'results',
  level, boxProfile: 'vip'|'gato'|'bomba', isPrivate, maxDuos,
  members: [{ userId, name, role: 'player'|'spectator', ready, teamId|null, slots: (1|2)[],
              chars: { p1: id|null, p2: id|null }, online, abandoned, watch: duo|null }],
  teams:   [{ id, slots: { 1: userId|null, 2: userId|null } }],
  matchId|null, lastResults: MatchEnd|null
}

MatchStart = {
  matchId, level, boxProfile, seed, countdownSec, timeLimitSec, fixedStep,
  duos: [{ id, players: [{ slot: 1|2, userId, name, char, alt }] }],   // alt = P2 con colores alternos
  snapshot: { tick, time, duos: DuoState[] },   // estado inicial (cuenta atrás). Sin `own`: tu mundo inicial
                                                // es exactamente new Game(LEVELS[level], { seed }) tras selectBox(boxProfile)
  resume?: true,                                // reconexión: justo después llega un match:snapshot completo
  spectate?: true                               // entras a mirar (no tienes puesto)
}
```

### Snapshot = codec compartido `frontend/src/net/duoState.js`

El estado de cada dúo lo serializa **el mismo módulo** que el cliente usa para volcarlo sobre un `Game` local
(`applyLightDuoState`, `applyWorldDuoState`). La forma exacta está en ese archivo; aquí el resumen:

> **Cuantización** (red): el wire lleva **enteros** — posiciones/velocidades en **cm**, ángulos en **0,1°**,
> unitarios (`axis`/`forward`/`dir`) ×1000, porcentajes (`integrity`/`wetness`/`health`/`rage`) enteros,
> 0..1 (`sync`/`desync`) ×100 y tiempos ×100 (0,01 s). `applyLightDuoState`/`applyWorldDuoState` dividen al volcar.
> La pérdida es solo visual (cm/0,1°/%) y nunca afecta al determinismo del servidor.

```ts
Snapshot = {
  tick, time,                    // reloj de partida (s desde que empezó playing)
  duos: DuoState[],              // TODOS los dúos
  own: OwnState | null           // el mundo del dúo que ves: el tuyo mientras corre; si miras, el de match:watch
                                 // (o el primero). Aplícalo al dúo own.id
}

DuoState = {                     // = { id, status, ghost, online } + lightDuoState(game)
  id, status: 'waiting'|'racing'|'finished'|'eliminated',
  ghost,                         // recién aparecido: sin colisión con otros dúos
  online: { 1: bool, 2: bool },
  state: 'playing'|'failing'|'failed'|'won', lives, checkpoint, respawnTimer, runTime, time, failReason, result,
  players: [{ pos:[x,y,z], vel:[x,y,z], actualVel:[x,y,z], grounded, knockTimer }],   // [P1, P2]
  box: { center:[x,y,z], axis:[x,z], forward:[x,z], tilt:[roll,pitch,mag], state, sync,
         integrity, wetness, leakRate, dropped, criticalTime, invuln },
  cat:  { phase, rage, swipeLeft, anim, side, victim },
  bomb: { health, exploded, sinceBeep|null, sinceDrain|null, desync }      // null = Infinity
}

OwnState = {                     // = { id } + worldDuoState(game)
  id,
  npcs: [{ pos:[x,y,z], vel:[x,z], state, facing, windup, phase|null }],    // mismo orden que game.npcs.list
  projectiles: [{ npc: index, pos, vel, life }],
  weather: { current: zoneIndex|-1, sheltered,
             zones: [{ phase, timer, phaseLen, intensity, dir:[x,z]|null, boxShelter: index|-1 }] },
  glassBroken: string[],         // ids de paneles rotos (applyWorldDuoState devuelve los recién rotos → shatter)
  recovery: bool[],              // estación activa, mismo orden que world.recovery
  cacti: { near, lunge: number[] }
}

MatchEvent = { duo: teamId, e: string, d: object, t: time }
```

`e` públicos, a todos (`backend/src/match/events.js`): `game:start game:checkpoint game:splash game:life game:respawn game:fail game:win player:jump player:land hazard:hit geyser:hit box:state box:impact box:drop npc:shoot npc:hit npc:splash cat:scratch bomb:hit bomb:explode glass:break cactus:poke`. `d.player` (1|2) es el jugador dentro del dúo.
`e` privados, solo a tu dúo (`PRIVATE_EVENTS` en `duoState.js`): `box:wet bomb:beep bomb:warn bomb:desync cat:warn cat:shred cat:goal recovery:enter recovery:tick recovery:exit weather:enter weather:exit weather:warn weather:start weather:end weather:shelter`. `recovery:tick` y `box:wet` llegan agrupados (el último de cada snapshot).
Del servidor: `player:bump { player, by:{duo,player}, force }`, `player:stomp { player, by:{duo,player} }` (le cayó encima), `box:bump { other, force }` (chocó con la caja de `other`), `duo:finished { time, rating, … }`, `duo:eliminated { checkpoint }`, `player:disconnected { userId }`.

```ts
MatchEnd = {
  matchId, level, boxProfile, seed, reason: 'allDone'|'timeLimit'|'aborted', time,
  startedAt: iso|null,   // null si se cortó en la cuenta atrás
  ranking: [{ placement, teamId, status: 'finished'|'eliminated'|'dnf', finishTime|null,
              checkpoint, distance, lives, rating|null, integrity, wetness,
              players: [{ slot, userId, name, abandoned }] }]
}
```

### Códigos de error

`BAD_REQUEST · UNKNOWN_TYPE · UNAUTHORIZED · FORBIDDEN · NOT_IN_ROOM · ROOM_NOT_FOUND · ROOM_FULL · ROOM_IN_GAME · NOT_HOST · SLOT_TAKEN · CANNOT_START · USERNAME_TAKEN · INVALID_CREDENTIALS · ACCOUNT_REQUIRED · USER_NOT_FOUND · ALREADY_FRIENDS · REQUEST_PENDING · REQUEST_NOT_FOUND · NOT_FRIENDS · ALREADY_IN_ROOM · RATE_LIMITED · INVITE_EXPIRED · FRIEND_NOT_IN_LOBBY · NOT_FOUND · INTERNAL`
Cierres del WebSocket: **4001** `replaced` (abriste otra conexión) · **4008** `rate limited` (demasiados mensajes).

---

## 3. Cómo lo consume el cliente (`frontend/`)

Implementado en `frontend/src/net/` (`netClient.js`, `onlineMatch.js`, `onlineSession.js`) — ver `frontend/README.md` § Online. Pasos:

1. `POST /auth/guest` → token → `new WebSocket(ws://…/ws?token=…)`. Comparar `welcome.gameVersion`.
2. Lobby: `room:create` / `room:join` / `room:setChars` / `room:ready` → pintar `room:state`.
3. `match:start` → `selectBox(boxProfile)` y, **por cada dúo**, `new Game(LEVELS[level], { seed })` que **nunca** se simula (`update` no se llama): es solo el contenedor de estado que leen las vistas. Volcar `snapshot.duos[i]` con `applyLightDuoState`.
4. Vista: el `Game` de **tu** dúo se dibuja con `GameView` tal cual (nivel, NPCs, clima, HUD, audio). Los otros dúos solo necesitan `PlayerView` ×2 + `BoxView` (con `char`/`alt` de `match:start`): separar de `GameView` una `DuoView` reutilizable (#12).
5. Cada frame: leer teclado (`input.js`), mandar `input` por cada slot propio (~30 Hz o al cambiar; `jump: true` solo el frame del flanco).
6. `match:snapshot`: buffer de 2–3 snapshots y render **~100 ms atrás**: interpolar `players[].pos` y `box.center/tilt` entre los dos que rodean el render time, y volcar el resto tal cual (`applyLightDuoState` sobre una copia interpolada). `own` → `applyWorldDuoState(miGame, own)`; los ids que devuelve → `levelView.shatter(id)`. `game.world.update(snapshot.time)` mueve plataformas, rodillos y chorros.
7. `match:events`: cada `Game` tiene su propio `game.events`; reemitir `e.e` / `e.d` en el `Game` del dúo `e.duo` → la vista, la UI y el audio existentes reaccionan solos. Para otros dúos, además, toasts tipo “¡A {nombres} se les cayó la caja!”.
8. `match:end` → ranking; `room:state` vuelve a `lobby`. La UI online no usa `togglePause` / `retry` / `restart`.

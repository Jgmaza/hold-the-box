# backend/ — servidor online

Fastify (REST) + `ws` (WebSocket) en el mismo puerto. Estado de salas y partidas en memoria; la partida corre la sim de `../frontend/src` a 120 Hz y manda snapshots a 20 Hz.

```bash
npm install
cp .env.example .env    # opcional: defaults en src/config/env.js
npm run dev             # http://localhost:3000 · ws://localhost:3000/ws?token=…
npm test
npm run bots -- --rooms 2 --bots 8 --seconds 20
```

## Probar a mano

```bash
TOKEN=$(curl -s -XPOST localhost:3000/auth/guest -H 'content-type: application/json' -d '{"nickname":"ana"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
npx wscat -c "ws://localhost:3000/ws?token=$TOKEN"
> {"t":"room:create","d":{"maxDuos":1},"rid":1}
> {"t":"room:setTeam","d":{"teamId":0,"slots":[1,2]},"rid":2}
> {"t":"room:start","rid":3}
> {"t":"input","d":{"seq":1,"slot":1,"x":0,"z":-1}}
```

## Estructura

```
src/app.js        Fastify + rutas + gateway (inyección de dependencias)
src/ws/           gateway, protocolo (zod), hub de conexiones
src/rooms/        salas (lobby) y RoomManager (ticker, envío por destinatario)
src/match/        Match (lockstep), Duo (Game de la sim), colisiones entre dúos, snapshots
src/game/         única puerta a ../frontend/src
src/db/           Drizzle: schema, client, migrate  ·  drizzle/ migraciones SQL
src/redis.js      cliente ioredis (prefijo htb:)
test/  tools/
```

Contrato: [`../docs/PROTOCOL.md`](../docs/PROTOCOL.md) · Diseño: [`../docs/SDD.md`](../docs/SDD.md)

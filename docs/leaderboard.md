# Leaderboard arcade (IP + Supabase)

Ranking sin cuentas. La Edge Function lee la IP, la hashea y guarda el **mejor score por mapa**. Hay tablero **general** (suma de mejores) y uno **por mapa**.

GitHub Pages **no** guarda datos (solo front). La BD vive en Supabase.

## Fórmula (por mapa)

```
score = round(integrity * 1000 - timeSec * 10 - wetness * 5)
```

Más alto = mejor. **General** = mejor Muelle + mejor Bahía + mejor Tormenta.

## Flujo

1. Menú → **Jugar** → si esa IP aún no tiene nombre → modal **Tu nombre** + rol (una sola vez).
2. Ganas un mapa de campaña → `POST { action: "score", ... }` (no hace falta completar los 3).
3. Menú → **Records** → tabs General / Muelle / Bahía / Tormenta (`GET ?action=board&scope=…`).

## Proyecto

- URL: `https://pnzkrbdlrtukthyrvdri.supabase.co`
- Function: `/functions/v1/leaderboard`
- Tabla: `public.arcade_records` (migración en `supabase/migrations/`)

### Si el proyecto está INACTIVE

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → proyecto → **Restore / Resume**.
2. SQL Editor: pega y ejecuta [`supabase/migrations/20261017200000_arcade_records.sql`](../supabase/migrations/20261017200000_arcade_records.sql).
3. Edge Functions → crear/deploy `leaderboard` con el código de [`supabase/functions/leaderboard/index.ts`](../supabase/functions/leaderboard/index.ts), **Verify JWT = off**.
4. Secrets de la function: `LEADERBOARD_SALT` (cualquier string) — `SUPABASE_URL` y `SERVICE_ROLE` suelen inyectarse solos.
5. Project Settings → API → copia la **anon/public** key.

### Front (local / Pages)

En `apps/.env` (local) o secrets de GitHub Actions (Pages):

```
VITE_LEADERBOARD_URL=https://pnzkrbdlrtukthyrvdri.supabase.co/functions/v1/leaderboard
VITE_SUPABASE_ANON_KEY=eyJ...   # anon key del proyecto
```

El build de Pages debe recibir esas vars (ver workflow). Sin anon key, el gateway de Functions puede responder 401.

## API

| Acción | Body / query | Respuesta |
|--------|--------------|-----------|
| `board` | `GET ?action=board&scope=general\|muelle\|bahia\|tormenta&limit=10` | `{ scope, board: [...] }` |
| `score` | `POST { action, level, score, time, integrity, wetness }` | `{ improved, bests, total, saved }` |
| `save` | `POST { action, name, role }` | `{ saved, ... }` (idempotente si ya hay nombre) |
| `me` | `POST { action: "me" }` | status de esta IP |

Roles: `CARGADOR` · `CAPITAN` · `GRUMETE` · `PIRATA`. Nombre: 3–8 chars `A-Z0-9`.

## Issue

[#14](https://github.com/Jgmaza/no-sueltes-la-caja/issues/14)

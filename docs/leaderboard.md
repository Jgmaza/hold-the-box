# Leaderboard arcade (IP + Supabase)

Ranking sin cuentas. La Edge Function lee la IP, la hashea y guarda el **mejor score por mapa**. Hay tablero **general** (suma de mejores) y uno **por mapa**.

GitHub Pages **no** guarda datos (solo front). La BD vive en Supabase.

## Fórmula (por mapa)

```
score = round(integrity * 1000 - timeSec * 10 - wetness * 5)
```

Más alto = mejor. **General** = mejor Muelle + mejor Bahía + mejor Aldea + mejor Campamento.

## Flujo

1. Menú → **Jugar** → si esa IP aún no tiene nombre → modal **Tu nombre** + rol (una sola vez).
2. Ganas un mapa → `POST { action: "score", ... }` (no hace falta completar los 4).
3. Menú → **Records** → tabs General / Muelle / Bahía / Aldea / Campamento (`GET ?action=board&scope=…`).

## Proyecto

- URL: `https://pnzkrbdlrtukthyrvdri.supabase.co`
- Function: `/functions/v1/leaderboard`
- Tabla: `public.arcade_records` (migración en `supabase/migrations/`)

### Si el proyecto está INACTIVE

1. Abre [Supabase Dashboard](https://supabase.com/dashboard) → proyecto → **Restore / Resume**.
2. SQL Editor: pega y ejecuta, en orden, [`20261017200000_arcade_records.sql`](../supabase/migrations/20261017200000_arcade_records.sql) y [`20261018120000_campaign_maps.sql`](../supabase/migrations/20261018120000_campaign_maps.sql) (Aldea y Campamento; la Tormenta deja de sumar).
3. Edge Functions → crear/deploy `leaderboard` con el código de [`supabase/functions/leaderboard/index.ts`](../supabase/functions/leaderboard/index.ts), **Verify JWT = off**.
4. Secrets de la function: `LEADERBOARD_SALT` (cualquier string) — `SUPABASE_URL` y `SERVICE_ROLE` suelen inyectarse solos.
5. Project Settings → API → copia la **anon/public** key.

### Pasar a los 4 mapas (Muelle, Bahía, Aldea, Campamento)

Para quien tenga acceso al proyecto. **El orden importa:** la function nueva lee `score_aldea` / `score_campamento`; si se despliega antes de la migración, todo el ranking falla.

```
npx supabase login
npx supabase link --project-ref pnzkrbdlrtukthyrvdri
npx supabase db push                                       # 1. migración 20261018120000_campaign_maps.sql
npx supabase functions deploy leaderboard --no-verify-jwt  # 2. function
```

(Sin CLI: pegar la migración en el SQL Editor y luego desplegar la function desde el Dashboard.)

Comprobar: `GET ?action=board&scope=aldea` debe responder `"scope":"aldea"`. Mientras la function siga vieja, el front muestra «— Pronto —» en las pestañas Aldea y Campamento y no manda puntajes de esos mapas (no se rompe nada). `score_tormenta` / `time_tormenta` quedan en la tabla pero ya no suman.

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
| `board` | `GET ?action=board&scope=general\|muelle\|bahia\|aldea\|campamento&limit=10` | `{ scope, board: [...] }` |
| `score` | `POST { action, level, score, time, integrity, wetness }` | `{ improved, bests, total, saved }` |
| `save` | `POST { action, name, role }` | `{ saved, ... }` (idempotente si ya hay nombre) |
| `me` | `POST { action: "me" }` | status de esta IP |

Roles: `CARGADOR` · `CAPITAN` · `GRUMETE` · `PIRATA`. Nombre: 3–8 chars `A-Z0-9`.

## Issue

[#14](https://github.com/Jgmaza/hold-the-box/issues/14)

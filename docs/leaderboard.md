# Leaderboard arcade (IP + Supabase)

Ranking estilo máquina arcade: **sin cuentas**. La Edge Function lee la IP, la hashea y guarda el mejor score por mapa. Al completar los **3 mapas de campaña**, se puede registrar un nombre corto + rol.

GitHub Pages **no** guarda datos (solo front). La BD vive en Supabase.

## Fórmula (por mapa)

```
score = round(integrity * 1000 - timeSec * 10 - wetness * 5)
```

Más alto = mejor. **Total** = mejor Muelle + mejor Bahía + mejor Tormenta.

## Flujo

1. Ganas un mapa de campaña → el juego hace `POST { action: "score", ... }`.
2. Si esa IP ya tiene score en los 3 mapas y aún no tiene nombre → modal **¿GUARDAR RECORD?**
3. Menú → **Records** → `GET ?action=board` (top 10 con nombre).

## Proyecto

- URL: `https://pnzkrbdlrtukthyrvdri.supabase.co`
- Function: `/functions/v1/leaderboard`
- Tabla: `public.arcade_records` (migración en `supabase/migrations/`)

### Si el proyecto está INACTIVE

1. Abrí [Supabase Dashboard](https://supabase.com/dashboard) → proyecto → **Restore / Resume**.
2. SQL Editor: pegá y ejecutá [`supabase/migrations/20261017200000_arcade_records.sql`](../supabase/migrations/20261017200000_arcade_records.sql).
3. Edge Functions → crear/deploy `leaderboard` con el código de [`supabase/functions/leaderboard/index.ts`](../supabase/functions/leaderboard/index.ts), **Verify JWT = off**.
4. Secrets de la function: `LEADERBOARD_SALT` (cualquier string) — `SUPABASE_URL` y `SERVICE_ROLE` suelen inyectarse solos.
5. Project Settings → API → copiá la **anon/public** key.

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
| `board` | `GET ?action=board&limit=10` | `{ board: [{ rank, name, role, muelle, bahia, tormenta, total }] }` |
| `score` | `POST { action, level, score, time, integrity, wetness }` | `{ improved, bests, total, canSave, saved }` |
| `save` | `POST { action, name, role }` | `{ saved, ... }` |
| `me` | `POST { action: "me" }` | status de esta IP |

Roles: `CARGADOR` · `CAPITAN` · `GRUMETE` · `PIRATA`. Nombre: 3–8 chars `A-Z0-9`.

## Issue

[#14](https://github.com/Jgmaza/no-sueltes-la-caja/issues/14)

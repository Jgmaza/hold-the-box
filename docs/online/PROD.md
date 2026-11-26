# Online en producción — checklist Jose

El front en **GitHub Pages** ya tiene el cliente Online.  
Para que Multijugador funcione hace falta un **API vivo con HTTPS + WSS**.

## Estado hoy (2026-11-26)

| Pieza | Estado |
|---|---|
| Front Pages | ✅ https://jgmaza.github.io/hold-the-box/ |
| Var `VITE_SERVER_URL` | ❌ **No puesta** — sin ella el menú Online intenta `http://jgmaza.github.io:3000` (falla) |
| API (Node + WS) | ❌ **No hay URL pública** conocida |
| Postgres / Redis | ❌ Solo en el diseño de Danel (VPS / Fly / Upstash) |

`hold-the-box.vercel.app` del repo de Danel → **404** (no hay deploy).

---

## Qué tiene / debía tener Danel (y tú no)

Según `backend/docker-compose.yml` + issue T8 del monorepo de Danel:

1. **Un servidor siempre encendido** (VPS con Docker + nginx, o Fly.io).  
   El API **no** corre en GitHub Pages ni en Vercel serverless (WebSocket + tick 60 Hz + estado en memoria).
2. **URL pública del API**, p.ej. `https://api.tudominio.com` o `https://htb.fly.dev`  
   → esa es la que va en `VITE_SERVER_URL`.
3. **`JWT_SECRET`** fuerte en el server (`openssl rand -hex 32`).
4. **`CORS_ORIGIN`** = origen del front:  
   `https://jgmaza.github.io`  
   (si usas otro dominio Vercel, ese).
5. **Opcional pero recomendado:** `DATABASE_URL` (Postgres) + `REDIS_URL`.  
   Sin ellos el server corre **en memoria** (vale para demo; se pierde al reiniciar).
6. **Nginx / TLS** delante (WSS). En el compose de Danel el puerto solo escucha en `127.0.0.1` y nginx publica HTTPS.

### Mensaje corto para Danel

> ¿Tienes el backend de Hold the Box desplegado en algún lado?  
> Necesito la **URL HTTPS** del API (la de `/health`) para ponerla en Pages como `VITE_SERVER_URL`,  
> y que `CORS_ORIGIN` incluya `https://jgmaza.github.io`.  
> Si aún no está arriba, ¿me pasas acceso al VPS / Fly o lo levantamos juntos?

---

## Cuando tengas la URL del API

### 1) Variable de GitHub (Pages)

Repo → **Settings → Secrets and variables → Actions → Variables**:

| Name | Value |
|---|---|
| `VITE_SERVER_URL` | `https://TU-API` (sin `/` final) |

Luego **Actions → Deploy Pages → Run workflow** (o push a `main`) para rebuild.

### 2) En el server de Danel / tuyo

```env
JWT_SECRET=<openssl rand -hex 32>
CORS_ORIGIN=https://jgmaza.github.io
TRUST_PROXY=true
# opcional:
DATABASE_URL=postgres://...
REDIS_URL=redis://...
HOST_PORT=3001
```

Comprobar:

```bash
curl -s https://TU-API/health
# → { "ok": true, ... }
```

Desde el navegador en Pages → Online → guest → crear sala.

### 3) Vars viejas (arcade)

`VITE_LEADERBOARD_URL` y `VITE_SUPABASE_ANON_KEY` ya **no** las usa el front monorepo. Se pueden borrar cuando quieras.

---

## Mínimo para la expo (si no hay VPS de Danel)

1. Fly.io / Railway / un VPS barato.  
2. `docker compose -f backend/docker-compose.yml up -d --build` (o `fly launch` con el Dockerfile de `backend/`, **context = raíz del repo**).  
3. Poner `VITE_SERVER_URL` y redeploy Pages.  
4. Probar 2 PCs / 2 pestañas.

Detalle compose y nginx: [`../DEPLOY.md`](../DEPLOY.md).

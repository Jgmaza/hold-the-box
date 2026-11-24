# Deploy — Jose

Onboarding del equipo (Git + CI/CD): [`ONBOARDING.md`](./ONBOARDING.md).  
Online (contrato / diseño): [`online/PROTOCOL.md`](./online/PROTOCOL.md) · [`online/SDD.md`](./online/SDD.md).

El juego vive en `frontend/` (PlayCanvas + Vite). El servidor online en `backend/`.

## ¿Dónde se despliega?

| Destino | Para qué | Cómo |
|---|---|---|
| **GitHub Pages** | Front estático (local + UI online) | **CI/CD** al mergear a `main` |
| **API (VPS / Docker)** | Salas, partidas, auth, WSS | `backend/docker-compose.yml` + nginx |
| **itch.io** (HTML5) | Jam / zip estático | Zip manual del build |

**Repo:** https://github.com/Jgmaza/hold-the-box  
**URL GitHub Pages:** https://jgmaza.github.io/hold-the-box/

> Pages solo sirve el **front**. Online necesita `VITE_SERVER_URL` apuntando al API con HTTPS/WSS.

---

## Flujo de producción (Pages)

```
work/<persona> → PR a dev → playtest
dev → PR a main (aprobación de Jose + CI verde) → merge → Deploy Pages automático
```

CI en PRs: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — tests backend + frontend + build.

Variable de repo para Pages: `VITE_SERVER_URL` (Settings → Variables). Sin ella, Online intenta `http://<host>:3000`.

---

## Build local (front)

```bash
git checkout main && git pull
npm run install:all
npm test
npm run build:frontend       # → frontend/dist/
```

Zip itch (contenido de `dist/`):

```bash
cd frontend/dist
zip -r ../hold-the-box-itch.zip .
```

Smoke: `npm --prefix frontend run preview` → http://127.0.0.1:4173/

---

## Backend (prod)

En el server (con Postgres en red Docker `db` y nginx delante):

```bash
cd backend
cp .env.production.example .env   # JWT_SECRET, CORS_ORIGIN, DATABASE_URL, HOST_PORT
docker compose up -d --build
# API en 127.0.0.1:${HOST_PORT} — nginx publica HTTPS/WSS
```

Local con memoria (sin Docker):

```bash
npm run dev:backend    # :3000
npm run dev:frontend   # :5173 · VITE_SERVER_URL=http://localhost:3000
```

Local con Postgres + Redis: `docker compose up -d` en la raíz → `npm --prefix backend run db:migrate`.

---

## Checklist pre-promote (`dev` → `main`)

- [ ] Smoke Local 2P
- [ ] Smoke Online (lobby → partida) contra el API de staging/prod
- [ ] CI verde en el PR a `main`
- [ ] `VITE_SERVER_URL` apunta al API correcto
- [ ] Fail/win entendibles; sin depender de `?debug`

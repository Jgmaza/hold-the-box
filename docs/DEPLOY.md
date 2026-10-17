# Deploy — Jose

Onboarding del equipo (Git + CI/CD): [`ONBOARDING.md`](./ONBOARDING.md).  
Material oficial del jam: [`jam/`](./jam/).

El slice jugable vive en `apps/` (PlayCanvas + Vite).

## ¿Dónde se despliega?

| Destino | Para qué | Cómo |
|---|---|---|
| **itch.io** (HTML5) | Destino del jam / presentación oficial | Zip manual (cuenta itch) |
| **GitHub Pages** | Link de producción del repo | **CI/CD** al mergear a `main` |

**URL GitHub Pages:** https://jgmaza.github.io/no-sueltes-la-caja/  
**URL itch.io:** `_crear página y pegar aquí_`

---

## Flujo de producción (Pages)

```
work/<persona> → PR a dev → playtest
dev → PR a main (aprobación de Jose + CI verde) → merge → Deploy Pages automático
```

Reglas de `dev` y `main`:
- Solo entra por **pull request** (no push directo)
- **Aprueba solo Jose** (Lead + QA, code owner)
- Check **CI / test** debe pasar

El workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) corre en cada push a `main` (es decir, tras el merge del PR).

CI en PRs: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (`npm test` + `npm run build` en `apps/`).

---

## Build local

```bash
git checkout main
git pull
cd apps
npm ci
npm test
npm run build       # → apps/dist/
```

Zip para itch (contenido de `dist/`, no la carpeta padre):

```bash
cd apps/dist
zip -r ../no-sueltes-la-caja-itch.zip .
# archivo: apps/no-sueltes-la-caja-itch.zip
```

Smoke del build: `npm run preview` → http://127.0.0.1:4173/

---

## itch.io (oficial jam)

1. Crear juego en https://itch.io/game/new  
2. Kind: **HTML**  
3. Subir `apps/no-sueltes-la-caja-itch.zip`  
4. “This file will be played in the browser”  
5. Viewport: p.ej. `1280x720` o fullscreen  
6. Publicar (Draft → Restricted/Public según el jam)  
7. Pegar URL arriba en este doc  

---

## GitHub Pages (automático)

Tras merge a `main`:

1. Actions → workflow **Deploy Pages**  
2. Si sale verde → https://jgmaza.github.io/no-sueltes-la-caja/

Redeploy manual (mismo commit de `main`): Actions → Deploy Pages → **Run workflow**.

Pages usa **GitHub Actions** (no hay rama de deploy).

---

## Checklist pre-promote (`dev` → `main`)

- [ ] Smoke 2P en `dev` local o preview
- [ ] CI verde en el PR a `main`
- [ ] QA y aprobación de Jose
- [ ] Sin depender de `?debug` para jugar
- [ ] Fail/win entendibles
- [ ] (Jam) Página itch creada + URL anotada

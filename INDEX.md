# ÍNDICE GENERAL — Hold the Box

**Lee esto primero.** Luego ve a tu asignación. No hace falta recorrer todo el repo.

> **Documento único del proyecto:** [`docs/contexto/EL-PROYECTO.md`](./docs/contexto/EL-PROYECTO.md)  
> (qué es · tech · arquitectura · Jose / Luis / Danel / 3 creativos).

---

## 1) ¿Qué es este repo?

| Carpeta | Qué es | Quién entra |
|---|---|---|
| `frontend/` | El **juego** (PlayCanvas + online) | Danel (código), Luis (UI producto) |
| `backend/` | Servidor online (salas, WS, auth) | Danel + Luis/Turriago |
| `team/<tu-nombre>/` | **Tus tareas + prompts** | Cada activo / miembro nuevo |
| `deliveries/<tu-nombre>/` | **Lo que entregas** (PNG, audio, bugs) | Técnicos + slots Docs/UX si aplica |
| `docs/` | Decisiones, UX, story, contexto · online en `docs/online/` | Consulta; Docs/UX escribe en `ux/` y `story/` |
| `prompts/shared/` | Prompts genéricos de respaldo | Opcional |
| `supabase/` | Histórico arcade jam (deprecado) | Solo consulta |

La raíz (`GAME_DESIGN_DOCUMENT.md`, `MVP_SCOPE.md`, `TASK_BOARD.md`) es referencia global del Lead.  
**Lee primero:** [`docs/contexto/EL-PROYECTO.md`](./docs/contexto/EL-PROYECTO.md)

---

## 2) Flujo en 3 pasos (todos)

**Cómo Git + CI/CD:** [`docs/ONBOARDING.md`](./docs/ONBOARDING.md)

```
① EL-PROYECTO.md  →  ② tu rol / slot  →  ③ PR a dev
```

| Quién | Abre esto ahora |
|---|---|
| **Cualquiera / nuevo** | [`docs/contexto/EL-PROYECTO.md`](./docs/contexto/EL-PROYECTO.md) |
| **Jose** | Lead — además `team/jose/` · `docs/DEPLOY.md` |
| **Danel** | Dev estrella — `frontend/` · `backend/` · `team/danel/` |
| **Luis** | Relaciones + apoyo — UI lobby/online · `team/luis/` |
| **Creativo nuevo** | Slot A/B/C en EL-PROYECTO §2 · `docs/ux/` / `docs/story/` |

Alumni (histórico): `team/zharick`, `team/juanes`, `team/matias`.

---

## 3) Fase actual (expo)

Ver dibujo del equipo y producto en [`EL-PROYECTO.md`](./docs/contexto/EL-PROYECTO.md).  
Issues: [`docs/contexto/roles.md`](./docs/contexto/roles.md) · Scope jam histórico: [`MVP_SCOPE.md`](./MVP_SCOPE.md)

## 4) Visual

Assets jam (PNG) pueden seguir en `deliveries/` históricos. Docs/UX nuevos **no modelan 3D**; escriben briefs.  
[`docs/visual/PLAN.md`](./docs/visual/PLAN.md) · [`docs/visual/DECISIONS.md`](./docs/visual/DECISIONS.md) · [`docs/contexto/voz-y-estilo.md`](./docs/contexto/voz-y-estilo.md)

## 5) Correr / ramas / CI-CD

```bash
git checkout work/<tu-nombre> && git pull
# jugar lo integrado:
git checkout dev && git pull && npm run install:all && npm run dev:frontend
# online: otra terminal → npm run dev:backend
```

| Doc | Para qué |
|---|---|
| [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) | **Cómo trabajar** (Git, sync, CI/CD) |
| [`docs/BRANCHES.md`](./docs/BRANCHES.md) | Detalle de ramas |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Pages + itch (Jose) |

---

## 6) Mapa de documentos

| Doc | Para qué |
|---|---|
| [`docs/contexto/EL-PROYECTO.md`](./docs/contexto/EL-PROYECTO.md) | **Documento único** (tech, arquitectura, equipo) |
| [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) | Onboarding + CI/CD |
| [`MVP_SCOPE.md`](./MVP_SCOPE.md) | Piso real post-slice |
| [`TASK_BOARD.md`](./TASK_BOARD.md) | Roles fase actual |
| [`docs/DEPLOY.md`](./docs/DEPLOY.md) | Deploy (Jose) |
| [`docs/jam/`](./docs/jam/) | Material oficial del jam |
| [`docs/BRANCHES.md`](./docs/BRANCHES.md) | `main` / `dev` / `work/*` |
| [`GAME_DESIGN_DOCUMENT.md`](./GAME_DESIGN_DOCUMENT.md) | Fantasía |
| [`docs/mechanics.md`](./docs/mechanics.md) | Mecánicas |
| [`docs/clima.md`](./docs/clima.md) | Clima: lluvia / viento y cómo instanciar secciones |
| [`docs/rieles.md`](./docs/rieles.md) | Rieles asimétricos (P1/P2) y `railsPair()` |
| [`docs/escenografia.md`](./docs/escenografia.md) | Props Kenney y `dressLevel()` / `dressIsland()` |
| [`docs/agua.md`](./docs/agua.md) | Agua 3D (olas en código) y MCP del Editor PlayCanvas |
| [`docs/leaderboard.md`](./docs/leaderboard.md) | Leaderboard arcade (IP + Supabase) |
| [`docs/visual/DECISIONS.md`](./docs/visual/DECISIONS.md) | Decisiones diseño |
| [`prompts/shared/`](./prompts/shared/) | Prompts identidad |
| [`docs/COLLABORATORS.md`](./docs/COLLABORATORS.md) | GitHubs |
| [`team/SKILLS.md`](./team/SKILLS.md) | Skills Cursor |

```bash
git clone https://github.com/Jgmaza/hold-the-box.git
cd hold-the-box && git checkout dev
npm run install:all && npm run dev:frontend
```

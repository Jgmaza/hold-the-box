# ÍNDICE GENERAL — Hold the Box

**Lee esto primero.** Luego ve a tu asignación. No hace falta recorrer todo el repo.

---

## 1) ¿Qué es este repo?

| Carpeta | Qué es | Quién entra |
|---|---|---|
| `apps/` | El **juego** (PlayCanvas) | Danel (código), Zharick (UI) |
| `team/<tu-nombre>/` | **Tus tareas + prompts** | Cada uno la suya |
| `deliveries/<tu-nombre>/` | **Lo que entregas** (PNG, audio, bugs) | Todos excepto solo-docs |
| `docs/` | Decisiones y guías (diseño, visual, demo) | Consulta |
| `prompts/shared/` | Prompts genéricos de respaldo | Opcional |

La raíz (`GAME_DESIGN_DOCUMENT.md`, `MVP_SCOPE.md`, `TASK_BOARD.md`) es referencia global del Lead.

---

## 2) Flujo en 3 pasos (todos)

**Cómo Git + CI/CD + dónde subir:** [`docs/ONBOARDING.md`](./docs/ONBOARDING.md)

```
① ONBOARDING + este INDEX  →  ② team/<tu-nombre>/README.md  →  ③ deliveries/ o apps/ → PR a dev
```

| Tu nombre | Abre esto ahora |
|---|---|
| **Jose** | [`team/jose/README.md`](./team/jose/README.md) |
| **Danel** | [`team/danel/README.md`](./team/danel/README.md) · código en `apps/` · **Opus 5.5** |
| **Luis** | [`team/luis/README.md`](./team/luis/README.md) · feel caja + audio/color |
| **Zharick** | [`team/zharick/README.md`](./team/zharick/README.md) |
| **Juanes** | [`team/juanes/README.md`](./team/juanes/README.md) |
| **Matias** | [`team/matias/README.md`](./team/matias/README.md) |

Cada carpeta de persona tiene:
- `README.md` → qué hacer hoy / criterios de done  
- `prompts.md` → qué pegar en la IA  

---

## 3) Fase actual (leer esto)

El vertical slice **ya está** en `apps/` (caja compleja: tilt + huequito + mojado + nivel).  
Scope real: **[`MVP_SCOPE.md`](./MVP_SCOPE.md)**

| Quién | Ahora |
|---|---|
| **Luis** | Mejorar / seleccionar **perfiles de caja** + audio/color |
| **Juanes / Matias** | Visuales **de este juego** (papel→PNG) |
| **Zharick** | Pulir UI |
| **Danel** | Estabilizar + integrar deliveries |
| **Jose** | **Desplegar** + alcance + pitch → [`docs/DEPLOY.md`](./docs/DEPLOY.md) · jam en [`docs/jam/`](./docs/jam/) |

## 4) Visual

**Juanes/Matias NO modelan en 3D.** Papel → PNG.  
[`docs/visual/PLAN.md`](./docs/visual/PLAN.md) · [`docs/visual/DECISIONS.md`](./docs/visual/DECISIONS.md) · [`docs/visual/pipeline-papel.md`](./docs/visual/pipeline-papel.md) · [`docs/visual/refs/`](./docs/visual/refs/)

## 5) Correr / ramas / CI-CD

```bash
git checkout work/<tu-nombre> && git pull
# jugar lo integrado:
git checkout dev && git pull && cd apps && npm install && npm run dev
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
```

# ÍNDICE GENERAL — No Sueltes La Caja

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

```
① Este INDEX  →  ② team/<tu-nombre>/README.md  →  ③ Haz la tarea y súbela a deliveries/ (o apps/ si eres Danel)
```

| Tu nombre | Abre esto ahora |
|---|---|
| **Jose** | [`team/jose/README.md`](./team/jose/README.md) |
| **Danel** | [`team/danel/README.md`](./team/danel/README.md) · código en `apps/` · **Opus 5.5** |
| **Luis** | [`team/luis/README.md`](./team/luis/README.md) |
| **Zharick** | [`team/zharick/README.md`](./team/zharick/README.md) |
| **Juanes** | [`team/juanes/README.md`](./team/juanes/README.md) |
| **Matias** | [`team/matias/README.md`](./team/matias/README.md) |

Cada carpeta de persona tiene:
- `README.md` → qué hacer hoy / criterios de done  
- `prompts.md` → qué pegar en la IA  

---

## 3) Tema visual (importante)

**Juanes y Matias NO modelan en 3D.** Solo dibujan en papel.

Plan completo: **[`docs/visual/PLAN.md`](./docs/visual/PLAN.md)**  
Decisiones (feel/cámara/tono): **[`docs/visual/DECISIONS.md`](./docs/visual/DECISIONS.md)**  
Refs visuales: **[`docs/visual/refs/`](./docs/visual/refs/)**  
Pipeline papel → PNG: **[`docs/visual/pipeline-papel.md`](./docs/visual/pipeline-papel.md)**

Resumen:
1. Danel arma el mundo con **primitivas 3D** (cápsulas, cajas, planos) + colores de Luis.  
2. Sus dibujos se vuelven **texturas / carteles / refs** pegados en esos objetos.  
3. Modelado “bonito” en Blender/Meshy es **opcional y no es tarea de diseño** — solo si sobra tiempo y lo hace Danel/Jose.

---

## 4) Primer demo (prioridad de código)

Guía del día: [`docs/START_TOMORROW.md`](./docs/START_TOMORROW.md)

Orden Danel: bootstrap → 2P mover → **caja + inclinación** → fail + meta.

---

## 5) Mapa de documentos

| Doc | Para qué |
|---|---|
| [`GAME_DESIGN_DOCUMENT.md`](./GAME_DESIGN_DOCUMENT.md) | Fantasía + caja complicada |
| [`MVP_SCOPE.md`](./MVP_SCOPE.md) | Qué sí / qué no |
| [`TASK_BOARD.md`](./TASK_BOARD.md) | Vista global de roles |
| [`docs/mechanics.md`](./docs/mechanics.md) | Mecánicas |
| [`docs/controls.md`](./docs/controls.md) | Controles |
| [`docs/pitch.md`](./docs/pitch.md) | Pitch corto |
| [`docs/visual/PLAN.md`](./docs/visual/PLAN.md) | Estrategia visual jam |
| [`docs/visual/DECISIONS.md`](./docs/visual/DECISIONS.md) | Feel/cámara/arte congelados |
| [`docs/visual/pipeline-papel.md`](./docs/visual/pipeline-papel.md) | Cómo digitalizar dibujos |
| [`prompts/shared/`](./prompts/shared/) | Prompts de identidad (art, level, …) |
| [`docs/COLLABORATORS.md`](./docs/COLLABORATORS.md) | GitHubs del equipo |
| [`team/SKILLS.md`](./team/SKILLS.md) | Skills Cursor por persona |

---

## 6) Clone

```bash
git clone https://github.com/Jgmaza/no-sueltes-la-caja.git
cd no-sueltes-la-caja
```

Abre **`INDEX.md`** → tu fila en la tabla → trabaja.

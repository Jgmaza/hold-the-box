# Skills por persona (Cursor + jam)

Índice del repo: [`../INDEX.md`](../INDEX.md)

Skills instaladas en la máquina del Lead viven en `~/.cursor/skills-cursor/`.  
En el repo también hay un skill de proyecto para gameplay: `.cursor/skills/no-sueltes-playcanvas/`.

> **Danel:** usa modelo **Claude Opus 5.5** en Cursor Agent para todo lo de `apps/`.

---

## Jose (Lead)

| Skill | Para qué |
|---|---|
| **create-rule** | Reglas del repo (alcance MVP, dueño de `apps/`, no online) |
| **create-skill** | Skills de jam reutilizables para el equipo |
| **create-subagent** | Agentes: “PO reviewer”, “pitch helper” |
| **goal** | Mantener el objetivo del jam visible y actualizado |
| **split-to-prs** | Partir trabajo en PRs chicos revisables |
| **review** / **review-bugbot** | Revisar PRs de Danel/Zharick sin codear el bulk |
| **share** / **new-repo** | Compartir / respaldar el proyecto en Cursor |
| **automate** | Automatizaciones (recordatorios, checks) si usan Agents Window |
| **autopilot** | Mantener PRs merge-ready cerca del deadline |
| **loop** | Re-chequear build/pitch cada X tiempo en la recta final |
| **onboard** | Si alguien del equipo entra frío a Cursor |

**Modelo sugerido:** Opus o Sonnet para dirección; no gastes Opus en tareas triviales de docs.

---

## Danel (Dev Estrella) — **Opus 5.5**

| Skill | Para qué |
|---|---|
| **no-sueltes-playcanvas** (repo) | Contexto del juego + mecánicas de caja + convenciones `apps/` |
| **create-rule** | Rules solo para `apps/**` (PlayCanvas, modular, jam-speed) |
| **shell** | Comandos literales cuando haga falta (`/shell`) |
| **review-bugbot** | Autoreview antes de pedirle merge a Jose |
| **split-to-prs** | Separar movimiento / caja / nivel / polish |
| **loop** | Iterar tuneo de físicas en ciclos cortos |
| **update-cursor-settings** | Ajustar editor si le estorba el flujo |

**Modelo obligatorio (gameplay):** en el picker de Cursor elige **Claude Opus 5.5** (o el label equivalente “Opus 5.5”).  
Prompts listos: `team/danel/prompts.md`.

---

## Luis (Soundtrack + Color)

| Skill | Para qué |
|---|---|
| **canvas** | Moodboard / tabla de paleta hex interactiva junto al chat |
| **create-rule** (opcional) | Si quiere que el agent respete `deliveries/luis/PALETTE.md` |

Cursor no produce audio final: úsalo para **briefs, naming, paletas y checklists**.  
Producción: DAW / bancos / generadores; entrega en `deliveries/luis/`.

**Modelo sugerido:** Sonnet o el más barato bueno para listas/paletas; no necesita Opus.

---

## Zharick (Dev Apoyo)

| Skill | Para qué |
|---|---|
| **no-sueltes-playcanvas** (repo) | Entender mecánicas al cablear UI |
| **review-bugbot** | Pasar bug review a cambios de UI |
| **create-rule** | Reglas de UI/textos en español |
| **canvas** | Tablero de bugs / checklist QA visual |
| **split-to-prs** | PRs chicos de pantallas |
| **loop** | Re-test checklist cerca del freeze |

**Modelo sugerido:** Sonnet para UI; subir a Opus solo si toca integración peliaguda con la caja.

---

## Juanes (Diseño 1) · Matias (Diseño 2)

Casi no necesitan skills de código. Flujo principal: **papel → Photopea** (`docs/design-pipeline.md`).

| Skill / herramienta | Para qué |
|---|---|
| **canvas** (si usan Cursor) | Briefs visuales / listas de vistas a dibujar |
| Prompts en `team/juanes` o `team/matias` | Briefs y checklists de foto |
| Photopea / Vectorizer / remove.bg | Digitalizar (no son skills de Cursor) |

**Modelo sugerido:** el más liviano; Cursor aquí es copiloto de brief, no de producción.

---

## Cómo activar un skill

1. En Cursor Agent, menciona la skill o el flujo (`create-rule`, `review-bugbot`, etc.).
2. Para el skill del repo, abre el proyecto y pide algo de gameplay en `apps/` — debe leer `.cursor/skills/no-sueltes-playcanvas/SKILL.md`.
3. Danel: **cambia el modelo a Opus 5.5** antes de pegar prompts de `team/danel/prompts.md`.

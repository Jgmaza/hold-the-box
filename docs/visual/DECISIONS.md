# Decisiones de diseño (congeladas en entrevista Lead)

Fuente de verdad para `prompts/shared/*` y para el equipo.  
Refs: [`refs/`](./refs/)

**Owner del feel de la caja (core):** Luis / [@turriago](https://github.com/turriago)  
**Implementación PlayCanvas:** Danel / [@danelmott](https://github.com/danelmott)  
Los números son **tuneables** según playtest de Luis — no hardcodear magia sin exponer parámetros.

---

## Ronda 1 — Identidad, feel, cámara, tono

- Jugabilidad: **Moving Out** sin soltar; reto = cuidar la caja; roce **Overcooked**.
- Look: trazos **Fall Guys**; path **recto** con profundidad.
- Cámara: una coop, mismo PC, 3ª persona profunda.
- Tono: family-friendly primero; mods visuales después.
- Fantasía: gracioso cooperar y discutir amistosamente.
- Fail MVP: restart; post: burla.

---

## Ronda 2 — Visual

- Personajes: humanos stylized caricaturescos (como la ref).
- Mods futuros opcionales (skins caricaturescas de figuras públicas) — no MVP.
- Caja MVP: cartón + sello **VIP / FRÁGIL**.
- Build 1: Capa A + 2–3 carteles laterales.
- Luz: sol de mediodía caribeño.
- Señales: a los lados, vibe Overcooked.

---

## Ronda 3 — Control, vida, ownership

### Velocidad / peso
- **C:** misma velocidad base; se sienten **más lentos solo si están desincronizados**.

### Castigo por desbalance
- **C:** muy **permisivo al inicio** (casi no castiga); subir dureza con tuneo de Luis después del primer playtest.

### Vida de la caja
- **C:** **100 HP** con **daño variable** (caída al piso, golpes, etc.).
- Sin recuperación de vida en MVP (**A:** no heal).

### Salto
- **A:** ambos pueden saltar; si uno salta solo → alto riesgo de desbalance/daño.

### Ownership
- Luis (Turriago) **diseña y tuneará** la mecánica de caja + narrativa/feel asociados.
- Danel implementa sistemas **exponiendo parámetros** (script attrs / config) para que Luis itere sin reescribir todo.
- Jose valida alcance MVP vs post (hueco, mojada, burla).

---

## Parámetros que deben ser tuneables (lista mínima)

Luis propone valores iniciales; Danel los expone en `apps/`:

| Parámetro | Rol |
|---|---|
| `syncSlowThreshold` | Desde qué desfase se aplica slow |
| `desyncSlowMultiplier` | Cuánto frenan al desincronizar |
| `tiltWarnAngle` / stretch limit | Aviso visual antes de caer |
| `dropDamage` | Daño al caer al piso |
| `impactDamage` | Daño por golpes menores |
| `boxMaxHp` | Default 100 |
| `earlyGameForgiveness` | Multiplicador de daño/permisividad al inicio |
| `jumpDesyncPenalty` | Extra riesgo/daño si solo uno salta |
| `cameraFollow*` | Suavizado cámara coop (con Danel) |

---

## Ronda 4 — UI + polish + audio

- **HUD:** barra de vida de la caja (sobre caja o arriba) — A
- **Fail:** placeholder para burla + Restart ya — C
- **Timer:** solo pitch/demo, apagable — C
- **Audio:** SFX de caja + loop en paralelo (mínimos) — C
- Entrevista de prompts compartidos: **cerrada** (A)

## Estado prompts compartidos

| Archivo | Estado |
|---|---|
| `art.md` | OK |
| `level_design.md` | OK |
| `gameplay.md` | OK |
| `ui.md` / `polish.md` | OK (R4) |

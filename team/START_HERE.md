# Empieza aquí

Repo de gestión del game jam **No Sueltes La Caja**.  
El juego (PlayCanvas) vive en `apps/` — lo construye principalmente **Danel**.

## ¿Quién eres?

| Persona | Rol | Tu carpeta |
|---|---|---|
| **Jose** | Lead | [`jose/`](./jose/) |
| **Danel** | Dev Estrella (gameplay) | [`danel/`](./danel/) |
| **Luis** | Soundtrack + Colorimetría | [`luis/`](./luis/) |
| **Zharick** | Dev Apoyo | [`zharick/`](./zharick/) |
| **Juanes** | Diseño 1 (personajes + caja) | [`juanes/`](./juanes/) |
| **Matias** | Diseño 2 (señales + props) | [`matias/`](./matias/) |

## Cómo trabajar (todos)

1. Entra a **tu carpeta** en `team/<tu-nombre>/`.
2. Lee `README.md` → tus tareas y criterios de done.
3. Usa `prompts.md` cuando trabajes con IA (Cursor / ChatGPT).
4. Sube entregables a `deliveries/<tu-nombre>/` (arte, audio, paletas, capturas).
5. Dudas de alcance → Jose. Dudas de código en `apps/` → Danel.

## Mañana — primer demo
Plan del día: **[`../docs/START_TOMORROW.md`](../docs/START_TOMORROW.md)**

## Skills + modelo
Ver **[`SKILLS.md`](./SKILLS.md)** — qué skill usa cada quien.  
**Danel:** Claude **Opus 5.5** + skill `.cursor/skills/no-sueltes-playcanvas/`.

## Docs globales (consulta)

- [`../GAME_DESIGN_DOCUMENT.md`](../GAME_DESIGN_DOCUMENT.md) — fantasía + caja complicada
- [`../MVP_SCOPE.md`](../MVP_SCOPE.md) — qué sí / qué no
- [`../TASK_BOARD.md`](../TASK_BOARD.md) — vista de todo el equipo
- [`../docs/mechanics.md`](../docs/mechanics.md)
- [`../docs/design-pipeline.md`](../docs/design-pipeline.md) — dibujo → PNG (Juanes & Matias)
- [`../docs/controls.md`](../docs/controls.md)
- [`../docs/pitch.md`](../docs/pitch.md)

## Setup git (primera vez)

```bash
git clone https://github.com/Jgmaza/no-sueltes-la-caja.git
cd no-sueltes-la-caja
```

Ramas sugeridas:
- `main` — estable (Jose aprueba merges)
- `apps/danel-*` — gameplay
- `feat/zharick-ui` — UI
- `assets/luis-*` / `assets/juanes-*` / `assets/matias-*` — entregas

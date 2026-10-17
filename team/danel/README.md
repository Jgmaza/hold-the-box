# Danel — Dev Estrella (PlayCanvas)

GitHub: [@danelmott](https://github.com/danelmott)  
Eres el **owner de `apps/`**. Aquí va el vibe coding pesado. Jose revisa; tú ejecutas.

## Tus tareas

- [ ] Scaffold PlayCanvas / estructura en `apps/`
- [ ] P1 + P2: movimiento, salto, controles (`docs/controls.md`)
- [ ] Cámara cooperativa
- [ ] Caja compartida (ambos influyen)
- [ ] Inclinación de caja
- [ ] Mecánica **huequito** y/o **se moja** (mínimo una completa; ideal ambas simples)
- [ ] Plataformas, rodillos, agua/fail, respawn
- [ ] Meta + win/fail states
- [ ] Integrar assets de `deliveries/juanes`, `deliveries/matias`, `deliveries/luis`
- [ ] Dejar build jugable para testing de Jose/Zharick

## Reglas

1. Trabaja en ramas `apps/danel-*`.
2. No metas online, inventario, powerups, ranking.
3. Lee `docs/mechanics.md` antes de improvisar sistemas nuevos.
4. Si un asset no llega, usa placeholder y sigue.

## Modelo + skills
- **Modelo:** Claude **Opus 5.5** (obligatorio en Agent para `apps/`)
- **Skill repo:** `.cursor/skills/no-sueltes-playcanvas/`
- **Otros:** ver `team/SKILLS.md` (review-bugbot, split-to-prs, loop, create-rule)
- **Prompts:** `team/danel/prompts.md` (llevan prefijo Opus 5.5)

## Done cuando
Dos jugadores pueden cargar la caja, sentir el riesgo (inclinación/agua/hueco) y llegar a la meta o fallar de forma clara.

# Empezar mañana — camino al primer demo

> Índice del repo: [`../INDEX.md`](../INDEX.md) · Visual: [`visual/PLAN.md`](./visual/PLAN.md)

Fecha de referencia: plan congelado para el siguiente día de jam.  
Objetivo: ver un **vertical slice** jugable, no el MVP completo.

---

## Qué cuenta como “primer demo”

2 jugadores locales + **caja compartida** + **inclinación** + fail (agua/vacío) + meta/win.  
Placeholders OK (cubos). No esperar arte, audio ni UI pulida.

Pitch jugable en ~30–60 segundos: se siente “Better Together”.

---

## Orden (Danel en `apps/`, Opus 5.5)

Usar `team/danel/prompts.md` — **un bloque por chat**, skill `no-sueltes-playcanvas`.

| # | Bloque | Resultado |
|---|---|---|
| 1 | Bootstrap PlayCanvas | Proyecto en `apps/` + README de cómo abrir |
| 2 | Movimiento + salto P1/P2 | Dos cápsulas se mueven (aún no es el juego) |
| 3 | Caja compartida + inclinación | **Primer demo real del concepto** |
| 4 | Cierre del slice | Agua/vacío = fail · meta = win · respawn simple |

Después (no bloquea el demo de mañana):
- Huequito / se moja
- Rodillo, plataforma móvil
- UI (Zharick), audio/paleta (Luis), arte (Juanes/Matias)

---

## Quién hace qué mañana

### Danel (crítico)
1. Clone / pull del repo.
2. Cursor → modelo **Claude Opus 5.5**.
3. Skill: `no-sueltes-playcanvas`.
4. Prompts **1 → 2 → 3** (y fail+meta en cuanto exista la caja).
5. Rama `apps/danel-*`. Placeholders si no hay assets.

### Jose (Lead)
- Congelar criterio: **demo = 2P + caja + inclinación + fail + meta**.
- No codear el bulk; desbloquear a Danel y playtestear lo que suba.
- Coordinar que `deliveries/` avance en paralelo sin frenar `apps/`.

### Zharick
- Cuando exista win/fail: pantallas start / victoria / restart mínimas.
- Checklist QA del slice (no del MVP entero).

### Luis
- Paleta hex en `deliveries/luis/PALETTE.md` + 1 loop o SFX básicos si puede.
- No bloquea a Danel.

### Juanes
- Prioridad: caja (normal + inclinada) y siluetas P1/P2.
- Papel → Photopea → `deliveries/juanes/`.

### Matias
- Prioridad: banner META + 1 señal de cuidado.
- Mismo pipeline → `deliveries/matias/`.

---

## Mensaje listo para pegarle a Danel

```
Mañana arrancamos el primer demo (vertical slice), no el MVP entero.

1. Pull del repo no-sueltes-la-caja
2. Cursor Agent → Claude Opus 5.5
3. Skill: no-sueltes-playcanvas
4. Sigue team/danel/prompts.md en orden: Bootstrap → Movimiento → Caja+inclinación
5. Luego fail (agua) + meta. Placeholders OK.
6. Criterio done del día: dos jugadores cargan la caja, se desbalancea si no coordinan, pueden ganar o perder.

Arte/audio/UI van en paralelo; no te esperes por eso.
```

---

## Links rápidos

- Prompts Danel: `team/danel/prompts.md`
- Tareas Danel: `team/danel/README.md`
- Skills: `team/SKILLS.md`
- MVP (después del demo): `MVP_SCOPE.md`
- Mecánicas: `docs/mechanics.md`
- Onboarding equipo: `team/START_HERE.md`

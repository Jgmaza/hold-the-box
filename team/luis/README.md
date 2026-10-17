# Luis (Turriago) — Soundtrack + Color + **Feel de la caja (core)**

GitHub: [@turriago](https://github.com/turriago)

## Cómo empezar (3 pasos)

1. [`../../INDEX.md`](../../INDEX.md)  
2. Lee el core: [`../../docs/visual/DECISIONS.md`](../../docs/visual/DECISIONS.md) (Ronda 3) + [`../../prompts/shared/gameplay.md`](../../prompts/shared/gameplay.md)  
3. Define valores iniciales tuneables y súbelos a `deliveries/luis/` · Danel los expone en `apps/`

## Tu rol (ampliado)

Eres dueño del **corazón del juego**: cómo se siente la caja (sync, daño, permisividad) y la narrativa/vibe alrededor.  
También: **paleta** + **audio**.

Danel **implementa**; tú **diseñas números y playtesteas**. Los valores deben ser modificables según UX — no hace falta que codes el motor.

## Tareas — Feel de caja (prioridad #1)

- [ ] Proponer defaults permisivos en `deliveries/luis/BOX_FEEL.md` (ver plantilla)
- [ ] Playtest con Danel: ¿se siente gracioso o frustrante?
- [ ] Subir/bajar dureza con `earlyGameForgiveness` y daños
- [ ] Notas de narrativa corta de la caja VIP/FRÁGIL (por qué importa cuidarla) en el mismo doc o `NARRATIVE.md`

### Parámetros que te pertenecen
`syncSlowThreshold`, `desyncSlowMultiplier`, tilt/stretch, `dropDamage`, `impactDamage`, `boxMaxHp` (100), `earlyGameForgiveness`, `jumpDesyncPenalty`

## Tareas — Color
- [ ] `deliveries/luis/PALETTE.md` — sol mediodía caribeño

## Tareas — Audio
- [ ] Loop + SFX (inclinación warning, drop/daño, splash, meta, fail/win)
- [ ] `deliveries/luis/audio/`

## Prompts
- Feel/caja: [`../../prompts/shared/gameplay.md`](../../prompts/shared/gameplay.md)  
- Tuyos: [`prompts.md`](./prompts.md)

## Done cuando
Hay una tabla de parámetros con defaults permisivos, Danel los tiene en `apps/`, y un playtest de 2 min se siente “Moving Out + Overcooked” sin rabia.

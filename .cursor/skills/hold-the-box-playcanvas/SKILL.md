---
name: hold-the-box-playcanvas
description: >-
  Gameplay y arquitectura PlayCanvas para Hold the Box (coop local 2P,
  caja compartida con inclinación, huequito y mojada). Usar cuando se trabaje
  en frontend/, mecánicas de caja, controles P1/P2, online (net/), o integración
  desde deliveries/. El backend importa frontend/src/sim — no romper ese contrato.
---

# Hold the Box — PlayCanvas

## Contexto
- Game jam + expo online.
- Stack: **PlayCanvas** en `frontend/` · servidor en `backend/` (misma sim).
- Owner de código: **Danel**. Review: Jose. UI: Luis.

## Propuesta de valor
La caja es el problema: inclinación, huequito, se moja. Coordinación = estabilidad.

## Controles
- P1: WASD + Space
- P2: Flechas + Enter
- Online: ver `docs/online/PROTOCOL.md`

## Alcance
Leer `MVP_SCOPE.md`, `docs/mechanics.md`, y si tocas multi `docs/online/SDD.md`.  
La sim en `frontend/src/sim/` (y `levels/`, `config.js`, `net/duoState.js`) **no puede** usar `window`, DOM ni PlayCanvas: el backend la importa.

## Convenciones
- Código modular, parámetros en `frontend/src/config.js`.
- Placeholders OK si falta arte/audio en `deliveries/`.
- Textos UI en español.
- Ramas: `issue/<n>-slug` desde `dev`.

## Carpetas
- `frontend/src/sim/` · `view/` · `ui/` · `net/` · `online/`
- `backend/src/` — Fastify + WS; puerta a la sim: `backend/src/game/index.js`

## Modelo
Para implementación en `frontend/` / `backend/`, preferir **Claude Opus 5.5** en Cursor Agent.

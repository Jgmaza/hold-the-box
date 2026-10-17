---
name: no-sueltes-playcanvas
description: >-
  Gameplay y arquitectura PlayCanvas para No Sueltes La Caja (coop local 2P,
  caja compartida con inclinación, huequito y mojada). Usar cuando se trabaje
  en apps/, mecánicas de caja, controles P1/P2, nivel jam o integración desde
  deliveries/.
---

# No Sueltes La Caja — PlayCanvas

## Contexto
- Game jam, tema Better Together.
- 2 jugadores **locales** (no online).
- Stack: **PlayCanvas** dentro de `apps/`.
- Owner de código: **Danel**. Review: Jose. UI support: Zharick.

## Propuesta de valor
La caja es el problema: inclinación, huequito, se moja. Coordinación = estabilidad.

## Controles
- P1: WASD + Space
- P2: Flechas + Enter

## Alcance
Leer siempre `MVP_SCOPE.md` y `docs/mechanics.md` en la raíz del repo.  
Prohibido: multiplayer online, inventario, powerups, tienda, ranking, enemigos complejos.

## Convenciones
- Código modular, parámetros tuneables (speed, jump, tilt threshold, wet weight).
- Placeholders OK si falta arte/audio en `deliveries/`.
- No bloquear gameplay por assets faltantes: warning + seguir.
- Textos UI en español.
- Ramas: `apps/danel-*`.

## Orden de implementación sugerido
1. Controllers P1/P2 + cámara
2. Caja compartida + inclinación + estados `upright|tilting|critical`
3. Huequito y/o mojada
4. Nivel mínimo (plataformas, móvil, rodillo, agua, meta, respawn)
5. Win/fail + enganche UI
6. Integrar `deliveries/`

## Visual
Seguir `docs/visual/PLAN.md`: Capa A primitivas primero; PNG de `deliveries/` como texturas/carteles.
No exigir modelado 3D a Juanes/Matias.

## Modelo
Para implementación en `apps/`, preferir **Claude Opus 5.5** en Cursor Agent.

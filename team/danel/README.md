# Danel — Dev Estrella (PlayCanvas)

GitHub: [@danelmott](https://github.com/danelmott)

## Cómo empezar (3 pasos)

1. [`../../INDEX.md`](../../INDEX.md) + [`../../docs/START_TOMORROW.md`](../../docs/START_TOMORROW.md)  
2. Cursor → modelo **Claude Opus 5.5** + skill `no-sueltes-playcanvas`  
3. Ejecuta prompts en orden: [`prompts.md`](./prompts.md) · trabaja solo en `apps/`

## Tu rol
**Owner de `apps/`.** Aquí va el vibe coding. Jose revisa; tú ejecutas.

## Visual (léelo)
[`../../docs/visual/PLAN.md`](../../docs/visual/PLAN.md)

1. **Capa A primero:** primitivas (cápsulas, cubos, planos) + colores de Luis.  
2. **No esperes** dibujos de Juanes/Matias para el demo.  
3. Cuando lleguen PNG en `deliveries/`, pégalos como texturas/carteles (Capa B).  
4. Modelado 3D “bonito” = opcional y al final (Capa C). **No se lo pidas a diseño.**

## Tareas código

- [x] Scaffold PlayCanvas en `apps/`
- [x] P1 + P2 movimiento/salto
- [x] Cámara
- [x] Caja compartida + inclinación ← **corazón del demo**
- [x] Fail (agua) + meta + win
- [x] Huequito y se moja (+ chorros)
- [x] Plataforma móvil, rodillo, respawn (+ elevador, puente de tablones)
- [x] Integrar `deliveries/` (listo: los PNG/audio/paleta entran solos al subirlos; mientras, placeholders)
- [ ] Playtest 2P y afinar números con `?debug`

Cómo correrlo y estructura: [`apps/README.md`](../../apps/README.md).

## Reglas
- Ramas `apps/danel-*`
- Sin online / inventario / powerups / ranking
- Placeholders OK

## Done (primer demo)
Dos jugadores cargan la caja, se desbalancea si no coordinan, pueden ganar o perder.

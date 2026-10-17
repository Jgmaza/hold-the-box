# Mecánicas

Fuente viva: `docs/visual/DECISIONS.md` · Feel owner: **Luis (Turriago)** · Código: **Danel**

## Caja compartida (MVP)
- No se suelta. Ambos influyen siempre.
- Velocidad normal; **slow solo si hay desync**.
- Estirón fuerte → puede caer al piso → **daño a HP** (100, daño variable).
- Sin curación. Inicio **permisivo** (`earlyGameForgiveness`).
- Salto libre; si solo uno salta → más riesgo.
- Números en `deliveries/luis/BOX_FEEL.md` (tuneables).

## Post-MVP (no bloquear demo)
1. **Huequito** / **mojada**
2. Burla al fallar
3. Mods visuales / skins

## Obstáculos del nivel
- Huecos entre plataformas
- Rodillos giratorios
- Plataformas móviles
- Agua debajo (castigo permanente)

## Controles
Ver `docs/controls.md`.

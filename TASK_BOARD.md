# TASK BOARD — fase post-slice

> [`INDEX.md`](./INDEX.md) · [`MVP_SCOPE.md`](./MVP_SCOPE.md) · [`docs/BRANCHES.md`](./docs/BRANCHES.md)  
> El juego **ya tiene** core de caja complejo. Ahora: tunear, vestir, desplegar.

---

## Jose — Lead + **deploy**
- Congelar alcance (no más sistemas sin OK)
- Playtest de aceptación
- **Desplegar** build (`npm run build` → itch / hosting)
- Pitch
- Rama: `work/jose` · merge a `dev` → promover `main` cuando presentable

## Danel — Dev Estrella (`apps/`)
- Bugs / estabilidad del slice
- Enganchar PNG/audio de `deliveries/`
- Implementar **presets de caja** que Luis documente (sin rewrites grandes)
- Rama: `work/danel` → PR a `dev`

## Luis — Feel + **diseño de cajas** + audio/color
- Playtest y tuneo (`config.js` / `BOX_FEEL.md`)
- **Seleccionar y mejorar mecánicas por perfil de caja** (`BOX_VARIANTS.md`)
- Paleta + SFX/loop
- Rama: `work/luis`

## Zharick — UI
- Pulir HUD integridad/mojado, start/fail/win, restart
- Checklist QA
- Rama: `work/zharick`

## Juanes — Visual personajes + caja (juego actual)
- PNG: P1/P2, caja VIP/FRÁGIL, estados inclinada / dañada / mojada / goteando
- Alineado a lo que se ve en `apps/` (no concepto paralelo)
- Rama: `work/juanes` · entrega `deliveries/juanes/`

## Matias — Visual señales + props (juego actual)
- Carteles del muelle / META / Overcooked-side signs
- Props que ya usa el nivel (rodillo, plataformas, etc. como refs/texturas)
- Rama: `work/matias` · entrega `deliveries/matias/`

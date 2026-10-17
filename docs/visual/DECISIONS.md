# Decisiones de diseño (vivas)

Refs: [`refs/`](./refs/) · Ramas: [`../BRANCHES.md`](../BRANCHES.md) · Scope: [`../../MVP_SCOPE.md`](../../MVP_SCOPE.md)

**Piso técnico:** el vertical slice de Danel en `apps/` ya incluye inclinación, huequito, mojado, nivel 1, ratings.  
**No** tratamos el core como “mecánica simple pendiente”.

| Rol | Ownership |
|---|---|
| **Luis / @turriago** | Diseño y mejora de **mecánicas por caja** + tuneo + audio/color |
| **Danel / @danelmott** | Código `apps/` — estabilizar e integrar assets |
| **Juanes / Matias** | Visuales papel→PNG alineados al juego actual |
| **Zharick** | UI polish |
| **Jose** | Alcance, pitch, **despliegue** |

---

## Identidad (Rondas 1–2, vigentes)

- Feel: Moving Out sin soltar + roce Overcooked  
- Look: Fall Guys strokes, path recto, sol mediodía caribeño  
- Family-friendly primero; mods/skins después  
- Caja visual MVP: cartón **VIP / FRÁGIL**  
- Señales laterales tipo Overcooked  

## Feel / ownership (Ronda 3, actualizada)

- Luis no “inventa la caja desde cero”: **selecciona, tuneará y mejora** lo que ya corre.
- Puede proponer **perfiles de caja** (misma sim, distintos números / reglas leves).
- Todo vía `apps/src/config.js` + `deliveries/luis/BOX_FEEL.md` (+ `BOX_VARIANTS.md`).
- Permisividad y diversión > hardcore. Sin heal forzado salvo que Luis lo pida tras playtest.

## UI (Ronda 4)

- HUD: barras de estado de caja (integridad / mojado)  
- Fail + Restart (burla = después)  
- Timer demo apagable  
- Audio: SFX caja + loop en paralelo  

## Prompts compartidos

`prompts/shared/*` — identidad. Ejecución diaria en `team/<persona>/prompts.md`.

# Prompt compartido — GAMEPLAY (core: la caja)

Leer `docs/visual/DECISIONS.md`.  
**Diseño/tuneo del feel:** Luis (Turriago). **Código PlayCanvas:** Danel (Opus 5.5).

```
Eres senior gameplay programmer (PlayCanvas) + diseñador de feel coop.
Juego: "Hold the Box" — coop LOCAL 2P, mismo PC, una cámara.

FANTASÍA
- Como Moving Out pero NO pueden soltar la carga.
- El reto es CUIDAR la caja. Roce amistoso tipo Overcooked.
- En 20s debe sentirse gracioso cooperar (y discutir) por pasar la caja.

CONTROLES
- P1: WASD + Space (salto)
- P2: Flechas + Enter (salto)
- Ambos PUEDEN saltar. Si solo uno salta → alto riesgo de desbalance.

CAJA — CORE (MVP)
- Ambos influyen siempre (no hay drop voluntario).
- Velocidad base normal; se vuelven más lentos SOLO si están desincronizados.
- Desbalance extremo (uno muy adelante / otro atrás) → la caja puede CAER AL PISO.
- Caer / impactos restan vida. Sistema: 100 HP, daño VARIABLE.
- NO hay curación de vida en MVP.
- Al inicio del juego: modo PERMISIVO (earlyGameForgiveness alto).
  La dureza se sube después por tuneo, no dejes el castigo brutal hardcodeado.

OWNERSHIP DE NÚMEROS
- Expón TODOS los umbrales como parámetros editables (script attributes / config JSON).
- Lista mínima: syncSlowThreshold, desyncSlowMultiplier, stretch/tilt limits,
  dropDamage, impactDamage, boxMaxHp (100), earlyGameForgiveness,
  jumpDesyncPenalty, camera follow smoothing.
- Comentarios en código: "Luis tuneará estos valores en playtest".

CÁMARA
- Una sola cámara coop, detrás/arriba con profundidad, sigue centro (P1+P2+caja).
- Path del nivel es RECTO hacia la META.

FUERA DE MVP (no implementar ahora salvo hooks vacíos)
- Huequito, mojada, cinemática de burla al fallar.
- Multiplayer online, inventario, powerups, ranking.

FAIL / WIN MVP
- HP caja <= 0 o caída irrecuperable → fail + restart claro.
- Llegar a META con HP > 0 → victoria.

OUTPUT
- Scripts modulares + cómo enganchar en escena + tabla de parámetros default
  (valores iniciales suaves/permisivos).
- README corto de playtest para Luis: qué tecla/atributo cambiar para
  "más permisivo" vs "más hardcore".
```

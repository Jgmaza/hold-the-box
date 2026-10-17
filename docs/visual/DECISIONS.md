# Decisiones de diseño (congeladas en entrevista Lead)

Fuente de verdad para reescribir `prompts/shared/*`.  
Refs visuales: [`refs/`](./refs/)

---

## Ronda 1 — Identidad, feel, cámara, tono

### Jugabilidad (feel)
- Norte: **Moving Out**, pero **no pueden soltar** lo que cargan.
- El reto es **cuidar la caja**, no solo llegar.
- Cooperación con roce amistoso tipo **Overcooked** (reírse / pelearse un poco por sincronizar).

### Estética vs movimiento
- **Trazos / look:** cercano a **Fall Guys** (formas legibles, cartoon party, colores vivos).
- **Movimiento / layout:** recorrido **recto hacia adelante** con profundidad (no arena caótica).
- Ref principal de cámara + path: [`refs/concept-camera-path.jpeg`](./refs/concept-camera-path.jpeg)
- Ref concepto base: [`refs/concept-art-base.jpg`](./refs/concept-art-base.jpg)

### Física de caja (MVP primero)
- Física **simple** para poder mostrar pronto.
- Si un jugador se adelanta mucho y el otro queda atrás → la caja puede **caer al piso** y eso **daña** la caja.
- MVP: caja ligada a un sistema de **vida / integridad** (más que huecos/mojado todavía).
- Post-MVP / nice: huequito, se moja, etc. (no bloquean el primer demo).

### Cámara
- **Una sola cámara cooperativa** (mismo PC, 2 jugadores).
- 3ª persona con **profundidad**: detrás/arriba, mirando hacia la META, ambos en 3D.
- Sigue el centro del dúo + caja (estilo de la imagen ref).

### Tono / marcas
- **B) Family-friendly primero:** mismo vibe, sin depender de marcas/personas reales.
- Si sobra tiempo: “mods” / upgrade visual (versión más cercana a la imagen original).

### Fantasía (20 segundos)
> Debe sentirse **gracioso** jugar y cooperar con tu amigo, y poder **discutir amistosamente** por pasar la caja — como Overcooked.

### Fail
- Ideal a futuro: animación de **burla** (otros gozando lo de la caja mientras ellos fallan).
- **Inicial / MVP:** restart claro (splash o caída → reintentar). Sin bloquear por cinemática de burla.

---

## Implicaciones para prompts compartidos (borrador profe)

| Prompt | Debe anclar |
|---|---|
| `art.md` | Fall Guys strokes + path recto + family-friendly; refs en `docs/visual/refs/` |
| `gameplay.md` | Moving Out sin soltar; vida de caja; desbalance = daño; no online |
| `level_design.md` | Corredor con profundidad hacia META; lectura clara; 1 cámara |
| `ui.md` | Textos ES; tono gracioso coop; start/fail restart primero |
| `polish.md` | Burla fail = post; primero feedback de vida/inclinación |

---

## Pendiente — Ronda 2 (visual / estado del arte)
Ver preguntas del Lead/profe en chat; respuestas se suman aquí.

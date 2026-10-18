# Prompt compartido — UI

Leer `docs/visual/DECISIONS.md` (Ronda 4).

```
Eres UI designer/implementer PlayCanvas para "Hold the Box".
Tono: gracioso coop Overcooked, textos en español, family-friendly.
Sol de mediodía caribeño (colores de deliveries/luis/PALETTE.md si existe).

HUD MVP
- Barra de vida de la caja (100 HP) visible: sobre la caja O arriba en pantalla (opción A).
- Clara, gruesa, legible; no minimalista escondido.

FAIL MVP
- Placeholder listo para futura "burla", PERO ya debe haber botón/flujo Restart (opción C).
- Texto tipo: "¡Se dañó la VIP!" + Restart. No bloquees por cinemática.

TIMER
- Timer visible SOLO para pitch/demo; debe poder APAGARSE fácilmente (opción C).
- Default en desarrollo: configurable on/off.

PANTALLAS
- Start (título + Play)
- Victory
- Fail + Restart
- Sin tienda, ranking ni online.

CONTRATO CON GAMEPLAY
- Escucha eventos: boxHpChanged, boxDropped, levelFail, levelWin.
- No reescribas físicas de la caja.
```

# Registro — caja `bomba`

Tercera caja, aparte de la VIP y del gato.

## Qué hace

- En el título se elige con clic o con la tecla `3`. Arriba dice `BOMBA` y el tiempo que queda.
- La mecha dura **90 segundos** (`box.bomb.fuseTime`). Corre aunque caminen bien. Juntos solo llegan antes.
- A los 20 segundos (`warnTime`) la chispa se apura, la caja palpita y avisa «la mecha está corta».
- Si pisan la meta antes, la mecha se apaga y ganan.
- Si llega a cero, explota: sacudida, destello y «¡Explotó la bomba!».
- Caerse por inclinarse sigue siendo la derrota de siempre, sin esperar al reloj.
- Reintentar desde el checkpoint vuelve a dar los 90 segundos. Caer al agua no reinicia la mecha.

## Dónde está

| Pieza | Archivo |
|---|---|
| Números | `apps/src/config.js` → `box.bomb` |
| Reloj | `apps/src/sim/bomb.js` |
| Mecha y chispa | `apps/src/view/boxView.js` |

Eventos: `bomb:beep`, `bomb:warn`, `bomb:explode`.

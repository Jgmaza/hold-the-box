# Registro — caja `bomba`

Tercera caja, aparte de la VIP y del gato.

## Qué hace

- En el título se elige con clic o con la tecla `3`. Para probar directo: `?level=level2&box=bomba`.
- La mecha dura **90 segundos** (`box.bomb.fuseTime`). Corre aunque caminen bien. Juntos solo llegan antes.
- **Sin mojado ni huequito.** Los golpes y el agua le quitan vida a la bomba:
  - Golpes (rodillo, aterrizaje fuerte, NPC): `secondsPerDamage` segundos por cada 1 % de daño que haría en la caja VIP. Rodillo 8 % → 3.2 s.
  - Agua (chorro del niño, caer al agua): `secondsPerWet` por cada 1 % de mojado. Caer al agua 45 % → 4.5 s.
  - Chorros del piso, lluvia, ola y viento gastan la mecha mientras dura (mismas tasas, por segundo).
  - Cada golpe avisa «¡Rodillo! −3 s de bomba».
- A los 20 segundos (`warnTime`) la chispa se apura, la caja palpita y avisa «la mecha está corta».
- Si pisan la meta antes, la mecha se apaga y ganan. La calificación sale de la vida que sobra: perfecta con la mitad o más, aceptable con 20 % o más (`rating`).
- Si llega a cero, explota: sacudida, destello y «¡Explotó la bomba!».
- Caerse por inclinarse sigue siendo la derrota de siempre, sin esperar al reloj.
- Reintentar desde el checkpoint vuelve a dar los 90 segundos. Caer al agua no reinicia la mecha (y le quita 4.5 s).

## HUD con la caja bomba

- Primera barra: **Vida de bomba**, con los segundos que quedan (`1:30`). Verde, amarilla desde la mitad, roja y palpitando en los últimos 20 s. Se marca en azul mientras el agua la está gastando.
- No hay barra de mojado. Sincronía sigue igual.
- El cronómetro de arriba cuenta hacia atrás la vida de la bomba (`01:29.6`) y se pone rojo en los últimos 20 s. El chip de abajo dice solo `BOMBA`.
- Al ganar se muestran el tiempo de carrera y la vida que sobró.

## Dónde está

| Pieza | Archivo |
|---|---|
| Números | `apps/src/config.js` → `box.bomb` |
| Reloj, golpes (`hit`) y desgaste (`drain`) | `apps/src/sim/bomb.js` |
| Golpes y agua → segundos | `apps/src/sim/box.js` (`damage`, `addWet`, `update`) |
| HUD | `apps/src/ui/ui.js` + `ui.css` |
| Atado de TNT (malla) | `deliveries/luis/models/caja-bomba.glb` |
| Script que genera la malla | `apps/scripts/make-bomb-glb.mjs` |
| Cartón de la caja bomba | `apps/src/view/signs.js` → `bombBoxCanvas` |
| Reloj, LED, mecha y chispa | `apps/src/view/boxView.js` |

Eventos: `bomb:beep`, `bomb:warn`, `bomb:explode`, `bomb:hit { seconds, cause, timeLeft }`.

## Cómo se ve

- La caja va cerrada, con un cartón propio: etiqueta de envío con código de barras (`ENTREGA / URGENTE`), franja amarilla y negra con `¡PELIGRO!`, `NO SOLTAR` y los iconos de no mojar, frágil y este lado arriba.
- Encima va un atado de 7 cartuchos rojos con dos vueltas de cinta gris y una etiqueta, amarrado con dos sogas que le dan la vuelta entera a la caja (con nudo arriba).
- Sobre el atado, la placa del detonador: reloj de 7 segmentos inclinado hacia la cámara, LED, botón rojo, perilla, chip y bornera. Cuatro cables de colores van a las puntas de los cartuchos y dos cables en espiral (rojo y negro) bajan hasta la tapa.
- De la punta de un cartucho sale la mecha con su casquillo de bronce.

## Qué se mueve desde código

- El reloj muestra el tiempo real que queda (`M:SS`). Los dos puntos parpadean cada segundo, y el doble de rápido en los últimos `warnTime` segundos.
- El LED se prende en cada tic (`bomb:beep`), al mismo ritmo del sonido.
- La mecha se acorta con el tiempo y la chispa va en la punta, soltando chispitas (más en los últimos segundos).
- En los últimos 8 segundos el atado tiembla.
- En el menú, la caja de muestra cuenta hacia atrás en bucle.
- Si el `.glb` no carga, queda la bomba redonda de antes. Nada de esto cambia `box.size` ni los choques.

## Regenerar la malla

```
node apps/scripts/make-bomb-glb.mjs
```

Malla propia, sin modelos de terceros. Si se mueven la placa, el reloj, el LED o la punta de la mecha en el script, hay que copiar las medidas nuevas a las constantes `BOMB_*` de `boxView.js` (el script las imprime al terminar).

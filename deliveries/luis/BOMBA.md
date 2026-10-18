# Registro — caja `bomba`

Tercera caja, aparte de la VIP y del gato.

## Qué hace

- En el título se elige con clic o con la tecla `3`. Para probar directo: `?level=level2&box=bomba`.
- La bomba arranca al **100 %**. **No hay tiempo:** si van bien, no baja nunca.
- **Sin mojado ni huequito.** Solo la dañan tres cosas:
  - Golpes (rodillo, aterrizaje fuerte, NPC): el mismo % que le quitarían de contenido a la caja VIP. Rodillo 8 % → −8 %.
  - Agua (chorro del niño, caer al agua): el mojado que recibiría × `wetFactor` (0.3). Caer al agua 45 % → −13.5 %.
  - Chorros del piso, lluvia, ola y viento la dañan mientras duran (mismas tasas, por segundo).
  - Cada golpe avisa «¡Rodillo! −8% de bomba».
- **Sin sincronía la bomba se daña.** Por debajo de `desyncBelow` (0.5) pierde hasta `desyncPerSec` (6) % por segundo con sincronía 0. Caminar uno solo (sincronía 0.35) quita ≈ 1.8 % por segundo. Avisa «¡Sin sincronía la bomba se daña!» y la barra tiembla con borde rojo.
- Con `warnHealth` (25 %) o menos, la chispa se apura, la caja palpita y avisa «¡La bomba está por explotar!». El tic se acelera a medida que baja.
- La calificación sale del % que queda al llegar a la meta: perfecta con 85 % o más, aceptable con 50 % o más (`rating`).
- Si llega a 0 %, explota: sacudida, destello y «¡Explotó la bomba!».
- Caerse por inclinarse sigue siendo la derrota de siempre.
- Reintentar vuelve al checkpoint con el % que tenía la bomba al pasar por él. Reiniciar el nivel la deja en 100 %.

## HUD con la caja bomba

- Primera barra: **¡BUM!**, con el % de la bomba (`100%`). Verde, amarilla bajo 50 %, roja y palpitando desde 25 %. Borde azul mientras el agua la daña, borde rojo y temblor si van desincronizados.
- No hay barra de mojado ni cronómetro grande. Arriba al centro queda solo el chip `BOMBA` (rojo desde 25 %).
- Al ganar se muestran el tiempo de carrera y el % con que llegó la «Bomba».

## Dónde está

| Pieza | Archivo |
|---|---|
| Números | `apps/src/config.js` → `box.bomb` |
| % de la bomba, golpes (`hit`), daño continuo (`drain`) y sincronía | `apps/src/sim/bomb.js` |
| Golpes y agua → % de bomba | `apps/src/sim/box.js` (`damage`, `addWet`, `update`) |
| % guardado en el checkpoint | `apps/src/sim/game.js` (`checkpointSnapshot.bomb`, `retry`) |
| HUD | `apps/src/ui/ui.js` + `ui.css` |
| Atado de TNT (malla) | `deliveries/luis/models/caja-bomba.glb` |
| Script que genera la malla | `apps/scripts/make-bomb-glb.mjs` |
| Cartón de la caja bomba | `apps/src/view/signs.js` → `bombBoxCanvas` |
| Reloj, LED, mecha y chispa | `apps/src/view/boxView.js` |

Eventos: `bomb:beep`, `bomb:warn`, `bomb:explode`, `bomb:hit { amount, cause, health }`, `bomb:desync {}` (empiezan a ir desincronizados).

## Cómo se ve

- La caja va cerrada, con un cartón propio: etiqueta de envío con código de barras (`ENTREGA / URGENTE`), franja amarilla y negra con `¡PELIGRO!`, `NO SOLTAR` y los iconos de no mojar, frágil y este lado arriba.
- Encima va un atado de 7 cartuchos rojos con dos vueltas de cinta gris y una etiqueta, amarrado con dos sogas que le dan la vuelta entera a la caja (con nudo arriba).
- Sobre el atado, la placa del detonador: reloj de 7 segmentos inclinado hacia la cámara, LED, botón rojo, perilla, chip y bornera. Cuatro cables de colores van a las puntas de los cartuchos y dos cables en espiral (rojo y negro) bajan hasta la tapa.
- De la punta de un cartucho sale la mecha con su casquillo de bronce.

## Qué se mueve desde código

- La pantalla de la placa muestra el % de la bomba (`100%`, ` 87%`, `  5%`).
- El LED se prende en cada tic (`bomb:beep`), al mismo ritmo del sonido.
- La mecha se acorta con el daño y la chispa va en la punta, soltando chispitas (más desde 25 %).
- Bajo 10 % el atado tiembla.
- En el menú, la caja de muestra baja de 100 % a 0 % en bucle.
- Si el `.glb` no carga, queda la bomba redonda de antes. Nada de esto cambia `box.size` ni los choques.

## Regenerar la malla

```
node apps/scripts/make-bomb-glb.mjs
```

Malla propia, sin modelos de terceros. Si se mueven la placa, el reloj, el LED o la punta de la mecha en el script, hay que copiar las medidas nuevas a las constantes `BOMB_*` de `boxView.js` (el script las imprime al terminar).

# Registro — caja `gato-inquieto`

Perfil aceptado para trabajar en `work/luis`. La caída sigue siendo la del motor: si la caja se queda crítica, se suelta y pierden.

## Qué hace

- La caja lleva un gato. Orejas, cola y cara se agitan más conforme sube la rabia (0–100, se ve en el letrero `GATO`).
- La rabia sube **siempre**. Caminar juntos la frena (`calmMul`) pero no la borra. Separarse la acelera (`desyncMul`).
- Al llegar a `warnRage` asoma la pata. A `scratchRage` araña a un lado y repite cada `cooldown` segundos. La rabia no se reinicia.
- Desde `damageRage` también baja el contenido, despacio (`chipPerSec`).
- En la terraza de la meta (`goalLead` metros antes), si no avanzan hacia ella (`hurrySpeed`), el gato vacía la caja en unos 5 s (`goalDrainPerSec`). Si cruzan corriendo, ese vaciado no corre.
- Integridad 0 sigue siendo la derrota de siempre: «se vació».
- En el título se elige una de dos: **Caja VIP** (la de siempre, sin gato) o **Caja del gato** (orejas, cara, cola y garras). Teclas `1` y `2`, o clic.
- Durante la partida, arriba dice `VIP` o `GATO`.
- `box.cat.enabled` solo se enciende con la caja del gato.

## Dónde está en código

| Pieza | Archivo |
|---|---|
| Números | `apps/src/config.js` → `box.cat` |
| Regla | `apps/src/sim/cat.js` (usa `player.knock` y `box.kick`) |
| Pata y orejas | `apps/src/view/boxView.js` |
| Sonido | `apps/src/view/audio.js` |

Eventos para PlayCanvas: `cat:warn { player }` y `cat:scratch { player }`.

## Audio

Los archivos están en `deliveries/luis/audio/` (CC0, ver `ATTRIBUTION.txt`). Si falta uno, el maullido y el arañazo siguen siendo un tono del navegador.

## Qué mirar después en PlayCanvas

- La pata es `deliveries/luis/models/pata-gato.glb` (malla propia, sin modelo de terceros). Sale por el hueco del frente. Si el archivo no carga, queda la pata de cajas. No cambia `box.size` ni los choques.
- El arañazo no crea una derrota nueva. Solo empuja hacia `critical` → drop.
- Si más adelante hay un clip de animación, tiene que leer `cat.phase` (`calm` / `warn` / `swipe`) y `cat.side` (1 o 2).

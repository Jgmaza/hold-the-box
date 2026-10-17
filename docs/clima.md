# Clima de las islas (lluvia y viento)

Código: `apps/src/sim/weather/` (lógica) · `apps/src/view/weatherView.js` (dibujo) · `apps/src/levels/sections.js` (secciones listas).
Números: `CONFIG.weather` en `apps/src/config.js` (se ajustan en vivo con `?debug` → carpeta **Clima**).

El clima es una propiedad de una **isla**, es decir, de una plataforma del nivel. Cualquier isla puede tener lluvia o viento, y se puede combinar con NPCs.

---

## 1. Instanciar una sección en una línea (recomendado)

En `levels/<nivel>.js`:

```js
import { rainIsland, windIsland } from './sections.js';

platforms: [
  // ...
  rainIsland({ id: 'isla-lluvia', from: 40, length: 14 }),   // carpas automáticas, alternadas
  windIsland({ id: 'isla-viento', from: 23, length: 14 }),
  // ...
],
```

El nivel avanza hacia **−Z**. `from` es el borde de **entrada** (el z más alto) y la isla llega hasta `from − length`.
Para encadenar secciones, la siguiente empieza en `from − length`, o un poco antes si hay un puente en el medio.

### `rainIsland(opciones)`: sección de lluvia de cualquier largo

| Opción | Por defecto | Qué es |
|---|---|---|
| `id` | **obligatorio** | id de la plataforma |
| `from` | **obligatorio** | z del borde de entrada |
| `length` | **obligatorio** | largo de la sección en metros (puede ser tan larga como quieras) |
| `shelters` | ≈ 1 cada 4.5 m | cantidad de carpas |
| `firstSide` | `'left'` | lado de la primera carpa (la más cercana a la entrada) |
| `width` | `10` | ancho de la isla |
| `x` | `0` | centro de la isla en X |
| `top` | `1` | altura del piso |
| `shelterSize` | `{ w: 3.6, d: 3 }` | tamaño de cada carpa (en 3.6 m entra la pareja con la caja) |
| `strength` | `1` | multiplicador de la lluvia solo en esta isla |

Las carpas:
- **Siempre se alternan** izquierda → derecha → izquierda…
- Se reparten **parejo** a lo largo: una cada `length / shelters` m, centradas en su tramo.
- Quedan a 0.8 m del borde y dejan un **pasillo libre en el centro** para caminar.

Si los números no tienen sentido, la función lo dice con un error claro al cargar el nivel:
- `"6 carpas de 3 m no entran en 8 m (máximo 2)"`;
- `"la isla de 6 m es angosta para carpas de 3.6 m"`;
- falta `id` o falta `from`.

Ejemplos:

```js
rainIsland({ id: 'lluvia-corta', from: 40, length: 9 })                         // 2 carpas
rainIsland({ id: 'lluvia-larga', from: 0, length: 30, shelters: 6 })           // 6 carpas, una cada 5 m
rainIsland({ id: 'lluvia-suave', from: 0, length: 14, strength: 0.5 })         // moja la mitad
rainIsland({ id: 'lluvia-der', from: 0, length: 14, firstSide: 'right' })      // empieza a la derecha
```

### `windIsland(opciones)`

| Opción | Por defecto | Qué es |
|---|---|---|
| `id`, `from`, `length` | **obligatorios** | igual que en la lluvia |
| `dir` | `'alternate'` | `'alternate'` (izquierda/derecha alternado), `'random'` (izquierda o derecha al azar), o grados (0 = hacia +X / derecha, 90 = hacia +Z) |
| `width`, `x`, `top` | `10`, `0`, `1` | igual que en la lluvia |
| `strength` | `1` | multiplicador del viento solo en esta isla |

### Sin helper (a mano)

Es lo mismo que devuelven los helpers: el campo `weather` en la plataforma.

```js
{ id: 'isla', x: 0, z: 33, w: 10, d: 14, top: 1, weather: 'rain' }
{ id: 'isla', ..., weather: { type: 'rain', strength: 0.6, shelters: [{ x: -2.4, z: 36, w: 3.6, d: 3 }] } }
{ id: 'isla', ..., weather: { type: 'wind', dir: 'alternate', strength: 1.2 } }
```

---

## 2. Qué hace cada clima

Cada isla con clima tiene un ritmo que se repite: **calma → aviso → fuerte → calma**. Los tiempos varían ±20% en cada ciclo y se repiten igual con la misma `?seed=N`.

### Lluvia (`CONFIG.weather.rain`)
| Fase | Mojado de la caja |
|---|---|
| Calma (llovizna) | **8 %/s** (`wetRate × drizzle` = 40 × 0.2) |
| Aviso (nube oscura + trueno, 1.5 s) | 14 %/s: hora de correr a la carpa |
| **Aguacero** (3 s) | **40 %/s**: uno entero al descubierto deshace la caja |

- **Carpas:**
  - con la caja debajo no se moja; cuenta aunque asome hasta 0.45 m (`shelterMargin`);
  - la lona se vuelve transparente y la UI dice **"☂ A SALVO BAJO LA CARPA"**;
  - debajo de la carpa el piso no resbala.
- **Piso:** fuera de las carpas, el piso de la isla resbala (`slip` 0.7).

### Viento (`CONFIG.weather.wind`)
- Las ráfagas (2.2 s, con aviso de 0.9 s) **empujan** a la pareja de costado, hasta 2.6 m/s. Quietos, se van al agua.
- **Inclinan la caja**, hasta 16°, lo que activa la fuga del huequito.
- **Se llevan contenido**: 4 %/s, y hasta ×1.8 si van desincronizados.
- Caminar **contra** la ráfaga compensa el empuje.
- La **manga de viento** y las flechas del piso muestran hacia dónde va a soplar.

---

## 3. Diseño: reglas que conviene respetar

- **Carpas alcanzables en el aviso.** El aviso dura 1.5 s y una pareja lenta camina ~2.5 m/s, así que la distancia entre carpas no debería pasar de ~4.5 m. El valor por defecto de `rainIsland` (una cada 4.5 m) ya lo cumple.
- **Puente con checkpoint antes de cada isla de clima**, como en el Muelle (`cp-lluvia`, `cp-viento`). Si la caja se deshace, se reintenta desde la entrada de la isla.
- **No pegar dos islas de clima** sin un respiro (puente o isla normal) en el medio.
- Más difícil: más largo, menos carpas o `strength` > 1. Más fácil: lo contrario.

---

## 4. Para programadores

- `WeatherService` (`sim/weather/weatherService.js`) es el **único punto de entrada** desde `game.js`. Crea una zona por cada plataforma con `weather` y en cada paso devuelve los efectos que aplica `game.js`:
  - `wetRate` → `box.wetRate`;
  - `drain` y `tilt` → `box.external`;
  - `push` → `player.push`;
  - `gripMul` → el agarre de cada jugador.
- **Tipo de clima nuevo** (por ejemplo, niebla):
  1. clase que extienda `WeatherZone` con `apply(dt, game, fx)`;
  2. registrarla en `WEATHER_TYPES`;
  3. números en `CONFIG.weather.<tipo>`;
  4. su dibujo en `weatherView.js`.
- **Eventos**, de la zona donde está la caja:

| Evento | Datos |
|---|---|
| `weather:enter` / `weather:exit` | `{ type, zone }` |
| `weather:warn` / `weather:start` / `weather:end` | `{ type, zone, dir }` |
| `weather:shelter` | `{ type, zone, inside }` (entra / sale de una carpa) |

- **Tests:** `apps/test/weather.test.js` (`npm test`) cubre lluvia, carpas, viento, ritmo y los helpers `rainIsland` / `windIsland`.
- **Audio opcional (Luis):** `luis/audio/sfx-lluvia`, `sfx-viento` (loops) y `sfx-trueno`.

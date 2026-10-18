# Rieles asimétricos

Código: `railsPair()` / `railsBeats()` en [`apps/src/levels/sections.js`](../apps/src/levels/sections.js) · vista: `kind: 'rock' | 'bump'` en `levelView.js`.  
Issue: [#16](https://github.com/Jgmaza/hold-the-box/issues/16).

Dos rieles paralelos (uno por jugador) sobre el agua. Cada carril tiene **obstáculos distintos y desfasados en Z**: uno salta o espera mientras el otro camina. Si no se coordinan, la caja se inclina.

Igual que `rainIsland` con las carpas: **la sección puede ser tan larga como se quiera** — los obstáculos se reparten solos.

---

## 1. Instanciar en una línea

```js
import { railsPair } from './sections.js';

platforms: [
  { id: 'antes', x: 0, z: 0, w: 8, d: 8, top: 1 },
  ...railsPair({ id: 'rieles', from: -4, length: 28 }),            // ~6 obstáculos (default)
  ...railsPair({ id: 'rieles-cortos', from: 0, length: 14 }),     // más corto → menos obstáculos
  ...railsPair({ id: 'rieles-largos', from: 0, length: 45, hazards: 10 }),
  { id: 'despues', x: 0, z: -36, w: 8, d: 8, top: 1 },
],
```

`railsPair` devuelve un **array** de plataformas (hay que hacer spread `...`). El nivel avanza hacia **−Z**: `from` es el borde de entrada y los rieles llegan hasta `from − length`.

| Opción | Por defecto | Qué es |
|---|---|---|
| `id` | **obligatorio** | prefijo de ids (`rieles-izq-s0`, `rieles-der-rock0`, …) |
| `from` | **obligatorio** | z del borde de entrada |
| `length` | `28` | largo total (m); puede ser cualquier valor ≥ ~8 m |
| `hazards` | ≈ 1 cada 4 m del tramo jugable (mín. 2) | cantidad de obstáculos |
| `beats` | auto (`railsBeats`) | sheet a mano `{ p1, p2 }` con offsets; si se da, ignora `hazards` |
| `laneX` | `0.8` | \|x\| de cada carril (P1 = −laneX, P2 = +laneX) |
| `width` | `0.7` | ancho de cada riel |
| `top` | `1` | altura del piso |

Arena de prueba (solo tests): `apps/test/fixtures/railsArena.js`.

En el Muelle: `...railsPair({ id: 'rieles', from: -44, length: 28 })`.

Si los números no caben, error claro al cargar:
- `"length 6 m es corto (mínimo 8 m)"`;
- `"10 obstáculos no entran en 14 m"`.

---

## 2. Cómo se reparte (como las carpas de lluvia)

1. **3 m** sólidos al entrar y al salir (`RAILS_APPROACH`).
2. En el tramo del medio se colocan `hazards` slots **parejo**.
3. En cada slot **un solo carril** tiene obstáculo (alterna P1 → P2 → P1 → …).
4. Tipo según ciclo `RAILS_TYPES`: piedra → hueco → piedra → tope → hueco → piedra → …

Con `length: 28` (default) salen **6** obstáculos, muy parecido al sheet fijo original:

| ~metros | P1 (izq) | P2 (der) |
|---|---|---|
| 0–3 | sólido | sólido |
| ~5 | **piedra** | libre |
| ~9 | libre | **hueco** |
| ~12 | **piedra** | libre |
| ~16 | libre | **tope** |
| ~20 | **hueco** | libre |
| ~23 | libre | **piedra** |
| 25–28 | salida | salida |

- **Piedra** (`kind: 'rock'`): bloque ~0.55 m sobre el riel.
- **Hueco**: corte de **1.6 m** (`RAILS_GAP`).
- **Tope** (`kind: 'bump'`): escalón bajo ~0.35 m.

`railsBeats(length, hazards?)` genera el sheet sin crear plataformas (útil en tests).  
`RAILS_BEATS` = `railsBeats(28)`.

---

## 3. Diseño

- Checkpoint justo **antes** de entrar a los rieles.
- No hace falta motor nuevo: todo es plataformas AABB.
- Más difícil: más largo o más `hazards`. Más fácil: lo contrario.
- Se puede combinar después con clima / rampas al ensamblar mapas (#17).

---

## 4. Tests

`apps/test/rails.test.js` — geometría a varios largos, bloqueo/salto, arena y Muelle.

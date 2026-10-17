# Perfiles de caja — Luis

Cada perfil = mismo motor, **énfasis distinto**. Danel puede mapearlos a presets en `config.js`.

## Cómo elegir / mejorar
1. Juega el nivel con el default actual.  
2. Decide qué quieres que “cuente la historia” de esa caja (¿más frágil al tilt? ¿odia el agua?).  
3. Anota qué knobs de `config.js` cambian (`box.tilt.*`, `box.leak.*`, `box.wet.*`, `box.sync.*`).  
4. Playtest otra vez.

---

## Perfil A — `vip-fragil` (default del jam)

| Idea | Caja VIP/FRÁGIL estándar del muelle |
| Fantasía | Cuidarla juntos; castigo claro pero permisivo al inicio |
| Énfasis | Balance tilt + leak + wet como está, tuneado por ti |
| Cambios vs actual | _(rellenar tras playtest)_ |

## Perfil B — `gato-inquieto`

| Idea | Caja con un gato que no quiere estar dentro |
| Fantasía | Si se desincronizan, asoma la pata por el hueco y araña a un jugador para que suelten la caja |
| Énfasis | tilt (el arañazo empuja hacia la caída que ya existe). Leak y wet siguen igual |
| Knobs | `box.cat.*` en `apps/src/config.js`. `enabled: false` vuelve a la caja VIP |
| Registro | [`GATO.md`](./GATO.md) |

## Perfil C — `bomba`

| Idea | Caja con mecha |
| Fantasía | Tienen 90 segundos para llegar. Si no, explota |
| Énfasis | Tiempo. No usa gato ni goteo |
| Registro | [`BOMBA.md`](./BOMBA.md) |

---

## Decisión de selección (para Jose / pitch)

- Caja del pitch / demo principal: **`___________`**
- Por qué: **`___________`**

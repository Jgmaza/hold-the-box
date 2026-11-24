# Qué necesita aportar el juego (mapa de huecos)

> Relato completo del proyecto (equipo + tech + arquitectura): [`EL-PROYECTO.md`](./EL-PROYECTO.md)

Vista práctica: **qué falta / qué evoluciona** para la expo, y quién lo cubre.  
El core local **ya está**; el aporte nuevo es **producto online + docs creativas**.

---

## 1) Producto — menú y modos

| Pieza | Estado hoy | Aporte esperado | Dueño |
|---|---|---|---|
| Modo Local (2P mismo PC) | ✅ Existe | Mantener; sin login obligatorio | Danel (flujo menú) |
| Modo Multijugador (2 PCs) | ❌ No existe | Entrada de menú + lobby → partida | Danel + Luis UI |
| Gate auth | ❌ Arcade por IP | Magic link + username (máx. 16) | Jose schema · Luis UI · Danel gate |
| Coming soon móvil | ❌ Se puede “abrir” mal | Pantalla tipográfica HTB | Luis (#65) |
| Records | ⚠️ Arcade 5 letras / IP | UI nueva + `user_id` + `play_mode` | Jose (#64) · Danel front |

---

## 2) Backend (Supabase)

| Pieza | Estado hoy | Aporte esperado | Dueño |
|---|---|---|---|
| `arcade_records` por IP | ✅ | Migrar / reset → scores por usuario | Jose (#64) |
| Auth (magic link) | ❌ | Supabase Auth | Jose (#63) |
| Tabla `profiles` | ❌ | username + vínculo a auth user | Jose (#63) |
| Ranking `play_mode` | ❌ | `local` \| `multiplayer` separados | Jose (#64) |
| Salas / Realtime | ❌ | Tablas + canal para lobby/sync | Jose apoyo · Danel (#66/#67) |
| Edge Function leaderboard | ✅ | Adaptar a nuevo esquema | Jose |

Docs actuales del ranking: [`../leaderboard.md`](../leaderboard.md) (se actualizará con #64).

---

## 3) Multijugador en partida

| Pieza | Qué implica | Dueño |
|---|---|---|
| **Sync coop (#67)** | Replicar estado jugable entre 2 clientes (inputs o estado autoritativo). El local sigue siendo fuente de verdad del feel. | **Danel** |
| **Lobby / salas (#66)** | Crear/unirse, listos, arrancar mapa | Luis UI + Danel flujo |
| **Voz / micro (#68)** | Canal de audio en la sala + mute | Danel cableado · Luis mute UI |

**No pedir para la expo:** matchmaking global, más de 2 jugadores, mobile play, reescritura del motor de caja.

---

## 4) Gameplay local (no es el foco, pero existe)

Ya aportado / mantenible:

- Sim de caja (tilt, huequito, mojado, sync)  
- 4 mapas + secciones (`rainIsland`, `windIsland`, `railsPair`, etc.)  
- NPCs, recovery, vidas, win rating  
- Personajes seleccionables, audio, deliveries  

Si algo de esto se toca: solo bugs o knobs — **no features nuevas** sin OK.

Entregas de arte/audio históricas siguen en `deliveries/`; el juego usa placeholders si faltan (ver tabla en [`../../apps/README.md`](../../apps/README.md)).

---

## 5) Docs / UX — aporte “para cuando rediseñemos”

Slots **A / B / C** (miembros nuevos; salen Matias, Zharick, Juanes). Avanzan el **diseño del siguiente ciclo** (mapas + campaña), no el build de la expo:

| Entrega | Para qué sirve después | Issues |
|---|---|---|
| Playtests formales | Lista de fricciones reales (UI, caja, lectura de nivel) | #69 |
| Briefs por mapa | Rediseño de Muelle / Bahía / Aldea / Campamento con beats claros | #70 |
| Coherencia de biomas | Misma fantasía entre islas | #70 (Zharick) |
| Mapa de campaña | Orden, desbloqueo, estados del “mundo” | #71 |
| Transiciones | Texto corto entre mapas (narrativa ligera) | #71 |
| Boceto mapa mundo | Layout visual para pitch / UI futura | #71 |

Carpetas destino: `docs/ux/playtests/`, `docs/ux/redesign/`, `docs/story/`.  
Skeletons + voz del juego: [`templates.json`](./templates.json) · [`voz-y-estilo.md`](./voz-y-estilo.md).

---

## 6) Checklist mental “¿dónde aporto yo?”

```
¿Vas a tocar código del juego o Supabase?
  SÍ → Track técnico (roles.md § Track A) · issue #63–#68
  NO → Track docs/UX (§ Track B) · issue #69–#71 · no abras apps/

¿Es una idea nueva de mecánica / enemigo / tienda?
  → Parar. Comentar a Jose. Fuera de alcance expo.

¿Es un bug del modo local?
  → Issue + PR chico; no mezclar con sync online.
```

---

## 7) Definición de “listo” para la expo (norte)

Mínimo creíble en demos:

1. Menú con **Local** y **Multijugador**.  
2. Local jugable como hoy (sin obligar cuenta).  
3. Multi: login → username → sala → **dos PCs se ven en el mismo mapa** (#67) + micro opcional (#68).  
4. Móvil: **Coming soon**, no partida rota.  
5. Ranking no miente: scores local vs multi separados (aunque sea vacío al reset).  
6. Docs UX entregadas en Markdown (aunque el rediseño de mapas sea post-expo).

Detalle de personas e issues: [`roles.md`](./roles.md) · hub: [`README.md`](./README.md).

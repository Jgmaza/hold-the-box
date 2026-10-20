# Prompt — Mapa “Travesía” (3 paisajes en un recorrido)

**Para:** Danel (owner de `apps/`)  
**Cuándo usarlo:** cuando quieras un nivel hard que cruce mar → selva → desierto en una sola partida.  
**Caja de prueba:** VIP (`?box=vip`).  
**Modelo sugerido:** uno creativo / alto (p. ej. Claude Opus o similar), en Agent mode, con el skill `hold-the-box-playcanvas`.

---

## Copia y pega esto al agente

```
Sos el owner de gameplay PlayCanvas de Hold the Box (repo hold-the-box / apps/).

OBJETIVO
Creá un mapa NUEVO de dificultad alta (3★) llamado algo como "La Travesía" que se sienta
como UN solo recorrido continuo donde el paisaje cambia de verdad:

  1) Mar (muelle / bahía)
  2) Selva / aldea (jungle + village)
  3) Desierto / campamento

Pensado para jugarse con caja VIP (huequito + mojado). Better Together: la sincronía
es el reto, no una lista de features.

CONTEXTO DEL MOTOR (leer antes de inventar)
- Niveles en apps/src/levels/*.js, registro en apps/src/levels/index.js (LEVELS + MAPS).
- Hoy CADA nivel tiene UN theme/biome de por vida:
  - Mar: sin theme (agua + docks) → level1.js / level2.js
  - Selva: theme:'jungle', biome:'village' → aldea.js (valle, dirt, vidrio)
  - Desierto: theme:'desert', biome:'camp' → campamento.js (canyon, sand, cactus)
- levelView.js hace fork land vs sea al cargar (_land vs _sea). Cielo, niebla, pack de NPCs
  y música se fijan al start.
- Helpers: sections.js (rainIsland, windIsland, waveIsland, railsPair, glassBridge,
  dressLevel, recovery), nature.js (island looks), backdrop.js, valley.js, desert.js,
  audio.js (musica-loop / musica-selva / musica-desierto).
- NPCs: easy | medium | hard. Packs visuales por biome/theme (npcView.js).
- NO está en el leaderboard de campaña salvo que se extienda CAMPAIGN_LEVELS + Edge Function.

LO QUE YA INTENTAMOS Y NO BASTA
Solo cambiar cielo/niebla/música + skins de piso (dirt/sand) NO se lee como cambio de
paisaje: el jugador sigue viendo islas de playa a los lados. Si hacés zonas, el fondo
LATERAL tiene que cambiar por tramo de Z:
  - Mar → islas beach (arrecife, palmeras)
  - Selva → islas village/jungle (manglares) + laderas tipo valle (buildValley) en ese Z
  - Desierto → islas desert (dunas, cactus) + cañón (buildCanyon) en ese Z

REQUERIMIENTOS DE DISEÑO (el mapa debe incluir)
- Los 3 climas: rain, wind, waves (con shelters / holes / breakwaters).
- NPCs easy + medium + hard (skins del bioma de su tramo; opcional theme/biome en el def).
- Al menos un tramo asimétrico tipo rieles (railsPair) y uno tipo “cada uno distinto”
  (vidrio templado vs frágil, o carril bueno vs trampa con cactus).
- Ferry o moving platform, géiseres o sweeper, checkpoints que NO curan.
- Estaciones recovery: al menos refill + dry (VIP); cat/bomb opcionales al borde.
- Carteles claros en las TRANSICIONES (“→ La Selva”, “→ El Desierto”).
- Dificultad percibida > Bahía. Longitud larga pero justa con VIP (3 vidas).

REQUERIMIENTOS TÉCNICOS
1) API de zonas en el level data, p. ej.:
   zones: [
     { id:'mar', from, to, look:'beach', music:'musica-loop', label:'El Mar' },
     { id:'selva', from, to, theme:'jungle', biome:'village', look:'village',
       music:'musica-selva', label:'La Selva' },
     { id:'desierto', from, to, theme:'desert', biome:'camp', look:'desert',
       music:'musica-desierto', label:'El Desierto' },
   ]
   (from ≥ z ≥ to, avance hacia −Z.)
2) Runtime: al cruzar zona con la caja → cielo, niebla, sol, música, toast “→ {label}”.
3) Al CARGAR: generar backdrop/laderas POR TRAMO (no un solo look para todo el mapa).
4) Piso: docks en mar; skin dirt en selva; skin sand + cacti en desierto.
5) Registrar en MAPS con difficulty: 3. URL: ?level=<id>&box=vip
6) Tests: carga, checkpoints ordenados, win en meta, zoneAt por Z, no romper mapas viejos.
7) No meter en CAMPAIGN_LEVELS / leaderboard a menos que Jose lo pida.
8) Seguir docs/mechanics.md, convenciones del skill hold-the-box-playcanvas, español UI.

ENTREGABLE
- Archivo de nivel + wiring en index.js
- Cambios mínimos de motor (zones helper, levelView backdrop por tramo, game zone sync,
  audio/gameView atmósfera)
- Tests verdes
- Nota corta en el PR: cómo se siente la transición mar→selva→desierto al jugar

CALIDAD / CREATIVIDAD
No copies Bahía+Aldea+Campamento pegados. Diseñá un arco: tutorial implícito en el mar,
mentira del vidrio / NPCs de pueblo en la selva, decisión de carril + coyote en el desierto.
Las transiciones deben celebrarse (espacio, cartel, cambio de suelo Y de laterales).
Priorizá lectura y risa coop sobre densidad de obstáculos.
```

---

## Checklist rápido para quien revise el PR

- [ ] En selva se ven laterales verdes / manglares (no solo piso de tierra)
- [ ] En desierto se ven dunas / cañón / cactus a los lados (no playa)
- [ ] Cambia música al cruzar
- [ ] Toast o señal clara de transición
- [ ] VIP jugable de punta a punta con 3 vidas (difícil pero no unfair)
- [ ] `muelle` / `bahia` / `aldea` / `campamento` intactos

# Hold the Box — cómo se hizo el proyecto

**Un solo documento** para quien llega: qué es el juego, con qué se construyó, cómo está armado por dentro, y **quién hace qué ahora**.

Expo universidad · 28 nov · prioridad técnica: multijugador PC↔PC con micro, sin perder el local (2P en el mismo PC).

Git / ramas / CI: [`../ONBOARDING.md`](../ONBOARDING.md)  
Plantillas UX + voz: [`templates.json`](./templates.json) · [`voz-y-estilo.md`](./voz-y-estilo.md)  
Detalle de código: [`../../frontend/README.md`](../../frontend/README.md) · online: [`../online/SDD.md`](../online/SDD.md)

---

## 1) Qué es

Dos jugadores cargan una **caja viva**. Si uno tira y el otro no, se tuerce. Se inclina, gotea por el huequito, se moja. Coordinarse = estabilidad.

> El enemigo no es el mapa: es no botar, no mojar, no soltar.

Nació en jam (*Better Together*). Estribillo del pitch:

> *Ya no jugamos lo mismo. Por eso hicimos un juego donde tienen que ir juntos.*

**Controles:** P1 `WASD` + Espacio · P2 flechas + Enter.

| Mecánica | Qué hace |
|---|---|
| Inclinación | Desync → tilt → critical → sueltan la caja |
| Huequito | Inclinada = pierde contenido |
| Mojado | Agua / lluvia / chorros → más pesada e inestable |
| Sincronía | Inputs alineados → más velocidad y se endereza |

Tres cajas (misma regla, distinto énfasis): **VIP** · **gato** · **bomba**.  
Cuatro mapas de campaña: **El Muelle** · **La Bahía** · **La Aldea** · **El Campamento**.

---

## 2) El equipo (cómo está dibujado hoy)

Hay un **núcleo de construcción** (ya en marcha) y se abren **tres sillas creativas** para quienes llegan.

```
                         ┌─────────────────────────┐
                         │         JOSE            │
                         │  Lead del proyecto      │
                         │  + construcción         │
                         │  alcance · backend ·    │
                         │  deploy · unión del     │
                         │  equipo                 │
                         └───────────┬─────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌────────────────┐    ┌────────────────┐    ┌────────────────────┐
     │     DANEL      │    │      LUIS      │    │   CREATIVOS (×3)   │
     │  Dev estrella  │    │  Relaciones +  │    │   slots abiertos   │
     │                │    │  apoyo en dev  │    │                    │
     │  frontend/     │    │                │    │  A claridad/UI docs│
     │  + backend/    │    │  puente con    │    │  B caja/fantasía   │
     │  sync · menú   │    │  quien tiene   │    │  C nivel/señales   │
     │                │    │  info de los   │    │                    │
     │                │    │  proyectos +   │    │  docs/ux · story   │
     │                │    │  UI lobby/net  │    │  (no tocan código) │
     └────────────────┘    └────────────────┘    └────────────────────┘
```

### Núcleo listo

| Persona | Rol | En una frase |
|---|---|---|
| **Jose** | **Lead del proyecto y de la construcción** | Decide alcance, orquesta deploy (Pages + API), mergea, recibe gente nueva y mantiene el mapa del “qué estamos haciendo”. |
| **Luis** | **Relaciones + apoyo en desarrollo** | Puente con quienes tienen info de los proyectos (contexto, stakeholders, entregas, jam). Además apoya front: auth, lobby, Coming soon móvil, mute. |
| **Danel** | **Dev estrella** | Owner del código jugable en `frontend/` y del loop online en `backend/`: sim, sync, menú Local/Multi, cableado de voz. Donde el juego *existe* en runtime, está Danel. |

### Lo que falta: tres creativos

Salen del roster activo Matias, Zharick y Juanes. Sus carpetas quedan **históricas**.  
Para la expo (y el ciclo que sigue) necesitamos **tres creativos** — no programan el motor; documentan, playtesteán y proponen con la **voz del juego**.

| Slot | Foco creativo | Entregables típicos |
|---|---|---|
| **A — Claridad** | Pantallas, lectura, campaña | Playtest claridad · briefs Campamento + biomas · mapa mundo |
| **B — Caja / fantasía** | Cómo se *siente* cargar | Playtest caja · brief Aldea · transiciones narrativas |
| **C — Nivel / señales** | Camino, carteles, ritmo | Playtest nivel · briefs Muelle + Bahía · boceto mapa mundo |

Al llegar cada persona: Jose asigna slot, crea `team/<nombre>/`, invita en GitHub (`COLLABORATORS.md`).

### Cómo se relacionan (día a día)

```
  Creativos ──playtests / briefs──► Luis (contexto) ──► Jose (alcance)
       │                                    │
       │                                    ▼
       └──────── no tocan frontend/backend ──► Danel integra lo que Jose aprueba
```

- **Jose** cierra el “sí / no / después”.  
- **Luis** traduce entre creativos, jam, info externa y el track técnico.  
- **Danel** construye y estabiliza en código.  
- **Creativos** escriben en `docs/ux/` y `docs/story/` con tono Hold the Box (ver `voz-y-estilo.md`).

---

## 3) Tecnología

| Capa | Qué usamos |
|---|---|
| Motor | **PlayCanvas 2.x en código** (Vite), no el Editor web como fuente de verdad |
| Simulación | JS puro en `frontend/src/sim/` — Vitest **sin navegador** (también la corre el backend) |
| Vista | `frontend/src/view/` (meshes, agua, clima visual, audio) |
| UI | HTML/CSS sobre el canvas (`frontend/src/ui/`) |
| Backend | **`backend/`** Fastify + WebSocket (salas, partidas, auth guest/cuentas). `supabase/` = histórico jam |
| Deploy | GitHub Pages (front) · API en VPS/Docker · itch.io (zip) |
| Repo | `frontend/` · `backend/` · `docs/` · `deliveries/` · `team/` |

```bash
git checkout dev && git pull
npm run install:all
npm run dev:frontend   # → http://localhost:5173
npm run dev:backend    # → http://localhost:3000 (online)
```

`?debug` / `F2` = knobs · `?level=muelle|bahia|aldea|campamento` = salta menú.

---

## 4) Arquitectura (por qué aguanta cambios)

El juego se separó a propósito en capas. Así se puede tunear la caja o el menú sin romper todo.

```
   teclado (input.js)
          │
          ▼
   ┌─────────────┐
   │    sim/     │  reglas: GameState, box, players, carry,
   │  (sin PC)   │  hazards, weather, npcs  →  testeable
   └──────┬──────┘
          │ estado + eventos
          ▼
   ┌─────────────┐
   │    view/    │  PlayCanvas dibuja lo que la sim dice
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │     ui/     │  menú / HUD / win-fail  (escucha; no mueve física)
   └─────────────┘
```

**Regla de oro:** lógica en `sim/` · vista representa · UI reacciona a `game.state` y `game.events`.

Números tuneables: `frontend/src/config.js`. Arranque: `frontend/src/main.js`.

### Historia de construcción (cómo llegamos)

```
 1 Bootstrap Vite+PlayCanvas
 2 P1/P2 + caja compartida          ← primer “Better Together”
 3 Huequito + mojado + nivel 1      ← vertical slice
 4 Clima, rieles, NPCs, 4 mapas
 5 Menú, personajes, audio, ranking, Pages
 6 Ahora → Local vs Multi · auth · salas · sync · micro
```

### Piso que no se reescribe sin OK de Jose

Coop local · caja (tilt / huequito / mojado) · 4 mapas · clima · NPCs · recovery · menú · vidas · tests · CI.

Fase expo **suma** producto online encima; no tira el local.

### Producto que buscamos (expo)

```
Menú
 ├── Local          → mismo PC, SIN login obligatorio
 └── Multijugador   → 2 PCs, magic link + username + salas + sync + micro

Móvil               → Coming soon
Ranking             → local | multiplayer separados (play_mode)
```

Issues técnicos: #63–#68 · Docs/UX: #69–#71.

---

## 5) Mapa del repo (quién toca qué)

| Carpeta | Qué es | Quién |
|---|---|---|
| `frontend/` | El juego (+ cliente online) | **Danel** (+ Luis en UI producto) |
| `backend/` | API online (salas, WS, social) | **Danel** + Luis/Turriago |
| `supabase/` | Histórico arcade jam | Consulta |
| `docs/online/` | PROTOCOL + SDD | Lectura de todos |
| `docs/contexto/` | Este relato + plantillas | Lectura de todos |
| `docs/ux/` · `docs/story/` | Playtests, briefs, campaña | **Creativos** (slots A/B/C) |
| `deliveries/` | Arte/audio históricos + nuevos si aplica | Según asignación |
| `team/<nombre>/` | Tareas personales | Cada activo / nuevo |

Flujo Git: rama `issue/<n>-slug` desde `dev` → PR a `dev` → Jose promueve a `main` cuando toca desplegar.

---

## 6) Si acabas de llegar

1. Lee **este archivo** completo.  
2. Si eres **creativo**: [`voz-y-estilo.md`](./voz-y-estilo.md) + tu slot en la §2 + skeletons en `docs/ux/` o `docs/story/`.  
3. Si entras a **código**: [`../ONBOARDING.md`](../ONBOARDING.md) + [`../../frontend/README.md`](../../frontend/README.md) (+ [`../online/SDD.md`](../online/SDD.md) si tocas multi).  
4. Dudas de alcance → **Jose**. Contexto entre proyectos / gente → **Luis**. “¿Dónde se implementa?” → **Danel**.

---

## Apéndices (opcional)

| Doc | Para qué |
|---|---|
| [`roles.md`](./roles.md) | Tabla detallada de issues por persona/slot |
| [`aportes.md`](./aportes.md) | Checklist de huecos expo (auth, sync, docs) |
| [`templates.json`](./templates.json) | Catálogos + skeletons máquina |
| [`voz-y-estilo.md`](./voz-y-estilo.md) | Cómo debe sonar un texto HTB |
| [`../COLLABORATORS.md`](../COLLABORATORS.md) | GitHubs e invitaciones |

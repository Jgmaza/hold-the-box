# Plantilla: Hold the Box — El Proyecto (contexto y roles)

> **Cómo usar esta plantilla** (mismo flujo que Min Minas)
> 1. Edita los campos YAML y las secciones de abajo.
> 2. Corre: `npm run build` en esta carpeta → genera `.docx` + `.pdf` en `out/`.
> 3. O pídele a Claude: *"Regenera el documento oficial con esta plantilla."*

---

## METADATOS DEL DOCUMENTO

```yaml
titulo: "Hold the Box"
subtitulo: "Cómo se hizo el proyecto — contexto, tecnología y roles"
autor: "José Maza"
fecha: "Noviembre 2026"
version: "1.0 — Documento oficial de onboarding"
destinatarios: "Devs nuevos · creativos · equipo expo 26 nov"
footer: "Hold the Box  ·  GameJamPlus 2026  ·  Better Together (se juega, no se recita)"
```

---

## PORTADA — TEXTO

**Tagline:** Dos en un teclado.  
**Estribillo:** Ya no jugamos lo mismo. Por eso hicimos un juego donde tienen que ir juntos.  
**Contexto:** Expo universidad · 26 nov · prioridad: multijugador PC↔PC con micro, sin perder el local (2P en el mismo PC).

---

## SECCIÓN 1 — QUÉ ES

**Párrafo principal:**
Dos jugadores cargan una caja viva. Si uno tira y el otro no, se tuerce. Se inclina, gotea por el huequito, se moja. Coordinarse = estabilidad.

**Frase clave:**
El enemigo no es el mapa: es no botar, no mojar, no soltar.

**Origen:** Nació en jam (Better Together).

**Controles:**
- P1: WASD + Espacio
- P2: Flechas + Enter

**Tabla mecánicas:**

| Mecánica | Qué hace |
|---|---|
| Inclinación | Desync → tilt → critical → sueltan la caja |
| Huequito | Inclinada = pierde contenido |
| Mojado | Agua / lluvia / chorros → más pesada e inestable |
| Sincronía | Inputs alineados → más velocidad y se endereza |

**Cajas:** VIP · gato · bomba  
**Mapas:** El Muelle · La Bahía · La Aldea · El Campamento

---

## SECCIÓN 2 — EL EQUIPO

**Intro:**
Hay un núcleo de construcción (ya en marcha) y se abren tres sillas creativas para quienes llegan.

**Diagrama (texto):**
```
              JOSE (Lead + construcción)
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     DANEL           LUIS         CREATIVOS ×3
  Dev estrella   Relaciones +     slots A/B/C
   apps/ sync    apoyo en dev     docs/ux · story
```

**Núcleo listo:**

| Persona | Rol | En una frase |
|---|---|---|
| Jose | Lead del proyecto y de la construcción | Decide alcance, arma el backend (Supabase), mergea, despliega, recibe gente nueva. |
| Luis | Relaciones + apoyo en desarrollo | Puente con quienes tienen info de los proyectos. Además apoya front: auth, lobby, Coming soon móvil, mute. |
| Danel | Dev estrella | Owner del código jugable en apps/: sim, sync online, menú Local/Multi, Records, voz. |

**Creativos (slots abiertos):**

| Slot | Foco | Entregables típicos |
|---|---|---|
| A — Claridad | Pantallas, lectura, campaña | Playtest claridad · briefs Campamento + biomas · mapa mundo |
| B — Caja / fantasía | Cómo se siente cargar | Playtest caja · brief Aldea · transiciones |
| C — Nivel / señales | Camino, carteles, ritmo | Playtest nivel · briefs Muelle + Bahía · boceto mapa mundo |

**Nota alumni:** Salen del roster activo Matias, Zharick y Juanes (carpetas históricas).

**Flujo día a día:**
Creativos → playtests/briefs → Luis (contexto) → Jose (alcance).  
Creativos no tocan apps/. Danel integra lo que Jose aprueba.

---

## SECCIÓN 3 — TECNOLOGÍA

| Capa | Qué usamos |
|---|---|
| Motor | PlayCanvas 2.x en código (Vite) |
| Simulación | JS puro en apps/src/sim/ — Vitest sin navegador |
| Vista | apps/src/view/ |
| UI | HTML/CSS sobre el canvas (apps/src/ui/) |
| Backend | Supabase (leaderboard hoy; auth + salas + ranking en la expo) |
| Deploy | GitHub Pages desde main · itch.io |
| Repo | apps/ · supabase/ · docs/ · deliveries/ · team/ |

**Arranque local:**
```
git checkout dev && git pull
cd apps && npm install && npm run dev
→ http://localhost:5173
```

**Atajos:** `?debug` / F2 = knobs · `?level=muelle|bahia|aldea|campamento` = salta menú.

---

## SECCIÓN 4 — ARQUITECTURA

**Idea:** El juego se separó en capas para tunear la caja o el menú sin romper todo.

```
teclado (input.js)
        ↓
   sim/  (reglas, testeable, sin PlayCanvas)
        ↓ estado + eventos
   view/ (PlayCanvas dibuja)
        ↓
   ui/   (menú / HUD / win-fail)
```

**Regla de oro:** lógica en sim/ · vista representa · UI reacciona a game.state y game.events.

**Historia de construcción:**
1. Bootstrap Vite+PlayCanvas
2. P1/P2 + caja compartida ← primer Better Together
3. Huequito + mojado + nivel 1 ← vertical slice
4. Clima, rieles, NPCs, 4 mapas
5. Menú, personajes, audio, ranking, Pages
6. Ahora → Local vs Multi · auth · salas · sync · micro

**Piso que no se reescribe sin OK de Jose:**
Coop local · caja · 4 mapas · clima · NPCs · recovery · menú · vidas · tests · CI.

**Producto expo:**
- Local → mismo PC, SIN login obligatorio
- Multijugador → 2 PCs, magic link + username + salas + sync + micro
- Móvil → Coming soon
- Ranking → local | multiplayer separados (play_mode)

Issues técnicos: #63–#68 · Docs/UX: #69–#71.

---

## SECCIÓN 5 — MAPA DEL REPO

| Carpeta | Qué es | Quién |
|---|---|---|
| apps/ | El juego | Danel (+ Luis en UI producto) |
| supabase/ | Auth, ranking, functions | Jose |
| docs/contexto/ | Este relato + plantillas | Lectura de todos |
| docs/ux/ · docs/story/ | Playtests, briefs, campaña | Creativos A/B/C |
| deliveries/ | Arte/audio | Según asignación |
| team/nombre/ | Tareas personales | Cada activo / nuevo |

**Git:** rama `issue/<n>-slug` desde `dev` → PR a `dev` → Jose promueve a `main` para desplegar.

---

## SECCIÓN 6 — SI ACABAS DE LLEGAR

1. Lee este documento completo.
2. Si eres creativo: voz-y-estilo + tu slot (§2) + skeletons en docs/ux o docs/story.
3. Si entras a código: ONBOARDING.md + apps/README.md.
4. Dudas de alcance → Jose. Contexto entre proyectos → Luis. ¿Dónde se implementa? → Danel.

---

## APÉNDICES (lista en el PDF)

| Doc | Para qué |
|---|---|
| roles.md | Issues por persona/slot |
| aportes.md | Checklist huecos expo |
| templates.json | Catálogos + skeletons máquina |
| voz-y-estilo.md | Cómo debe sonar un texto HTB |
| COLLABORATORS.md | GitHubs e invitaciones |

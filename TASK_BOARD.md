# TASK BOARD — Roles y entregables

> Empieza por persona: **[`team/START_HERE.md`](./team/START_HERE.md)**  
> Cada quien tiene `team/<nombre>/README.md` (tareas) + `prompts.md`.  
> Raíz = gestión. `apps/` = juego (Danel). Entregas = `deliveries/`.

---

## Lead — Jose (Jgmaza)
**Rol:** dirección, alcance, calidad, pitch. No es el executor principal de código.

- Definir y congelar MVP
- Priorizar mecánicas de caja (hueco / mojada / inclinación)
- Testing + criterios de aceptación
- Pitch / presentación game jam
- Coordinar entregas de diseño → digital → integración
- Apoyo puntual; la ejecución fuerte va al Dev Estrella

---

## Dev Estrella — Danel (PlayCanvas / gameplay, owner de `apps/`)
**Rol:** ejecución principal del juego. Aquí va el vibe coding.

- Setup proyecto en `apps/`
- Movimiento + salto (P1 / P2)
- Cámara
- Caja compartida + inclinación
- Mecánica **huequito** y/o **se moja**
- Físicas, plataformas, rodillos, respawn
- Meta + win/fail
- Integrar assets que lleguen de diseño y audio

**Regla:** PRs / ramas desde su entorno. Jose revisa, no implementa el bulk.

---

## Dev Soundtrack + Colorimetría — Luis
**Rol:** identidad sonora y look de color del juego.

### Soundtrack / SFX
- Loop de gameplay (caribe / party, no molesto en repetición)
- SFX: pasos, salto, caja inclinada, caja mojada, caída al agua, meta
- Música de victoria / derrota (cortas)

### Colorimetría / look
- Paleta oficial (cielo, agua, madera, caja Old Parr, UI)
- Guía de contraste para legibilidad en PlayCanvas
- Moodboard + valores hex/export para el Dev Estrella
- Revisar que señales y UI no “se coman” el gameplay

---

## Dev Apoyo — Zharick (apoya al Lead)
**Rol:** brazo derecho de Jose. Reduce carga operativa y cierra gaps.

- UI: start, timer (si aplica), victoria, restart
- Ayudar en testing y checklist MVP
- Documentar bugs / decisiones rápidas
- Integración ligera o soporte al Dev Estrella cuando haga falta
- Mantener este TASK_BOARD al día si Jose lo pide

---

## Diseño 1 — Juanes (dibujo: personajes + caja)
**Solo dibujo a mano / sketch.** Entrega papel o foto clara; no se les pide 3D ni código.

### Tareas de dibujo
1. **Personaje P1** (traje + gafas) — frente, 3/4, espalda; pose cargando caja
2. **Personaje P2** (gorra + camiseta) — mismas vistas + pose cargando
3. **Caja Old Parr** — cerrada, inclinada, con **huequito**, **mojada/goteando**
4. Hoja de expresiones / “estados de estrés” al desbalancearse (opcional si hay tiempo)

### Entrega
- Dibujo en papel A4 o sketchbook, líneas claras, poca sombra sucia
- Foto con buena luz (ver `docs/design-pipeline.md`)

---

## Diseño 2 — Matias (dibujo: señales + meta + props)
**Solo dibujo a mano / sketch.**

### Tareas de dibujo
1. Señales: “TRABAJO EN EQUIPO = RESULTADOS”, “¡CUIDADO QUE NO SE CAIGA!”
2. Banner **META** + bandera a cuadros
3. Cartel bar: “AQUÍ SE TOMA EL RON”
4. Billboard humor local (referencia, versión family-friendly si hace falta)
5. Props chicos: palmera simple, rodillo, plataforma de madera (silueta clara)

### Entrega
Igual: papel + foto limpia → pipeline de digitalización.

---

## Flujo de assets (diseño → juego)
```
Dibujo a mano → foto → digitalizar (herramienta) → PNG/referencia → Dev Estrella integra en PlayCanvas
```
Detalle de herramienta y pasos: **`docs/design-pipeline.md`**

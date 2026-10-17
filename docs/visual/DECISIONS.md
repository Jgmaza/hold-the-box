# Decisiones de diseño (congeladas en entrevista Lead)

Fuente de verdad para `prompts/shared/*` y para el equipo.  
Refs visuales: [`refs/`](./refs/)

---

## Ronda 1 — Identidad, feel, cámara, tono

### Jugabilidad (feel)
- Norte: **Moving Out**, pero **no pueden soltar** lo que cargan.
- El reto es **cuidar la caja**, no solo llegar.
- Cooperación con roce amistoso tipo **Overcooked**.

### Estética vs movimiento
- **Trazos / look:** Fall Guys (formas legibles, cartoon party, colores vivos).
- **Movimiento / layout:** recorrido **recto hacia adelante** con profundidad.
- Refs: [`refs/concept-camera-path.jpeg`](./refs/concept-camera-path.jpeg), [`refs/concept-art-base.jpg`](./refs/concept-art-base.jpg)

### Física de caja (MVP primero)
- Desbalance fuerte (uno adelante, otro atrás) → caja puede **caer al piso** → **daña vida**.
- MVP = sistema de **vida / integridad**.
- Post: huequito, mojada, etc.

### Cámara
- Una cámara coop, mismo PC, 3ª persona con profundidad, sigue dúo + caja.

### Tono
- Family-friendly primero; “mods” / upgrade visual si hay tiempo.

### Fantasía (20 s)
Gracioso cooperar y discutir amistosamente por la caja (Overcooked).

### Fail
- MVP: restart claro.
- Post: burla (NPCs gozando lo de la caja).

---

## Ronda 2 — Estado del arte visual

### Personajes
- Estilo **1: humanos stylized** (cabeza un poco grande, como la ref).
- Bien caricaturescos, legibles a distancia.
- **Mods futuros (si sobra tiempo):** skins tipo figuras públicas caricaturizadas (ej. “Abelardo / Petro”) — **no bloquean MVP**; base = dúo traje + casual genérico family-friendly.

### Caja (MVP)
- **1:** cartón genérico con sello **“VIP / FRÁGIL”** (sin marca real).

### Fidelidad al primer build
- **2:** Capa A (primitivas + colores) **+ 2–3 carteles** de Matias en los lados.

### Luz / atmósfera
- **Sol de mediodía caribeño** (turquesa, soleado, donde estamos). No neon party oscuro.

### Señales
- A los lados del path, **exacto como Overcooked**: humor + personalidad del nivel, no solo tutorial seco.

---

## Implicaciones prompts compartidos

| Archivo | Estado |
|---|---|
| `art.md` | Reescrito con R1+R2 |
| `level_design.md` | Reescrito con path + señales Overcooked |
| `gameplay.md` | Pendiente Ronda 3 (feel/control/vida) |
| `ui.md` / `polish.md` | Después de R3 |

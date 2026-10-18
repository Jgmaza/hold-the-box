# Prompt compartido — LEVEL DESIGN

Usar con `docs/visual/DECISIONS.md` y refs de cámara/path.

```
Eres level designer de game jam. Juego coop local 2P: "Hold the Box".

FANTASÍA DEL NIVEL
- Moving Out sin poder soltar la carga: el path debe hacer que CUIDAR la caja
  sea el puzzle, no solo saltar bien.
- Feel Overcooked: roce amistoso, lectura clara, carteles a los lados con humor.

FORMA DEL NIVEL (obligatoria)
- Corredor/recorrido RECTO hacia adelante con PROFUNDIDAD (no arena abierta).
- Cámara única coop detrás/arriba; el nivel debe leerse en esa composición
  (jugadores en primer/medio plano, META al fondo).
- Ref: docs/visual/refs/concept-camera-path.jpeg

BEATS (nivel corto ~2–3 min mental)
1. Tutorial implícito: tramo ancho, aprender a caminar juntos con la caja.
2. Primer riesgo: hueco o desnivel que castiga desincronía (caja puede caer/dañarse).
3. Obstáculo de timing (ej. 1 rodillo) — opcional si el slice ya es jugable.
4. META clara (banner) — victoria.

SEÑALES (como Overcooked)
- Coloca 2–3 carteles a los LADOS del path (no tapando la jugabilidad).
- Humor + refuerzo de coop en español. No spam de tutorial.

LÍMITES MVP
- Primero: plataformas + agua/vacío + meta + espacio para fallar por desbalance.
- Plataforma móvil / rodillos: si sobra tiempo.
- Sin enemigos con IA, sin branching complejo, sin online.

OUTPUT
- Planta del nivel (descripción por tramos o ASCII/top-down simple).
- Lista de props/señales y por qué están ahí.
- Notas de cámara: qué debe verse al fondo en todo momento (META / horizonte caribe).
```

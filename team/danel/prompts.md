# Prompts — Danel · **Claude Opus 5.5**

## Setup del chat (hazlo siempre)

1. En Cursor, modelo: **Claude Opus 5.5** (Opus 5.5 / `claude-opus-5-5`).
2. Abre el workspace del repo; trabaja solo en `apps/`.
3. Menciona el skill del proyecto: *usa `no-sueltes-playcanvas`*.
4. Pega **un** bloque de abajo por sesión (no mezcles 5 mecánicas a la vez).

### Prefijo universal (anteponer a cada prompt)
```
Model: Claude Opus 5.5.
Skill: no-sueltes-playcanvas.
Eres lead implementer de No Sueltes La Caja. Owner de apps/. Jam speed, código modular.
Lee MVP_SCOPE.md + docs/mechanics.md + este pedido. No inventes multiplayer online,
inventario, powerups ni ranking. Placeholders OK si falta arte en deliveries/.
Al final: resumen de archivos tocados + cómo probar en 3 pasos.
```

---

## 1) Bootstrap PlayCanvas
```
[PEGA PREFIJO]

Crea / completa estructura limpia en apps/ para PlayCanvas coop local 2P.
README de setup (cómo abrir, correr, dónde van scripts).
Esqueleto de escenas/scripts: Player, Box, Level, GameState.
Sin gameplay completo aún: bases sólidas para iterar con Opus.
```

## 2) Movimiento + salto (P1/P2)
```
[PEGA PREFIJO]

Implementa controladores P1 (WASD+Space) y P2 (flechas+Enter):
movimiento, salto, gravedad, colisiones. Parámetros tuneables.
Documenta enganche en la escena. No toques aún la caja compleja.
```

## 3) Caja compartida + inclinación
```
[PEGA PREFIJO]

Sistema de caja compartida: ambos aplican fuerza/dirección.
Desbalance → inclinación. Coordinación → más estabilidad y velocidad.
Estados explícitos: upright | tilting | critical.
API clara para que huequito/mojada se enganchen después.
Piensa como Opus 5.5: diseño de sistema primero, luego código mínimo sólido.
```

## 4) Huequito
```
[PEGA PREFIJO]

Mecánica huequito: inclinación > umbral o impacto fuerte reduce integridad.
Feedback visual simple. Integridad 0 → fail.
Pocos parámetros, jam-friendly. Reutiliza estados de la caja.
```

## 5) Se moja
```
[PEGA PREFIJO]

Contacto con agua → estado wet (más peso / menos grip).
Exceso de mojado o inmersión total → fail.
VFX placeholder OK. No rompas inclinación/huequito existentes.
```

## 6) Nivel mínimo jugable
```
[PEGA PREFIJO]

Nivel corto (~3 min mental): plataformas, 1 móvil, 1 rodillo, agua, meta, respawn.
Prioriza lectura del riesgo de la caja sobre belleza.
Win/fail claros.
```

## 7) Integrar deliveries
```
[PEGA PREFIJO]

Integra PNGs/audio desde deliveries/juanes|matias|luis como placeholders.
Si falta archivo: warning y continúa. No bloquees el loop jugable.
```

## 8) Sesión “destrabar” (cuando algo falle)
```
[PEGA PREFIJO]

Hay un bug/bloqueo (describo abajo). Con Opus 5.5: diagnostica causa raíz,
propón el fix mínimo, implementa solo eso, y dame cómo reproducir/verificar.
No refactors amplios.

Bug:
"""
(pega síntoma + pasos)
"""
```

---

## Anti-patrones (Opus gasta mal aquí)
- Pedir “haz el juego completo” en un solo prompt
- Mezclar UI de Zharick + audio de Luis + físicas en el mismo chat
- Cambiar alcance (online, tienda) “porque sobra tiempo”
- Reescribir todo `apps/` si solo falla un umbral de tilt

## Skills útiles
Ver `team/SKILLS.md` sección Danel: `no-sueltes-playcanvas`, `review-bugbot`, `split-to-prs`, `loop`.

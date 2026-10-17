# Prompts — Danel (PlayCanvas / gameplay)

Copia el bloque que necesites en Cursor. Trabaja siempre dentro de `apps/`.

## Bootstrap
```
Eres senior PlayCanvas. Crea estructura limpia y modular en apps/ para un platformer
cooperativo local 2 jugadores. Incluye README de setup. Sin multiplayer online.
Stack: PlayCanvas. Controles: P1 WASD+Space, P2 flechas+Enter.
```

## Movimiento + salto
```
Implementa controladores P1/P2 con movimiento, salto, gravedad y colisiones.
Código modular, fácil de tunear (speed, jump force). Documenta cómo enganchar en la escena.
```

## Caja compartida + inclinación
```
Crea el sistema de caja compartida: ambos jugadores aplican fuerza/dirección.
Si hay desbalance, la caja se inclina. Coordinación = más estabilidad y velocidad.
Expón estados: upright / tilting / critical.
```

## Huequito
```
Añade mecánica de huequito en la caja: si inclinación > umbral o impacto fuerte,
pierde "integridad"/contenido. Feedback visual simple + fail si llega a 0.
Manténlo jam-friendly (pocos parámetros).
```

## Se moja
```
Contacto con agua: caja pasa a estado wet (más peso / menos grip).
Exceso de mojado o caída total = fail. Placeholders OK si no hay VFX aún.
```

## Nivel mínimo jugable
```
Arma un nivel corto: plataformas, 1 plataforma móvil, 1 rodillo, agua debajo, meta.
Respawn simple. Prioriza fun y claridad sobre fidelidad visual.
```

## Integrar asset pack
```
Integra PNGs/audio desde deliveries/ como placeholders en la escena.
No bloquees gameplay si falta un archivo: log warning y sigue.
```

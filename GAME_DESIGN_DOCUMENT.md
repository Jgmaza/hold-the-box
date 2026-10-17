# Game Design Document

## Fantasía
Sentir que trabajar en equipo permite superar obstáculos imposibles individualmente.

## Propuesta de valor (la caja es el enemigo)
La caja no es un prop inerte: es un problema vivo. El valor del juego no es solo “llevar algo juntos”, sino **cuidar un objeto frágil e impredecible**.

### Complicaciones de la caja (prioridad MVP+)
| Mecánica | Qué hace | Por qué importa |
|---|---|---|
| **Huequito / fuga** | Si la caja se inclina demasiado, se pierde contenido (o se “daña” la entrega) | Obliga a equilibrar, no solo a correr |
| **Se moja** | Al rozar agua o caer parcial, se vuelve más pesada / resbalosa / inestable | Castiga errores sin kill-instant siempre |
| **Inclinación** | Si un jugador tira más fuerte, la caja se tuerce | Premia sincronía real |
| **Estabilidad por coordinación** | Mismo ritmo = más estable y rápido | Better Together jugable, no solo temático |

### Fail states de la caja
- Caer al agua completa → derrota
- Mojarse demasiado / vaciarse por el hueco → derrota o score malo
- Llegar a la meta con la caja “dañada” → victoria débil (opcional post-MVP)

## Core Loop
Moverse → Coordinarse → Equilibrar la caja → Evitar obstáculos / agua → Mantenerla seca y estable → Llegar a la meta

## Jugadores
2 jugadores cooperativos locales.
- P1: traje + gafas — WASD + Space
- P2: gorra + camiseta — Flechas + Enter

## Win State
Llegar a la meta con la caja (idealmente seca e intacta).

## Fail State
La caja cae, se moja de más, se vacía por el hueco, o ambos jugadores fallan.

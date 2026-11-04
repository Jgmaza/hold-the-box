# Celular y tablet

Hay **dos alternativas** en revisión. Jose decide cuál va a la expo:

| Rama | Qué ve alguien en el celular |
|---|---|
| `issue/65-mobile-coming-soon` (#65) | Pantalla "¡Muy pronto en celular!" con el logo. El juego no se descarga (~4 KB en vez de 2,3 MB). |
| `issue/mobile-touch` | El juego completo con controles táctiles. Cada jugador juega en su propio aparato (como en PC con el Multijugador). |

## Cómo funciona `issue/mobile-touch`

- Se detecta táctil con `(pointer: coarse)` (`apps/src/touch.js`). `?touch` lo fuerza en el PC para probar con el mouse.
- **Menú:** sin **Local** (dos jugadores en un teclado no aplica), **Multijugador** es el botón principal, sin pistas de teclado. "Controles" explica el joystick.
- **Partida:**
  - Joystick: el dedo en la mitad izquierda; aparece donde se apoya. Es analógico (poco recorrido = caminar lento).
  - Saltar: botón amarillo abajo a la derecha.
  - Pausa: botón arriba, junto al nivel de la caja.
  - HUD compacto en las esquinas (`ui.css`, `@media (max-width: 640px), (max-height: 500px)`).
- **PC:** no cambia nada.

## Qué falta

- **Jugar de verdad en dos celulares** depende de la sincronización (#67) y del backend (`docs/online.md`). Hoy el táctil mueve a **P1** y el compañero se queda quieto. Con #67, el táctil debe mover al jugador de `room.me` (en `apps/src/main.js`, donde se llama `game.setInputs`).
- **Probar en celulares reales**, sobre todo de gama baja: el juego es 3D y pesa ~2,3 MB. Solo se probó simulado en el navegador.
- **Micro desde el celular:** el navegador solo lo permite en `https` o `localhost`. En GitHub Pages (https) funciona; en la red local de pruebas no.

## Probar en tu celular (misma wifi que el PC)

```bash
cd apps
npm run dev -- --host
```

Vite muestra una línea `Network: http://192.168.x.x:5173/`. Escribe esa dirección en el navegador del celular.

- `/` → menú en celular.
- `/?level=muelle` → entra directo a una partida para probar joystick y salto (horizontal se ve mejor).

Si no carga: en Windows la red wifi debe ser **Privada** y hay que permitir Node.js en el firewall para redes privadas.

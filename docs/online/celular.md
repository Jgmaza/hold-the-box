# Celular y tablet

En móvil se carga el **mismo juego** que en PC: menú táctil (Multijugador primero) + joystick/salto en partida.

## Cómo funciona

- Arranque: `boot.js` siempre carga `main.js` (ya no hay “Muy pronto”).
- Táctil: `(pointer: coarse)` o `?touch` → `TouchControls` (joystick izquierdo, salto derecha).
- Menú: sin **Local**; **Multijugador** es el botón principal.
- Online: el táctil mueve el slot de este aparato; se envía al API (`OnlineSession`).

## Probar

```bash
npm run install:all
npm run dev:frontend -- --host
# + npm run dev:backend en otra terminal
```

En el celular (misma wifi): la URL `Network` de Vite.

- `/` → menú móvil  
- `/?touch` en PC → simula táctil  
- `/?online=1` → entra directo al lobby  

Pages (prod): https://jgmaza.github.io/hold-the-box/ con API en Fly.

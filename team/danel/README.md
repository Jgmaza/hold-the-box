# Danel — Dev Estrella (PlayCanvas + online)

GitHub: [@danelmott](https://github.com/danelmott) · Rama: `work/danel`

## Cómo empezar

1. [`../../docs/contexto/EL-PROYECTO.md`](../../docs/contexto/EL-PROYECTO.md)  
2. Online: [`../../docs/online/SDD.md`](../../docs/online/SDD.md) · [`../../docs/online/PROTOCOL.md`](../../docs/online/PROTOCOL.md)  
3. `npm run install:all` → `npm run dev:frontend` (+ `npm run dev:backend` para multi)  
4. Opus 5.5 + skill `hold-the-box-playcanvas`

## Tu rol
Owner de `frontend/` y del loop de juego en `backend/` (salas, sync, sim compartida).

**No** tocar `frontend/src/sim/` (ni `levels/`, `config.js`, `net/duoState.js`) con APIs de browser: el backend las importa.

## Feel
Luis tuneará números; mantén todo en `frontend/src/config.js` / debug panel.

## Prompts
[`prompts.md`](./prompts.md)

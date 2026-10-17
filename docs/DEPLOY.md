# Deploy — Jose

El slice jugable vive en `apps/` (PlayCanvas + Vite).

## Build local

```bash
git checkout main   # o dev si aún no promoviste
git pull
cd apps
npm ci
npm test
npm run build       # sale en apps/dist/
```

## itch.io (HTML5)

1. Comprimir el **contenido** de `apps/dist/` (no la carpeta padre).  
2. Subir zip como proyecto HTML5.  
3. This game will be played in the browser · resolución embbed a gusto.  
4. Pegar URL aquí cuando exista:

**URL prod:** `_pendiente_`

## Checklist pre-deploy

- [ ] Smoke test 2 jugadores en el build (`npm run preview`)
- [ ] Sin `?debug` obligatorio para jugar
- [ ] Textos fail/win entendibles
- [ ] `deliveries/` integrados o placeholders OK para pitch

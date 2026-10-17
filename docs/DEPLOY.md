# Deploy — Jose

El slice jugable vive en `apps/` (PlayCanvas + Vite).

## ¿Dónde se despliega?

| Destino | Para qué | Estado |
|---|---|---|
| **itch.io** (HTML5) | **Destino del jam / presentación oficial** | Tú subes el zip (cuenta itch) |
| **GitHub Pages** | Link rápido para el equipo / playtest online | Auto desde rama `gh-pages` |

**URL GitHub Pages:** https://jgmaza.github.io/no-sueltes-la-caja/  
**URL itch.io:** `_crear página y pegar aquí_`

itch.io es el estándar de game jams (embed, página del juego, downloads).  
GitHub Pages sirve para compartir ya sin esperar a configurar itch.

---

## Build local

```bash
git checkout main
git pull
cd apps
npm ci
npm test
npm run build       # → apps/dist/
```

Zip para itch (contenido de `dist/`, no la carpeta padre):

```bash
cd apps/dist
zip -r ../no-sueltes-la-caja-itch.zip .
# archivo: apps/no-sueltes-la-caja-itch.zip
```

Smoke del build: `npm run preview` → http://127.0.0.1:4173/

---

## itch.io (oficial jam)

1. Crear juego en https://itch.io/game/new  
2. Kind: **HTML**  
3. Subir `apps/no-sueltes-la-caja-itch.zip`  
4. “This file will be played in the browser”  
5. Viewport: p.ej. `1280x720` o fullscreen  
6. Publicar (Draft → Restricted/Public según el jam)  
7. Pegar URL arriba en este doc  

---

## GitHub Pages (link rápido)

Ya hay rama `gh-pages` con el `dist/`.  
Tras un build nuevo:

```bash
# desde apps/ tras npm run build
rm -rf /tmp/nslc-pages && mkdir /tmp/nslc-pages && cp -R dist/* /tmp/nslc-pages/
cd /tmp/nslc-pages && git init && git checkout -b gh-pages
git add -A && git commit -m "Deploy playable build"
git remote add origin https://github.com/Jgmaza/no-sueltes-la-caja.git
git push -f origin gh-pages
```

---

## Checklist pre-deploy

- [x] `npm test` (29) + `npm run build`
- [ ] Smoke 2P en preview / Pages
- [ ] Sin depender de `?debug` para jugar
- [ ] Fail/win entendibles
- [ ] Página itch creada + URL anotada

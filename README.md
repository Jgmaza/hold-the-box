# Hold the Box

Game Jam 2026 · Better Together · PlayCanvas · coop local 2P + online

## Empieza aquí

1. **[`docs/contexto/EL-PROYECTO.md`](./docs/contexto/EL-PROYECTO.md)** — **todo en uno**: tech, arquitectura, equipo  
2. **[`docs/ONBOARDING.md`](./docs/ONBOARDING.md)** — Git, CI/CD  
3. **[`INDEX.md`](./INDEX.md)** — mapa del repo  

| Rol | Persona |
|---|---|
| Lead + construcción | **Jose** |
| Relaciones + apoyo en dev | **Luis** · [@turriago](https://github.com/turriago) |
| Dev estrella | **Danel** · [@danelmott](https://github.com/danelmott) |
| Creativos (×3, abiertos) | Slots A / B / C |

```bash
git clone https://github.com/Jgmaza/hold-the-box.git
cd hold-the-box
git checkout dev && git pull
npm run install:all
npm run dev:frontend    # → http://localhost:5173
# online (otra terminal):
npm run dev:backend     # → http://localhost:3000
```

| Carpeta | Qué es |
|---|---|
| `frontend/` | Juego (PlayCanvas + Vite) |
| `backend/` | API online (Fastify + WebSocket) |
| `docs/online/` | Protocolo y SDD del servidor |

Prod: https://jgmaza.github.io/hold-the-box/ · Deploy: [`docs/DEPLOY.md`](./docs/DEPLOY.md) · Ramas: [`docs/BRANCHES.md`](./docs/BRANCHES.md)

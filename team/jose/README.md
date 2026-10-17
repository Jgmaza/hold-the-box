# Jose — Lead + **despliegue**

Rama: `work/jose`

## Cómo empezar

1. [`../../docs/ONBOARDING.md`](../../docs/ONBOARDING.md) — Git + CI/CD del equipo  
2. [`../../MVP_SCOPE.md`](../../MVP_SCOPE.md) — scope congelado  
3. [`../../docs/DEPLOY.md`](../../docs/DEPLOY.md) — Pages + itch  

## Tu rol
Dirección y **sacar el juego a la calle**. Código pesado = Danel (`apps/`).  
Foco: no inflar sistemas, coordinar entregas, **promover a `main`** y subir itch.

## Tareas

### Alcance
- [ ] Mantener congelado: sin features nuevas sin OK explícito
- [ ] Playtest de aceptación (¿se ríen en 20 s?)
- [ ] Pitch

### Deploy (prioridad tuya)

**GitHub Pages (automático)**  
1. Smoke en `dev`  
2. PR **`dev` → `main`**  
3. Esperar **2 aprobaciones** + CI verde  
4. Merge → Actions **Deploy Pages**  
5. Verificar https://jgmaza.github.io/no-sueltes-la-caja/

**itch.io (manual, entrega jam)**  
1. Con build bueno (idealmente el de `main`): `cd apps && npm ci && npm test && npm run build`  
2. Zip del **contenido** de `apps/dist/` → ver [`docs/DEPLOY.md`](../../docs/DEPLOY.md)  
3. Subir HTML5 en itch · pegar URL en `DEPLOY.md`  
4. Material oficial del jam en [`docs/jam/`](../../docs/jam/)

### Equipo
- [ ] Luis: perfiles de caja + material jam si falta  
- [ ] Juanes/Matias: visuales  
- [ ] Zharick: UI  
- [ ] Tras merges a `dev`: el sync alimenta `work/*` (ellos hacen `git pull`)

## Mensaje al equipo
> Trabajamos en `work/<nombre>` → PR a `dev`. Al entrar a `dev`, las ramas se sincronizan solas. Producción = PR a `main` (2 ✅) → Pages. itch lo sube Jose.

## Prompts
[`prompts.md`](./prompts.md)

# Jose — Lead + **despliegue**

Rama: `work/jose`

## Cómo empezar

1. [`../../INDEX.md`](../../INDEX.md)  
2. Scope real: [`../../MVP_SCOPE.md`](../../MVP_SCOPE.md)  
3. Deploy: ver checklist abajo + [`../../apps/README.md`](../../apps/README.md)

## Tu rol
Dirección y **sacar el juego a la calle**. No eres el bulk de código (`apps/` = Danel).  
El core de caja ya está: tu foco es **no inflar sistemas**, coordinar entregas y **desplegar**.

## Tareas

### Alcance
- [ ] Mantener congelado: sin features nuevas sin OK explícito
- [ ] Playtest de aceptación (¿se ríen en 20 s?)
- [ ] Pitch

### Deploy (prioridad tuya)
- [ ] En `main` o `dev` estable: `cd apps && npm ci && npm test && npm run build`
- [ ] Publicar `apps/dist/` (itch.io HTML5 u otro host)
- [ ] Documentar URL del build en este README o `docs/DEPLOY.md`
- [ ] Promover `dev` → `main` cuando el build sea el de presentación ([`docs/BRANCHES.md`](../../docs/BRANCHES.md))

### Equipo
- [ ] Luis: perfiles de caja  
- [ ] Juanes/Matias: visuales del muelle actual  
- [ ] Zharick: UI  
- [ ] GitHubs faltantes si aplica  

## Mensaje al equipo
> El juego ya tiene caja compleja. Luis la mejora por perfiles. Diseño viste este proyecto. Yo despliego.

## Prompts
[`prompts.md`](./prompts.md)

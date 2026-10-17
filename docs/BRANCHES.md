# Sistema de ramas

| Rama | Para qué |
|---|---|
| **`main`** | Producción — al mergear, **Deploy Pages** |
| **`dev`** | Integración del equipo — playtest diario |
| **`work/<persona>`** | Trabajo de cada quien (sale de `dev`) |

Guía única del flujo: [`ONBOARDING.md`](./ONBOARDING.md).

## Ramas personales

| Persona | Rama |
|---|---|
| Jose | `work/jose` |
| Danel | `work/danel` |
| Luis | `work/luis` |
| Zharick | `work/zharick` |
| Juanes | `work/juanes` |
| Matias | `work/matias` |

## Flujo

```
work/<persona>  →  PR a dev  →  sync automático a work/*
                      ↓
                 playtest
                      ↓
         PR dev → main (2 approvals + CI)  →  Pages
```

### Modo de trabajo: `dev` alimenta a todos

Cada push/merge a **`dev`** dispara el workflow **Sync work from dev**:
- Hace `merge` de `origin/dev` en cada `work/*`
- **No borra** commits propios de una `work/*` (si hay conflicto, falla el job y se resuelve a mano)
- Después, cada persona: `git pull` en su rama

Manual: Actions → Sync work from dev → **Run workflow**.

### Pasos diarios

1. `git fetch && git checkout work/<tu-nombre>`
2. `git pull` (trae sync desde `dev`)
3. Trabaja / commit / push
4. PR hacia **`dev`**
5. Jose/Danel mergean a `dev` tras smoke
6. Demo presentable → PR **`dev` → `main`** (2 ✅ + CI)
7. Pages se actualiza solo ([`DEPLOY.md`](./DEPLOY.md))

## Probar local (desde dev)

```bash
git checkout dev
git pull
cd apps
npm install
npm run dev
```

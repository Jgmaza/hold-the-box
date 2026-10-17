# Sistema de ramas

| Rama | Para qué |
|---|---|
| **`main`** | Producción / estable (lo que se presenta si está verde) |
| **`dev`** | Integración diaria — copia de trabajo del equipo (aquí se prueba) |
| **`work/<persona>`** | Trabajo independiente de cada quien |

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
work/<persona>  →  PR a dev  →  playtest  →  PR dev → main (2 approvals + CI)  →  Pages
```

1. `git fetch && git checkout work/<tu-nombre>`
2. `git merge origin/dev` (trae lo último antes de codear)
3. Trabaja / commit / push
4. Abre PR hacia **`dev`** (no directo a `main`)
5. Jose/Danel mergean a `dev` tras smoke test
6. Cuando haya demo presentable: PR **`dev` → `main`**
7. `main` exige **mín. 2 aprobaciones** + check **CI / test** verde
8. Al mergear a `main`, Actions despliega GitHub Pages (ver [`DEPLOY.md`](./DEPLOY.md))

## Probar local (desde dev)

```bash
git checkout dev
git pull
cd apps
npm install
npm run dev
```

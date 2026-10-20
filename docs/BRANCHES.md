# Sistema de ramas

| Rama | Para qué | Quién escribe |
|---|---|---|
| **`main`** | Producción — al mergear, **Deploy Pages** | Solo **Jose**, vía PR **`dev` → `main`** |
| **`dev`** | Integración / playtest diario | Solo vía **PR** desde ramas de issue |
| **`issue/<n>-slug`** | Trabajo de un issue concreto (sale de `dev`) | Cualquiera del equipo |
| **`work/<persona>`** | Rama personal opcional (sync desde `dev`) | Cada quien |

Guía: [`ONBOARDING.md`](./ONBOARDING.md).

## Flujo (orden nuevo)

```
issue (GitHub)  →  rama issue/<n>-slug desde dev
                      ↓
                 PR → dev  (CI + approve Jose)
                      ↓
                 playtest en dev
                      ↓
         PR dev → main  (solo Jose mergea + CI)
                      ↓
                 GitHub Pages
```

### Reglas

1. **Nadie hace push directo a `dev` ni a `main`.** Todo entra por PR.
2. **`main` solo recibe PRs desde `dev`**, y solo Jose los mergea.
3. **`dev` solo recibe PRs** desde ramas `issue/...` (o `work/...` mientras migran).
4. Un issue → una rama → un PR (o varios PRs pequeños del mismo issue).

### Cómo empezar un issue

```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b issue/48-catalogo-componentes   # número del issue + slug
# …trabiar, commit…
git push -u origin HEAD
gh pr create --base dev --title "…" --body "Closes #48"
```

### Ramas personales (`work/*`)

Siguen existiendo para sync y entregas sueltas. Cada push/merge a **`dev`** dispara **Sync work from dev**.  
Para features nuevas, preferí **`issue/<n>-slug`**.

| Persona | Rama |
|---|---|
| Jose | `work/jose` |
| Danel | `work/danel` |
| Luis | `work/luis` |
| Zharick | `work/zharick` |
| Juanes | `work/juanes` |
| Matias | `work/matias` |

### Pasos diarios

1. `git fetch && git checkout dev && git pull`
2. `git checkout -b issue/<n>-…` (o sigue en tu `work/*` y ábrela desde `dev` actualizado)
3. Trabaja / commit / push
4. **PR hacia `dev`**
5. Jose aprueba + merge tras smoke
6. Demo presentable → **PR `dev` → `main`** (solo Jose)
7. Pages se actualiza solo ([`DEPLOY.md`](./DEPLOY.md))

## Probar local (desde dev)

```bash
git checkout dev
git pull
cd apps
npm install
npm run dev
```

# Onboarding — cómo trabajamos (Git + CI/CD + entregas)

**Una sola página.** Si solo lees esto y tu `team/<nombre>/README.md`, ya sabes qué hacer.

Repo: https://github.com/Jgmaza/no-sueltes-la-caja  
Juego online (prod): https://jgmaza.github.io/no-sueltes-la-caja/

---

## 1) Arranque (15 min)

1. Acepta la invitación de GitHub (mail o [invitations](https://github.com/Jgmaza/no-sueltes-la-caja/invitations)).
2. Clona y entra a **tu** rama:

```bash
git clone https://github.com/Jgmaza/no-sueltes-la-caja.git
cd no-sueltes-la-caja
git checkout work/<tu-nombre>   # jose | danel | luis | zharick | juanes | matias
git pull
```

3. Lee [`INDEX.md`](../INDEX.md) → luego `team/<tu-nombre>/README.md`.
4. Prueba el juego (opcional pero útil):

```bash
git checkout dev && git pull
cd apps && npm install && npm run dev
# → http://localhost:5173
```

---

## 2) Dónde va cada cosa

| Qué entregas | Dónde lo subes | Rama |
|---|---|---|
| Arte / audio / bugs | `deliveries/<tu-nombre>/` | `work/<tu-nombre>` |
| Código del juego | `apps/` | `work/danel` (Zharick UI OK) |
| Docs / deploy / jam | `docs/` | `work/jose` (u otra si te piden) |
| Material oficial del jam | [`docs/jam/`](./jam/) | vía PR a `dev` |

**No subas a `main`.** `main` solo recibe PRs desde `dev`.

---

## 3) Flujo diario (modo de trabajo)

```
work/<tú>  →  PR a dev  →  (auto) alimenta las demás work/*
                 ↓
            playtest en dev
                 ↓
         PR dev → main (2 ✅ + CI)
                 ↓
         GitHub Pages se actualiza solo
```

### Tú (cada día)

```bash
git checkout work/<tu-nombre>
git pull                         # trae lo que llegó desde dev (sync automático)
# ... trabajas, commits ...
git push -u origin work/<tu-nombre>
```

Luego abre un **Pull Request → `dev`** (no a `main`).

### Qué pasa al entrar algo a `dev`

1. Quien mergea el PR a `dev` (Jose/Danel) hace smoke test.
2. El workflow **Sync work from dev** actualiza todas las `work/*` con un merge desde `dev`.
3. Cada quien en su máquina: `git pull` en su `work/<nombre>` y sigue.

Así nadie se queda en un snapshot viejo cuando hay entregas relevantes en `dev`.

Detalle de ramas: [`BRANCHES.md`](./BRANCHES.md).

---

## 4) CI/CD (cómo sale a la calle)

| Momento | Qué corre | Resultado |
|---|---|---|
| PR a `dev` o `main` | **CI** (`npm test` + `npm run build`) | Debe quedar verde |
| Push a `dev` | **Sync work from dev** | Las `work/*` reciben `dev` |
| Merge a `main` | **Deploy Pages** | Se publica el juego en GitHub Pages |

### Reglas de `main` (producción)

- Solo por **pull request** desde `dev`
- Mínimo **2 aprobaciones**
- Check **CI / test** verde
- Al mergear → deploy automático a Pages

### Dos destinos de “publicado”

| Destino | Quién / cuándo | Doc |
|---|---|---|
| **GitHub Pages** | Automático al mergear `main` | Preview / link del equipo |
| **itch.io** | Jose, zip manual del build | Entrega oficial del jam |

Guía completa de Jose: [`DEPLOY.md`](./DEPLOY.md).

---

## 5) Checklist rápido por rol

| Persona | Empuja a | Primero lee |
|---|---|---|
| Danel | `apps/` → PR `dev` | `team/danel/README.md` |
| Luis | `deliveries/luis/` (+ jam en `docs/jam/` si aplica) | `team/luis/README.md` |
| Juanes / Matias | `deliveries/<nombre>/` PNGs | su `team/.../README.md` |
| Zharick | UI en `apps/` o bugs en `deliveries/zharick/` | `team/zharick/README.md` |
| Jose | alcance + PR `dev→main` + itch | `team/jose/README.md` + `DEPLOY.md` |

---

## 6) Si algo falla

- **No veo el sync:** Actions → “Sync work from dev” · luego `git pull` en tu rama.
- **Pages viejo:** el build de prod es el de `main`, no el de `dev`. Hay que promover.
- **CI rojo:** arregla en tu `work/*`, no force-push a `main`.
- **Invitación:** [`COLLABORATORS.md`](./COLLABORATORS.md).

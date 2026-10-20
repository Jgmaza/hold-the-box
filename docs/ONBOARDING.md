# Onboarding — cómo trabajamos (Git + CI/CD + entregas)

**Una sola página.** Si solo lees esto y tu `team/<nombre>/README.md`, ya sabes qué hacer.

Repo: https://github.com/Jgmaza/hold-the-box  
Juego online (prod): https://jgmaza.github.io/hold-the-box/

---

## 1) Arranque (15 min)

1. Acepta la invitación de GitHub (mail o [invitations](https://github.com/Jgmaza/hold-the-box/invitations)).
2. Clona, actualiza **`dev`** y abre una rama de **issue**:

```bash
git clone https://github.com/Jgmaza/hold-the-box.git
cd hold-the-box

> Si ya tenías el repo clonado con el nombre viejo, actualiza el remote:
> `git remote set-url origin https://github.com/Jgmaza/hold-the-box.git`
git checkout dev && git pull
git checkout -b issue/<n>-slug   # n = número del issue en GitHub
```

(Opcional) tu rama personal `work/<tu-nombre>` sigue existiendo para sync; las features van por **issue**.

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
| Arte / audio / bugs | `deliveries/<tu-nombre>/` | `issue/<n>-…` (o `work/<tú>`) |
| Código del juego | `apps/` | `issue/<n>-…` |
| Docs / deploy / jam | `docs/` | `issue/<n>-…` |
| Material oficial del jam | [`docs/jam/`](./jam/) | vía PR a `dev` |

**No subas a `dev` ni a `main` en directo.** Solo PRs.

---

## 3) Flujo diario (modo de trabajo)

```
issue/#N  →  rama issue/N-slug desde dev  →  PR → dev
                                              ↓
                                         playtest
                                              ↓
                              PR dev → main (solo Jose)
                                              ↓
                                         GitHub Pages
```

### Tú (cada issue)

```bash
git checkout dev && git pull
git checkout -b issue/<n>-slug
# ... trabajas, commits ...
git push -u origin HEAD
gh pr create --base dev   # o el botón en GitHub
```

### Qué pasa al entrar algo a `dev`

1. Jose aprueba el PR (code owner) + CI verde; smoke test.
2. El workflow **Sync work from dev** actualiza las `work/*`.
3. Cuando el playtest está listo: **Jose** abre/mergea PR **`dev` → `main`**.

Detalle: [`BRANCHES.md`](./BRANCHES.md).

---

## 4) CI/CD (cómo sale a la calle)

| Momento | Qué corre | Resultado |
|---|---|---|
| PR a `dev` o `main` | **CI** (`npm test` + `npm run build`) | Debe quedar verde |
| Push a `dev` | **Sync work from dev** | Las `work/*` reciben `dev` |
| Merge a `main` | **Deploy Pages** | Se publica el juego en GitHub Pages |

### Reglas de `dev` y `main`

- **`dev`:** solo PR desde `issue/*` (o `work/*`); aprueba **Jose** + CI
- **`main`:** solo PR desde **`dev`**; solo **Jose** puede mergear + CI
- Nadie hace push directo a `dev` / `main`
- Al mergear `main` → deploy automático a Pages

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
| Danel | `apps/` → PR a `dev` | `team/danel/README.md` |
| Luis | `deliveries/luis/` (+ jam en `docs/jam/` si aplica) | `team/luis/README.md` |
| Juanes / Matias | `deliveries/<nombre>/` PNGs | su `team/.../README.md` |
| Zharick | UI en `apps/` o bugs en `deliveries/zharick/` | `team/zharick/README.md` |
| Jose | alcance + merge PRs a `dev` + PR `dev→main` + itch | `team/jose/README.md` + `DEPLOY.md` |

---

## 6) Si algo falla

- **No veo el sync:** Actions → “Sync work from dev” · luego `git pull` en tu rama.
- **Pages viejo:** el build de prod es el de `main`, no el de `dev`. Hay que promover.
- **CI rojo:** arregla en tu `work/*`, no force-push a `main`.
- **Invitación:** [`COLLABORATORS.md`](./COLLABORATORS.md).

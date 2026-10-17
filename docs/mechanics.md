# Mecánicas

Fuente: código en `apps/src/sim/` + `apps/src/config.js`.  
Feel / perfiles: **Luis** · Código: **Danel** · Scope: `MVP_SCOPE.md`

## Core (ya en el build)
- Caja compartida (resorte, no soltar)
- Sincronía → velocidad / estabilidad
- Inclinación + critical → drop
- **Huequito** → baja integridad/contenido
- **Mojado** → penalizaciones; chorros; fall al agua
- Checkpoints, meta con rating (perfect / ok / dañada)

## Trabajo de Luis
Tunear knobs y definir **perfiles** en `deliveries/luis/BOX_VARIANTS.md` — no rehacer el motor.

## Después (opcional)
Burla al fallar · mods/skins · más perfiles de caja

## Obstáculos del nivel
- Huecos entre plataformas
- Rodillos giratorios
- Plataformas móviles
- Agua debajo (castigo permanente)
- Clima: isla de **lluvia** (el aguacero empapa la caja; hay que meterse bajo las carpas) e isla de **viento** (ráfagas que empujan, inclinan y se llevan contenido). Se agrega a cualquier isla con `weather` en la plataforma, o en una línea con `rainIsland()` / `windIsland()`: ver [`clima.md`](./clima.md).
- **Rieles asimétricos**: dos tablones largos (uno por jugador) con piedras, huecos y topes **desfasados** — hay que coordinar saltos. `railsPair()` en `levels/sections.js`. Ver [`rieles.md`](./rieles.md).
- **Mapas de campaña** (menú): Nivel 1 El Muelle → Nivel 2 La Bahía → Nivel 3 La Tormenta (`?level=muelle|bahia|tormenta`). Misma caja y controles; crecen en largo, peligros apilados y checkpoints más separados.
- **Escenografía**: modelos Kenney en las orillas (`dressLevel`); ver [`escenografia.md`](./escenografia.md). Agua con olas en [`agua.md`](./agua.md).
- NPCs easy / medium / hard que botan contenido o mojan la caja. Al inicio del Muelle hay **una isla por NPC** (easy → medium → hard) unidas por puentes seguros con checkpoint,. Ver `apps/README.md`.

## Controles
Ver `docs/controls.md`.

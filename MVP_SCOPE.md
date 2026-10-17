# MVP Scope — piso real (post vertical slice Danel)

El código en `apps/` **ya supera** el MVP original. Este doc refleja eso.  
No pensamos la caja como “mecánica simple”: el core ya es **complejo e interesante**.

## Ya existe (piso congelado — no re-inventar)

✅ Coop local 2P + cámara única  
✅ Caja compartida (resorte / no soltar)  
✅ Sincronía, inclinación (upright / tilting / critical), drop  
✅ **Huequito** (integridad / contenido %)  
✅ **Se moja** (wetness, chorros, penalizaciones)  
✅ Nivel 1: plataformas, elevador, rodillo, agua, checkpoints, meta  
✅ Win con rating (perfecta / ok / dañada) + fail + restart  
✅ `config.js` + panel `?debug` tuneable  
✅ UI placeholder + tests  

## Fase actual — qué hace cada quien

| Rol | Expectativa nueva |
|---|---|
| **Luis** | Dueño del **diseño de cajas**: tunear feel, proponer/mejorar perfiles de mecánica por caja, playtest |
| **Juanes / Matias** | Visuales **del juego que ya existe** (caja VIP/FRÁGIL, P1/P2, carteles del muelle, estados leak/wet) |
| **Zharick** | Pulir UI sobre eventos actuales (barra integridad/mojado, fail/win claros) |
| **Danel** | Estabilizar, bugs, enganchar `deliveries/` — **no** sumar sistemas nuevos sin OK de Jose |
| **Jose** | **Despliegue** + alcance + pitch (build itch / prod desde `main`) |

## Nice-to-have (solo si sobra y no rompe el feel)

- Más perfiles de caja (Luis define → Danel implementa preset)
- Burla al fallar
- Mods visuales / skins
- Timer demo apagable (ya casi hay)

## Sigue fuera

❌ Online · inventario · powerups · tienda · ranking · enemigos con IA  
❌ Reescribir el core de la caja desde cero  

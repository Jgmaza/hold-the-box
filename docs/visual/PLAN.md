# Plan visual — sin pedirles Blender a diseño

## Decisión de jam (congelada)

| Pregunta | Respuesta |
|---|---|
| ¿Juanes/Matias modelan en 3D? | **No** |
| ¿Hay que saber Blender para el MVP? | **No** |
| ¿El juego se ve 3D? | **Sí** — con formas simples en PlayCanvas |
| ¿Para qué sirven los dibujos a papel? | **Refs + texturas/carteles 2D** sobre esos objetos |

Si alguien solo sabe dibujar en papel, **igual aporta al look**. El 3D “de producción” no es su trabajo.

---

## Capas visuales (de obligatorio a opcional)

### Capa A — Jugable ya (Danel) · **obligatoria**
- Jugadores = cápsulas o cajas alargadas  
- Caja = cubo  
- Plataformas = cajas chatas  
- Agua = plano azul  
- Rodillo = cilindro  
- Colores desde `deliveries/luis/PALETTE.md`  

Con esto el demo se entiende **sin ningún dibujo**.

### Capa B — Look del jam (Juanes + Matias) · **prioridad arte**
Sus PNG se pegan como:

| Entrega | Cómo entra al juego | Quién dibuja |
|---|---|---|
| Carteles / META / señales | Planos 3D con textura PNG | **Matias** |
| Caja con estados (hueco, mojada) | Textura en el cubo o panel delante | **Juanes** |
| Personajes (vistas) | **Referencia** de proporciones/ropa; opcional sprite en billboard | **Juanes** |
| Props (palmera, etc.) | Planos con silueta PNG o decoración | **Matias** |

Herramientas de ellos: papel → foto → Photopea → PNG.  
Guía paso a paso: [`pipeline-papel.md`](./pipeline-papel.md)

### Capa C — 3D “bonito” · **solo si sobra tiempo**
- **No asignar a Juanes/Matias.**  
- Opcional: Danel o Jose generan mesh simple con:
  - Blender (si alguien sabe), o  
  - IA mesh (Meshy / Tripo / similar) usando el dibujo como referencia  
- Criterio: si tarda > 1–2 h, **se descarta** y se queda en Capa B.

---

## Asignación clara de tareas visuales

### Juanes (solo papel → PNG)
Prioridad:
1. Caja: normal, inclinada, huequito, mojada (4 dibujos claros)  
2. P1 traje + P2 gorra: al menos frente + pose cargando  

Entrega en: `deliveries/juanes/`  
Danel las usa como textura/ref — **Juanes no abre PlayCanvas**.

### Matias (solo papel → PNG)
Prioridad:
1. Banner META  
2. “¡CUIDADO QUE NO SE CAIGA!”  
3. “TRABAJO EN EQUIPO = RESULTADOS”  
4. Siluetas: rodillo / plataforma / palmera (simples)

Entrega en: `deliveries/matias/`

### Luis (color, no modela)
- Hex oficiales en `deliveries/luis/PALETTE.md`  
- Esos colores pintan las **primitivas** de Capa A hasta que lleguen texturas  

### Danel (implementa look en PlayCanvas)
1. Primero Capa A (primitivas + paleta)  
2. Cuando lleguen PNG: aplicar texturas a planos/caja  
3. No esperar arte para gameplay  

### Zharick
- UI con colores de Luis  
- Puede usar recortes de carteles de Matias en pantallas start/victoria  

---

## Qué NO hacer (evita desorden)

- Pedir “modelen los personajes en Blender” a diseño  
- Bloquear código esperando el arte final  
- Mezclar refs y entregas finales sin nombres claros  
- Detalle de sombreado fino en papel (en juego no se lee)

---

## Flujo visual completo

```
Papel (Juanes/Matias)
    → foto + Photopea (PNG transparente)
    → deliveries/juanes|matias/
    → Danel aplica en apps/ (textura / cartel / ref)
    → Luis da hex para todo lo que aún sea primitiva
```

Capa C (mesh 3D) queda fuera del camino crítico del demo.

# Pipeline de diseño → digital (para quienes solo dibujan)

Objetivo: que Diseño 1 y 2 **solo dibujen**. La digitalización es un proceso corto y repetible.

## Herramienta recomendada (gratis / game-jam)

### Opción A — principal: **Photopea** (https://www.photopea.com)
Editor online tipo Photoshop. No instala nada.

Usar para:
- Recortar la foto del dibujo
- Subir contraste / limpiar líneas
- Borrar fondo
- Exportar **PNG** transparente

### Opción B — vectorizar siluetas: **Vectorizer.ai** (https://vectorizer.ai)
Si el dibujo es de línea clara (señales, logos, banner META):
- Subes la foto → sacas SVG/PNG limpio
- Ideal para carteles y UI

### Opción C — quitar fondo rápido: **remove.bg** (https://www.remove.bg)
Cuando ya tienes el dibujo escaneado/foto y solo necesitas fondo transparente.

---

## Pasos (checklist para artistas)

1. **Dibujar** en papel blanco, lápiz/marcador oscuro, líneas cerradas.
2. **Fotografiar** con luz uniforme (evitar sombra de la mano). Centrar el dibujo.
3. Abrir la foto en **Photopea**.
4. Ajustar: Brillo/Contraste → que la línea se vea negra y el papel blanco.
5. Seleccionar fondo y borrarlo (o usar remove.bg).
6. Exportar `PNG` con transparencia.
7. Nombrar así y subir a la carpeta que indique el Lead:
   - `p1-frente.png`, `p1-cargar.png`
   - `p2-frente.png`, `caja-mojada.png`, `senal-meta.png`, etc.
8. El **Dev Apoyo** o el **Lead** pasan el pack al **Dev Estrella** para PlayCanvas.

---

## Qué NO se les pide a diseño
- Modelar en 3D
- Abrir PlayCanvas
- Animar
- Escribir código

Sus dibujos sirven como:
- **Referencia** para modelos/estados del juego
- **Texturas / carteles 2D** directos en el nivel
- **UI** (iconos, banner de victoria)

---

## Tip de jam
Priorizar siluetas legibles a distancia sobre detalle fino. En pantalla chica gana la forma clara, no el sombreado.

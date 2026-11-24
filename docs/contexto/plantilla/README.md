# Plantilla creativa — documento oficial HTB

Misma idea que Min Minas (plantilla → archivo listo), pero con **look del juego**, no institucional.

## Salida

| Archivo | Qué |
|---|---|
| [`out/Hold_the_Box_El_Proyecto.pdf`](./out/Hold_the_Box_El_Proyecto.pdf) | **PDF oficial** (manual del juego) |
| [`el_proyecto.html`](./el_proyecto.html) | Plantilla visual (Lilita One, cielo/madera, cards) |
| [`assets/`](./assets/) | Hero, equipo, arquitectura (generados al estilo cover) |
| [`plantilla_el_proyecto.md`](./plantilla_el_proyecto.md) | Fuente de contenido (YAML + secciones) |

## Regenerar

```bash
cd docs/contexto/plantilla
npm install
npm run build          # PDF creativo (HTML → Chrome headless)
npm run build:classic  # DOCX/PDF estilo tablas (legacy Minas)
```

## Identidad visual (del juego)

- Paleta del cover: cielo `#60c0f0` / madera `#c07830` / tinta `#301800`
- Tipografía: **Lilita One** (títulos, como el menú) + Nunito (cuerpo)
- Cartón, chips de teclas, paneles con borde grueso — feel Fall Guys / muelle
- Sin purple, sin look Ministerio

## MCPs / creativos

- **GenerateImage** + cover itch → assets en `assets/`
- **Kinocut** palette (opcional: `pip install kinocut[image]`)
- **PlayCanvas** captura runtime: conectar Editor MCP y se pueden meter screenshots reales del Muelle
- **Pencil** (extensión): instalada en Cursor; abrir un `.pen` y conectar el MCP para mockups editables de páginas

Cuando Connect de PlayCanvas o Pencil esté activo, se puede regenerar con capturas/mockups reales en vez de ilustraciones.

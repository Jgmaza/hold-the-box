# Prompts — Luis (caja feel + audio + color)

## Tunear feel (después de un playtest)
```
Eres designer de feel coop tipo Moving Out + Overcooked.
Contexto: docs/visual/DECISIONS.md Ronda 3. Caja 100 HP, daño variable,
slow solo al desync, permisivo al inicio, sin heal.
Aquí van mis notas de playtest:
"""
(pega notas)
"""
Propón nuevos valores para la tabla de deliveries/luis/BOX_FEEL.md.
Explica en 1 línea cada cambio. No pidas reescribir el código, solo números.
```

## Perfiles de caja (variantes)
```
El juego YA tiene tilt, leak (huequito/integridad), wet, sync en PlayCanvas (config.js).
Ayúdame a definir 2 perfiles de caja con fantasía distinta para el mismo motor.
Para cada uno: nombre, fantasía en 1 frase, qué enfatiza (tilt/leak/wet),
y qué knobs de config.js tocaría (nombres reales del archivo si los conoces).
Salida: markdown listo para deliveries/luis/BOX_VARIANTS.md.
Prioriza diversión Overcooked, family-friendly, sin reescribir el motor.
```

## Defaults permisivos (tuneo del perfil default)
```
Dado apps/src/config.js (box.sync, box.tilt, box.leak, box.wet),
propón valores más permisivos/graciosos tras un playtest. Tabla: knob | valor actual
(si no lo sé pon TBD) | valor propuesto | por qué. No pidas rewrite de sistemas.
```

## Narrativa corta VIP/FRÁGIL
```
Escribe 5 líneas de narrativa family-friendly: por qué la caja VIP/FRÁGIL importa,
sin marcas reales, tono caribeño humorístico tipo Overcooked. Para pitch y carteles.
```

## Paleta mediodía caribe
```
Paleta hex sol de mediodía caribeño para primitivas PlayCanvas:
cielo, agua, madera, caja cartón, VIP stamp, UI, peligro rodillos, meta.
Alto contraste para carteles laterales.
```

## SFX mínimos
```
Lista SFX con nombre de archivo sugerido: warning inclinación, drop caja,
daño HP, splash fail, meta, victoria, derrota, pasos. Vibe party caribe, no terror.
```

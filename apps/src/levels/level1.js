// Nivel 1 — "El Muelle". Avanza hacia -Z; el agua está en y = 0.
//
// Plataformas: centro (x, z), ancho w (X), fondo d (Z), piso a altura `top`.
//   Si no se da `h`, el bloque baja hasta debajo del agua (se ve como un muelle sólido).
// Carteles: `art` = PNG opcional en deliveries/ (si no existe se dibuja `text`).
// Recorrido: inicio → isla easy → isla medium → isla hard (un NPC por isla, unidas por puentes seguros)
//   → isla lluvia → isla viento (clima: campo `weather` de la plataforma, ver src/sim/weather/)
//   → muelle → hueco → ferry → CP1 → rodillo → dos tablones → chorros → CP2 → escalones → elevador → bar + META.

import { rainIsland, windIsland } from './sections.js';

export default {
  id: 'muelle',
  name: 'El Muelle',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 91 },
    p2: { x: 0.8, y: 1, z: 91 },
  },

  platforms: [
    // Islas de NPCs (antes del muelle). Cada NPC pasea solo en SU isla; los puentes son zona segura.
    { id: 'inicio', x: 0, z: 92, w: 10, d: 8, top: 1 }, //           z 96 .. 88
    { id: 'puente-easy', x: 0, z: 86.5, w: 4, d: 3, top: 1 }, //     z 88 .. 85
    { id: 'isla-easy', x: 0, z: 79, w: 10, d: 12, top: 1 }, //       z 85 .. 73
    { id: 'puente-medium', x: 0, z: 71.5, w: 4, d: 3, top: 1 }, //   z 73 .. 70
    { id: 'isla-medium', x: 0, z: 64, w: 10, d: 12, top: 1 }, //     z 70 .. 58
    { id: 'puente-hard', x: 0, z: 56.5, w: 4, d: 3, top: 1 }, //     z 58 .. 55
    { id: 'isla-hard', x: 0, z: 49, w: 12, d: 12, top: 1 }, //       z 55 .. 43
    // Islas de clima (ver docs/clima.md): una línea por sección; las carpas se alternan izquierda / derecha solas.
    { id: 'puente-lluvia', x: 0, z: 41.5, w: 4, d: 3, top: 1 }, //   z 43 .. 40
    rainIsland({ id: 'isla-lluvia', from: 40, length: 14, shelters: 3 }), // z 40 .. 26
    { id: 'puente-viento', x: 0, z: 24.5, w: 4, d: 3, top: 1 }, //   z 26 .. 23
    windIsland({ id: 'isla-viento', from: 23, length: 14 }), // z 23 .. 9
    { id: 'puente-salida', x: 0, z: 7.5, w: 4, d: 3, top: 1 }, //    z 9 .. 6
    { id: 'salida', x: 0, z: 0, w: 10, d: 12, top: 1 }, //          z  6 .. -6
    { id: 'tras-hueco', x: 0, z: -12.25, w: 8, d: 7.5, top: 1 }, // z -8.5 .. -16  (hueco de 2.5 m)
    { id: 'cp1', x: 0, z: -29, w: 8, d: 6, top: 1 }, //               z -26 .. -32
    { id: 'rodillo', x: 0, z: -38, w: 12, d: 12, top: 1 }, //         z -32 .. -44
    // Puente de dos tablones: uno para cada uno. Si se separan o se juntan de más, al agua.
    { id: 'tablon-izq', x: -0.8, z: -49, w: 0.7, d: 10, top: 1, h: 0.35, kind: 'plank' },
    { id: 'tablon-der', x: 0.8, z: -49, w: 0.7, d: 10, top: 1, h: 0.35, kind: 'plank' },
    { id: 'chorros', x: 0, z: -61, w: 6, d: 14, top: 1 }, //          z -54 .. -68
    { id: 'cp2', x: 0, z: -71, w: 8, d: 6, top: 1 }, //               z -68 .. -74
    { id: 'escalon-1', x: 0, z: -75.5, w: 8, d: 3, top: 1.6 },
    { id: 'escalon-2', x: 0, z: -78.5, w: 8, d: 3, top: 2.2 },
    { id: 'escalon-3', x: 0, z: -82.5, w: 8, d: 5, top: 2.8 }, //     z -80 .. -85
    { id: 'terraza', x: 0, z: -96.5, w: 12, d: 12, top: 5 }, //       z -90.5 .. -102.5
  ],

  moving: [
    // Ferry sobre el agua entre "tras-hueco" y CP1.
    { id: 'ferry', x: 0, z: -18.5, w: 4.5, d: 4, top: 1, to: { z: -23.5 }, period: 7 },
    // Elevador de los escalones a la terraza.
    { id: 'elevador', x: 0, z: -88, w: 5, d: 5, top: 2.8, to: { top: 5 }, period: 7, phase: 0 },
  ],

  // Un NPC por isla. Ver src/sim/npcs/ y CONFIG.npcs.
  npcs: [
    { difficulty: 'easy', platform: 'isla-easy', x: 1.5, z: 79 },
    { difficulty: 'medium', platform: 'isla-medium', x: 0, z: 61 },
    { difficulty: 'hard', platform: 'isla-hard', x: 0, z: 48 },
  ],

  sweepers: [{ id: 'rodillo', x: 0, z: -38, top: 1, length: 5.2, speed: 70, startAngle: 90 }],

  geysers: [
    { x: -1.0, z: -57.5, baseY: 1, radius: 1.1, offset: 0 },
    { x: 1.2, z: -61, baseY: 1, radius: 1.1, offset: 1.07 },
    { x: -0.6, z: -64.5, baseY: 1, radius: 1.1, offset: 2.13 },
  ],

  // Se activan cuando la caja entra. Guardan dónde reaparecer y el estado de la caja.
  checkpoints: [
    // En los puentes: si caen en una isla, reaparecen justo antes de ella.
    { id: 'cp-medium', x: 0, z: 71.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 71.5 }, p2: { x: 0.8, y: 1, z: 71.5 } } },
    { id: 'cp-hard', x: 0, z: 56.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 56.5 }, p2: { x: 0.8, y: 1, z: 56.5 } } },
    { id: 'cp-lluvia', x: 0, z: 41.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 41.5 }, p2: { x: 0.8, y: 1, z: 41.5 } } },
    { id: 'cp-viento', x: 0, z: 24.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 24.5 }, p2: { x: 0.8, y: 1, z: 24.5 } } },
    { id: 'cp-salida', x: 0, z: 7.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 2 }, p2: { x: 0.8, y: 1, z: 2 } } },
    { id: 'cp1', x: 0, z: -29, w: 8, d: 5, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -29 }, p2: { x: 0.8, y: 1, z: -29 } } },
    { id: 'cp2', x: 0, z: -71, w: 8, d: 5, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -71 }, p2: { x: 0.8, y: 1, z: -71 } } },
  ],

  goal: { x: 0, z: -99.5, w: 8, d: 5, top: 5 },

  signs: [
    { x: -3.6, z: -3, top: 1, w: 3.4, h: 1.5, text: 'TRABAJO EN EQUIPO\n= RESULTADOS', art: 'matias/senal-trabajo-equipo.png' },
    { x: 3.6, z: 90, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -3.8, z: 84, top: 1, w: 3, h: 1.4, text: 'NPC EASY\n¡SÁLTENLO JUNTOS!', style: 'info' },
    { x: 3.8, z: 69, top: 1, w: 3, h: 1.4, text: 'NPC MEDIUM\n¡MUÉVANSE JUNTOS!', style: 'warn' },
    { x: -4.6, z: 54, top: 1, w: 3.2, h: 1.4, text: 'NPC HARD\n¡ESQUIVEN Y PASEN!', style: 'warn' },
    { x: -4, z: 39.3, top: 1, w: 3.2, h: 1.4, text: '¡AGUACERO!\nMÉTANSE BAJO LA CARPA', style: 'info' },
    { x: 4, z: 22.3, top: 1, w: 3.4, h: 1.4, text: '¡VIENTO!\nCAMINEN CONTRA LA RÁFAGA', style: 'warn' },
    { x: 3.2, z: -10, top: 1, w: 3.2, h: 1.5, text: '¡CUIDADO QUE\nNO SE CAIGA!', art: 'matias/senal-cuidado-caja.png', style: 'warn' },
    { x: -4.6, z: -34, top: 1, w: 2.8, h: 1.3, text: '¡SALTEN\nJUNTOS!', style: 'warn' },
    { x: 2.9, z: -43, top: 1, w: 2.8, h: 1.2, text: 'UNO POR TABLÓN', style: 'info' },
    { x: -2.4, z: -55, top: 1, w: 2.8, h: 1.3, text: '¡NO MOJEN\nLA CAJA!', style: 'warn' },
    { x: -3.2, z: -83.5, top: 2.8, w: 3.2, h: 1.3, text: 'ESPEREN EL\nELEVADOR', style: 'info' },
    { x: -4.6, z: -100.5, top: 5, w: 3.2, h: 1.4, text: 'AQUÍ SE TOMA\nEL RON', art: 'matias/cartel-ron.png', style: 'bar' },
    // Valla publicitaria en el agua (humor local, family friendly).
    { x: -12, z: -40, top: 0, w: 7, h: 3, post: 3.5, text: 'SE BUSCAN AYUDANTES\nPARA CARGAR CAJAS\nPAGO: GRATITUD', art: 'matias/billboard-humor.png', style: 'billboard' },
  ],

  // Barcos en el agua (top 0). El resto, en grupos, sobre el piso y fuera del centro.
  scenery: [
    // Barcos, de la salida a la meta, alternando orilla.
    { art: 'ship-large', x: -9.2, z: 58, top: -0.15, yaw: 0, s: 0.5 },
    { art: 'ship-pirate-large', x: 9.2, z: 44, top: -0.15, yaw: 180, s: 0.5 },
    { art: 'ship-medium', x: -9.2, z: 28, top: -0.15, yaw: 0, s: 0.5 },
    { art: 'ship-pirate-medium', x: 9.2, z: 14, top: -0.15, yaw: 180, s: 0.5 },
    { art: 'ship-small', x: -9.2, z: -2, top: -0.15, yaw: 0, s: 0.5 },
    { art: 'ship-pirate-small', x: 9.2, z: -18, top: -0.15, yaw: 180, s: 0.5 },
    { art: 'ship-ghost', x: -9.4, z: -38, top: -0.15, yaw: 0, s: 0.5 },
    { art: 'ship-wreck', x: 9.4, z: -60, top: -0.15, yaw: 180, s: 0.5 },
    { art: 'boat-row-small', x: -6.4, z: 56, top: -0.04, yaw: 20, s: 0.55 },
    { art: 'boat-row-large', x: 6.4, z: 40, top: -0.04, yaw: -15, s: 0.55 },

    // Inicio: palmeras en las esquinas y carga a los lados.
    { art: 'palm-straight', x: -3.8, z: 60.6, top: 1, yaw: 0, s: 0.42 },
    { art: 'palm-bend', x: 3.8, z: 60.6, top: 1, yaw: 0, s: 0.42 },
    { art: 'barrel', x: -3.7, z: 56.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'crate', x: 3.7, z: 56.2, top: 1, yaw: 15, s: 0.42 },
    { art: 'tool-shovel', x: -4.3, z: 57.6, top: 1, yaw: 25, s: 0.42 },
    { art: 'tool-paddle', x: 4.3, z: 57.6, top: 1, yaw: -20, s: 0.42 },

    // Isla fácil: rocas, hierba y dos banderas.
    { art: 'rocks-a', x: -3.6, z: 48, top: 1, yaw: 0, s: 0.4 },
    { art: 'palm-detailed-straight', x: 3.7, z: 48.2, top: 1, yaw: 0, s: 0.4 },
    { art: 'grass-patch', x: -3.6, z: 42.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'grass-plant', x: 3.7, z: 42.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'flag', x: -3.8, z: 45, top: 1, yaw: 0, s: 0.42 },
    { art: 'flag-pirate', x: 3.8, z: 45, top: 1, yaw: 0, s: 0.42 },
    { art: 'bottle', x: -3.5, z: 44.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'bottle-large', x: 3.5, z: 44.2, top: 1, yaw: 0, s: 0.42 },

    // Isla media: campamento de un lado, carga del otro.
    { art: 'structure', x: -3.7, z: 33.4, top: 1, yaw: 0, s: 0.42 },
    { art: 'structure-roof', x: -3.7, z: 30.6, top: 1, yaw: 0, s: 0.42 },
    { art: 'structure-fence', x: -3.7, z: 27.6, top: 1, yaw: 90, s: 0.42 },
    { art: 'rocks-b', x: 3.6, z: 33.2, top: 1, yaw: 0, s: 0.38 },
    { art: 'chest', x: 3.6, z: 29.4, top: 1, yaw: 10, s: 0.42 },
    { art: 'crate-bottles', x: 3.6, z: 27.2, top: 1, yaw: -8, s: 0.42 },
    { art: 'flag-high', x: -3.8, z: 25.4, top: 1, yaw: 0, s: 0.4 },
    { art: 'flag-pirate-high', x: 3.8, z: 25.4, top: 1, yaw: 0, s: 0.4 },

    // Isla difícil: castillo a la izquierda, torres a la derecha.
    { art: 'castle-wall', x: -4.6, z: 18.6, top: 1, yaw: 0, s: 0.4 },
    { art: 'castle-door', x: -4.6, z: 16.2, top: 1, yaw: 0, s: 0.4 },
    { art: 'castle-window', x: -4.6, z: 13.8, top: 1, yaw: 0, s: 0.4 },
    { art: 'castle-gate', x: -4.6, z: 11.2, top: 1, yaw: 0, s: 0.4 },
    { art: 'tower-base', x: 4.6, z: 18.6, top: 1, yaw: 0, s: 0.4 },
    { art: 'tower-base-door', x: 4.6, z: 16, top: 1, yaw: 0, s: 0.4 },
    { art: 'tower-middle', x: 4.6, z: 13.4, top: 1, yaw: 0, s: 0.4 },
    { art: 'tower-middle-windows', x: 4.6, z: 10.8, top: 1, yaw: 0, s: 0.4 },
    { art: 'palm-detailed-bend', x: -2.6, z: 19.2, top: 1, yaw: 0, s: 0.38 },
    { art: 'cannon', x: 2.8, z: 19.2, top: 1, yaw: 90, s: 0.42 },
    { art: 'cannon-mobile', x: 2.8, z: 16.8, top: 1, yaw: 70, s: 0.42 },
    { art: 'cannon-ball', x: 2.6, z: 14.8, top: 1, yaw: 0, s: 0.42 },

    // Salida del muelle.
    { art: 'structure-platform-dock', x: -3.6, z: 3.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'structure-platform', x: 3.6, z: 3.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'platform', x: -3.6, z: -1.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'platform-planks', x: 3.6, z: -1.2, top: 1, yaw: 0, s: 0.42 },
    { art: 'structure-platform-dock-small', x: -3.6, z: -4.4, top: 1, yaw: 0, s: 0.42 },
    { art: 'structure-platform-small', x: 3.6, z: -4.4, top: 1, yaw: 0, s: 0.42 },
    { art: 'flag-pennant', x: -3.8, z: 1, top: 1, yaw: 0, s: 0.4 },
    { art: 'flag-pirate-pennant', x: 3.8, z: 1, top: 1, yaw: 0, s: 0.4 },

    // Después del hueco.
    { art: 'rocks-c', x: -2.8, z: -11, top: 1, yaw: 0, s: 0.36 },
    { art: 'hole', x: 2.8, z: -13.4, top: 1, yaw: 0, s: 0.36 },
    { art: 'grass', x: -2.6, z: -14.2, top: 1, yaw: 0, s: 0.42 },

    // Checkpoint y rodillo: rocas en las orillas, lejos del eje.
    { art: 'flag-high-pennant', x: -3.2, z: -29, top: 1, yaw: 0, s: 0.38 },
    { art: 'flag-pirate-high-pennant', x: 3.2, z: -29, top: 1, yaw: 0, s: 0.38 },
    { art: 'rocks-sand-a', x: -4.6, z: -41, top: 1, yaw: 0, s: 0.36 },
    { art: 'rocks-sand-b', x: 4.6, z: -41, top: 1, yaw: 0, s: 0.36 },
    { art: 'rocks-sand-c', x: -4.6, z: -35, top: 1, yaw: 0, s: 0.36 },
    { art: 'patch-grass', x: 4.6, z: -35.2, top: 1, yaw: 0, s: 0.36 },
    { art: 'mast', x: -4.8, z: -37.6, top: 1, yaw: 0, s: 0.32 },

    // Chorros: solo piezas chicas en el borde.
    { art: 'structure-fence-sides', x: -2.3, z: -57, top: 1, yaw: 90, s: 0.36 },
    { art: 'patch-grass-foliage', x: 2.2, z: -64, top: 1, yaw: 0, s: 0.28 },

    // Terraza: torres altas y arena, sin tapar la meta.
    { art: 'tower-complete-small', x: -4.6, z: -93, top: 5, yaw: 0, s: 0.4 },
    { art: 'tower-complete-large', x: 4.6, z: -93, top: 5, yaw: 0, s: 0.38 },
    { art: 'tower-roof', x: -4.8, z: -95.4, top: 5, yaw: 0, s: 0.38 },
    { art: 'tower-watch', x: 4.8, z: -95.4, top: 5, yaw: 0, s: 0.4 },
    { art: 'tower-top', x: -5.1, z: -100.2, top: 5, yaw: 0, s: 0.36 },
    { art: 'mast-ropes', x: 5, z: -91.6, top: 5, yaw: 0, s: 0.28 },
    { art: 'patch-sand', x: -2.6, z: -91.4, top: 5, yaw: 0, s: 0.26 },
    { art: 'patch-sand-foliage', x: 2.6, z: -91.4, top: 5, yaw: 0, s: 0.24 },
  ],

  props: [
    { type: 'palm', x: -4.2, z: 94.5, top: 1 },
    { type: 'palm', x: 4.2, z: 74, top: 1 },
    { type: 'palm', x: -4.2, z: 59, top: 1 },
    { type: 'palm', x: 5.2, z: 44, top: 1 },
    { type: 'flag', x: 3, z: 69.2, top: 1, checkpoint: 0 },
    { type: 'flag', x: 3, z: 54.2, top: 1, checkpoint: 1 },
    { type: 'palm', x: 4.3, z: 27.2, top: 1 },
    { type: 'flag', x: 3, z: 39.2, top: 1, checkpoint: 2 },
    { type: 'flag', x: -3.2, z: 22.2, top: 1, checkpoint: 3 },
    { type: 'flag', x: 3.5, z: 4.5, top: 1, checkpoint: 4 },
    { type: 'palm', x: 4.3, z: -5, top: 1 },
    { type: 'palm', x: -4.3, z: -5.2, top: 1 },
    { type: 'palm', x: 3.3, z: -15, top: 1 },
    { type: 'palm', x: -5.3, z: -43, top: 1 },
    { type: 'palm', x: 5.3, z: -33, top: 1 },
    { type: 'palm', x: 2.4, z: -67, top: 1 },
    { type: 'palm', x: -3.5, z: -73, top: 1 },
    { type: 'palm', x: 5.2, z: -91.5, top: 5 },
    { type: 'palm', x: -5.2, z: -91.5, top: 5 },
    { type: 'bar', x: -4.3, z: -101, top: 5 },
    { type: 'flag', x: 3.5, z: -27, top: 1, checkpoint: 5 },
    { type: 'flag', x: 3.5, z: -69, top: 1, checkpoint: 6 },
  ],
};

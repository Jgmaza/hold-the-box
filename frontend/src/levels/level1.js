// Nivel 1 — "El Muelle". Avanza hacia -Z; el agua está en y = 0.
//
// Plataformas: centro (x, z), ancho w (X), fondo d (Z), piso a altura `top`.
//   Si no se da `h`, el bloque baja hasta debajo del agua (se ve como un muelle sólido).
// Carteles: `art` = PNG opcional en deliveries/ (si no existe se dibuja `text`).
// Recorrido: inicio → isla easy → isla medium → isla hard (un NPC por isla, unidas por puentes seguros)
//   → isla lluvia → isla viento (clima: campo `weather` de la plataforma, ver src/sim/weather/)
//   → muelle → hueco → ferry → CP1 → rodillo → rieles asimétricos → chorros → CP2 → escalones → elevador → bar + META.
// Estaciones: la fuente después del perro, los abanicos al salir de la lluvia, galletas tras el viento y el taller en la terraza.

import { dressLevel, rainIsland, railsPair, recovery, windIsland } from './sections.js';

const level = {
  id: 'muelle',
  name: 'El Muelle',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 91 },
    p2: { x: 0.8, y: 1, z: 91 },
  },

  platforms: [
    // Islas de NPCs (antes del muelle). Cada NPC pasea solo en SU isla; los puentes son zona segura.
    { id: 'inicio', x: 0, z: 92, w: 14, d: 8, top: 1 }, //           z 96 .. 88
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
    // Rieles asimétricos (ver docs/rieles.md): P1 piedras/hueco, P2 hueco/tope/piedra, desfasados.
    ...railsPair({ id: 'rieles', from: -44, length: 28 }), //         z -44 .. -72
    { id: 'chorros', x: 0, z: -79, w: 6, d: 14, top: 1 }, //          z -72 .. -86
    { id: 'cp2', x: 0, z: -89, w: 8, d: 6, top: 1 }, //               z -86 .. -92
    { id: 'escalon-1', x: 0, z: -93.5, w: 8, d: 3, top: 1.6 },
    { id: 'escalon-2', x: 0, z: -96.5, w: 8, d: 3, top: 2.2 },
    { id: 'escalon-3', x: 0, z: -100.5, w: 8, d: 5, top: 2.8 }, //    z -98 .. -103
    { id: 'terraza', x: 0, z: -114.5, w: 12, d: 12, top: 5 }, //      z -108.5 .. -120.5
  ],

  moving: [
    // Ferry sobre el agua entre "tras-hueco" y CP1.
    { id: 'ferry', x: 0, z: -18.5, w: 4.5, d: 4, top: 1, to: { z: -23.5 }, period: 7 },
    // Elevador de los escalones a la terraza.
    { id: 'elevador', x: 0, z: -106, w: 5, d: 5, top: 2.8, to: { top: 5 }, period: 7, phase: 0 },
  ],

  // Un NPC por isla. Ver src/sim/npcs/ y CONFIG.npcs.
  npcs: [
    { difficulty: 'easy', platform: 'isla-easy', x: 1.5, z: 79 },
    { difficulty: 'medium', platform: 'isla-medium', x: 0, z: 61 },
    { difficulty: 'hard', platform: 'isla-hard', x: 0, z: 48 },
  ],

  sweepers: [{ id: 'rodillo', x: 0, z: -38, top: 1, length: 5.2, speed: 70, startAngle: 90 }],

  geysers: [
    { x: -1.0, z: -75.5, baseY: 1, radius: 1.1, offset: 0 },
    { x: 1.2, z: -79, baseY: 1, radius: 1.1, offset: 1.07 },
    { x: -0.6, z: -82.5, baseY: 1, radius: 1.1, offset: 2.13 },
  ],

  // Cada aparato después de lo que arregla, en el borde. El centro del muelle queda libre.
  recovery: [
    recovery({ id: 'rec-cerveza', kind: 'refill', x: -4.4, z: 44.8, top: 1 }),
    recovery({ id: 'rec-galletas', kind: 'cat', x: -3.6, z: 4.2, top: 1 }),
    recovery({ id: 'rec-abanicos', kind: 'dry', x: -3.6, z: 20.4, top: 1 }),
    recovery({ id: 'rec-taller', kind: 'bomb', x: 4.2, z: -112.8, top: 5 }),
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
    { id: 'cp-rieles', x: 0, z: -42, w: 8, d: 4, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -42 }, p2: { x: 0.8, y: 1, z: -42 } } },
    { id: 'cp2', x: 0, z: -89, w: 8, d: 5, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -89 }, p2: { x: 0.8, y: 1, z: -89 } } },
  ],

  goal: { x: 0, z: -117.5, w: 8, d: 5, top: 5 },

  signs: [
    { x: -3.6, z: -3, top: 1, w: 3.4, h: 1.5, text: 'TRABAJO EN EQUIPO\n= RESULTADOS', art: 'matias/senal-trabajo-equipo.png' },
    { x: 3.6, z: 90, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: 4.2, z: 50, top: 1, w: 3.0, h: 1.3, text: '¿QUÉ NECESITA\nLA CAJA?', style: 'bar' },
    { x: -3.8, z: 84, top: 1, w: 3, h: 1.4, text: 'NPC EASY\n¡SÁLTENLO JUNTOS!', style: 'info' },
    { x: 3.8, z: 69, top: 1, w: 3, h: 1.4, text: 'NPC MEDIUM\n¡MUÉVANSE JUNTOS!', style: 'warn' },
    { x: -4.6, z: 54, top: 1, w: 3.2, h: 1.4, text: 'NPC HARD\n¡ESQUIVEN Y PASEN!', style: 'warn' },
    { x: -4, z: 39.3, top: 1, w: 3.2, h: 1.4, text: '¡AGUACERO!\nMÉTANSE BAJO LA CARPA', style: 'info' },
    { x: 4, z: 22.3, top: 1, w: 3.4, h: 1.4, text: '¡VIENTO!\nCAMINEN CONTRA LA RÁFAGA', style: 'warn' },
    { x: 3.2, z: -10, top: 1, w: 3.2, h: 1.5, text: '¡CUIDADO QUE\nNO SE CAIGA!', art: 'matias/senal-cuidado-caja.png', style: 'warn' },
    { x: -4.6, z: -34, top: 1, w: 2.8, h: 1.3, text: '¡SALTEN\nJUNTOS!', style: 'warn' },
    { x: 2.9, z: -43, top: 1, w: 3.4, h: 1.3, text: 'CADA UNO SU RIEL\nOBSTÁCULOS DISTINTOS', style: 'info' },
    { x: -2.4, z: -73, top: 1, w: 2.8, h: 1.3, text: '¡NO MOJEN\nLA CAJA!', style: 'warn' },
    { x: -3.2, z: -101.5, top: 2.8, w: 3.2, h: 1.3, text: 'ESPEREN EL\nELEVADOR', style: 'info' },
    { x: -4.6, z: -118.5, top: 5, w: 3.2, h: 1.4, text: 'AQUÍ SE TOMA\nEL RON', art: 'matias/cartel-ron.png', style: 'bar' },
    // Valla publicitaria en el agua (humor local, family friendly).
    { x: -12, z: -40, top: 0, w: 7, h: 3, post: 3.5, text: 'SE BUSCAN AYUDANTES\nPARA CARGAR CAJAS\nPAGO: GRATITUD', art: 'matias/billboard-humor.png', style: 'billboard' },
  ],

  props: [
    { type: 'palm', x: -6.4, z: 95.4, top: 1 },
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
    { type: 'palm', x: 2.4, z: -85, top: 1 },
    { type: 'palm', x: -3.5, z: -91, top: 1 },
    { type: 'palm', x: 5.2, z: -109.5, top: 5 },
    { type: 'palm', x: -5.2, z: -109.5, top: 5 },
    { type: 'bar', x: -4.3, z: -119, top: 5 },
    { type: 'flag', x: 3.5, z: -27, top: 1, checkpoint: 5 },
    { type: 'flag', x: 3.5, z: -41, top: 1, checkpoint: 6 },
    { type: 'flag', x: 3.5, z: -87, top: 1, checkpoint: 7 },
  ],
};

// Modelos Kenney: playa en las islas, pirata en el muelle y la terraza; barcos a ambos lados.
level.scenery = dressLevel(
  level,
  {
    beach: ['inicio', 'isla-easy', 'isla-medium', 'isla-hard', 'isla-lluvia', 'isla-viento', 'tras-hueco'],
    pirate: ['salida', 'cp1', 'rodillo', 'chorros', 'escalon-3', 'terraza'],
  },
  { seed: 1 },
);

export default level;

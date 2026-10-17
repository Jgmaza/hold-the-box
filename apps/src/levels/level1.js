// Nivel 1 — "El Muelle". Avanza hacia -Z; el agua está en y = 0.
//
// Plataformas: centro (x, z), ancho w (X), fondo d (Z), piso a altura `top`.
//   Si no se da `h`, el bloque baja hasta debajo del agua (se ve como un muelle sólido).
// Carteles: `art` = PNG opcional en deliveries/ (si no existe se dibuja `text`).
// Recorrido: inicio → isla easy → isla medium → isla hard (un NPC por isla, unidas por puentes seguros)
//   → muelle → hueco → ferry → CP1 → rodillo → dos tablones → chorros → CP2 → escalones → elevador → bar + META.

export default {
  id: 'muelle',
  name: 'El Muelle',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 57 },
    p2: { x: 0.8, y: 1, z: 57 },
  },

  platforms: [
    // Islas de NPCs (antes del muelle). Cada NPC pasea solo en SU isla; los puentes son zona segura.
    { id: 'inicio', x: 0, z: 58, w: 10, d: 8, top: 1 }, //           z 62 .. 54
    { id: 'puente-easy', x: 0, z: 52.5, w: 4, d: 3, top: 1 }, //     z 54 .. 51
    { id: 'isla-easy', x: 0, z: 45, w: 10, d: 12, top: 1 }, //       z 51 .. 39
    { id: 'puente-medium', x: 0, z: 37.5, w: 4, d: 3, top: 1 }, //   z 39 .. 36
    { id: 'isla-medium', x: 0, z: 30, w: 10, d: 12, top: 1 }, //     z 36 .. 24
    { id: 'puente-hard', x: 0, z: 22.5, w: 4, d: 3, top: 1 }, //     z 24 .. 21
    { id: 'isla-hard', x: 0, z: 15, w: 12, d: 12, top: 1 }, //       z 21 .. 9
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
    { difficulty: 'easy', platform: 'isla-easy', x: 1.5, z: 45 },
    { difficulty: 'medium', platform: 'isla-medium', x: 0, z: 27 },
    { difficulty: 'hard', platform: 'isla-hard', x: 0, z: 14 },
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
    { id: 'cp-medium', x: 0, z: 37.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 37.5 }, p2: { x: 0.8, y: 1, z: 37.5 } } },
    { id: 'cp-hard', x: 0, z: 22.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 22.5 }, p2: { x: 0.8, y: 1, z: 22.5 } } },
    { id: 'cp-salida', x: 0, z: 7.5, w: 4, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: 2 }, p2: { x: 0.8, y: 1, z: 2 } } },
    { id: 'cp1', x: 0, z: -29, w: 8, d: 5, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -29 }, p2: { x: 0.8, y: 1, z: -29 } } },
    { id: 'cp2', x: 0, z: -71, w: 8, d: 5, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -71 }, p2: { x: 0.8, y: 1, z: -71 } } },
  ],

  goal: { x: 0, z: -99.5, w: 8, d: 5, top: 5 },

  signs: [
    { x: -3.6, z: -3, top: 1, w: 3.4, h: 1.5, text: 'TRABAJO EN EQUIPO\n= RESULTADOS', art: 'matias/senal-trabajo-equipo.png' },
    { x: 3.6, z: 56, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -3.8, z: 50, top: 1, w: 3, h: 1.4, text: 'NPC EASY\n¡SÁLTENLO JUNTOS!', style: 'info' },
    { x: 3.8, z: 35, top: 1, w: 3, h: 1.4, text: 'NPC MEDIUM\n¡MUÉVANSE JUNTOS!', style: 'warn' },
    { x: -4.6, z: 20, top: 1, w: 3.2, h: 1.4, text: 'NPC HARD\n¡ESQUIVEN Y PASEN!', style: 'warn' },
    { x: 3.2, z: -10, top: 1, w: 3.2, h: 1.5, text: '¡CUIDADO QUE\nNO SE CAIGA!', art: 'matias/senal-cuidado-caja.png', style: 'warn' },
    { x: -4.6, z: -34, top: 1, w: 2.8, h: 1.3, text: '¡SALTEN\nJUNTOS!', style: 'warn' },
    { x: 2.9, z: -43, top: 1, w: 2.8, h: 1.2, text: 'UNO POR TABLÓN', style: 'info' },
    { x: -2.4, z: -55, top: 1, w: 2.8, h: 1.3, text: '¡NO MOJEN\nLA CAJA!', style: 'warn' },
    { x: -3.2, z: -83.5, top: 2.8, w: 3.2, h: 1.3, text: 'ESPEREN EL\nELEVADOR', style: 'info' },
    { x: -4.6, z: -100.5, top: 5, w: 3.2, h: 1.4, text: 'AQUÍ SE TOMA\nEL RON', art: 'matias/cartel-ron.png', style: 'bar' },
    // Valla publicitaria en el agua (humor local, family friendly).
    { x: -12, z: -40, top: 0, w: 7, h: 3, post: 3.5, text: 'SE BUSCAN AYUDANTES\nPARA CARGAR CAJAS\nPAGO: GRATITUD', art: 'matias/billboard-humor.png', style: 'billboard' },
  ],

  props: [
    { type: 'palm', x: -4.2, z: 60.5, top: 1 },
    { type: 'palm', x: 4.2, z: 40, top: 1 },
    { type: 'palm', x: -4.2, z: 25, top: 1 },
    { type: 'palm', x: 5.2, z: 10, top: 1 },
    { type: 'flag', x: 3, z: 35.2, top: 1, checkpoint: 0 },
    { type: 'flag', x: 3, z: 20.2, top: 1, checkpoint: 1 },
    { type: 'flag', x: 3.5, z: 4.5, top: 1, checkpoint: 2 },
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
    { type: 'flag', x: 3.5, z: -27, top: 1, checkpoint: 3 },
    { type: 'flag', x: 3.5, z: -69, top: 1, checkpoint: 4 },
  ],
};

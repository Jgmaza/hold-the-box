// Fixture de tests: arena de NPCs (easy → medium → hard). Ya no es un mapa del juego.
// Avanza hacia -Z; el agua está en y = 0 (a los lados). Cada zona tiene NPCs de una dificultad:
//   salida → zona easy (cangrejos) → CP → zona medium (pistolas de agua) → CP → zona hard (perro) → META.
// Los NPCs se quedan en SU plataforma (campo `platform` = id) y pasean al azar dentro de ella.

export default {
  id: 'npc-arena',
  name: 'Arena NPC',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 1.5 },
    p2: { x: 0.8, y: 1, z: 1.5 },
  },

  // Plataformas pegadas (mismo `top`): se camina de una a otra sin saltar.
  platforms: [
    { id: 'salida', x: 0, z: 0, w: 10, d: 8, top: 1 }, //               z  4 .. -4
    { id: 'zona-easy', x: 0, z: -10, w: 10, d: 12, top: 1 }, //         z -4 .. -16
    { id: 'zona-medium', x: 0, z: -23, w: 10, d: 14, top: 1 }, //       z -16 .. -30
    { id: 'zona-hard', x: 0, z: -38, w: 12, d: 16, top: 1 }, //         z -30 .. -46
    { id: 'llegada', x: 0, z: -51, w: 8, d: 10, top: 1 }, //            z -46 .. -56
  ],

  npcs: [
    { difficulty: 'easy', platform: 'zona-easy', x: -2.5, z: -8 },
    { difficulty: 'easy', platform: 'zona-easy', x: 2.5, z: -12.5 },
    { difficulty: 'medium', platform: 'zona-medium', x: 3, z: -21.5 },
    { difficulty: 'medium', platform: 'zona-medium', x: -3, z: -26.5 },
    { difficulty: 'hard', platform: 'zona-hard', x: 0, z: -41 },
  ],

  checkpoints: [
    { id: 'cp-medium', x: 0, z: -17.5, w: 10, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -17.5 }, p2: { x: 0.8, y: 1, z: -17.5 } } },
    { id: 'cp-hard', x: 0, z: -31.5, w: 12, d: 3, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -31.5 }, p2: { x: 0.8, y: 1, z: -31.5 } } },
  ],

  goal: { x: 0, z: -52, w: 6, d: 5, top: 1 },

  signs: [
    { x: 3.6, z: 0, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -4, z: -4.5, top: 1, w: 3, h: 1.4, text: 'NPC EASY\n¡SÁLTENLO JUNTOS!', style: 'info' },
    { x: 4, z: -16.5, top: 1, w: 3, h: 1.4, text: 'NPC MEDIUM\n¡MUÉVANSE JUNTOS!', style: 'warn' },
    { x: -4.6, z: -30.5, top: 1, w: 3.2, h: 1.4, text: 'NPC HARD\n¡ESQUIVEN Y PASEN!', style: 'warn' },
  ],

  props: [
    { type: 'palm', x: -4.3, z: 2.5, top: 1 },
    { type: 'palm', x: 4.4, z: -45, top: 1 },
    { type: 'palm', x: -3.4, z: -54.5, top: 1 },
    { type: 'flag', x: 4.3, z: -18.5, top: 1, checkpoint: 0 },
    { type: 'flag', x: 5.2, z: -32.5, top: 1, checkpoint: 1 },
  ],
};

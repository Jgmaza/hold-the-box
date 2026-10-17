// Fixture de tests: arena de rieles asimétricos. Ya no es un mapa del juego.
// Pad de entrada → rieles 28 m (P1 piedras/hueco, P2 hueco/tope/piedra) → pad de salida + META.
// Ver docs/rieles.md.

import { railsPair } from '../../src/levels/sections.js';

export default {
  id: 'rails-arena',
  name: 'Arena Rieles',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 2 },
    p2: { x: 0.8, y: 1, z: 2 },
  },

  platforms: [
    { id: 'entrada', x: 0, z: 0, w: 8, d: 8, top: 1 }, //              z  4 .. -4
    ...railsPair({ id: 'rieles', from: -4, length: 28 }), //           z -4 .. -32
    { id: 'salida', x: 0, z: -36, w: 8, d: 8, top: 1 }, //             z -32 .. -40
  ],

  checkpoints: [
    { id: 'cp-rieles', x: 0, z: -2, w: 8, d: 4, top: 1, spawn: { p1: { x: -0.8, y: 1, z: -2 }, p2: { x: 0.8, y: 1, z: -2 } } },
  ],

  goal: { x: 0, z: -37, w: 6, d: 5, top: 1 },

  signs: [
    { x: 3.2, z: 1.5, top: 1, w: 3.2, h: 1.4, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -3.2, z: -3.2, top: 1, w: 3.4, h: 1.3, text: 'CADA UNO SU RIEL\nOBSTÁCULOS DISTINTOS', style: 'warn' },
  ],

  props: [
    { type: 'flag', x: 3.2, z: -1.5, top: 1, checkpoint: 0 },
    { type: 'palm', x: -3.5, z: 2.5, top: 1 },
    { type: 'palm', x: 3.5, z: -38, top: 1 },
  ],
};

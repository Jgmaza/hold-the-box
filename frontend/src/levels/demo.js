// Nivel corto para /gameplay: look de El Muelle + cangrejo y perro, un salto y META en bucle.

import { dressLevel } from './sections.js';

const level = {
  id: 'demo',
  name: 'Paseo demo',
  waterLevel: 0,
  theme: 'beach',

  spawn: {
    p1: { x: -0.8, y: 1, z: 38 },
    p2: { x: 0.8, y: 1, z: 38 },
  },

  platforms: [
    { id: 'inicio', x: 0, z: 36, w: 12, d: 8, top: 1 }, // z 40 .. 32
    { id: 'puente-easy', x: 0, z: 30.5, w: 4, d: 3, top: 1 }, // z 32 .. 29
    { id: 'isla-easy', x: 0, z: 23, w: 10, d: 12, top: 1 }, // z 29 .. 17 — cangrejo
    { id: 'puente-hard', x: 0, z: 15.5, w: 4, d: 3, top: 1 }, // z 17 .. 14
    { id: 'isla-hard', x: 0, z: 8, w: 12, d: 12, top: 1 }, // z 14 .. 2 — perro
    { id: 'puente-salida', x: 0, z: 0.5, w: 4, d: 3, top: 1 }, // z 2 .. -1
    // Hueco ~2.5 m
    { id: 'llegada', x: 0, z: -10, w: 12, d: 16, top: 1 }, // z -2 .. -18
  ],

  moving: [],

  npcs: [
    { difficulty: 'easy', platform: 'isla-easy', x: 1.2, z: 23 },
    { difficulty: 'hard', platform: 'isla-hard', x: 0, z: 7 },
  ],

  sweepers: [],
  geysers: [],
  recovery: [],
  checkpoints: [
    {
      id: 'cp-easy',
      x: 0,
      z: 30.5,
      w: 4,
      d: 3,
      top: 1,
      spawn: { p1: { x: -0.8, y: 1, z: 30.5 }, p2: { x: 0.8, y: 1, z: 30.5 } },
    },
    {
      id: 'cp-hard',
      x: 0,
      z: 15.5,
      w: 4,
      d: 3,
      top: 1,
      spawn: { p1: { x: -0.8, y: 1, z: 15.5 }, p2: { x: 0.8, y: 1, z: 15.5 } },
    },
  ],

  goal: { x: 0, z: -15, w: 8, d: 4, top: 1 },

  signs: [
    { x: 3.6, z: 38, top: 1, w: 3.2, h: 1.4, text: 'DEMO\nEN BUCLE', style: 'info' },
    { x: -3.8, z: 28, top: 1, w: 3, h: 1.4, text: 'CANGREJO\n¡SÁLTENLO!', style: 'info' },
    { x: 3.8, z: 14, top: 1, w: 3.2, h: 1.4, text: '¡EL PERRO!\nPASEN JUNTOS', style: 'warn' },
    { x: -3.4, z: 1, top: 1, w: 3, h: 1.3, text: '¡SALTEN\nJUNTOS!', style: 'warn' },
    { x: 3.2, z: -14, top: 1, w: 3.2, h: 1.4, text: 'AQUÍ SE TOMA\nEL RON', art: 'matias/cartel-ron.png', style: 'bar' },
  ],

  props: [
    { type: 'palm', x: -5.5, z: 38, top: 1 },
    { type: 'palm', x: 5.2, z: 34, top: 1 },
    { type: 'palm', x: -4.5, z: 22, top: 1 },
    { type: 'palm', x: 4.8, z: 20, top: 1 },
    { type: 'palm', x: -5, z: 8, top: 1 },
    { type: 'palm', x: 5, z: 6, top: 1 },
    { type: 'palm', x: -5.2, z: -16, top: 1 },
    { type: 'palm', x: 5.2, z: -16, top: 1 },
    { type: 'bar', x: -4.2, z: -16.5, top: 1 },
    { type: 'flag', x: 3.2, z: 29.5, top: 1, checkpoint: 0 },
    { type: 'flag', x: 3.2, z: 14.5, top: 1, checkpoint: 1 },
    { type: 'flag', x: 3.2, z: -13.5, top: 1, checkpoint: 0 },
  ],
};

level.scenery = dressLevel(
  level,
  {
    beach: ['inicio', 'isla-easy', 'isla-hard'],
    pirate: ['llegada'],
  },
  { seed: 7 },
);

export default level;

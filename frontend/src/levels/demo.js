// Nivel corto para el bucle de presentación en /gameplay.
// Copia el look de El Muelle (playa + muelle) sin NPCs ni clima: caminar, un salto y META.

import { dressLevel } from './sections.js';

const level = {
  id: 'demo',
  name: 'Paseo demo',
  waterLevel: 0,
  theme: 'beach',

  spawn: {
    p1: { x: -0.8, y: 1, z: 16 },
    p2: { x: 0.8, y: 1, z: 16 },
  },

  platforms: [
    { id: 'inicio', x: 0, z: 12, w: 12, d: 16, top: 1 }, // z 20 .. 4
    // Hueco ~2.5 m (como en el muelle): hay que saltar juntos.
    { id: 'llegada', x: 0, z: -6, w: 12, d: 16, top: 1 }, // z 2 .. -14
  ],

  moving: [],
  npcs: [],
  sweepers: [],
  geysers: [],
  recovery: [],
  checkpoints: [
    {
      id: 'cp-inicio',
      x: 0,
      z: 12,
      w: 8,
      d: 4,
      top: 1,
      spawn: { p1: { x: -0.8, y: 1, z: 12 }, p2: { x: 0.8, y: 1, z: 12 } },
    },
  ],

  goal: { x: 0, z: -11, w: 8, d: 4, top: 1 },

  signs: [
    { x: 3.6, z: 16, top: 1, w: 3.2, h: 1.4, text: 'DEMO\nEN BUCLE', style: 'info' },
    { x: -3.4, z: 5, top: 1, w: 3, h: 1.3, text: '¡SALTEN\nJUNTOS!', style: 'warn' },
    { x: 3.2, z: -10, top: 1, w: 3.2, h: 1.4, text: 'AQUÍ SE TOMA\nEL RON', art: 'matias/cartel-ron.png', style: 'bar' },
  ],

  props: [
    { type: 'palm', x: -5.5, z: 18, top: 1 },
    { type: 'palm', x: 5.2, z: 14, top: 1 },
    { type: 'palm', x: -5, z: 6, top: 1 },
    { type: 'palm', x: 5, z: -2, top: 1 },
    { type: 'palm', x: -5.2, z: -12, top: 1 },
    { type: 'palm', x: 5.2, z: -12, top: 1 },
    { type: 'bar', x: -4.2, z: -12.5, top: 1 },
    { type: 'flag', x: 3.2, z: -9.5, top: 1, checkpoint: 0 },
  ],
};

level.scenery = dressLevel(level, { beach: ['inicio'], pirate: ['llegada'] }, { seed: 7 });

export default level;

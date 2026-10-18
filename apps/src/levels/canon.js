// Desierto 3 — "El Cañón". Viento, un tablón que va y viene, y el elevador hasta la mina.
// El coyote queda en su risco: el inicio es zona segura.

import { windIsland } from './sections.js';

const TOP = 2.6;
const GROUND = 2.48;

const sand = (p) => ({ ...p, skin: 'sand', h: p.h ?? 0.2 });
const cp = (id, z, top = TOP, { w = 4, d = 3 } = {}) =>
  sand({
    id,
    x: 0,
    z,
    w,
    d,
    top,
    spawn: { p1: { x: -0.8, y: top, z }, p2: { x: 0.8, y: top, z } },
  });

const level = {
  id: 'canon',
  name: 'El Cañón',
  theme: 'desert',
  biome: 'chasm',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: TOP, z: 18 },
    p2: { x: 0.8, y: TOP, z: 18 },
  },

  platforms: [
    { id: 'suelo-inicio', x: 0, z: 22.25, w: 14, d: 67.5, top: GROUND, h: 2.6, kind: 'ground' },
    { id: 'suelo-fin', x: 0, z: -46.4, w: 14, d: 47.2, top: GROUND, h: 2.6, kind: 'ground' },
    sand({ id: 'plaza-inicio', x: 0, z: 32, w: 12, d: 40, top: TOP }),
    sand({ id: 'enlace', x: 0, z: 11, w: 6, d: 3, top: TOP }),
    sand({ id: 'risco', x: 0, z: 6, w: 10, d: 8, top: TOP }),
    sand({ id: 'camino', x: 0, z: 1, w: 6, d: 3, top: TOP }),
    sand({ ...windIsland({ id: 'isla-viento', from: 0, length: 12, dir: 'alternate', width: 10, top: TOP }), h: 0.2 }),
    sand({ id: 'antes', x: 0, z: -13.2, w: 7, d: 3, top: TOP }),
    sand({ id: 'tras', x: 0, z: -24.5, w: 8, d: 5, top: TOP }),
    sand({ id: 'lip', x: 0, z: -28.2, w: 6, d: 3, top: TOP }),
    sand({ id: 'terraza', x: 0, z: -38, w: 12, d: 16, top: 5.2 }),
  ],

  moving: [
    { id: 'tablon', x: 0, z: -16, w: 5, d: 4, top: TOP, to: { z: -22 }, period: 7 },
    { id: 'elevador', x: 0, z: -31, w: 5, d: 5, top: TOP, to: { top: 5.2 }, period: 7 },
  ],

  npcs: [{ difficulty: 'hard', platform: 'risco', x: 0.2, z: 6 }],

  checkpoints: [cp('cp-risco', 11), cp('cp-viento', 1), cp('cp-vacio', -13.2, TOP, { w: 6, d: 3 }), cp('cp-subida', -28.2)],

  goal: { x: 0, z: -44, w: 8, d: 5, top: 5.2 },

  signs: [
    { x: 4.6, z: 20, top: TOP, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -4.8, z: 8, top: TOP, w: 3.2, h: 1.4, text: 'COYOTE\n¡NO SE QUEDEN!', style: 'warn' },
    { x: 4.6, z: -2, top: TOP, w: 3.2, h: 1.3, text: '¡VIENTO!\nCAMINEN JUNTOS', style: 'warn' },
    { x: -3.6, z: -12.2, top: TOP, w: 3.4, h: 1.4, text: 'EL TABLÓN VA\nY VIENE', style: 'info' },
    { x: 3.4, z: -27.2, top: TOP, w: 3.2, h: 1.3, text: 'ESPEREN EL\nELEVADOR', style: 'info' },
    { x: -4.6, z: -44.4, top: 5.2, w: 3.2, h: 1.4, text: '¡EL ORO\nNO SE LLEVA SOLO!', style: 'bar' },
  ],

  props: [
    { type: 'flag', x: 2.8, z: 9.8, top: TOP, checkpoint: 0 },
    { type: 'flag', x: 2.8, z: -0.2, top: TOP, checkpoint: 1 },
    { type: 'flag', x: 3, z: -14.2, top: TOP, checkpoint: 2 },
    { type: 'flag', x: 2.8, z: -29.2, top: TOP, checkpoint: 3 },
    { type: 'cactus', x: 6.3, z: 28, top: GROUND, h: 1.8 },
    { type: 'cactus', x: -6.2, z: 16, top: GROUND, h: 1.4 },
    { type: 'cactus', x: 6.4, z: -26, top: GROUND, h: 1.7 },
    { type: 'mine', x: 0, z: -45.6, top: 5.2, yaw: 180 },
  ],
};

level.pit = { z0: -22.8, z1: -11.5 };

level.scenery = [
  { art: 'nature/tent_detailedOpen', x: -6.2, z: 30, top: GROUND, yaw: 70, s: 1.6 },
  { art: 'nature/rock_largeA', x: 6.3, z: -38, top: 5.2, yaw: -12, s: 2.2 },
  { art: 'town/lantern', x: -4.6, z: 22, top: TOP, yaw: 0, s: 1.8 },
  { art: 'town/banner-red', x: 4.8, z: 24, top: TOP, yaw: -16, s: 1.7, motion: 'sway' },
  { art: 'nature/campfire_stones', x: -4.5, z: -38, top: 5.2, yaw: 8, s: 2.6, motion: 'fire' },
  { art: 'town/lantern', x: 4.4, z: -40, top: 5.2, yaw: 0, s: 1.7 },
];

export default level;

// Desierto 2 — "La Mina". Grúas, rieles de vagoneta y el coyote antes de la boca.
//   minero → grúas → rieles (cada uno salta lo suyo) → coyote → boca de la mina.

import { railsPair } from './sections.js';

const GROUND = 0.88;
const TOP = 1;
const RAIL_FROM = 2;
const RAIL_LEN = 22;

const sand = (p) => ({ ...p, skin: 'sand', h: p.h ?? 0.18 });
const cp = (id, z, { w = 4, d = 3 } = {}) =>
  sand({
    id,
    x: 0,
    z,
    w,
    d,
    top: TOP,
    spawn: { p1: { x: -0.8, y: TOP, z }, p2: { x: 0.8, y: TOP, z } },
  });

const level = {
  id: 'mina',
  name: 'La Mina',
  theme: 'desert',
  biome: 'mine',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: TOP, z: 30 },
    p2: { x: 0.8, y: TOP, z: 30 },
  },

  platforms: [
    { id: 'suelo-norte', x: 0, z: 29.75, w: 14, d: 56.5, top: GROUND, h: 1.5, kind: 'ground' },
    { id: 'suelo-sur', x: 0, z: -46.1, w: 14, d: 51.8, top: GROUND, h: 1.5, kind: 'ground' },
    sand({ id: 'calle', x: 0, z: 36, w: 10, d: 32, top: TOP }),
    sand({ id: 'enlace', x: 0, z: 18.5, w: 6, d: 4, top: TOP }),
    sand({ id: 'plaza-medium', x: 0, z: 12, w: 12, d: 10, top: TOP }),
    sand({ id: 'grua', x: 0, z: 4.2, w: 10, d: 6, top: TOP }),
    ...railsPair({ id: 'rieles', from: RAIL_FROM, length: RAIL_LEN, hazards: 4, top: TOP }),
    sand({ id: 'salida', x: 0, z: -23, w: 8, d: 7, top: TOP }),
    sand({ id: 'enlace-2', x: 0, z: -28.6, w: 6, d: 5, top: TOP }),
    sand({ id: 'plaza-hard', x: 0, z: -36, w: 12, d: 12, top: TOP }),
    sand({ id: 'enlace-3', x: 0, z: -43.2, w: 6, d: 3.6, top: TOP }),
    sand({ id: 'meta', x: 0, z: -50, w: 12, d: 12, top: TOP }),
  ],

  sweepers: [
    { id: 'grua-1', x: 0, z: 5.2, top: TOP, length: 3.6, speed: 55, startAngle: 80 },
    { id: 'grua-2', x: 0, z: 3.2, top: TOP, length: 3.6, speed: -60, startAngle: 10 },
  ],

  npcs: [
    { difficulty: 'medium', platform: 'plaza-medium', x: 0.8, z: 12 },
    { difficulty: 'hard', platform: 'plaza-hard', x: 0.2, z: -36 },
  ],

  checkpoints: [cp('cp-enlace', 18.5), cp('cp-salida', -23, { w: 6, d: 4 }), cp('cp-boca', -43.2)],

  goal: { x: 0, z: -54, w: 8, d: 5, top: TOP },

  signs: [
    { x: 4.2, z: 32, top: TOP, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -4.6, z: 14, top: TOP, w: 3.2, h: 1.4, text: '¡EL MINERO\nTIRA AGUA!', style: 'warn' },
    { x: 4.6, z: 6.4, top: TOP, w: 3.2, h: 1.4, text: 'GRÚAS\n¡SALTE JUNTOS!', style: 'warn' },
    { x: -4.2, z: 1.2, top: TOP, w: 3.4, h: 1.5, text: 'RIELES\nCADA UNO LO SUYO', style: 'info' },
    { x: 4.4, z: -32, top: TOP, w: 3.2, h: 1.4, text: 'COYOTE\n¡NO SE QUEDEN!', style: 'warn' },
    { x: -4.6, z: -54.2, top: TOP, w: 3.2, h: 1.3, text: 'LA MINA\nTE ESPERA', style: 'bar' },
  ],

  props: [
    { type: 'flag', x: 2.6, z: 17.2, top: TOP, checkpoint: 0 },
    { type: 'flag', x: 3.2, z: -24.4, top: TOP, checkpoint: 1 },
    { type: 'flag', x: 2.8, z: -44.4, top: TOP, checkpoint: 2 },
    { type: 'cactus', x: 6.2, z: 34, top: GROUND, h: 1.6 },
    { type: 'cactus', x: -6.3, z: 22, top: GROUND, h: 1.9 },
    { type: 'cactus', x: 6.4, z: -30, top: GROUND, h: 1.5 },
    { type: 'mine', x: 0, z: -55.2, top: TOP, yaw: 180 },
  ],
};

level.pit = { z0: -20.2, z1: 1.5 };

level.scenery = [
  { art: 'nature/tent_detailedOpen', x: -6.2, z: 12, top: GROUND, yaw: 80, s: 1.6 },
  { art: 'nature/rock_largeA', x: 6.3, z: -36, top: GROUND, yaw: 18, s: 2.4 },
  { art: 'town/lantern', x: -4.5, z: 33, top: TOP, yaw: 8, s: 1.8 },
  { art: 'town/lantern', x: 4.5, z: 14, top: TOP, yaw: -6, s: 1.7 },
  { art: 'nature/campfire_stones', x: -4.6, z: 10, top: TOP, yaw: 0, s: 2.8, motion: 'fire' },
  { art: 'town/banner-red', x: 4.6, z: -48, top: TOP, yaw: 14, s: 1.65, motion: 'sway' },
  { art: 'town/lantern', x: -4.4, z: -50, top: TOP, yaw: 0, s: 1.8 },
];

export default level;

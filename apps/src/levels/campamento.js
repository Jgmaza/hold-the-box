// Desierto 1 — "El Campamento".
// El arranque es un pasillo de arena, como el dibujo: cactus, tinajas, arco.
// Después se parte. El carril ancho es trampa y se corta. El bueno es más estrecho
// y hay que escorarse juntos para no rozar los cactus. Nadie dice cuál es cuál.
import { dressPathRim } from './sections.js';

const TOP = 1;

const sand = (p) => ({ ...p, skin: 'sand', h: p.h ?? 0.18 });
const cp = (id, z, { w = 5, d = 3 } = {}) =>
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
  id: 'campamento',
  name: 'El Campamento',
  theme: 'desert',
  biome: 'camp',
  maze: true,
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: TOP, z: 44 },
    p2: { x: 0.8, y: TOP, z: 44 },
  },

  platforms: [
    sand({ id: 'calle', x: 0, z: 48, w: 8, d: 24, top: TOP }),
    sand({ id: 'boca', x: 0, z: 33, w: 12, d: 8, top: TOP }),
    sand({ id: 'carril-izq', x: -3.1, z: 21.3, w: 5.2, d: 16.6, top: TOP }),
    sand({ id: 'trampa-der', x: 3.2, z: 24.2, w: 5.6, d: 10.4, top: TOP }),
    sand({ id: 'cruce', x: 0, z: 10, w: 12, d: 8, top: TOP }),
    sand({ id: 'boca-2', x: 0, z: 4, w: 12, d: 6, top: TOP }),
    sand({ id: 'trampa-izq', x: -3.2, z: -2, w: 5.6, d: 8, top: TOP }),
    sand({ id: 'carril-der', x: 3.1, z: -4.3, w: 5.2, d: 14.6, top: TOP }),
    sand({ id: 'boca-3', x: 0, z: -14, w: 10, d: 6, top: TOP }),
    sand({ id: 'calle-fina', x: 0, z: -24.8, w: 5.4, d: 17, top: TOP }),
    sand({ id: 'plaza-meta', x: 0, z: -40, w: 12, d: 16, top: TOP }),
  ],

  cacti: [
    { x: -3.55, z: 52, h: 3.5, kind: 'saguaro' },
    { x: 3.6, z: 50, h: 3.2, kind: 'saguaro', yaw: 20 },
    { x: -3.3, z: 47.2, h: 0.75, kind: 'barrel' },
    { x: 3.35, z: 46.4, h: 1.05, kind: 'pear' },
    { x: -3.5, z: 41, h: 2.6, kind: 'saguaro', yaw: -12 },
    { x: 3.45, z: 38.5, h: 0.65, kind: 'barrel' },

    { x: 3.2, z: 26.2, hostile: true, h: 2.6 },
    { x: 3.2, z: 23.2, hostile: true, h: 2.3, kind: 'saguaro' },
    { x: 3.2, z: 20.4, hostile: true, h: 2.5 },

    { x: -4.35, z: 25, hostile: true, h: 2.4 },
    { x: -1.85, z: 20.5, hostile: true, h: 2.2 },
    { x: -4.35, z: 16, hostile: true, h: 2.5 },

    { x: -3.2, z: 0.4, hostile: true, h: 2.4 },
    { x: -3.2, z: -2.6, hostile: true, h: 2.6 },

    { x: 1.85, z: -1, hostile: true, h: 2.3 },
    { x: 4.35, z: -5.5, hostile: true, h: 2.5 },
    { x: 1.85, z: -9, hostile: true, h: 2.2 },

    { x: -1.7, z: -20, hostile: true, h: 2.4 },
    { x: 1.7, z: -24.5, hostile: true, h: 2.6 },
    { x: -1.7, z: -28.5, hostile: true, h: 2.3 },

    { x: -4.6, z: -38, h: 3.1, kind: 'saguaro' },
    { x: 4.5, z: -36, h: 0.8, kind: 'barrel' },
    { x: 4.2, z: -42, h: 1.1, kind: 'pear' },
  ],

  checkpoints: [cp('cp-cruce', 10), cp('cp-segunda', -14, { w: 6, d: 4 }), cp('cp-meta', -36, { w: 6, d: 4 })],

  goal: { x: 0, z: -44, w: 8, d: 5, top: TOP },

  signs: [
    { x: 3.2, z: 46, top: TOP, w: 3.3, h: 1.45, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -3.3, z: 34.2, top: TOP, w: 3.5, h: 1.65, text: '¡CUIDADO!\nCACTUS QUE PINCHAN\nY DAÑAN LA CAJA', style: 'warn' },
    { x: 0, z: 30.2, top: TOP, w: 3.4, h: 1.35, text: 'UN CAMINO PINCHA\nY SE CORTA', style: 'warn' },
    { x: -3.4, z: -44.2, top: TOP, w: 3.2, h: 1.3, text: 'CAMPAMENTO\nDEL ORO', style: 'bar' },
  ],

  props: [
    { type: 'flag', x: 4.2, z: 8.6, top: TOP, checkpoint: 0 },
    { type: 'flag', x: 3.6, z: -15.4, top: TOP, checkpoint: 1 },
    { type: 'flag', x: 2.4, z: -34.2, top: TOP, checkpoint: 2 },
    { type: 'lamp', x: -3.35, z: 43.2, top: TOP },
    { type: 'pot', x: -3.45, z: 49.5, top: TOP, h: 2.2 },
    { type: 'pot', x: 3.5, z: 41.2, top: TOP, h: 1.8 },
    { type: 'pot', x: -3.4, z: 28.4, top: TOP, h: 1.5 },
    { type: 'pot', x: 2.15, z: -27, top: TOP, h: 1.9 },
    { type: 'deadTree', x: -3.5, z: 55, top: TOP, h: 3.6, yaw: 18 },
    { type: 'deadTree', x: 3.55, z: 47.5, top: TOP, h: 3.2, yaw: -24 },
    { type: 'deadTree', x: 4.6, z: 23, top: TOP, h: 2.9, yaw: 10 },
    { type: 'arch', x: 3.15, z: 36.2, top: TOP, w: 4.4, h: 3.6 },
    { type: 'rock', x: -3.5, z: 32.4, top: TOP, size: 1.3 },
    { type: 'rock', x: 3.4, z: -10.5, top: TOP, size: 1.15 },
  ],
};

const camp = [
  { art: 'nature/tent_detailedOpen', x: -4.75, z: 34.6, top: TOP, yaw: 18, s: 2.3 },
  { art: 'nature/tent_detailedOpen', x: 4.85, z: 31.8, top: TOP, yaw: -150, s: 2.2 },
  { art: 'nature/campfire_stones', x: -2.55, z: 50.2, top: TOP, yaw: 12, s: 2.7, motion: 'fire' },
  { art: 'nature/stump_round', x: -3.35, z: 51.1, top: TOP, yaw: 20, s: 2.2 },
  { art: 'nature/log', x: -3.45, z: 49.1, top: TOP, yaw: 42, s: 2.05 },
  { art: 'town/lantern', x: 3.35, z: 53.4, top: TOP, yaw: -8, s: 1.2 },
  { art: 'town/lantern', x: -3.4, z: 42.6, top: TOP, yaw: 10, s: 1.18 },
  { art: 'nature/pot_large', x: 3.4, z: 55.6, top: TOP, yaw: 25, s: 2.2 },
  { art: 'nature/pot_small', x: -3.35, z: 37.4, top: TOP, yaw: -12, s: 2.15 },
  { art: 'nature/rock_largeA', x: 3.45, z: 57.2, top: TOP, yaw: 16, s: 1.85 },
  { art: 'nature/rock_tallB', x: -3.5, z: 58.4, top: TOP, yaw: -20, s: 1.7 },
  { art: 'nature/fence_simple', x: -3.55, z: 47.6, top: TOP, yaw: 90, s: 1.8 },
  { art: 'nature/campfire_stones', x: -2.7, z: -37.6, top: TOP, yaw: 0, s: 2.8, motion: 'fire' },
  { art: 'town/banner-red', x: 3.7, z: -40.2, top: TOP, yaw: -14, s: 1.65, motion: 'sway' },
  { art: 'town/cart', x: 4.6, z: -36.4, top: TOP, yaw: -22, s: 1.4 },
  { art: 'nature/tent_detailedOpen', x: -4.7, z: -42.2, top: TOP, yaw: 8, s: 2.25 },
  { art: 'nature/log_large', x: 3.5, z: 8.4, top: TOP, yaw: 70, s: 1.7 },
];

level.scenery = [
  ...camp,
  ...dressPathRim(level, {
    set: 'desert',
    seed: 19,
    keepOut: camp.map((s) => ({ x: s.x, z: s.z, r: 1.6 })),
  }),
];

export default level;

// Selva 3 — "El Puente". Risco, viento, dos puentes de vidrio sobre la catarata, ofrenda al otro lado.

import { dressBanks, glassBridge, windIsland } from './sections.js';

const TOP = 2.6;
const stone = (p) => ({ ...p, skin: 'stone' });
const cp = (id, z, top = TOP, { w = 4, d = 3 } = {}) =>
  stone({
    id,
    x: 0,
    z,
    w,
    d,
    top,
    spawn: { p1: { x: -0.8, y: top, z }, p2: { x: 0.8, y: top, z } },
  });

const level = {
  id: 'puente',
  name: 'El Puente',
  theme: 'jungle',
  biome: 'canyon',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: TOP, z: 14 },
    p2: { x: 0.8, y: TOP, z: 14 },
  },

  platforms: [
    // Meseta angosta: a los lados, el valle de la aldea. En el tramo del vidrio no hay suelo.
    { id: 'suelo-inicio', x: 0, z: 22.5, w: 26, d: 67, top: 2.48, h: 2.6, kind: 'ground' },
    { id: 'suelo-fin', x: 0, z: -63, w: 26, d: 40, top: 2.48, h: 2.6, kind: 'ground' },
    stone({ id: 'plaza-inicio', x: 0, z: 28, w: 12, d: 44, top: TOP, h: 0.2 }),
    stone({ id: 'risco', x: 0, z: 2.5, w: 12, d: 9, top: TOP, h: 0.2 }),
    stone({ ...windIsland({ id: 'isla-viento', from: 6, length: 14, dir: 'alternate', top: TOP }), h: 0.2 }),
    stone({ id: 'antes-puente', x: 0, z: -9.5, w: 8, d: 3, top: TOP, h: 0.2 }),
    ...glassBridge({ from: -11, rows: 8, gap: 0.91, panelD: 2.85, top: TOP, seed: 19 }).panels,
    stone({ id: 'tras-puente', x: 0, z: -45, w: 8, d: 6, top: TOP, h: 0.2 }),
    stone({ id: 'escalon-1', x: 0, z: -49.5, w: 8, d: 3, top: 3.3, h: 0.2 }),
    stone({ id: 'escalon-2', x: 0, z: -52.5, w: 8, d: 3, top: 4.0, h: 0.2 }),
    stone({ id: 'terraza', x: 0, z: -64, w: 12, d: 14, top: 6, h: 0.22 }),
  ],

  moving: [{ id: 'elevador', x: 0, z: -56.5, w: 5, d: 5, top: 4.0, to: { top: 6 }, period: 7 }],

  npcs: [{ difficulty: 'hard', platform: 'risco', x: 0.2, z: 2 }],

  checkpoints: [cp('cp-viento', 5.5, TOP, { w: 8, d: 3 }), cp('cp-cuerdas', -9.5), cp('cp-tras', -45, TOP, { w: 8, d: 5 })],

  goal: { x: 0, z: -68, w: 8, d: 5, top: 6 },

  signs: [
    { x: 4.6, z: 16, top: TOP, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -5.0, z: 8, top: TOP, w: 3.2, h: 1.4, text: 'JAGUAR\n¡NO SE QUEDEN!', style: 'warn' },
    { x: 4.8, z: 4, top: TOP, w: 3.2, h: 1.3, text: '¡VIENTO!\nCAMINEN JUNTOS', style: 'warn' },
    { x: -3.6, z: -8.6, top: TOP, w: 3.4, h: 1.5, text: 'DOS PUENTES\n¡SALTE JUNTOS!', style: 'info' },
    { x: 3.6, z: -8.6, top: TOP, w: 3.4, h: 1.5, text: 'UN VIDRIO AGUANTA\nEL OTRO SE ROMPE', style: 'warn' },
    { x: 3.4, z: -53, top: 4.0, w: 3.2, h: 1.3, text: 'ESPEREN EL\nELEVADOR', style: 'info' },
    { x: -4.8, z: -68.5, top: 6, w: 3.2, h: 1.4, text: 'AQUÍ SE DEJA\nLA OFRENDA', style: 'bar' },
  ],

  props: [
    { type: 'flag', x: 3.4, z: 4.2, top: TOP, checkpoint: 0 },
    { type: 'flag', x: 3.4, z: -10.8, top: TOP, checkpoint: 1 },
    { type: 'flag', x: 3.4, z: -43.8, top: TOP, checkpoint: 2 },

    { type: 'cliff', x: -7.2, z: 10, top: 0, height: 3.4, w: 2.2, d: 8 },
    { type: 'cliff', x: 7.2, z: 10, top: 0, height: 3.4, w: 2.2, d: 8 },
    { type: 'cliff', x: -7.4, z: -2, top: 0, height: 3.2, w: 2.4, d: 10 },
    { type: 'cliff', x: 7.4, z: -2, top: 0, height: 3.2, w: 2.4, d: 10 },
    { type: 'cliff', x: -7.6, z: -45, top: 0, height: 3.4, w: 2.4, d: 8 },
    { type: 'cliff', x: 7.6, z: -45, top: 0, height: 3.4, w: 2.4, d: 8 },

    { type: 'waterfall', x: 0, z: -20, top: 0.04, height: 2.2, w: 0.85 },
    { type: 'waterfall', x: 0, z: -26, top: 0.04, height: 2.2, w: 0.85 },
    { type: 'waterfall', x: 0, z: -32, top: 0.04, height: 2.2, w: 0.85 },

    { type: 'monkey', x: 7.2, z: 14, top: 6.9, hang: 1.15, yaw: -20 },

    { type: 'pyramid', x: 10.5, z: -66, top: 2.48, size: 10, height: 9 },
    { type: 'pyramid', x: -11, z: -62, top: 2.48, size: 6.5, height: 5.5 },
    { type: 'altar', x: -4.4, z: -68.6, top: 6 },
  ],
};

const FLOOR = 2.48;
const gorge = [
  { art: 'town/watermill', x: -8.6, z: 9.5, top: FLOOR, yaw: 70, s: 2.15 },
  { art: 'nature/tree_tall', x: 7.2, z: 14, top: FLOOR, yaw: -18, s: 2.85 },
  { art: 'town/banner-green', x: 4.6, z: -63.5, top: 6, yaw: -10, s: 1.65, motion: 'sway' },
  { art: 'nature/rock_largeA', x: -7.6, z: -20, top: 0.12, yaw: 28, s: 3.1 },
  { art: 'nature/rock_largeB', x: 7.8, z: -28, top: 0.1, yaw: -16, s: 3.3 },
  { art: 'nature/rock_tallA', x: -8.2, z: -34, top: 0.08, yaw: 10, s: 2.6 },
];

level.scenery = [
  ...gorge,
  ...dressBanks(level, {
    set: 'canyon',
    seed: 31,
    ground: FLOOR,
    keepOut: gorge.map((h) => ({ x: h.x, z: h.z, r: 2.2 })),
  }),
];

export default level;

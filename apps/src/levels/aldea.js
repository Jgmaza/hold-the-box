// Selva 1 — "La Aldea". Pueblo en tierra: camino de tierra, chozas, tótems, gente del pueblo.
//   plaza → niño → aldeano con agua → dos puentes de vidrio (salten juntos) → plaza + META.

import { dressBanks, glassBridge, pathTrim, totems, unclipScenery, villageHouses } from './sections.js';

const GROUND = 0.88;
const GLASS_FROM = 1;
const glass = glassBridge({ from: GLASS_FROM, rows: 5, seed: 7, top: 1 });
const LAND_D = 7;
const landNear = glass.endZ - 0.9;
const landZ = Math.round((landNear - LAND_D / 2) * 100) / 100;
const northNear = 4;
const northFar = 57;
const southFar = -73;

const dirt = (p) => ({ ...p, skin: 'dirt', h: p.h ?? 0.18 });
const cp = (id, z, { w = 4, d = 3 } = {}) =>
  dirt({
    id,
    x: 0,
    z,
    w,
    d,
    top: 1,
    spawn: { p1: { x: -0.8, y: 1, z }, p2: { x: 0.8, y: 1, z } },
  });

const level = {
  id: 'aldea',
  name: 'La Aldea',
  theme: 'jungle',
  biome: 'village',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 37 },
    p2: { x: 0.8, y: 1, z: 37 },
  },

  platforms: [
    // El pasto caminable llega hasta la orilla. En el tramo del vidrio el suelo se abre: si fallan el salto, caen.
    {
      id: 'suelo-norte',
      x: 0,
      z: (northNear + northFar) / 2,
      w: 24,
      d: northFar - northNear,
      top: GROUND,
      h: 1.5,
      kind: 'ground',
    },
    {
      id: 'suelo-sur',
      x: 0,
      z: (southFar + landNear) / 2,
      w: 24,
      d: landNear - southFar,
      top: GROUND,
      h: 1.5,
      kind: 'ground',
    },
    dirt({ id: 'inicio', x: 0, z: 38, w: 10, d: 8, top: 1 }),
    dirt({ id: 'sendero-easy', x: 0, z: 32.5, w: 5, d: 3, top: 1 }),
    dirt({ id: 'plaza-easy', x: 0, z: 25, w: 10, d: 12, top: 1 }),
    dirt({ id: 'sendero-medium', x: 0, z: 17.5, w: 5, d: 3, top: 1 }),
    dirt({ id: 'plaza-medium', x: 0, z: 10, w: 10, d: 12, top: 1 }),
    dirt({ id: 'sendero-vidrio', x: 0, z: 2.5, w: 5, d: 3, top: 1 }),
    ...glass.panels,
    dirt({ id: 'llegada', x: 0, z: landZ, w: 8, d: LAND_D, top: 1 }),
    dirt({ id: 'plaza-meta', x: 0, z: -28, w: 12, d: 16, top: 1 }),
  ],

  npcs: [
    { difficulty: 'easy', platform: 'plaza-easy', x: 1.3, z: 25 },
    { difficulty: 'medium', platform: 'plaza-medium', x: 0, z: 8 },
  ],

  checkpoints: [cp('cp-medium', 17.5), cp('cp-vidrio', 2.5), dirt({ ...cp('cp-meta', -19.2, { w: 5, d: 3 }) })],

  goal: { x: 0, z: -33, w: 8, d: 5, top: 1 },

  signs: [
    { x: 4.0, z: 36, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -4.2, z: 30, top: 1, w: 3.2, h: 1.4, text: 'NIÑO DEL PUEBLO\n¡SÁLTENLO JUNTOS!', style: 'info' },
    { x: 4.2, z: 16, top: 1, w: 3.2, h: 1.4, text: '¡EL ALDEANO\nTIRA AGUA!', style: 'warn' },
    { x: -4.2, z: 6.4, top: 1, w: 3.4, h: 1.5, text: 'DOS PUENTES\n¡SALTE JUNTOS!', style: 'info' },
    { x: 4.2, z: 6.4, top: 1, w: 3.4, h: 1.5, text: 'UN VIDRIO AGUANTA\nEL OTRO SE ROMPE', style: 'warn' },
    { x: -4.6, z: -33.5, top: 1, w: 3.2, h: 1.3, text: 'PLAZA DEL\nPUEBLO', style: 'bar' },
  ],

  props: [
    { type: 'flag', x: 3.2, z: 16.2, top: 1, checkpoint: 0 },
    { type: 'flag', x: 2.1, z: 3.4, top: 1, checkpoint: 1 },
    { type: 'flag', x: 3.2, z: -20.6, top: 1, checkpoint: 2 },
  ],
};

const houses = villageHouses([
  { x: -6.7, z: 40, top: GROUND },
  { x: 6.7, z: 29, top: GROUND },
  { x: -6.7, z: 21, top: GROUND },
  { x: 6.7, z: 13, top: GROUND },
  { x: -6.7, z: 5, top: GROUND },
  { x: 6.7, z: -22, top: GROUND },
  { x: -6.7, z: -30, top: GROUND },
  { x: 6.7, z: -36, top: GROUND },
]);
const poles = totems([
  { x: -5.3, z: 34.6, top: GROUND, yaw: 8 },
  { x: 5.3, z: 17.4, top: GROUND, yaw: -12 },
  { x: -5.2, z: 7.6, top: GROUND, yaw: 6 },
  { x: 5.4, z: -20.4, top: GROUND, yaw: -8 },
]);
const market = [
  { art: 'town/stall-green', x: -3.7, z: 28.6, top: 1, yaw: 75, s: 1.9 },
  { art: 'town/stall-red', x: 3.75, z: 21.4, top: 1, yaw: -80, s: 1.85 },
  { art: 'town/cart', x: 4.05, z: 23.3, top: 1, yaw: 18, s: 1.55 },
  { art: 'town/stall', x: -3.65, z: 11.4, top: 1, yaw: 90, s: 1.8 },
  { art: 'town/fountain-round', x: -3.55, z: -26.2, top: 1, yaw: 0, s: 1.12 },
  { art: 'town/banner-green', x: -3.5, z: 36.4, top: 1, yaw: 18, s: 1.75, motion: 'sway' },
  { art: 'town/banner-red', x: 3.6, z: -29.4, top: 1, yaw: -16, s: 1.75, motion: 'sway' },
  { art: 'nature/campfire_stones', x: 3.35, z: 26.2, top: GROUND, yaw: 12, s: 3.3, motion: 'fire' },
  { art: 'nature/stump_round', x: 4.45, z: 25.35, top: GROUND, yaw: 12, s: 2.5 },
  { art: 'nature/log', x: 4.55, z: 27.15, top: GROUND, yaw: 38, s: 2.05 },
  { art: 'nature/campfire_stones', x: -3.3, z: -23.2, top: GROUND, yaw: 0, s: 3.4, motion: 'fire' },
  { art: 'nature/stump_round', x: -4.55, z: -22.2, top: GROUND, yaw: -10, s: 2.4 },
  { art: 'town/hedge', x: -5.2, z: -25.4, top: 1, yaw: 90, s: 1.75 },
  { art: 'town/hedge', x: -5.2, z: -27.1, top: 1, yaw: 90, s: 1.75 },
];

level.pit = { z0: landNear, z1: northNear };

const pitZ = (landNear + northNear) / 2;
const pitD = northNear - landNear;
level.scenery = [
  ...houses,
  ...poles,
  ...market,
  ...pathTrim(level, { seed: 4, ground: GROUND }),
  ...dressBanks(level, {
    set: 'village',
    seed: 11,
    ground: GROUND,
    keepOut: [
      ...houses.filter((h) => h.art === 'town/wall-wood-door').map((h) => ({ x: h.x, z: h.z, r: 3.6 })),
      ...poles.map((h) => ({ x: h.x, z: h.z, r: 1.5 })),
      ...market.map((h) => ({ x: h.x, z: h.z, r: 1.9 })),
      { x: 0, z: pitZ, w: 28, d: pitD },
    ],
  }),
];
unclipScenery(level.scenery);

export default level;

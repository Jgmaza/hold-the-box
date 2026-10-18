// Selva 2 — "El Templo". Losa de piedra, cabezas, pirámide al fondo. Sin tablón ni caimanes.
//   plaza (mono) → camino → lianas → plaza (jaguar) → escalones → terraza + ofrenda.

import { dressBanks } from './sections.js';

const GROUND = 0.88;

const stone = (p) => ({ ...p, skin: 'stone' });
const cp = (id, z, top = 1, { w = 4, d = 3 } = {}) =>
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
  id: 'templo',
  name: 'El Templo',
  theme: 'jungle',
  biome: 'temple',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: 19 },
    p2: { x: 0.8, y: 1, z: 19 },
  },

  platforms: [
    // El pasto llega hasta la orilla. A los lados está el mismo valle de la aldea: si se salen, caen.
    { id: 'suelo', x: 0, z: -9, w: 26, d: 134, top: 0.88, h: 1.5, kind: 'ground' },
    stone({ id: 'plaza', x: 0, z: 16, w: 12, d: 12, top: 1, h: 0.18 }),
    // La calle sigue detrás del spawn: la cámara va 10 m atrás y si no, se ve el corte del pasto.
    stone({ id: 'calle-atras', x: 0, z: 37, w: 12, d: 30, top: 1, h: 0.18 }),
    stone({ id: 'camino-1', x: 0, z: 8.5, w: 8, d: 3, top: 1, h: 0.18 }),
    stone({ id: 'lianas', x: 0, z: -1, w: 12, d: 16, top: 1, h: 0.18 }),
    stone({ id: 'camino-2', x: 0, z: -10.5, w: 8, d: 3, top: 1, h: 0.18 }),
    stone({ id: 'plaza-2', x: 0, z: -19, w: 12, d: 14, top: 1, h: 0.18 }),
    stone({ id: 'camino-3', x: 0, z: -27.5, w: 8, d: 3, top: 1, h: 0.18 }),
    stone({ id: 'escalon-1', x: 0, z: -31, w: 8, d: 4, top: 1.7, h: 0.2 }),
    stone({ id: 'escalon-2', x: 0, z: -35, w: 8, d: 4, top: 2.5, h: 0.2 }),
    stone({ id: 'escalon-3', x: 0, z: -39.5, w: 8, d: 5, top: 3.3, h: 0.2 }),
    stone({ id: 'terraza', x: 0, z: -50, w: 14, d: 14, top: 4.2, h: 0.22 }),
  ],

  npcs: [
    { difficulty: 'medium', platform: 'plaza', x: 0.6, z: 14 },
    { difficulty: 'hard', platform: 'plaza-2', x: -0.8, z: -20 },
  ],

  sweepers: [
    { id: 'liana-1', x: 0, z: 3, top: 1, length: 5.0, speed: 65, startAngle: 90 },
    { id: 'liana-2', x: 0, z: -5, top: 1, length: 5.0, speed: -70, startAngle: 20 },
  ],

  checkpoints: [cp('cp-lianas', 8.5), cp('cp-jaguar', -10.5), cp('cp-escalon', -27.5)],

  goal: { x: 0, z: -54, w: 8, d: 5, top: 4.2 },

  signs: [
    { x: 4.6, z: 20, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -5.0, z: 12, top: 1, w: 3.2, h: 1.4, text: '¡EL MONO\nTIRA AGUA!', style: 'warn' },
    { x: 5.0, z: 7, top: 1, w: 3.4, h: 1.4, text: 'PELIGRO:\nLIANAS AGRESIVAS', style: 'warn' },
    { x: -5.0, z: -12, top: 1, w: 3.2, h: 1.4, text: 'JAGUAR\n¡NO SE QUEDEN!', style: 'warn' },
    { x: 3.6, z: -40, top: 3.3, w: 3, h: 1.3, text: 'SUBAN A\nLA PIRÁMIDE', style: 'info' },
    { x: -5.2, z: -54.5, top: 4.2, w: 3.2, h: 1.4, text: 'AQUÍ SE DEJA\nLA OFRENDA', style: 'bar' },
  ],

  props: [
    { type: 'flag', x: 3.4, z: 7.2, top: 1, checkpoint: 0 },
    { type: 'flag', x: 3.4, z: -11.8, top: 1, checkpoint: 1 },
    { type: 'flag', x: 3.4, z: -28.8, top: 1, checkpoint: 2 },

    { type: 'monkey', x: 7.1, z: 8, top: 5.3, hang: 1.15, yaw: -25 },
    { type: 'monkey', x: -6.8, z: -8, top: 5.15, hang: 1.1, yaw: 20 },

    { type: 'pyramid', x: 11, z: -52, top: 0.88, size: 11, height: 9 },
    { type: 'pyramid', x: -12, z: -48, top: 0.88, size: 7.5, height: 6 },
    { type: 'altar', x: -4.6, z: -54.8, top: 4.2 },
  ],
};

const ruins = [
  { art: 'nature/statue_head', x: -6.5, z: 18.2, top: GROUND, yaw: 16, s: 3.45 },
  { art: 'nature/statue_head', x: 6.7, z: 13.6, top: GROUND, yaw: -18, s: 3.15 },
  { art: 'nature/statue_head', x: -6.7, z: 1.6, top: GROUND, yaw: 12, s: 3.55 },
  { art: 'nature/statue_head', x: 6.6, z: -4.2, top: GROUND, yaw: -14, s: 3.25 },
  { art: 'nature/statue_head', x: -6.4, z: -20, top: GROUND, yaw: 10, s: 3.6 },
  { art: 'nature/statue_obelisk', x: 6.4, z: 7.2, top: GROUND, yaw: 4, s: 3.2 },
  { art: 'nature/statue_obelisk', x: -6.3, z: -14.5, top: GROUND, yaw: -6, s: 3.35 },
  { art: 'nature/statue_column', x: 6.3, z: 19.4, top: GROUND, yaw: 0, s: 3.25 },
  { art: 'nature/statue_columnDamaged', x: 6.5, z: -18, top: GROUND, yaw: 8, s: 3.05 },
  { art: 'nature/tree_palmDetailedTall', x: 7.1, z: 8, top: GROUND, yaw: -20, s: 3.25 },
  { art: 'nature/tree_palmDetailedTall', x: -6.8, z: -8, top: GROUND, yaw: 24, s: 3.15 },
  { art: 'town/banner-green', x: 4.5, z: -22.2, top: 1, yaw: -12, s: 1.7, motion: 'sway' },
  { art: 'town/pillar-stone', x: -4.8, z: -48, top: 4.2, yaw: 8, s: 2.4 },
  { art: 'town/pillar-stone', x: 4.9, z: -46.5, top: 4.2, yaw: -6, s: 2.2 },
];

level.scenery = [
  ...ruins,
  ...dressBanks(level, {
    set: 'temple',
    seed: 23,
    ground: GROUND,
    keepOut: ruins.map((h) => ({ x: h.x, z: h.z, r: 1.8 })),
  }),
];

export default level;

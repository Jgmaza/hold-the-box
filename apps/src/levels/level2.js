// Nivel 2 — "La Bahía". Avanza hacia -Z; el agua está en y = 0. Mismo formato que level1.js.
//
// Sube un escalón respecto al Muelle: tramos más largos, menos checkpoints y mecánicas repetidas
// con otro largo (sin rodillo ni elevador):
//   inicio → isla NPC medium → aguacero de 5 carpas → rieles de 36 m → ferry → viento alternado
//   → isla cangrejos (medium + easy) → rieles cortos de 24 m → segundo ferry → chorros (4) → META.

import { dressLevel, rainIsland, railsPair, windIsland } from './sections.js';

const cp = (id, z, { d = 3, w = 4 } = {}) => ({ id, x: 0, z, w, d, top: 1, spawn: { p1: { x: -0.8, y: 1, z }, p2: { x: 0.8, y: 1, z } } });

const level = {
  id: 'bahia',
  name: 'La Bahía',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: -2 },
    p2: { x: 0.8, y: 1, z: -2 },
  },

  platforms: [
    { id: 'inicio', x: 0, z: -4, w: 10, d: 8, top: 1 }, //                       z    0 .. -8
    { id: 'puente-npc', x: 0, z: -9.5, w: 4, d: 3, top: 1 }, //                  z   -8 .. -11
    { id: 'isla-npc', x: 0, z: -17, w: 10, d: 12, top: 1 }, //                   z  -11 .. -23
    { id: 'puente-lluvia', x: 0, z: -24.5, w: 4, d: 3, top: 1 }, //              z  -23 .. -26
    rainIsland({ id: 'isla-lluvia', from: -26, length: 24, shelters: 5 }), //    z  -26 .. -50
    { id: 'puente-rieles', x: 0, z: -51.5, w: 4, d: 3, top: 1 }, //              z  -50 .. -53
    ...railsPair({ id: 'rieles', from: -53, length: 36 }), //                    z  -53 .. -89
    { id: 'tras-rieles', x: 0, z: -92, w: 8, d: 6, top: 1 }, //                  z  -89 .. -95  (ferry en el agua)
    { id: 'muelle-medio', x: 0, z: -108, w: 8, d: 6, top: 1 }, //                z -105 .. -111
    windIsland({ id: 'isla-viento', from: -111, length: 22, dir: 'alternate' }), // z -111 .. -133
    { id: 'puente-cangrejos', x: 0, z: -134.5, w: 4, d: 3, top: 1 }, //          z -133 .. -136
    { id: 'isla-cangrejos', x: 0, z: -143, w: 10, d: 14, top: 1 }, //            z -136 .. -150
    { id: 'puente-rieles-2', x: 0, z: -151.5, w: 4, d: 3, top: 1 }, //           z -150 .. -153
    ...railsPair({ id: 'rieles-cortos', from: -153, length: 24 }), //            z -153 .. -177
    { id: 'tras-rieles-2', x: 0, z: -180, w: 8, d: 6, top: 1 }, //               z -177 .. -183  (segundo ferry)
    { id: 'muelle-chorros', x: 0, z: -195, w: 8, d: 4, top: 1 }, //              z -193 .. -197
    { id: 'chorros', x: 0, z: -204, w: 6, d: 14, top: 1 }, //                    z -197 .. -211
    { id: 'isla-meta', x: 0, z: -218, w: 10, d: 14, top: 1 }, //                 z -211 .. -225
  ],

  moving: [
    { id: 'ferry', x: 0, z: -97.5, w: 4.5, d: 4, top: 1, to: { z: -102.5 }, period: 7 },
    { id: 'ferry-2', x: 0, z: -185.5, w: 4.5, d: 4, top: 1, to: { z: -190.5 }, period: 6, phase: 2 },
  ],

  npcs: [
    { difficulty: 'medium', platform: 'isla-npc', x: 0, z: -17 },
    { difficulty: 'medium', platform: 'isla-cangrejos', x: -1, z: -144 },
    { difficulty: 'easy', platform: 'isla-cangrejos', x: 1.5, z: -140 },
  ],

  geysers: [
    { x: -1.1, z: -199.5, baseY: 1, radius: 1.1, offset: 0 },
    { x: 1.2, z: -202.5, baseY: 1, radius: 1.1, offset: 0.8 },
    { x: -0.9, z: -205.5, baseY: 1, radius: 1.1, offset: 1.6 },
    { x: 1.0, z: -208.5, baseY: 1, radius: 1.1, offset: 2.4 },
  ],

  checkpoints: [cp('cp-lluvia', -24.5), cp('cp-rieles', -51.5), cp('cp-ferry', -108, { d: 5, w: 8 }), cp('cp-cangrejos', -134.5), cp('cp-chorros', -195, { w: 8 })],

  goal: { x: 0, z: -221.5, w: 8, d: 5, top: 1 },

  signs: [
    { x: 3.6, z: -2, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -3.8, z: -12, top: 1, w: 3, h: 1.4, text: 'NPC MEDIUM\n¡MUÉVANSE JUNTOS!', style: 'warn' },
    { x: -3.8, z: -21.8, top: 1, w: 3.4, h: 1.4, text: 'AGUACERO LARGO\nDE CARPA EN CARPA', style: 'info' },
    { x: 3.8, z: -49.2, top: 1, w: 3.4, h: 1.3, text: 'RIELES LARGOS\nCADA UNO EL SUYO', style: 'warn' },
    { x: -3, z: -90.5, top: 1, w: 3, h: 1.3, text: 'ESPEREN\nEL FERRY', style: 'info' },
    { x: 4, z: -110, top: 1, w: 3.4, h: 1.4, text: '¡VIENTO!\nCAMINEN CONTRA LA RÁFAGA', style: 'warn' },
    { x: -3.8, z: -137, top: 1, w: 3, h: 1.4, text: 'ISLA DE LOS\nCANGREJOS', style: 'warn' },
    { x: 3, z: -194, top: 1, w: 2.8, h: 1.3, text: '¡NO MOJEN\nLA CAJA!', style: 'warn' },
    { x: -13, z: -70, top: 0, w: 7, h: 3, post: 3.5, text: 'BAHÍA DE LOS\nCARGADORES\nNO SE ACEPTAN CAJAS MOJADAS', style: 'billboard' },
  ],

  props: [
    { type: 'palm', x: -4.2, z: -1, top: 1 },
    { type: 'flag', x: 3, z: -26.8, top: 1, checkpoint: 0 },
    { type: 'flag', x: 3.6, z: -94, top: 1, checkpoint: 1 },
    { type: 'flag', x: 3.3, z: -106, top: 1, checkpoint: 2 },
    { type: 'flag', x: 3.4, z: -136.8, top: 1, checkpoint: 3 },
    { type: 'flag', x: -3.3, z: -195.5, top: 1, checkpoint: 4 },
    { type: 'palm', x: 4.3, z: -90, top: 1 },
    { type: 'palm', x: -4.3, z: -223, top: 1 },
    { type: 'bar', x: 3.8, z: -223.5, top: 1 },
  ],
};

// Bahía pirata: cañones, cofres y barcos; un poco de playa al inicio.
level.scenery = dressLevel(
  level,
  {
    beach: ['inicio', 'isla-npc', 'isla-cangrejos'],
    pirate: ['isla-lluvia', 'tras-rieles', 'muelle-medio', 'isla-viento', 'tras-rieles-2', 'chorros', 'isla-meta'],
  },
  { seed: 2, density: 1.15 },
);

export default level;

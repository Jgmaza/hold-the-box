// Nivel 3 — "La Tormenta". Avanza hacia -Z; el agua está en y = 0. Mismo formato que level1.js.
//
// El más largo y con mecánicas apiladas, checkpoints más separados:
//   inicio → isla NPC hard + medium → aguacero fuerte pegado a ventarrón (sin puente)
//   → rieles de 45 m con 10 obstáculos → balsas angostas que se mueven de lado → doble rodillo
//   → isla guardia (hard + medium) → segunda tormenta más fuerte → oleaje con rompeolas → chorros densos (6) → escalones → elevador alto → terraza + META.

import { dressLevel, rainIsland, railsPair, waveIsland, windIsland } from './sections.js';

const cp = (id, z, d = 3, top = 1) => ({ id, x: 0, z, w: 4, d, top, spawn: { p1: { x: -0.8, y: top, z }, p2: { x: 0.8, y: top, z } } });

const level = {
  id: 'tormenta',
  name: 'La Tormenta',
  waterLevel: 0,

  spawn: {
    p1: { x: -0.8, y: 1, z: -2 },
    p2: { x: 0.8, y: 1, z: -2 },
  },

  platforms: [
    { id: 'inicio', x: 0, z: -4, w: 10, d: 8, top: 1 }, //                     z    0 .. -8
    { id: 'puente-npc', x: 0, z: -9.5, w: 4, d: 3, top: 1 }, //                z   -8 .. -11
    { id: 'isla-npc', x: 0, z: -18, w: 12, d: 14, top: 1 }, //                 z  -11 .. -25
    rainIsland({ id: 'isla-lluvia', from: -25, length: 18, shelters: 3, strength: 1.35 }), // z -25 .. -43
    windIsland({ id: 'isla-viento', from: -43, length: 16, dir: 'random', strength: 1.35 }), // z -43 .. -59
    { id: 'puente-rieles', x: 0, z: -60.5, w: 4, d: 3, top: 1 }, //            z  -59 .. -62
    ...railsPair({ id: 'rieles', from: -62, length: 45, hazards: 10 }), //     z  -62 .. -107
    { id: 'tras-rieles', x: 0, z: -110, w: 8, d: 6, top: 1 }, //               z -107 .. -113
    // Balsas (moving) en z -115 .. -127; las une un salto corto a cada lado.
    { id: 'isla-rodillos', x: 0, z: -137, w: 12, d: 18, top: 1 }, //           z -128 .. -146
    { id: 'puente-guardia', x: 0, z: -147.5, w: 4, d: 3, top: 1 }, //          z -146 .. -149
    { id: 'isla-guardia', x: 0, z: -156, w: 12, d: 14, top: 1 }, //            z -149 .. -163
    // Segunda tormenta, más corta y más fuerte.
    rainIsland({ id: 'isla-lluvia-2', from: -163, length: 12, shelters: 2, firstSide: 'right', strength: 1.5 }), // z -163 .. -175
    windIsland({ id: 'isla-viento-2', from: -175, length: 12, dir: 'alternate', strength: 1.5 }), // z -175 .. -187
    // Y después el mar se pone bravo: oleaje con rompeolas.
    ...waveIsland({ id: 'isla-olas', from: -187, length: 16, strength: 1.2 }), // z -187 .. -203
    { id: 'puente-chorros', x: 0, z: -204.5, w: 4, d: 3, top: 1 }, //          z -203 .. -206
    { id: 'chorros', x: 0, z: -215, w: 6, d: 18, top: 1 }, //                  z -206 .. -224
    { id: 'escalon-1', x: 0, z: -225.5, w: 8, d: 3, top: 1.6 },
    { id: 'escalon-2', x: 0, z: -228.5, w: 8, d: 3, top: 2.2 },
    { id: 'escalon-3', x: 0, z: -232.5, w: 8, d: 5, top: 2.8 }, //             z -230 .. -235
    { id: 'terraza', x: 0, z: -247, w: 12, d: 14, top: 6 }, //                 z -240 .. -254
  ],

  moving: [
    { id: 'balsa-1', x: -1.8, z: -116.5, w: 4, d: 3, top: 1, to: { x: 1.8 }, period: 6 },
    { id: 'balsa-2', x: 1.8, z: -121, w: 4, d: 3, top: 1, to: { x: -1.8 }, period: 6 },
    { id: 'balsa-3', x: -1.8, z: -125.5, w: 4, d: 3, top: 1, to: { x: 1.8 }, period: 6, phase: 1.5 },
    { id: 'elevador', x: 0, z: -237.5, w: 5, d: 5, top: 2.8, to: { top: 6 }, period: 8, phase: 0 },
  ],

  npcs: [
    { difficulty: 'hard', platform: 'isla-npc', x: 0, z: -19 },
    { difficulty: 'medium', platform: 'isla-npc', x: 2, z: -14 },
    { difficulty: 'hard', platform: 'isla-guardia', x: -1, z: -157 },
    { difficulty: 'medium', platform: 'isla-guardia', x: 2, z: -152 },
  ],

  sweepers: [
    { id: 'rodillo-1', x: 0, z: -132.5, top: 1, length: 4.4, speed: 85, startAngle: 90 },
    { id: 'rodillo-2', x: 0, z: -141.5, top: 1, length: 4.4, speed: -85, startAngle: 0 },
  ],

  geysers: [
    { x: -1.1, z: -208.5, baseY: 1, radius: 1.1, offset: 0, period: 2.8 },
    { x: 1.2, z: -211, baseY: 1, radius: 1.1, offset: 0.5, period: 2.8 },
    { x: -0.9, z: -213.5, baseY: 1, radius: 1.1, offset: 1.0, period: 2.8 },
    { x: 1.0, z: -216, baseY: 1, radius: 1.1, offset: 1.5, period: 2.8 },
    { x: -1.2, z: -218.5, baseY: 1, radius: 1.1, offset: 2.0, period: 2.8 },
    { x: 0.9, z: -221, baseY: 1, radius: 1.1, offset: 2.4, period: 2.8 },
  ],

  checkpoints: [cp('cp-rieles', -60.5), cp('cp-guardia', -147.5), cp('cp-chorros', -204.5)],

  goal: { x: 0, z: -250.5, w: 8, d: 5, top: 6 },

  signs: [
    { x: 3.6, z: -2, top: 1, w: 3.2, h: 1.5, text: 'P1: WASD + ESPACIO\nP2: FLECHAS + ENTER', style: 'info' },
    { x: -4.6, z: -12, top: 1, w: 3.2, h: 1.4, text: 'DOS NPC\n¡ESQUIVEN Y PASEN!', style: 'warn' },
    { x: 4.2, z: -26, top: 1, w: 3.4, h: 1.4, text: 'TORMENTA\nLLUVIA Y VIENTO', style: 'warn' },
    { x: 4.2, z: -57.5, top: 1, w: 3.4, h: 1.3, text: '45 METROS\nDE RIELES', style: 'warn' },
    { x: -3, z: -108, top: 1, w: 3.2, h: 1.3, text: 'BALSAS\n¡SALTEN A TIEMPO!', style: 'warn' },
    { x: -5, z: -129, top: 1, w: 2.8, h: 1.3, text: 'DOBLE\nRODILLO', style: 'warn' },
    { x: 4.6, z: -161.5, top: 1, w: 3.2, h: 1.4, text: '¡OTRA VEZ!\nMÁS FUERTE', style: 'warn' },
    { x: -5.6, z: -186, top: 1, w: 3.4, h: 1.4, text: '¡OLEAJE!\nDETRÁS DEL ROMPEOLAS', style: 'warn' },
    { x: -2.4, z: -206.5, top: 1, w: 2.8, h: 1.3, text: '¡NO MOJEN\nLA CAJA!', style: 'warn' },
    { x: -3.2, z: -233.5, top: 2.8, w: 3.2, h: 1.3, text: 'ESPEREN EL\nELEVADOR', style: 'info' },
    { x: 13, z: -120, top: 0, w: 7, h: 3, post: 3.5, text: 'ALERTA DE TORMENTA\nSI SE MOJA\nNO SE ENTREGA', style: 'billboard' },
  ],

  props: [
    { type: 'flag', x: -4, z: -58.2, top: 1, checkpoint: 0 },
    { type: 'flag', x: 3, z: -149.8, top: 1, checkpoint: 1 },
    { type: 'flag', x: 2.4, z: -206.6, top: 1, checkpoint: 2 },
    { type: 'palm', x: -4.2, z: -1, top: 1 },
    { type: 'palm', x: 5.2, z: -241.5, top: 6 },
    { type: 'palm', x: -5.2, z: -241.5, top: 6 },
    { type: 'bar', x: -4.3, z: -252, top: 6 },
  ],
};

// Fuerte: murallas y torres en las islas grandes; pirata en lo demás.
level.scenery = dressLevel(
  level,
  {
    pirate: ['inicio', 'isla-lluvia', 'isla-viento', 'tras-rieles', 'isla-lluvia-2', 'isla-viento-2', 'isla-olas', 'chorros', 'escalon-3'],
    fort: ['isla-npc', 'isla-rodillos', 'isla-guardia', 'terraza'],
  },
  { seed: 3, density: 1.3 },
);

export default level;

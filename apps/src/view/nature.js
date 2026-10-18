// Naturaleza hecha con piezas suaves (parts.js): palmeras, arbustos, rocas e islas por capas.
// La usan el menú (menuScenery.js) y las palmeras del nivel (levelView.js).
import * as pc from 'playcanvas';

/** Aleatorio repetible (misma semilla = misma palmera). */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Pone una pieza en `mid` mirando hacia `end` (las dos en coordenadas locales de `parent`). */
function aim(entity, parent, end) {
  const world = parent.getWorldTransform().transformPoint(new pc.Vec3(end[0], end[1], end[2]));
  entity.lookAt(world);
}

/**
 * Palmera: tronco curvo con anillos, penacho de hojas en arco que caen y cocos.
 * `pos` = base del tronco. `lean` = cuánto se curva (en fracción de la altura) hacia +X local; `yaw` lo gira.
 */
export function palm(P, parent, pos, { height = 3.4, lean = 0.25, yaw = 0, fronds = 8, rand = seeded(1) } = {}) {
  const g = P.gfx;
  const root = P.group('palmera', parent, pos, [0, yaw, 0]);
  const bark = [g.solid('trunk'), g.solid('trunk', { mul: 0.82 })];
  const ringMat = g.solid('trunk', { mul: 0.68 });
  const r0 = height * 0.055;

  // Tronco: tramos cortos sobre una curva, alternando tono, con un anillo en cada unión.
  const n = 7;
  const at = (u) => [lean * height * u * u, height * u, 0];
  let prev = at(0);
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const p = at(u);
    const r = r0 * (1 - 0.35 * u);
    P.limb(root, bark[i % 2], prev, p, r, { name: 'tronco' });
    if (i < n) P.ring(root, ringMat, p, r * 0.98, r * 0.18, { name: 'anillo' });
    prev = p;
  }
  P.ball(root, bark[0], [prev[0], 0.05, 0], [r0 * 3.2, r0 * 1.4, r0 * 3.2], { name: 'raiz' });

  // Hojas: arco que sube un poco y cae, hecho de tramos anchos y aplanados con una nervadura encima.
  const top = prev;
  const leaf = [g.solid('leaf'), g.solid('leaf', { mul: 0.82 }), g.solid('leaf', { mul: 1.1 })];
  const rib = g.solid('leaf', { mul: 0.6 });
  const L = height * 0.62;
  const steps = 6;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rand() * 0.4;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const len = L * (0.85 + rand() * 0.3);
    const lift = 0.3 + rand() * 0.2;
    const point = (u) => [top[0] + dx * len * u, top[1] + len * (lift * u - 0.95 * u * u), top[2] + dz * len * u];
    const mat = leaf[f % leaf.length];
    for (let k = 0; k < steps; k++) {
      const u0 = k / steps;
      const u1 = (k + 1) / steps;
      const p0 = point(u0);
      const p1 = point(u1);
      const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2];
      const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      const width = len * 0.3 * (1 - 0.6 * ((u0 + u1) / 2)) * (k === 0 ? 0.6 : 1);
      const blade = P.ball(root, mat, mid, [width, 0.05, segLen * 1.9], { name: 'hoja' });
      aim(blade, root, p1);
      P.limb(root, rib, p0, p1, height * 0.008, { shadows: false, name: 'nervio' });
    }
  }
  P.ball(root, leaf[1], [top[0], top[1] + 0.05, top[2]], [r0 * 3, r0 * 2, r0 * 3], { name: 'cogollo' });
  const coco = g.solid('#6b4423', { gloss: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + rand();
    P.ball(root, coco, [top[0] + Math.cos(a) * r0 * 1.4, top[1] - r0 * 1.6, top[2] + Math.sin(a) * r0 * 1.4], [r0 * 1.9, r0 * 2.1, r0 * 1.9], { name: 'coco' });
  }
  return root;
}

/** Arbusto: racimo de bolas verdes de varios tonos, a veces con florecitas. */
export function bush(P, parent, pos, size = 1, rand = seeded(2)) {
  const g = P.gfx;
  const root = P.group('arbusto', parent, pos);
  const n = 4 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand();
    const d = size * (0.2 + rand() * 0.25);
    const s = size * (0.5 + rand() * 0.35);
    P.ball(root, g.solid('leaf', { mul: 0.7 + rand() * 0.4 }), [Math.cos(a) * d, s * 0.35, Math.sin(a) * d], [s, s * 0.85, s], { name: 'mata' });
  }
  P.ball(root, g.solid('leaf', { mul: 1.05 }), [0, size * 0.5, 0], [size * 0.7, size * 0.6, size * 0.7], { name: 'mata' });
  if (rand() < 0.6) {
    const petal = g.solid(rand() < 0.5 ? 'danger' : '#ff8fc7');
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2;
      P.ball(root, petal, [Math.cos(a) * size * 0.4, size * (0.55 + rand() * 0.25), Math.sin(a) * size * 0.4], [size * 0.12, size * 0.12, size * 0.12], { shadows: false, name: 'flor' });
    }
  }
  return root;
}

/** Roca: dos o tres piedras grises aplanadas, con un poco de musgo arriba. */
export function rock(P, parent, pos, size = 1, rand = seeded(3)) {
  const g = P.gfx;
  const root = P.group('roca', parent, pos, [0, rand() * 360, 0]);
  const n = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const s = size * (1 - i * 0.3);
    P.ball(root, g.solid('#8d9aa3', { mul: 0.8 + rand() * 0.3, gloss: 0.15 }), [i * size * 0.45, s * 0.25, (rand() - 0.5) * size * 0.4], [s * 1.2, s * 0.7, s], { rot: [rand() * 20, 0, rand() * 20], name: 'piedra' });
  }
  if (rand() < 0.5) P.ball(root, g.solid('leaf', { mul: 0.6 }), [0, size * 0.48, 0], [size * 0.6, size * 0.12, size * 0.5], { name: 'musgo' });
  return root;
}

/**
 * Isla por capas, centrada en (x, z), con el mar en `seaY`: arrecife clarito, orilla de arena mojada,
 * arena irregular, colinas de pasto, y encima palmeras, arbustos y rocas en la orilla.
 */
export function island(P, parent, { x, z, w, d, h, seaY, palms = 2, bushes = 3, rocks = 3, seed = 1, look = 'beach' }) {
  const g = P.gfx;
  const rand = seeded(seed);
  const jungle = look === 'jungle';
  const village = look === 'village';
  const ruins = look === 'ruins';
  const canyon = look === 'canyon';
  const wild = jungle || ruins || canyon || village;
  const root = P.group('isla', parent, [x, seaY, z]);
  if (ruins) {
    P.ball(root, g.solid('#8d887c', { gloss: 0.15 }), [0, 0.02, 0], [w * 1.3, 0.05, d * 1.3], { shadows: false, name: 'losa' });
    P.ball(root, g.solid('#b8b3a8', { mul: 0.9 }), [0, 0, 0], [w * 1.05, h * 0.4, d * 1.05], { name: 'ruina' });
  } else if (canyon) {
    P.ball(root, g.solid('#6a5a48', { gloss: 0.12 }), [0, 0.02, 0], [w * 1.2, 0.05, d * 1.2], { shadows: false, name: 'risco' });
    P.ball(root, g.solid('#8a7358', { mul: 0.85 }), [0, 0, 0], [w * 1.05, h * 0.55, d * 1.05], { name: 'peña' });
  } else if (jungle || village) {
    P.ball(root, g.solid('#3d6b4a', { gloss: 0.5 }), [0, 0.02, 0], [w * 1.45, 0.04, d * 1.45], { shadows: false, name: 'orilla-selva' });
    P.ball(root, g.solid('#2a4a34', { mul: 0.9 }), [0, 0, 0], [w * 1.05, h * 0.35, d * 1.05], { name: 'barro' });
  } else {
    P.ball(root, g.solid('#7fdcec', { gloss: 0.8 }), [0, 0.02, 0], [w * 1.5, 0.04, d * 1.5], { shadows: false, name: 'arrecife' });
    P.ball(root, g.solid('#a9ecf4', { gloss: 0.8 }), [0, 0.03, 0], [w * 1.18, 0.04, d * 1.18], { shadows: false, name: 'espuma' });
    P.ball(root, g.solid('sand', { mul: 0.82 }), [0, 0, 0], [w * 1.05, h * 0.35, d * 1.05], { name: 'orilla' });
  }

  // Arena: varias lomas encimadas para que el borde no sea un óvalo perfecto.
  for (let i = 0; i < 4; i++) {
    const ox = (rand() - 0.5) * w * 0.3;
    const oz = (rand() - 0.5) * d * 0.3;
    const s = 0.7 + rand() * 0.25;
    const hill = ruins ? '#9a9588' : canyon ? '#7a6550' : jungle || village ? 'leaf' : 'sand';
    P.ball(root, g.solid(hill, { mul: wild ? 0.7 + rand() * 0.25 : 0.95 + rand() * 0.1 }), [ox, -h * 0.15, oz], [w * s, h * (1.1 + rand() * 0.3), d * s], { name: wild ? 'loma' : 'arena' });
  }
  // Pasto: colinas más chicas hacia el centro.
  const top = h * 0.5;
  for (let i = 0; i < 3; i++) {
    const ox = (rand() - 0.5) * w * 0.25;
    const oz = (rand() - 0.6) * d * 0.25;
    const s = 0.45 + rand() * 0.15;
    P.ball(root, g.solid('leaf', { mul: 0.8 + rand() * 0.25 }), [ox, top * 0.75, oz], [w * s, h * (0.5 + rand() * 0.3), d * s], { name: 'pasto' });
  }

  // Altura de la superficie (aprox.) para apoyar cosas encima.
  const surface = (px, pz) => {
    const k = 1 - (px / (w * 0.42)) ** 2 - (pz / (d * 0.42)) ** 2;
    return Math.max(0.05, top * 1.05 * Math.sqrt(Math.max(0, k)));
  };
  for (let i = 0; i < palms; i++) {
    const px = (i - (palms - 1) / 2) * w * 0.22 + (rand() - 0.5) * w * 0.05;
    const pz = (rand() - 0.6) * d * 0.15;
    const py = surface(px, pz) - 0.1;
    if (jungle || village) mangrove(P, root, [px, py, pz], { height: h * (2.2 + rand() * 0.6), rand });
    else if (!ruins && !canyon) palm(P, root, [px, py, pz], { height: h * (1.5 + rand() * 0.6), lean: (px >= 0 ? 1 : -1) * (0.15 + rand() * 0.2), yaw: (rand() - 0.5) * 50, rand });
  }
  for (let i = 0; i < bushes; i++) {
    const a = rand() * Math.PI * 2;
    const px = Math.cos(a) * w * 0.25;
    const pz = Math.sin(a) * d * 0.25;
    bush(P, root, [px, surface(px, pz) - 0.05, pz], h * (0.3 + rand() * 0.2), rand);
  }
  for (let i = 0; i < rocks; i++) {
    const a = rand() * Math.PI * 2;
    rock(P, root, [Math.cos(a) * w * 0.48, 0, Math.sin(a) * d * 0.48], h * (0.25 + rand() * 0.2), rand);
  }
  return root;
}

/** Mangle: raíces en zancos que se juntan y un copo de hojas arriba. */
export function mangrove(P, parent, pos, { height = 5.2, rand = seeded(4) } = {}) {
  const g = P.gfx;
  const root = P.group('mangle', parent, pos);
  const bark = [g.solid('trunk', { mul: 0.62 }), g.solid('trunk', { mul: 0.48 })];
  const meet = [0, height * 0.42, 0];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.25;
    const r = 0.55 + rand() * 0.55;
    P.limb(root, bark[i % 2], [Math.cos(a) * r, 0, Math.sin(a) * r], meet, 0.055 + rand() * 0.02, { name: 'raiz' });
  }
  P.limb(root, bark[0], meet, [0, height, 0], 0.09, { name: 'tronco' });
  const leaf = [g.solid('leaf', { mul: 0.55 }), g.solid('leaf', { mul: 0.75 }), g.solid('leaf', { mul: 0.95 })];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rand();
    const d = 0.7 + rand() * 1.1;
    P.ball(root, leaf[i % 3], [Math.cos(a) * d, height + rand() * 0.45, Math.sin(a) * d], [1.5 + rand() * 0.4, 0.75, 1.5 + rand() * 0.4], { name: 'copa' });
  }
  return root;
}

/** Caimán bajo: cuerpo, hocico y cola. Se dibuja casi a ras del agua. */
export function crocodile(P, parent, pos, { yaw = 0 } = {}) {
  const g = P.gfx;
  const root = P.group('caiman', parent, pos, [0, yaw, 0]);
  const skin = g.solid('#4a6b3a', { gloss: 0.35 });
  const dark = g.solid('#2f4a28');
  P.ball(root, skin, [0, 0.1, 0], [0.42, 0.2, 1.55], { name: 'cuerpo' });
  P.ball(root, skin, [0, 0.12, 0.82], [0.26, 0.14, 0.62], { name: 'hocico' });
  P.ball(root, dark, [0, 0.08, -0.95], [0.18, 0.1, 0.7], { name: 'cola' });
  const eye = g.solid('#1d1d1d');
  P.ball(root, eye, [-0.1, 0.22, 0.52], [0.055, 0.055, 0.055], { shadows: false, name: 'ojo' });
  P.ball(root, eye, [0.1, 0.22, 0.52], [0.055, 0.055, 0.055], { shadows: false, name: 'ojo' });
  return root;
}

/** Mono colgado: el `pos` es el punto de la rama. */
export function monkey(P, parent, pos, { hang = 1.15, yaw = 0 } = {}) {
  const g = P.gfx;
  const root = P.group('mono', parent, pos, [0, yaw, 0]);
  const fur = g.solid('#6b3f24');
  const face = g.solid('#d4a574');
  P.limb(root, fur, [0, 0, 0], [0, -hang, 0], 0.035, { name: 'brazo' });
  P.ball(root, fur, [0, -hang, 0], [0.26, 0.3, 0.2], { name: 'cuerpo' });
  P.ball(root, fur, [0, -hang - 0.26, 0.02], [0.15, 0.15, 0.15], { name: 'cabeza' });
  P.ball(root, face, [0, -hang - 0.27, 0.08], [0.1, 0.09, 0.06], { shadows: false, name: 'cara' });
  P.limb(root, fur, [0, -hang - 0.08, -0.05], [0.22, -hang + 0.15, -0.25], 0.025, { name: 'cola' });
  return root;
}

/** Cabeza de piedra tipo moái, al lado del camino. */
export function stoneHead(P, parent, pos, { h = 3.4, yaw = 0 } = {}) {
  const g = P.gfx;
  const root = P.group('cabeza', parent, pos, [0, yaw, 0]);
  const stone = g.solid('#b8b3a8', { mul: 0.95, gloss: 0.12 });
  const dark = g.solid('#8d887c', { gloss: 0.1 });
  g.prim('box', stone, { parent: root, pos: [0, h * 0.46, 0], scale: [1.35, h * 0.92, 1.05], name: 'bloque' });
  g.prim('box', dark, { parent: root, pos: [0, h * 0.78, 0.42], scale: [1.15, 0.22, 0.28], name: 'ceja' });
  g.prim('box', dark, { parent: root, pos: [0, h * 0.52, 0.52], scale: [0.28, 0.55, 0.22], name: 'nariz' });
  g.prim('box', dark, { parent: root, pos: [0, h * 0.28, 0.48], scale: [0.7, 0.12, 0.18], name: 'boca' });
  return root;
}

/** Pirámide escalonada (se lee de lejos). */
export function pyramid(P, parent, pos, { size = 9, h = 7 } = {}) {
  const g = P.gfx;
  const root = P.group('piramide', parent, pos);
  const stone = g.solid('#c4b8a4', { gloss: 0.08 });
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const k = 1 - i / steps;
    const y = (h / steps) * (i + 0.5);
    g.prim('box', stone, { parent: root, pos: [0, y, 0], scale: [size * k, h / steps + 0.04, size * k], name: 'escalon' });
  }
  return root;
}

/** Cortina de agua bajo el puente: solo se ve, no choca. */
export function waterfall(P, parent, pos, { h = 4.2, w = 2.4 } = {}) {
  const g = P.gfx;
  const root = P.group('catarata', parent, pos);
  const sheet = g.solid('#8fd4e8', { opacity: 0.38, unlit: true });
  const foam = g.solid('foam', { opacity: 0.7, unlit: true });
  g.prim('box', sheet, { parent: root, pos: [0, h / 2, 0], scale: [w, h, 0.12], shadows: false, name: 'agua' });
  g.prim('box', sheet, { parent: root, pos: [0.15, h / 2, 0.08], scale: [w * 0.7, h, 0.08], shadows: false, name: 'agua' });
  P.ball(root, foam, [0, 0.08, 0.1], [w * 1.15, 0.18, 0.7], { shadows: false, name: 'espuma' });
  P.ball(root, foam, [0, h - 0.1, 0], [w * 0.9, 0.12, 0.25], { shadows: false, name: 'borde' });
  return root;
}

/** Mesa de ofrenda en la meta. */
export function altar(P, parent, pos) {
  const g = P.gfx;
  const root = P.group('ofrenda', parent, pos);
  const stone = g.solid('#b8b3a8', { gloss: 0.12 });
  const gold = g.solid('ui', { gloss: 0.55 });
  g.prim('box', stone, { parent: root, pos: [0, 0.45, 0], scale: [2.2, 0.9, 1.1], name: 'mesa' });
  g.prim('box', stone, { parent: root, pos: [0, 0.95, 0], scale: [2.4, 0.1, 1.25], name: 'tapa' });
  g.prim('cylinder', gold, { parent: root, pos: [0, 1.25, 0], scale: [0.28, 0.45, 0.28], name: 'idolo' });
  P.ball(root, gold, [0, 1.58, 0], [0.22, 0.22, 0.22], { name: 'cabeza' });
  return root;
}

/** Choza de palma al final del manglar. */
export function hut(P, parent, pos) {
  const g = P.gfx;
  const root = P.group('choza', parent, pos);
  g.prim('box', g.solid('wood', { mul: 0.7 }), { parent: root, pos: [0, 0.7, 0], scale: [2.2, 1.4, 1.8], name: 'pared' });
  g.prim('box', g.solid('leaf', { mul: 0.7 }), { parent: root, pos: [0, 1.7, 0], rot: [0, 0, 18], scale: [2.8, 0.12, 2.2], name: 'techo' });
  g.prim('box', g.solid('leaf', { mul: 0.55 }), { parent: root, pos: [0, 1.7, 0], rot: [0, 0, -18], scale: [2.8, 0.12, 2.2], name: 'techo' });
  g.prim('box', g.solid('#3a2418'), { parent: root, pos: [0, 0.55, 0.88], scale: [0.7, 1.1, 0.08], name: 'puerta' });
  return root;
}

/** Tótem de madera del pueblo. */
export function totem(P, parent, pos, { h = 2.6 } = {}) {
  const g = P.gfx;
  const root = P.group('totem', parent, pos);
  const wood = g.solid('trunk', { mul: 0.85 });
  const face = g.solid('#e8c36a', { gloss: 0.2 });
  g.prim('cylinder', wood, { parent: root, pos: [0, h / 2, 0], scale: [0.38, h, 0.38], name: 'palo' });
  g.prim('box', face, { parent: root, pos: [0, h * 0.72, 0.16], scale: [0.42, 0.38, 0.12], name: 'cara' });
  g.prim('box', g.solid('#2a2018'), { parent: root, pos: [-0.08, h * 0.76, 0.22], scale: [0.08, 0.08, 0.04], name: 'ojo' });
  g.prim('box', g.solid('#2a2018'), { parent: root, pos: [0.08, h * 0.76, 0.22], scale: [0.08, 0.08, 0.04], name: 'ojo' });
  g.prim('box', wood, { parent: root, pos: [0, h + 0.12, 0], scale: [0.7, 0.16, 0.7], name: 'sombrero' });
  return root;
}

/** Pared de risco (solo se ve). */
export function cliff(P, parent, pos, { h = 3.2, w = 2.2, d = 8 } = {}) {
  const g = P.gfx;
  const root = P.group('risco', parent, pos);
  const stone = g.solid('#8a7358', { gloss: 0.1 });
  g.prim('box', stone, { parent: root, pos: [0, h / 2, 0], scale: [w, h, d], name: 'pared' });
  g.prim('box', g.solid('#6a5a48', { gloss: 0.08 }), { parent: root, pos: [0, h * 0.7, 0], scale: [w * 1.08, h * 0.35, d * 0.7], name: 'saliente' });
  return root;
}

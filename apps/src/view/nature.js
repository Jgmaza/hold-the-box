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
export function island(P, parent, { x, z, w, d, h, seaY, palms = 2, bushes = 3, rocks = 3, seed = 1 }) {
  const g = P.gfx;
  const rand = seeded(seed);
  const root = P.group('isla', parent, [x, seaY, z]);
  P.ball(root, g.solid('#7fdcec', { gloss: 0.8 }), [0, 0.02, 0], [w * 1.5, 0.04, d * 1.5], { shadows: false, name: 'arrecife' });
  P.ball(root, g.solid('#a9ecf4', { gloss: 0.8 }), [0, 0.03, 0], [w * 1.18, 0.04, d * 1.18], { shadows: false, name: 'espuma' });
  P.ball(root, g.solid('sand', { mul: 0.82 }), [0, 0, 0], [w * 1.05, h * 0.35, d * 1.05], { name: 'orilla' });

  // Arena: varias lomas encimadas para que el borde no sea un óvalo perfecto.
  for (let i = 0; i < 4; i++) {
    const ox = (rand() - 0.5) * w * 0.3;
    const oz = (rand() - 0.5) * d * 0.3;
    const s = 0.7 + rand() * 0.25;
    P.ball(root, g.solid('sand', { mul: 0.95 + rand() * 0.1 }), [ox, -h * 0.15, oz], [w * s, h * (1.1 + rand() * 0.3), d * s], { name: 'arena' });
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
    palm(P, root, [px, surface(px, pz) - 0.1, pz], { height: h * (1.5 + rand() * 0.6), lean: (px >= 0 ? 1 : -1) * (0.15 + rand() * 0.2), yaw: (rand() - 0.5) * 50, rand });
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

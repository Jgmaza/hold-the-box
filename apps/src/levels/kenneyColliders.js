// Colisiones de la escenografía Kenney (level.scenery). Los bounds salen de kenneyBounds.js (medidos de los GLB);
// aquí se decide QUÉ choca y con qué forma:
//   'box'    caja del modelo entero (barriles, cajas, cañones, murallas, torres, rocas, cercas)
//   'trunk'  solo el tronco, centrado en el origen del modelo (palmeras: las hojas no chocan)
//   'pole'   solo el mástil (banderas)
//   null     no choca (pasto, arena, botellas, herramientas, barcos en el agua)
// Ver docs/escenografia.md.
import { makeAABB } from '../sim/collision.js';
import { KENNEY_BOUNDS } from './kenneyBounds.js';

const RULES = [
  [/^(palm-)/, 'trunk'],
  [/^flag-/, 'pole'],
  [/^(ship-|boat-)/, null],
  [/^(grass|patch-|bottle|tool-|cannon-ball|hole)/, null],
  [/^(barrel|crate|chest|cannon|castle-|tower-|structure|rocks-)/, 'box'],
];

/** Footprint fijo (m, ya en el mundo) de las formas angostas. */
const NARROW = { trunk: 0.32, pole: 0.16 };

/** Forma de colisión de un modelo ('box' | 'trunk' | 'pole' | null). */
export function collideKind(art) {
  for (const [re, kind] of RULES) if (re.test(art)) return kind;
  return null;
}

/**
 * AABB en el mundo de un prop del nivel, o null si no choca.
 * @param {{art: string, x: number, z: number, top: number, yaw?: number, s?: number}} item
 */
export function propCollider(item) {
  const kind = collideKind(item.art);
  const b = KENNEY_BOUNDS[item.art];
  if (!kind || !b) return null;
  const s = item.s ?? 0.36;
  const minY = item.top + b.min[1] * s;
  const maxY = item.top + b.max[1] * s;
  if (kind !== 'box') {
    const h = NARROW[kind] / 2;
    return makeAABB(item.x - h, minY, item.z - h, item.x + h, maxY, item.z + h);
  }
  // Rectángulo del modelo girado por `yaw` (como en la vista: rotación en Y), y su AABB.
  const a = ((item.yaw ?? 0) * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const lx of [b.min[0], b.max[0]]) {
    for (const lz of [b.min[2], b.max[2]]) {
      const wx = item.x + (lx * cos + lz * sin) * s;
      const wz = item.z + (-lx * sin + lz * cos) * s;
      x0 = Math.min(x0, wx);
      x1 = Math.max(x1, wx);
      z0 = Math.min(z0, wz);
      z1 = Math.max(z1, wz);
    }
  }
  return makeAABB(x0, minY, z0, x1, maxY, z1);
}

// Cuerpos de lo que se ve en el campamento pero antes no frenaba (cactus, tinajas, arco, farol).
// El tronco hostil es angosto a propósito: en el carril bueno la pareja cabe escorada; el centro de la trampa no.
import { makeAABB } from '../sim/collision.js';
import { KENNEY_BOUNDS } from './kenneyBounds.js';
import { collideKind } from './kenneyColliders.js';

function column(x, z, top, r, h) {
  return makeAABB(x - r, top, z - r, x + r, top + h, z + r);
}

function cactusBox(c, top) {
  const kind = c.kind ?? 'saguaro';
  const h = c.h ?? (kind === 'barrel' ? 0.75 : kind === 'pear' ? 1.05 : 2.4);
  const y = c.top ?? top;
  if (kind === 'barrel') return column(c.x, c.z, y, Math.max(0.36, h * 0.55), Math.max(0.5, h * 0.9));
  if (kind === 'pear') return column(c.x, c.z, y, 0.42, Math.max(0.75, h * 0.85));
  // Hostil: solo el tronco, para poder pasar de lado. El de adorno ocupa también los brazos.
  return column(c.x, c.z, y, c.hostile ? 0.34 : 0.48, Math.max(1.5, h * 0.92));
}

/** Fogata, farol y bandera del laberinto: el kit no les pone choque, pero se pisan. */
function softScenery(level) {
  if (!level.maze) return [];
  const out = [];
  for (const item of level.scenery ?? []) {
    if (collideKind(item.art)) continue;
    if (!/campfire|lantern|banner/.test(item.art)) continue;
    const b = KENNEY_BOUNDS[item.art];
    if (!b) continue;
    const s = item.s ?? 1;
    const rx = Math.max(0.16, Math.max(Math.abs(b.min[0]), Math.abs(b.max[0])) * s);
    const rz = Math.max(0.16, Math.max(Math.abs(b.min[2]), Math.abs(b.max[2])) * s);
    const fileH = (b.max[1] - Math.min(0, b.min[1])) * s;
    const h = item.art.includes('campfire') ? 0.5 : Math.max(1.5, fileH);
    out.push({
      def: { kind: 'solid', art: item.art },
      aabb: makeAABB(item.x - rx, item.top, item.z - rz, item.x + rx, item.top + h, item.z + rz),
    });
  }
  return out;
}

/** AABBs de adorno que el jugador no debe atravesar. */
export function solidDressing(level) {
  const top = level.platforms?.find((p) => p.top != null)?.top ?? 1;
  const out = [];
  for (const c of level.cacti ?? []) {
    out.push({ def: { kind: 'solid', art: 'cactus' }, aabb: cactusBox(c, top) });
  }
  for (const p of level.props ?? []) {
    const y = p.top ?? top;
    if (p.type === 'pot') {
      const h = p.h ?? 1.5;
      out.push({ def: { kind: 'solid', art: 'pot' }, aabb: column(p.x, p.z, y, h * 0.42, h * 0.72) });
    } else if (p.type === 'deadTree') {
      const h = p.h ?? 3.2;
      out.push({ def: { kind: 'solid', art: 'deadTree' }, aabb: column(p.x, p.z, y, 0.4, h * 0.7) });
    } else if (p.type === 'lamp') {
      out.push({ def: { kind: 'solid', art: 'lamp' }, aabb: column(p.x, p.z, y, 0.2, 2.3) });
    } else if (p.type === 'rock') {
      const s = p.size ?? 1.4;
      out.push({
        def: { kind: 'solid', art: 'rock' },
        aabb: makeAABB(p.x - s * 0.62, y, p.z - s * 0.45, p.x + s * 0.62, y + s * 0.7, p.z + s * 0.45),
      });
    } else if (p.type === 'arch') {
      const w = p.w ?? 4.6;
      const h = p.h ?? 3.6;
      const half = 0.46;
      for (const side of [-1, 1]) {
        const x = p.x + side * w * 0.38;
        out.push({
          def: { kind: 'solid', art: 'arch' },
          aabb: makeAABB(x - half, y, p.z - half, x + half, y + h * 0.72, p.z + half),
        });
      }
    } else if (p.type === 'cactus') {
      out.push({ def: { kind: 'solid', art: 'cactus' }, aabb: cactusBox({ ...p, kind: 'saguaro' }, y) });
    }
  }
  return [...out, ...softScenery(level)];
}

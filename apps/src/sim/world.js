// Mundo: colliders del nivel, obstáculos y triggers (checkpoints, meta).
import { propCollider } from '../levels/kenneyColliders.js';
import { containsPoint, makeAABB, platformAABB } from './collision.js';
import { Geyser, MovingPlatform, Sweeper } from './hazards.js';

/** Trigger con forma de caja apoyada en `top` (alto `h`). */
function triggerAABB({ x, z, w, d, top, h = 4 }) {
  return makeAABB(x - w / 2, top - 0.5, z - d / 2, x + w / 2, top + h, z + d / 2);
}

// Hueco para darse la vuelta con la caja. Más atrás, el tope.
const BACK_GAP = 2.4;
const BACK_THICK = 0.45;
const BACK_HEIGHT = 2.8;

/** Muro invisible detrás del spawn: desde ahí solo se avanza hacia la meta (−Z). */
function backStop(level) {
  const s1 = level.spawn?.p1;
  const s2 = level.spawn?.p2;
  if (!s1 || !s2) return null;
  const z0 = Math.max(s1.z, s2.z);
  const floor = Math.min(s1.y, s2.y);
  const cx = (s1.x + s2.x) / 2;
  const cz = (s1.z + s2.z) / 2;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of level.platforms ?? []) {
    if (p.kind === 'glass') continue;
    if (Math.abs((p.top ?? floor) - floor) > 0.6) continue;
    if (cx < p.x - p.w / 2 || cx > p.x + p.w / 2 || cz < p.z - p.d / 2 || cz > p.z + p.d / 2) continue;
    minX = Math.min(minX, p.x - p.w / 2);
    maxX = Math.max(maxX, p.x + p.w / 2);
  }
  if (!Number.isFinite(minX)) {
    minX = cx - 6;
    maxX = cx + 6;
  }
  const face = z0 + BACK_GAP;
  return {
    def: { id: 'tope-inicio', kind: 'backstop' },
    floor,
    height: BACK_HEIGHT,
    aabb: makeAABB(minX - 0.3, floor - 2, face, maxX + 0.3, floor + BACK_HEIGHT, face + BACK_THICK),
  };
}

export class World {
  constructor(level) {
    this.level = level;
    this.waterLevel = level.waterLevel ?? 0;

    // `holes`: círculos del piso donde no hay suelo (islas de viento con `weather.holes`): se cae al agua.
    this.statics = level.platforms.map((p) => ({
      def: p,
      aabb: platformAABB({ ...p, h: p.h ?? p.top - this.waterLevel + 0.6 }),
      holes: p.weather?.holes,
    }));
    this.movers = (level.moving ?? []).map((m) => new MovingPlatform(m));
    this.sweepers = (level.sweepers ?? []).map((s) => new Sweeper(s));
    this.geysers = (level.geysers ?? []).map((g) => new Geyser(g));
    this.checkpoints = (level.checkpoints ?? []).map((c) => ({ def: c, aabb: triggerAABB(c), spawn: c.spawn }));
    this.goal = level.goal ? triggerAABB({ ...level.goal, h: 5 }) : null;

    // Escenografía Kenney que choca (barriles, cajas, rocas, troncos de palmera…). No se dibuja aquí: es del nivel.
    this.props = (level.scenery ?? [])
      .map((item) => ({ def: { kind: 'prop', art: item.art }, aabb: propCollider(item) }))
      .filter((p) => p.aabb);

    // Lista que usan las colisiones (los móviles actualizan su aabb en el lugar).
    this.backWall = backStop(level);
    this.colliders = [...this.statics, ...this.props, ...this.sweepers.map((s) => s.pillar), ...this.movers];
    if (this.backWall) this.colliders.push(this.backWall);
    this.update(0);
    for (const m of this.movers) m.sync(0);
  }

  update(time) {
    for (const m of this.movers) m.update(time);
    for (const s of this.sweepers) s.update(time);
    for (const g of this.geysers) g.update(time);
  }

  /** Reinicia los deltas de las plataformas (tras teletransportar jugadores). */
  syncMovers(time) {
    for (const m of this.movers) m.sync(time);
  }

  checkpointAt(p) {
    return this.checkpoints.findIndex((c) => containsPoint(c.aabb, p));
  }

  inGoal(p) {
    return this.goal ? containsPoint(this.goal, p) : false;
  }

  /** El vidrio normal desaparece al pisarlo. El templado se queda. */
  breakGlass(col) {
    if (!col?.def || col.def.kind !== 'glass' || col.def.tempered || col.broken) return false;
    col.broken = true;
    const i = this.colliders.indexOf(col);
    if (i >= 0) this.colliders.splice(i, 1);
    return true;
  }

  /** Vuelve a poner los paneles rotos (reinicio del nivel). */
  restoreGlass() {
    for (const s of this.statics) {
      if (s.def.kind !== 'glass' || !s.broken) continue;
      s.broken = false;
      if (!this.colliders.includes(s)) this.colliders.push(s);
    }
  }

  /** Altura del piso más alto bajo (x, z) que no esté por encima de `maxY`. -Infinity si no hay. */
  floorBelow(x, z, maxY) {
    let best = -Infinity;
    for (const c of this.colliders) {
      const a = c.aabb;
      if (x < a.min.x || x > a.max.x || z < a.min.z || z > a.max.z) continue;
      if (c.holes?.some((h) => Math.hypot(x - h.x, z - h.z) <= h.r)) continue;
      if (a.max.y <= maxY && a.max.y > best) best = a.max.y;
    }
    return best;
  }
}

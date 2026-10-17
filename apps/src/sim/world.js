// Mundo: colliders del nivel, obstáculos y triggers (checkpoints, meta).
import { containsPoint, makeAABB, platformAABB } from './collision.js';
import { Geyser, MovingPlatform, Sweeper } from './hazards.js';

/** Trigger con forma de caja apoyada en `top` (alto `h`). */
function triggerAABB({ x, z, w, d, top, h = 4 }) {
  return makeAABB(x - w / 2, top - 0.5, z - d / 2, x + w / 2, top + h, z + d / 2);
}

export class World {
  constructor(level) {
    this.level = level;
    this.waterLevel = level.waterLevel ?? 0;

    this.statics = level.platforms.map((p) => ({
      def: p,
      aabb: platformAABB({ ...p, h: p.h ?? p.top - this.waterLevel + 0.6 }),
    }));
    this.movers = (level.moving ?? []).map((m) => new MovingPlatform(m));
    this.sweepers = (level.sweepers ?? []).map((s) => new Sweeper(s));
    this.geysers = (level.geysers ?? []).map((g) => new Geyser(g));
    this.checkpoints = (level.checkpoints ?? []).map((c) => ({ def: c, aabb: triggerAABB(c), spawn: c.spawn }));
    this.goal = level.goal ? triggerAABB({ ...level.goal, h: 5 }) : null;

    // Lista que usan las colisiones (los móviles actualizan su aabb en el lugar).
    this.colliders = [...this.statics, ...this.sweepers.map((s) => s.pillar), ...this.movers];
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

  /** Altura del piso más alto bajo (x, z) que no esté por encima de `maxY`. -Infinity si no hay. */
  floorBelow(x, z, maxY) {
    let best = -Infinity;
    for (const c of this.colliders) {
      const a = c.aabb;
      if (x < a.min.x || x > a.max.x || z < a.min.z || z > a.max.z) continue;
      if (a.max.y <= maxY && a.max.y > best) best = a.max.y;
    }
    return best;
  }
}

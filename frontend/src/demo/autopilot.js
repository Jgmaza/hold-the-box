// Piloto automático para /gameplay: avanza en cualquier mapa, salta huecos/NPCs y pide reinicio al ganar/perder.

const IDLE = { x: 0, z: 0, jumpPressed: false, jumpHeld: false };

const hold = (base, sec) => {
  let left = 0;
  return {
    pulse(dt) {
      if (left <= 0) {
        left = sec;
        return { ...base, jumpPressed: true, jumpHeld: true };
      }
      left -= dt;
      return { ...base, jumpPressed: false, jumpHeld: left > 0 };
    },
    reset() {
      left = 0;
    },
  };
};

/** @param {import('../sim/game.js').Game} game */
function nearestNpc(game, kind) {
  let best = null;
  let bestD = Infinity;
  for (const n of game.npcs?.list ?? []) {
    if (kind && n.difficulty !== kind) continue;
    const dx = n.pos.x - game.box.center.x;
    const dz = n.pos.z - game.box.center.z;
    const d = Math.hypot(dx, dz);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best ? { npc: best, dist: bestD } : null;
}

/** ¿Hay piso bajo (x,z) a altura razonable de la caja? */
function hasFloor(game, x, z, y) {
  for (const s of game.world.statics) {
    const a = s.aabb;
    if (x < a.minX - 0.15 || x > a.maxX + 0.15 || z < a.minZ - 0.15 || z > a.maxZ + 0.15) continue;
    if (a.maxY >= y - 1.2 && a.maxY <= y + 0.6) return true;
  }
  for (const m of game.world.movers ?? []) {
    const a = m.aabb;
    if (!a) continue;
    if (x < a.minX - 0.15 || x > a.maxX + 0.15 || z < a.minZ - 0.15 || z > a.maxZ + 0.15) continue;
    if (a.maxY >= y - 1.2 && a.maxY <= y + 0.6) return true;
  }
  return false;
}

function gapAhead(game) {
  const { x, y, z } = game.box.center;
  // Probes hacia -Z (dirección de la meta en todos los mapas).
  return !hasFloor(game, x, z - 1.6, y) || !hasFloor(game, x, z - 2.4, y);
}

/**
 * @param {{ sideX?: number, endHoldSec?: number }} [opts]
 */
export function createAutopilot({ sideX = 0.7, endHoldSec = 2.2 } = {}) {
  const jump = hold({ x: 0, z: -1 }, 0.4);
  let endTimer = 0;
  let prevState = 'playing';

  return {
    endHoldSec,
    reset() {
      endTimer = 0;
      prevState = 'playing';
      jump.reset();
    },
    /** @param {import('../sim/game.js').Game} game @param {number} dt */
    frame(game, dt) {
      const state = game.state;
      if (state !== prevState) {
        endTimer = 0;
        jump.reset();
        prevState = state;
      }

      if (state === 'won') {
        endTimer += dt;
        // El boot cambia de mapa; no reiniciar el mismo con jump.
        if (endTimer >= endHoldSec) return [IDLE, IDLE, { advance: true }];
        return [IDLE, IDLE, { advance: false }];
      }
      if (state === 'failed') {
        endTimer += dt;
        if (endTimer >= endHoldSec) {
          const tap = { ...IDLE, jumpPressed: true };
          return [tap, tap, { advance: false }];
        }
        return [IDLE, IDLE, { advance: false }];
      }

      if (state !== 'playing') return [IDLE, IDLE, { advance: false }];

      const crab = nearestNpc(game, 'easy');
      const dog = nearestNpc(game, 'hard');
      const nearCrab = crab && crab.dist < 2.4 && crab.npc.pos.z < game.box.center.z + 0.5 && crab.npc.pos.z > game.box.center.z - 3.5;
      const dogClose = dog && dog.dist < 3.2;
      const dogDash =
        dog && dog.dist < 5 && (dog.npc.state === 'attack' || dog.npc.phase === 'windup' || dog.npc.phase === 'dash');
      const air = !game.p1.grounded || !game.p2.grounded;
      const gap = gapAhead(game);

      let move = { x: 0, z: -1, jumpPressed: false, jumpHeld: false };
      if (gap || nearCrab || dogDash || air) move = jump.pulse(dt);
      else jump.reset();

      const steer = (p, side) => {
        let targetX = side * sideX;
        if (dogClose) targetX = side * 2.4;
        const dx = targetX - p.pos.x;
        const x = Math.abs(dx) > 0.2 ? Math.sign(dx) : 0;
        return { ...move, x: x || move.x };
      };

      return [steer(game.p1, -1), steer(game.p2, 1), { advance: false }];
    },
  };
}

/** Los 3 biomas del menú (mar / selva / desierto) para la demo en bucle. */
export const DEMO_ROTATION = ['muelle', 'aldea', 'campamento'];

export function nextDemoMap(current) {
  const i = DEMO_ROTATION.indexOf(current);
  return DEMO_ROTATION[i < 0 ? 0 : (i + 1) % DEMO_ROTATION.length];
}

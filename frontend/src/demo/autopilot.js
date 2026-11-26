// Piloto automático para /gameplay: caminan juntos, saltan cangrejo/hueco y esquivan al perro.

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

/**
 * @param {{ gapFrom?: number, gapTo?: number, sideX?: number, endHoldSec?: number }} [opts]
 */
export function createAutopilot({ gapFrom = 1.2, gapTo = -3.2, sideX = 0.7, endHoldSec = 2.2 } = {}) {
  const jump = hold({ x: 0, z: -1 }, 0.4);
  let endTimer = 0;
  let prevState = 'playing';

  return {
    /** @param {import('../sim/game.js').Game} game @param {number} dt */
    frame(game, dt) {
      const state = game.state;
      if (state !== prevState) {
        endTimer = 0;
        jump.reset();
        prevState = state;
      }

      if (state === 'won' || state === 'failed') {
        endTimer += dt;
        if (endTimer >= endHoldSec) {
          const tap = { ...IDLE, jumpPressed: true };
          return [tap, tap];
        }
        return [IDLE, IDLE];
      }

      if (state !== 'playing') return [IDLE, IDLE];

      const z = game.box.center.z;
      const crab = nearestNpc(game, 'easy');
      const dog = nearestNpc(game, 'hard');
      const nearGap = z < gapFrom && z > gapTo;
      // Cangrejo: saltarlo cuando está cerca y delante / encima del camino.
      const nearCrab = crab && crab.dist < 2.4 && crab.npc.pos.z < z + 0.5 && crab.npc.pos.z > z - 3.5;
      // Perro: saltar o abrirse si embiste / está muy cerca.
      const dogClose = dog && dog.dist < 3.2;
      const dogDash =
        dog && dog.dist < 5 && (dog.npc.state === 'attack' || dog.npc.phase === 'windup' || dog.npc.phase === 'dash');
      const air = !game.p1.grounded || !game.p2.grounded;

      let move = { x: 0, z: -1, jumpPressed: false, jumpHeld: false };
      if (nearGap || nearCrab || dogDash || air) move = jump.pulse(dt);
      else jump.reset();

      const steer = (p, side) => {
        // Ante el perro, abrirse a los bordes; si no, mantenerse a los lados de la caja.
        let targetX = side * sideX;
        if (dogClose) targetX = side * 2.4;
        const dx = targetX - p.pos.x;
        const x = Math.abs(dx) > 0.2 ? Math.sign(dx) : 0;
        return { ...move, x: x || move.x };
      };

      return [steer(game.p1, -1), steer(game.p2, 1)];
    },
  };
}

// Piloto automático para /gameplay: los dos caminan juntos hacia -Z, saltan el hueco y reinician al ganar/perder.

const IDLE = { x: 0, z: 0, jumpPressed: false, jumpHeld: false };
const hold = (base, sec) => {
  // Evita spam de jumpPressed: solo el primer frame del gesto.
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

/**
 * @param {{ gapFrom?: number, gapTo?: number, sideX?: number, endHoldSec?: number }} [opts]
 * gapFrom/gapTo: ventana de Z de la caja donde hay que saltar (hacia -Z).
 */
export function createAutopilot({ gapFrom = 6.5, gapTo = 2.2, sideX = 0.55, endHoldSec = 2.2 } = {}) {
  const jump = hold({ x: 0, z: -1 }, 0.35);
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
      const nearGap = z < gapFrom && z > gapTo;
      const air = !game.p1.grounded || !game.p2.grounded;

      let move = { x: 0, z: -1, jumpPressed: false, jumpHeld: false };
      if (nearGap || air) move = jump.pulse(dt);
      else jump.reset();

      // Mantenerse a los lados de la caja para no apilarse.
      const steer = (p, side) => {
        const dx = side * sideX - p.pos.x;
        const x = Math.abs(dx) > 0.25 ? Math.sign(dx) : 0;
        return { ...move, x: x || move.x };
      };

      return [steer(game.p1, -1), steer(game.p2, 1)];
    },
  };
}

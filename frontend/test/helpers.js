// Helpers para correr la simulación sin navegador.
import { CONFIG } from '../src/config.js';
import { Game } from '../src/sim/game.js';
import level1 from '../src/levels/level1.js';

export const IDLE = { x: 0, z: 0, jumpPressed: false };
export const FWD = { x: 0, z: -1, jumpPressed: false };
export const BACK = { x: 0, z: 1, jumpPressed: false };
export const LEFT = { x: -1, z: 0, jumpPressed: false };
export const RIGHT = { x: 1, z: 0, jumpPressed: false };
export const jump = (base = IDLE) => ({ ...base, jumpPressed: true });

/** Juego ya en estado 'playing'. */
export function playingGame(level = level1) {
  const g = new Game(level);
  g.setInputs(jump(), jump());
  return g;
}

/**
 * Corre `seconds` de simulación a 60 fps con inputs fijos (o funciones (t) => input).
 * `jumpPressed` solo se envía en el primer frame. Devuelve muestras por frame.
 */
export function run(game, seconds, in1, in2, onFrame) {
  const dt = 1 / 60;
  const frames = Math.round(seconds / dt);
  const samples = [];
  for (let i = 0; i < frames; i++) {
    const t = i * dt;
    const a = typeof in1 === 'function' ? in1(t, i) : i === 0 ? in1 : { ...in1, jumpPressed: false };
    const b = typeof in2 === 'function' ? in2(t, i) : i === 0 ? in2 : { ...in2, jumpPressed: false };
    game.setInputs(a, b);
    game.update(dt);
    const s = {
      t,
      state: game.state,
      boxState: game.box.state,
      mag: game.box.tilt.mag,
      sync: game.box.sync,
      integrity: game.box.integrity,
      wetness: game.box.wetness,
      center: { ...game.box.center },
    };
    samples.push(s);
    onFrame?.(s, game);
  }
  return samples;
}

export const maxOf = (samples, key) => samples.reduce((m, s) => Math.max(m, s[key]), -Infinity);

export { CONFIG, Game, level1 };

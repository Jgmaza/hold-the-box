import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config.js';
import { createAutopilot } from '../src/demo/autopilot.js';
import demo from '../src/levels/demo.js';
import { Game } from '../src/sim/game.js';

describe('demo autopilot', () => {
  it('pasa cangrejo y perro, llega a la meta y reinicia', () => {
    CONFIG.debug.godMode = true;
    const game = new Game(demo, { seed: 42 });
    game.start();
    expect(game.npcs.list.map((n) => n.difficulty).sort()).toEqual(['easy', 'hard']);
    const bots = createAutopilot({ endHoldSec: 0.05 });
    const dt = 1 / 60;
    let won = false;
    for (let i = 0; i < 60 * 90; i++) {
      const [a, b] = bots.frame(game, dt);
      game.setInputs(a, b);
      game.update(dt);
      if (game.state === 'won') {
        won = true;
        break;
      }
    }
    expect(won).toBe(true);

    for (let i = 0; i < 20; i++) {
      const [a, b] = bots.frame(game, dt);
      game.setInputs(a, b);
      game.update(dt);
    }
    expect(game.state).toBe('playing');
    CONFIG.debug.godMode = false;
  });
});

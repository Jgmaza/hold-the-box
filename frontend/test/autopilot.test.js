import { describe, expect, it } from 'vitest';
import { createAutopilot } from '../src/demo/autopilot.js';
import demo from '../src/levels/demo.js';
import { Game } from '../src/sim/game.js';

describe('demo autopilot', () => {
  it('llega a la meta y puede reiniciar el bucle', () => {
    const game = new Game(demo, { seed: 42 });
    game.start();
    const bots = createAutopilot({ endHoldSec: 0.05 });
    const dt = 1 / 60;
    let won = false;
    for (let i = 0; i < 60 * 45; i++) {
      const [a, b] = bots.frame(game, dt);
      game.setInputs(a, b);
      game.update(dt);
      if (game.state === 'won') {
        won = true;
        break;
      }
    }
    expect(won).toBe(true);

    // Esperar el hold y pulsar salto → restart
    for (let i = 0; i < 20; i++) {
      const [a, b] = bots.frame(game, dt);
      game.setInputs(a, b);
      game.update(dt);
    }
    expect(game.state).toBe('playing');
  });
});

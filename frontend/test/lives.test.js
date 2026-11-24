// Vidas por partida (#41): cada caída al agua y cada caja perdida gasta una. Con vidas reaparecen solos en el
// checkpoint; sin vidas sale la pantalla de derrota y se empieza desde la salida.
import { describe, expect, it } from 'vitest';
import { CONFIG, IDLE, level1, playingGame, run } from './helpers.js';

const W = CONFIG.box.wet;

/** Corre hasta que termine la derrota / reaparición. */
const settle = (g) => run(g, CONFIG.respawn.failDelay + CONFIG.respawn.fadeTime + 0.3, IDLE, IDLE);

/** Tira a P1 al agua y espera a que reaparezcan. */
const fall = (g) => {
  g.p1.pos.y = -20;
  run(g, CONFIG.respawn.fadeTime + 0.2, IDLE, IDLE);
};

const livesLog = (g) => {
  const log = [];
  g.events.on('game:life', (e) => log.push(e));
  return log;
};

describe('vidas', () => {
  it('arranca con 3 vidas', () => {
    expect(CONFIG.respawn.lives).toBe(3);
    expect(playingGame().lives).toBe(3);
  });

  it('caer al agua gasta una vida y reaparecen en el checkpoint con la caja mojada', () => {
    const g = playingGame();
    g.teleport(0);
    const log = livesLog(g);
    fall(g);
    expect(log).toEqual([{ lives: 2, cause: 'fell' }]);
    expect(g.state).toBe('playing');
    expect(g.box.wetness).toBeGreaterThan(W.fallPenalty - 2);
    expect(g.p1.pos.z).toBeCloseTo(level1.checkpoints[0].spawn.p1.z);
  });

  it('caerse varias veces va bajando los corazones', () => {
    const g = playingGame();
    fall(g);
    g.box.wetness = 0;
    fall(g);
    expect(g.lives).toBe(1);
  });

  it('perder la caja (vacía) gasta una vida y reaparecen solos con la caja del checkpoint', () => {
    const g = playingGame();
    g.teleport(0);
    g.checkpointSnapshot = { integrity: 70, wetness: 5, bomb: 100 };
    const log = livesLog(g);
    let screen = 0;
    g.events.on('game:fail', () => screen++);
    g.box.integrity = 0;
    settle(g);
    expect(log).toEqual([{ lives: 2, cause: 'empty' }]);
    expect(screen).toBe(0);
    expect(g.state).toBe('playing');
    expect(g.box.integrity).toBe(70);
  });

  it('una caída que empapa la caja gasta UNA sola vida', () => {
    const g = playingGame();
    g.box.wetness = 90;
    const log = livesLog(g);
    fall(g);
    settle(g);
    expect(log).toHaveLength(1);
    expect(g.lives).toBe(2);
    expect(g.state).toBe('playing');
    expect(g.box.wetness).toBe(0); // volvió como estaba en la salida
  });

  it('sin vidas sale la pantalla de derrota y "empezar de nuevo" vuelve a la salida con 3 vidas', () => {
    const g = playingGame();
    g.teleport(1);
    let fail = null;
    g.events.on('game:fail', (e) => (fail = e));
    fall(g);
    g.box.integrity = 0;
    settle(g);
    expect(g.lives).toBe(1);
    fall(g);
    run(g, CONFIG.respawn.failDelay + 0.2, IDLE, IDLE);
    expect(g.state).toBe('failed');
    expect(fail).toMatchObject({ reason: 'fell', lives: 0, gameOver: true });
    g.retry();
    expect(g.state).toBe('playing');
    expect(g.lives).toBe(3);
    expect(g.checkpointIndex).toBe(-1);
    expect(g.box.integrity).toBe(100);
  });

  it('reiniciar el nivel devuelve las 3 vidas', () => {
    const g = playingGame();
    fall(g);
    g.restart();
    expect(g.lives).toBe(3);
  });
});

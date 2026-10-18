// Escenarios de juego completos sobre el nivel 1 (sin navegador).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { selectBox } from '../src/config.js';
import { Box } from '../src/sim/box.js';
import { BACK, CONFIG, FWD, Game, IDLE, LEFT, jump, level1, maxOf, playingGame, run } from './helpers.js';

// Estos escenarios prueban la caja y el nivel; NPCs y clima se prueban en npcs.test.js y weather.test.js.
beforeEach(() => {
  CONFIG.npcs.enabled = false;
  CONFIG.weather.enabled = false;
});

/** Índice de un checkpoint del nivel 1 por id (el orden cambia si se agregan checkpoints). */
const cpIndex = (id) => level1.checkpoints.findIndex((c) => c.id === id);

afterEach(() => {
  CONFIG.debug.godMode = false;
  CONFIG.npcs.enabled = true;
  selectBox('vip');
  CONFIG.weather.enabled = true;
});

describe('título', () => {
  it('empieza solo cuando los dos pulsan salto', () => {
    const g = new Game(level1);
    g.setInputs(jump(), IDLE);
    expect(g.state).toBe('title');
    expect(g.ready).toEqual({ p1: true, p2: false });
    g.setInputs(IDLE, jump());
    expect(g.state).toBe('playing');
  });
});

describe('sincronía', () => {
  it('quietos = 1, uno solo = soloValue, opuestos = 0', () => {
    expect(Box.syncFromInputs(IDLE, IDLE)).toBe(1);
    expect(Box.syncFromInputs(FWD, IDLE)).toBe(CONFIG.box.sync.soloValue);
    expect(Box.syncFromInputs(FWD, FWD)).toBe(1);
    expect(Box.syncFromInputs(FWD, BACK)).toBe(0);
  });
});

describe('caja compartida', () => {
  it('caminar sincronizados: la caja va derecha y van rápido', () => {
    const g = playingGame();
    const z0 = g.box.center.z;
    const s = run(g, 1.2, FWD, FWD);
    expect(maxOf(s, 'mag')).toBeLessThan(CONFIG.box.tilt.tiltingDeg);
    expect(s.every((x) => x.boxState === 'upright')).toBe(true);
    expect(z0 - g.box.center.z).toBeGreaterThan(5); // > 5 m en 1.2 s
  });

  it('si solo uno camina, van más lento y la caja se inclina', () => {
    const solo = playingGame();
    const z0 = solo.box.center.z;
    const s = run(solo, 1.2, FWD, IDLE);
    expect(z0 - solo.box.center.z).toBeLessThan(4);
    expect(maxOf(s, 'mag')).toBeGreaterThan(CONFIG.box.tilt.tiltingDeg);
    expect(solo.state).toBe('playing');
  });

  it('saltar solo: se inclina pero no la sueltan', () => {
    const g = playingGame();
    const s = run(g, 2, jump(), IDLE);
    expect(maxOf(s, 'mag')).toBeGreaterThan(CONFIG.box.tilt.tiltingDeg);
    expect(g.state).toBe('playing');
    expect(g.box.dropped).toBe(false);
  });

  it('saltar juntos: la caja casi no se mueve', () => {
    const g = playingGame();
    const s = run(g, 1.5, jump(), jump());
    expect(maxOf(s, 'mag')).toBeLessThan(CONFIG.box.tilt.tiltingDeg);
  });

  it('saltar con 0.1 s de diferencia todavía es manejable', () => {
    const g = playingGame();
    const s = run(g, 1.5, (t, i) => (i === 0 ? jump() : IDLE), (t, i) => (i === 6 ? jump() : IDLE));
    expect(maxOf(s, 'mag')).toBeLessThan(CONFIG.box.tilt.criticalDeg);
  });

  it('tirar en direcciones opuestas: ¡Soltaron la caja!', () => {
    const g = playingGame();
    let fail = null;
    g.events.on('game:fail', (e) => (fail = e));
    run(g, 4, FWD, BACK);
    expect(g.box.dropped).toBe(true);
    expect(g.state).toBe('failed');
    expect(fail.reason).toBe('dropped');
  });

  it('el huequito vacía la caja con la inclinación', () => {
    const g = playingGame();
    const before = g.box.integrity;
    run(g, 1.5, FWD, IDLE);
    expect(g.box.integrity).toBeLessThan(before);
  });
});

describe('agua, respawn y derrotas', () => {
  it('caer al agua: respawn en la salida y +30% mojada', () => {
    const g = playingGame();
    let splash = 0;
    let respawn = 0;
    g.events.on('game:splash', () => splash++);
    g.events.on('game:respawn', () => respawn++);
    run(g, 3, LEFT, LEFT);
    expect(splash).toBeGreaterThanOrEqual(1);
    expect(respawn).toBeGreaterThanOrEqual(1);
    expect(g.box.wetness).toBeGreaterThan(20);
    expect(g.state).toBe('playing');
  });

  it('contenido en 0 → derrota "empty"', () => {
    const g = playingGame();
    g.box.integrity = 0;
    run(g, 2, IDLE, IDLE);
    expect(g.state).toBe('failed');
    expect(g.failReason).toBe('empty');
  });

  it('mojado al 100% → derrota "soaked"', () => {
    const g = playingGame();
    g.box.wetness = 100;
    run(g, 2, IDLE, IDLE);
    expect(g.state).toBe('failed');
    expect(g.failReason).toBe('soaked');
  });

  it('reintentar tras la derrota vuelve al checkpoint con la caja guardada', () => {
    const g = playingGame();
    g.teleport(0);
    g.checkpointSnapshot = { integrity: 80, wetness: 10 };
    g.box.integrity = 0;
    run(g, 2, IDLE, IDLE);
    expect(g.state).toBe('failed');
    g.setInputs(jump(), IDLE);
    expect(g.state).toBe('playing');
    expect(g.box.integrity).toBe(80);
    expect(g.p1.pos.z).toBeCloseTo(level1.checkpoints[0].spawn.p1.z);
  });

  it('el modo dios evita la derrota', () => {
    CONFIG.debug.godMode = true;
    const g = playingGame();
    run(g, 4, FWD, BACK);
    expect(g.state).toBe('playing');
  });
});

describe('checkpoints y meta', () => {
  it('pasar la caja por un checkpoint lo activa', () => {
    const g = playingGame();
    const got = [];
    g.events.on('game:checkpoint', (e) => got.push(e.index));
    g.teleport(-1);
    // Colocar a los jugadores justo antes del CP1 y caminar hacia él.
    g._placeAtSpawn({ p1: { x: -0.8, y: 1, z: -26.5 }, p2: { x: 0.8, y: 1, z: -26.5 } });
    run(g, 0.6, FWD, FWD);
    expect(got).toContain(cpIndex('cp1'));
    expect(g.checkpointIndex).toBe(cpIndex('cp1'));
  });

  it('llegar a la meta con la caja → victoria con calificación', () => {
    const g = playingGame();
    let win = null;
    g.events.on('game:win', (e) => (win = e));
    g.teleport('goal');
    run(g, 2, FWD, FWD);
    expect(g.state).toBe('won');
    expect(win.rating).toBe('perfect');
    expect(win.time).toBeGreaterThan(0);
  });
});

describe('obstáculos', () => {
  it('el elevador sube a los dos pegados al piso (sin rebotar)', () => {
    const g = playingGame();
    const el = g.world.movers.find((m) => m.def.id === 'elevador');
    g.teleport({ p1: { x: -0.8, y: el.pos.top, z: el.pos.z }, p2: { x: 0.8, y: el.pos.top, z: el.pos.z } });
    let lands = 0;
    g.events.on('player:land', () => lands++);
    let maxTop = 0;
    run(g, 4, IDLE, IDLE, (s, gg) => {
      maxTop = Math.max(maxTop, el.pos.top);
      expect(gg.p1.grounded && gg.p2.grounded).toBe(true);
    });
    expect(maxTop).toBeGreaterThan(4.9);
    expect(lands).toBe(0);
  });

  it('el rodillo golpea a quien no salta y le quita contenido a la caja', () => {
    const g = playingGame();
    let hits = 0;
    g.events.on('hazard:hit', () => hits++);
    g.teleport(cpIndex('cp1'));
    run(g, 3, FWD, FWD);
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(g.box.integrity).toBeLessThan(100);
  });
});

describe('gato', () => {
  it('solo hay dos cajas y la VIP no trae gato', () => {
    expect(selectBox('vip').id).toBe('vip');
    expect(CONFIG.box.cat.enabled).toBe(false);
    expect(selectBox('gato').name).toBe('Caja del gato');
    expect(CONFIG.box.cat.enabled).toBe(true);
    expect(selectBox('otra')).toMatchObject({ id: 'vip' });
  });

  it('araña a un lado si uno va más lento y la caja se inclina', () => {
    selectBox('gato');
    const g = playingGame();
    let scratch = null;
    g.events.on('cat:scratch', (e) => (scratch = e));
    run(g, 5, FWD, { x: 0, z: -0.4, jumpPressed: false });
    expect(scratch).not.toBeNull();
    expect([1, 2]).toContain(scratch.player);
  });

  it('cada zarpazo quita %; el huequito no gotea', () => {
    selectBox('gato');
    const g = playingGame();
    g.cat.rage = CONFIG.box.cat.scratchRage;
    run(g, 0.3, IDLE, IDLE);
    expect(g.box.integrity).toBeCloseTo(100 - CONFIG.box.cat.scratchDamage);
    run(g, 1.2, FWD, { x: 0, z: -0.4, jumpPressed: false });
    expect(g.box.leakRate).toBe(0);
    expect(g.box.integrity).toBeCloseTo(100 - CONFIG.box.cat.scratchDamage);
  });

  it('no araña si caminan juntos, pero la rabia ya sube', () => {
    selectBox('gato');
    const g = playingGame();
    let n = 0;
    g.events.on('cat:scratch', () => n++);
    run(g, 1, FWD, FWD);
    expect(n).toBe(0);
    expect(g.cat.phase).toBe('calm');
    expect(g.cat.rage).toBeGreaterThan(1);
    expect(g.cat.rage).toBeLessThan(CONFIG.box.cat.warnRage);
  });

  it('en la meta, quedarse quieto vacía la caja', () => {
    selectBox('gato');
    const g = playingGame();
    g.teleport('goal');
    run(g, 7.5, IDLE, IDLE);
    expect(g.box.integrity).toBe(0);
    expect(g.state).toBe('failed');
    expect(g.failReason).toBe('empty');
  });

  it('en la meta, cruzar corriendo no la vacía', () => {
    selectBox('gato');
    const g = playingGame();
    g.teleport('goal');
    run(g, 1.5, FWD, FWD);
    expect(g.state).not.toBe('failed');
    expect(g.box.integrity).toBeGreaterThan(70);
  });

  it('la bomba no pierde nada con el tiempo si van juntos y quietos', () => {
    selectBox('bomba');
    const g = playingGame();
    run(g, 5, IDLE, IDLE);
    expect(g.bomb.health).toBe(100);
    expect(g.state).toBe('playing');
  });

  it('la bomba explota cuando llega a 0 %', () => {
    selectBox('bomba');
    const g = playingGame();
    expect(g.cat.phase).toBe('calm');
    g.bomb.health = 5;
    let boom = 0;
    g.events.on('bomb:explode', () => boom++);
    g.box.damage(10, 'sweeper');
    run(g, 2, IDLE, IDLE);
    expect(boom).toBe(1);
    expect(g.failReason).toBe('exploded');
    expect(g.state).toBe('failed');
  });

  it('con la bomba, reintentar vuelve con el % que tenía en el checkpoint', () => {
    selectBox('bomba');
    const g = playingGame();
    g.teleport(0);
    g.checkpointSnapshot = { integrity: 100, wetness: 0, bomb: 62 };
    g.bomb.health = 1;
    g.box.damage(5, 'sweeper');
    run(g, 2, IDLE, IDLE);
    expect(g.failReason).toBe('exploded');
    g.setInputs(jump(), IDLE);
    expect(g.state).toBe('playing');
    expect(g.bomb.health).toBe(62);
    expect(g.bomb.exploded).toBe(false);
  });

  it('la bomba no explota si llegan a la meta', () => {
    selectBox('bomba');
    const g = playingGame();
    g.teleport('goal');
    run(g, 1.5, FWD, FWD);
    expect(g.bomb.exploded).toBe(false);
    expect(g.state).not.toBe('failed');
  });

  it('con la bomba, golpes y agua le quitan % sin tocar contenido ni mojado', () => {
    selectBox('bomba');
    const g = playingGame();
    const B = CONFIG.box.bomb;
    const hits = [];
    g.events.on('bomb:hit', (e) => hits.push(e));
    g.box.damage(10, 'sweeper');
    g.box.addWet(20, 'fall');
    expect(g.bomb.health).toBeCloseTo(100 - 10 - 20 * B.wetFactor);
    expect(hits.map((h) => h.cause)).toEqual(['sweeper', 'fall']);
    expect(g.box.integrity).toBe(100);
    expect(g.box.wetness).toBe(0);
  });

  it('con la bomba, ir desincronizados le quita %', () => {
    selectBox('bomba');
    const together = playingGame();
    run(together, 2, FWD, FWD);
    expect(together.bomb.health).toBe(100);
    let warned = 0;
    const alone = playingGame();
    alone.events.on('bomb:desync', () => warned++);
    run(alone, 1.5, FWD, IDLE);
    expect(alone.box.dropped).toBe(false);
    expect(alone.bomb.health).toBeLessThan(99);
    expect(warned).toBeGreaterThan(0);
  });

  it('la caja bomba no gotea aunque vaya inclinada', () => {
    selectBox('bomba');
    const g = playingGame();
    run(g, 1.5, FWD, { x: 0, z: -0.4, jumpPressed: false });
    expect(g.box.integrity).toBe(100);
    expect(g.box.leakRate).toBe(0);
  });

  it('con la bomba, la calificación sale de la vida que sobra', () => {
    selectBox('bomba');
    const g = playingGame();
    g.teleport('goal');
    g.bomb.health = 30;
    run(g, 1.5, FWD, FWD);
    expect(g.state).toBe('won');
    expect(g.result.bombHealth).toBeCloseTo(30, 0);
    expect(g.result.rating).toBe('damaged');
  });

  it('apagado no araña ni cambia la derrota de siempre', () => {
    selectBox('vip');
    const g = playingGame();
    let n = 0;
    let fail = null;
    g.events.on('cat:scratch', () => n++);
    g.events.on('game:fail', (e) => (fail = e));
    run(g, 4, FWD, BACK);
    expect(n).toBe(0);
    expect(g.box.dropped).toBe(true);
    expect(fail.reason).toBe('dropped');
  });
});

describe('nivel 1', () => {
  const floorAt = (g, p) => g.world.floorBelow(p.x, p.z, p.y + 0.01);

  it('los puntos de aparición están sobre suelo', () => {
    const g = new Game(level1);
    const spawns = [level1.spawn, ...level1.checkpoints.map((c) => c.spawn)];
    for (const s of spawns) {
      expect(floorAt(g, s.p1)).toBeCloseTo(s.p1.y);
      expect(floorAt(g, s.p2)).toBeCloseTo(s.p2.y);
    }
  });

  it('la meta está sobre la terraza', () => {
    const g = new Game(level1);
    const goal = level1.goal;
    expect(floorAt(g, { x: goal.x, y: goal.top, z: goal.z })).toBeCloseTo(goal.top);
  });
});

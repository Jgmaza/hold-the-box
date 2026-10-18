import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { selectBox } from '../src/config.js';
import { RecoveryStation } from '../src/sim/recovery.js';
import { CONFIG, IDLE, playingGame, run } from './helpers.js';

const tinyLevel = {
  id: 'recovery-test',
  name: 'Recovery Test',
  theme: 'pier',
  biome: null,
  waterLevel: 0,
  spawn: { p1: { x: -0.8, y: 1, z: 0 }, p2: { x: 0.8, y: 1, z: 0 } },
  platforms: [{ id: 'floor', x: 0, z: 0, w: 12, d: 12, top: 1, h: 1 }],
  checkpoints: [],
  recovery: [{ id: 'rec', kind: 'refill', x: 0, z: 0, top: 1, w: 4, d: 4 }],
  goal: { x: 0, z: -20, w: 4, d: 2, top: 1 },
};

const dryLevel = {
  ...tinyLevel,
  id: 'recovery-dry',
  recovery: [{ id: 'fans', kind: 'dry', x: 0, z: 0, top: 1, w: 4, d: 4 }],
};

beforeEach(() => {
  CONFIG.npcs.enabled = false;
  CONFIG.weather.enabled = false;
  selectBox('vip');
});

afterEach(() => {
  selectBox('vip');
  CONFIG.npcs.enabled = true;
  CONFIG.weather.enabled = true;
});

describe('RecoveryStation', () => {
  it('VIP en la fuente sube integrity, no baja', () => {
    const st = new RecoveryStation({ id: 'r', kind: 'refill', x: 0, z: 0, w: 4, d: 4 });
    st.active = true;
    const g = playingGame(tinyLevel);
    g.box.integrity = 40;
    const before = g.box.integrity;
    const out = st.apply(1, g.box, g.cat);
    expect(out.refill).toBeGreaterThan(0);
    expect(g.box.integrity).toBeGreaterThan(before);
    expect(g.box.integrity).toBeLessThanOrEqual(100);
    expect(out.kinds).toContain('refill');
  });

  it('abanicos bajan wetness y dejan integrity intacta', () => {
    const st = new RecoveryStation({ id: 'r', kind: 'dry', x: 0, z: 0, w: 4, d: 4 });
    st.active = true;
    const g = playingGame(tinyLevel);
    g.box.integrity = 55;
    g.box.wetness = 80;
    const out = st.apply(1, g.box, g.cat);
    expect(out.dry).toBeGreaterThan(0);
    expect(g.box.wetness).toBeLessThan(80);
    expect(g.box.integrity).toBe(55);
    expect(out.kinds).toContain('dry');
  });

  it('gato: baja rage y no emite box:impact', () => {
    selectBox('gato');
    const st = new RecoveryStation({ id: 'r', kind: 'cat', x: 0, z: 0, w: 4, d: 4 });
    st.active = true;
    const g = playingGame(tinyLevel);
    g.cat.rage = 70;
    let impacts = 0;
    g.events.on('box:impact', () => impacts++);
    const out = st.apply(1, g.box, g.cat);
    expect(out.catCalm).toBeGreaterThan(0);
    expect(g.cat.rage).toBeLessThan(70);
    expect(impacts).toBe(0);
    expect(out.kinds).toContain('cat');
  });

  it('bomba: la mesa de taller sube health', () => {
    selectBox('bomba');
    const st = new RecoveryStation({ id: 'r', kind: 'bomb', x: 0, z: 0, w: 4, d: 4 });
    st.active = true;
    const g = playingGame(tinyLevel);
    g.bomb.health = 40;
    const out = st.apply(1, g.box, g.cat);
    expect(out.bombHeal).toBeGreaterThan(0);
    expect(g.bomb.health).toBeGreaterThan(40);
    expect(out.kinds).toContain('bomb');
  });

  it('el aparato equivocado no hace nada', () => {
    selectBox('gato');
    const beer = new RecoveryStation({ id: 'r', kind: 'refill', x: 0, z: 0, w: 4, d: 4 });
    beer.active = true;
    const g = playingGame(tinyLevel);
    g.box.integrity = 50;
    g.cat.rage = 60;
    const out = beer.apply(1, g.box, g.cat);
    expect(out.refill).toBe(0);
    expect(out.catCalm).toBe(0);
    expect(g.box.integrity).toBe(50);
    expect(g.cat.rage).toBe(60);
  });

  it('fuera de zona: sin cambios', () => {
    const st = new RecoveryStation({ id: 'r', kind: 'refill', x: 0, z: 0, w: 4, d: 4 });
    st.active = false;
    const g = playingGame(tinyLevel);
    g.box.integrity = 50;
    g.box.wetness = 50;
    const out = st.apply(1, g.box, g.cat);
    expect(out.refill).toBe(0);
    expect(out.dry).toBe(0);
    expect(g.box.integrity).toBe(50);
    expect(g.box.wetness).toBe(50);
  });
});

describe('Game + recovery', () => {
  it('entrar a la fuente emite recovery:enter y recarga', () => {
    const g = playingGame(tinyLevel);
    g.box.integrity = 30;
    let entered = null;
    g.events.on('recovery:enter', (e) => (entered = e));
    run(g, 0.5, IDLE, IDLE);
    expect(entered).toEqual({ id: 'rec', kind: 'refill', profile: 'vip' });
    expect(g.box.integrity).toBeGreaterThan(30);
    expect(g.world.recovery[0].active).toBe(true);
  });

  it('abanicos no vacían contenido', () => {
    const g = playingGame(dryLevel);
    g.box.integrity = 60;
    g.box.wetness = 90;
    run(g, 0.8, IDLE, IDLE);
    expect(g.box.wetness).toBeLessThan(90);
    expect(g.box.integrity).toBe(60);
  });
});

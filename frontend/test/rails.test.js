// Rieles asimétricos: geometría de railsPair, piedras, huecos, arena y Muelle (sin navegador).
import { describe, expect, it } from 'vitest';
import railsArena from './fixtures/railsArena.js';
import {
  RAILS_BEATS,
  RAILS_DEFAULT_LENGTH,
  RAILS_GAP,
  RAILS_ROCK_H,
  railsBeats,
  railsPair,
} from '../src/levels/sections.js';
import { FWD, Game, IDLE, jump, level1, run } from './helpers.js';

const hazardCount = (beats) =>
  ['p1', 'p2'].reduce((n, lane) => n + beats[lane].rocks.length + beats[lane].gaps.length + beats[lane].bumps.length, 0);

/** Nivel mínimo: pad + rieles + pad. Spawn en la entrada de los rieles. */
const railsLevel = (from = 0, length = RAILS_DEFAULT_LENGTH) => ({
  id: 'test-rieles',
  waterLevel: 0,
  spawn: { p1: { x: -0.8, y: 1, z: from - 0.5 }, p2: { x: 0.8, y: 1, z: from - 0.5 } },
  platforms: [
    { id: 'pad', x: 0, z: from + 2, w: 8, d: 6, top: 1 },
    ...railsPair({ id: 'rieles', from, length }),
    { id: 'out', x: 0, z: from - length - 4, w: 8, d: 6, top: 1 },
  ],
});

const start = (level) => {
  const g = new Game(level);
  g.setInputs(jump(), jump());
  return g;
};

describe('railsPair', () => {
  it('arma dos carriles a ±laneX con segmentos plank y obstáculos rock/bump', () => {
    const plats = railsPair({ id: 'r', from: 0, length: 28 });
    const left = plats.filter((p) => p.x < 0);
    const right = plats.filter((p) => p.x > 0);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(plats.filter((p) => p.kind === 'plank').length).toBeGreaterThanOrEqual(4);
    expect(plats.filter((p) => p.kind === 'rock')).toHaveLength(RAILS_BEATS.p1.rocks.length + RAILS_BEATS.p2.rocks.length);
    expect(plats.filter((p) => p.kind === 'bump')).toHaveLength(RAILS_BEATS.p2.bumps.length);
    expect(plats.filter((p) => p.kind === 'plank').every((p) => Math.abs(Math.abs(p.x) - 0.8) < 0.01)).toBe(true);
  });

  it('coloca piedras y huecos en los beats del sheet (desfasados por carril)', () => {
    const from = 10;
    const plats = railsPair({ id: 'r', from, length: 28 });
    for (const t of RAILS_BEATS.p1.rocks) {
      expect(plats.some((p) => p.kind === 'rock' && p.x < 0 && Math.abs(p.z - (from - t)) < 0.05)).toBe(true);
    }
    for (const t of RAILS_BEATS.p2.rocks) {
      expect(plats.some((p) => p.kind === 'rock' && p.x > 0 && Math.abs(p.z - (from - t)) < 0.05)).toBe(true);
    }
    // Hueco P2 en t=9: ningún plank derecho cubre el centro del hueco.
    const gapZ = from - RAILS_BEATS.p2.gaps[0];
    const covers = (p, z) => p.kind === 'plank' && Math.abs(z - p.z) <= p.d / 2;
    expect(plats.some((p) => p.x > 0 && covers(p, gapZ))).toBe(false);
    expect(plats.some((p) => p.x < 0 && covers(p, gapZ))).toBe(true);
    // Hueco P1 en t=21.
    const gap1 = from - RAILS_BEATS.p1.gaps[0];
    expect(plats.some((p) => p.x < 0 && covers(p, gap1))).toBe(false);
    expect(plats.some((p) => p.x > 0 && covers(p, gap1))).toBe(true);
  });

  it('reparte obstáculos según el largo (como las carpas de rainIsland)', () => {
    const short = railsBeats(14);
    const mid = railsBeats(28);
    const long = railsBeats(45);
    expect(hazardCount(short)).toBeLessThan(hazardCount(mid));
    expect(hazardCount(mid)).toBeLessThan(hazardCount(long));
    expect(hazardCount(mid)).toBe(6);
    // Más largo con hazards a mano.
    expect(hazardCount(railsBeats(45, 10))).toBe(10);
    // Los beats quedan dentro del tramo y alternan carril (P1 tiene el primero).
    expect(short.p1.rocks[0] ?? short.p1.gaps[0] ?? short.p1.bumps[0]).toBeGreaterThan(0);
    expect(railsPair({ id: 'corto', from: 0, length: 14 }).filter((p) => p.kind === 'rock' || p.kind === 'bump').length).toBeGreaterThan(0);
    expect(railsPair({ id: 'largo', from: 0, length: 45, hazards: 10 }).filter((p) => p.kind === 'plank').length).toBeGreaterThan(4);
  });

  it('avisa si faltan datos, el largo es corto o hay demasiados obstáculos', () => {
    expect(() => railsPair({ from: 0, length: 28 })).toThrow(/id/);
    expect(() => railsPair({ id: 'x', length: 28 })).toThrow(/from/);
    expect(() => railsPair({ id: 'x', from: 0, length: 6 })).toThrow(/corto/);
    expect(() => railsPair({ id: 'x', from: 0, length: 14, hazards: 20 })).toThrow(/no entran/);
  });

  it('exporta el hueco de 1.6 m y la piedra de 0.55 m', () => {
    expect(RAILS_GAP).toBe(1.6);
    expect(RAILS_ROCK_H).toBe(0.55);
  });
});

describe('gameplay en rieles', () => {
  it('sin saltar, la piedra de P1 frena al jugador izquierdo', () => {
    const from = 0;
    const g = start(railsLevel(from));
    // Justo antes de la primera piedra (t=5).
    g.teleport({ p1: { x: -0.8, y: 1, z: from - 3.5 }, p2: { x: 0.8, y: 1, z: from - 3.5 } });
    run(g, 1.2, FWD, FWD);
    const rockZ = from - RAILS_BEATS.p1.rocks[0];
    // No pasan el centro de la piedra caminando.
    expect(g.p1.pos.z).toBeGreaterThan(rockZ - 0.2);
  });

  it('sin saltar, P2 cae al agua en su hueco dañado', () => {
    const from = 0;
    const g = start(railsLevel(from));
    const gapT = RAILS_BEATS.p2.gaps[0];
    // P2 frente al hueco; P1 un poco atrás en su riel sólido para no sujetarlo tanto.
    g.teleport({
      p1: { x: -0.8, y: 1, z: from - (gapT - 2.5) },
      p2: { x: 0.8, y: 1, z: from - (gapT - 1.2) },
    });
    let splash = 0;
    g.events.on('game:splash', () => splash++);
    run(g, 2.5, IDLE, FWD);
    expect(splash).toBeGreaterThanOrEqual(1);
  });

  it('saltando, P1 supera la primera piedra', () => {
    const from = 0;
    const g = start(railsLevel(from));
    g.teleport({ p1: { x: -0.8, y: 1, z: from - 3.8 }, p2: { x: 0.8, y: 1, z: from - 3.8 } });
    const rockZ = from - RAILS_BEATS.p1.rocks[0];
    // Caminan y saltan al acercarse; cortar antes del hueco de P2 (t=9) para no respawnear.
    let cleared = false;
    run(g, 0.9, (t) => (t > 0.15 && t < 0.35 ? jump(FWD) : FWD), (t) => (t > 0.15 && t < 0.35 ? jump(FWD) : FWD), (s, gg) => {
      if (gg.p1.pos.z < rockZ - 0.3) cleared = true;
    });
    expect(cleared).toBe(true);
  });
});

describe('nivel 1 y arena', () => {
  it('el Muelle usa railsPair después del rodillo y tiene cp-rieles', () => {
    const g = new Game(level1);
    const rocks = g.world.statics.filter((s) => s.def.kind === 'rock');
    const planks = g.world.statics.filter((s) => s.def.kind === 'plank' && String(s.def.id).startsWith('rieles'));
    expect(rocks.length).toBeGreaterThanOrEqual(3);
    expect(planks.length).toBeGreaterThanOrEqual(4);
    expect(level1.checkpoints.some((c) => c.id === 'cp-rieles')).toBe(true);
    // Los rieles ocupan z -44 .. -72; chorros empiezan después.
    const railMinZ = Math.min(...planks.map((s) => s.aabb.min.z));
    expect(railMinZ).toBeLessThan(-70);
    expect(level1.goal.z).toBeLessThan(-110);
  });

  it('la arena de rieles (fixture) carga y se puede ganar', () => {
    const g = start(railsArena);
    expect(g.weather.zones).toHaveLength(0);
    expect(railsArena.platforms.some((p) => p.kind === 'rock')).toBe(true);
    g.teleport('goal');
    run(g, 2, FWD, FWD);
    expect(g.state).toBe('won');
  });
});

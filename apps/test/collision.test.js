import { describe, expect, it } from 'vitest';
import { closestOnSegmentXZ, makeAABB, overlaps, platformAABB } from '../src/sim/collision.js';
import { MovingPlatform } from '../src/sim/hazards.js';
import { Player } from '../src/sim/player.js';

const floor = { aabb: platformAABB({ x: 0, z: 0, w: 10, d: 10, top: 1 }) };
const wall = { aabb: makeAABB(2, 1, -5, 3, 4, 5) };
const MODS = { speedMul: 1, jumpMul: 1, grip: 1 };

function stepPlayer(p, cols, seconds, input = { x: 0, z: 0 }, jump = false) {
  const dt = 1 / 120;
  p.setInput(input.x, input.z, jump);
  for (let i = 0; i < seconds / dt; i++) {
    p.beginStep(cols);
    p.integrate(dt, MODS);
    p.applyVelocity(dt, cols);
    p.endStep(dt);
  }
}

describe('colisiones', () => {
  it('tocarse en el borde no cuenta como solapamiento', () => {
    const a = makeAABB(0, 0, 0, 1, 1, 1);
    const b = makeAABB(1, 0, 0, 2, 1, 1);
    expect(overlaps(a, b)).toBe(false);
    expect(overlaps(a, makeAABB(0.9, 0, 0, 2, 1, 1))).toBe(true);
  });

  it('punto más cercano en un segmento', () => {
    const c = closestOnSegmentXZ(0, 5, -1, 0, 1, 0);
    expect(c.x).toBeCloseTo(0);
    expect(c.z).toBeCloseTo(0);
    expect(c.t).toBeCloseTo(0.5);
  });

  it('el jugador cae y aterriza sobre la plataforma', () => {
    const p = new Player(1, { x: 0, y: 3, z: 0 });
    p.grounded = false;
    stepPlayer(p, [floor], 1.5);
    expect(p.grounded).toBe(true);
    expect(p.pos.y).toBeCloseTo(1, 5);
  });

  it('una pared lo frena', () => {
    const p = new Player(1, { x: 0, y: 1, z: 0 });
    stepPlayer(p, [floor, wall], 2, { x: 1, z: 0 });
    expect(p.pos.x).toBeCloseTo(2 - p.radius, 3);
    expect(p.grounded).toBe(true);
  });

  it('caminar fuera del borde lo hace caer', () => {
    const p = new Player(1, { x: 4, y: 1, z: 0 });
    stepPlayer(p, [floor], 1, { x: 1, z: 0 });
    expect(p.pos.y).toBeLessThan(0);
  });

  it('salta ~1.5 m', () => {
    const p = new Player(1, { x: 0, y: 1, z: 0 });
    let maxY = 0;
    const dt = 1 / 120;
    p.setInput(0, 0, true);
    for (let i = 0; i < 120; i++) {
      p.beginStep([floor]);
      p.integrate(dt, MODS);
      p.applyVelocity(dt, [floor]);
      maxY = Math.max(maxY, p.pos.y);
    }
    expect(maxY - 1).toBeGreaterThan(1.3);
    expect(maxY - 1).toBeLessThan(1.7);
    expect(p.grounded).toBe(true);
  });

  it('la plataforma móvil lleva al jugador', () => {
    const m = new MovingPlatform({ x: 0, z: 0, w: 4, d: 4, top: 1, to: { z: -5 }, period: 4 });
    const p = new Player(1, { x: 0, y: 1, z: 0 });
    const dt = 1 / 120;
    let t = 0;
    m.sync(0);
    for (let i = 0; i < 240; i++) {
      t += dt;
      m.update(t);
      p.beginStep([m]);
      p.integrate(dt, MODS);
      p.applyVelocity(dt, [m]);
      if (i === 0) p.ground = m;
    }
    // Medio periodo: la plataforma llegó a z = -5 y el jugador va encima.
    expect(m.pos.z).toBeCloseTo(-5, 1);
    expect(p.pos.z).toBeCloseTo(-5, 1);
    expect(p.grounded).toBe(true);
  });
});

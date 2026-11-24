// Oleaje: waveIsland (isla + rompeolas), la cresta empuja y moja, el rompeolas del lado correcto tapa,
// saltar juntos esquiva, el rompeolas choca, y la Bahía lo trae (sin navegador).
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { waveIsland } from '../src/levels/sections.js';
import { Game, IDLE, LEFT, jump, run } from './helpers.js';

/** Isla de oleaje de 12 × 18 (z 9 .. -9) con 3 rompeolas: izquierda z 6, derecha z 0, izquierda z -6. */
function waves({ z = 0 } = {}) {
  const g = new Game(
    {
      id: 'test-olas',
      waterLevel: 0,
      spawn: { p1: { x: -0.8, y: 1, z }, p2: { x: 0.8, y: 1, z } },
      platforms: [...waveIsland({ id: 'isla', from: 9, length: 18, width: 12 })],
    },
    { seed: 1 },
  );
  g.setInputs(jump(), jump());
  run(g, 0.5, IDLE, IDLE); // que aterricen
  return { g, zone: g.weather.zones[0] };
}

/** Ola cruzando, quieta con la cresta en `at` (x), viniendo desde `from` ('left' | 'right'). */
function crest(zone, { from, at = 0 }) {
  zone.dir.x = from === 'left' ? 1 : -1;
  zone.phase = 'active';
  zone._phaseLen = 1000;
  const pad = zone.C.crestWidth;
  const x0 = from === 'left' ? zone.area.min.x - pad : zone.area.max.x + pad;
  const x1 = from === 'left' ? zone.area.max.x + pad : zone.area.min.x - pad;
  zone.timer = 1000 * (1 - (at - x0) / (x1 - x0));
}

describe('waveIsland', () => {
  it('devuelve la isla con oleaje y rompeolas alternados en los bordes, que chocan', () => {
    const [isla, ...blocks] = waveIsland({ id: 'olas', from: 0, length: 18 });
    expect(isla.weather.type).toBe('waves');
    expect(isla.weather.breakwaters).toHaveLength(3);
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.kind === 'breakwater' && b.top > isla.top)).toBe(true);
    const sides = isla.weather.breakwaters.map((b) => Math.sign(b.x));
    expect(sides).toEqual([-1, 1, -1]);
    for (const b of isla.weather.breakwaters) expect(Math.abs(b.x) + b.w / 2).toBeLessThanOrEqual(isla.w / 2);
  });

  it('avisa con errores claros', () => {
    expect(() => waveIsland({ id: 'x', from: 0, length: 6, breakwaters: 3 })).toThrow(/no entran/);
    expect(() => waveIsland({ id: 'x', from: 0, length: 12, width: 5 })).toThrow(/angosta/);
    expect(() => waveIsland({ from: 0, length: 12 })).toThrow(/id/);
  });
});

describe('oleaje', () => {
  it('en calma y en aviso no pasa nada', () => {
    const { g, zone } = waves();
    for (const phase of ['calm', 'warn']) {
      zone.phase = phase;
      zone.timer = zone._phaseLen = 999;
      const x = g.p1.pos.x;
      run(g, 0.5, IDLE, IDLE);
      expect(g.box.wetness).toBe(0);
      expect(Math.abs(g.p1.pos.x - x)).toBeLessThan(0.05);
    }
  });

  it('la cresta empuja a la pareja hacia donde va la ola y moja la caja', () => {
    const { g, zone } = waves({ z: 3 }); // fila sin rompeolas
    crest(zone, { from: 'left', at: g.p1.pos.x });
    const x = (g.p1.pos.x + g.p2.pos.x) / 2;
    run(g, 0.4, IDLE, IDLE);
    expect((g.p1.pos.x + g.p2.pos.x) / 2 - x).toBeGreaterThan(0.3);
    crest(zone, { from: 'left', at: g.box.center.x });
    run(g, 0.4, IDLE, IDLE);
    expect(g.box.wetness).toBeGreaterThan(5);
  });

  it('detrás del rompeolas del lado de donde viene la ola no pasa nada (y avisa)', () => {
    const { g, zone } = waves({ z: 0 }); // fila del rompeolas de la DERECHA
    const shelter = [];
    g.events.on('weather:shelter', (e) => shelter.push(e.inside));
    crest(zone, { from: 'right', at: 0 });
    const x = g.p1.pos.x;
    run(g, 0.4, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
    expect(Math.abs(g.p1.pos.x - x)).toBeLessThan(0.05);
    expect(zone.boxShelter).not.toBeNull();
    expect(shelter).toContain(true);
  });

  it('el rompeolas del lado contrario no sirve', () => {
    const { g, zone } = waves({ z: 0 });
    crest(zone, { from: 'left', at: 0 });
    run(g, 0.4, IDLE, IDLE);
    expect(g.box.wetness).toBeGreaterThan(5);
    expect(zone.boxShelter).toBeNull();
  });

  it('saltando juntos la ola pasa por debajo: ni empuja ni moja', () => {
    const { g, zone } = waves({ z: 3 });
    const x = g.p1.pos.x;
    run(g, 0.08, jump(), jump()); // ya en el aire
    crest(zone, { from: 'left', at: 0 });
    run(g, 0.25, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
    expect(Math.abs(g.p1.pos.x - x)).toBeLessThan(0.05);
  });

  it('el rompeolas choca: no se puede atravesar caminando', () => {
    const { g, zone } = waves({ z: 6 }); // fila del rompeolas de la izquierda (x −5.2, borde en −4.7)
    zone.phase = 'calm';
    zone.timer = zone._phaseLen = 999;
    run(g, 2.5, LEFT, LEFT);
    expect(g.p1.pos.x).toBeGreaterThan(-4.75);
    expect(g.state).toBe('playing');
  });
});

describe('oleaje en los mapas', () => {
  for (const key of ['bahia']) {
    it(`${key} tiene una isla de oleaje con rompeolas`, () => {
      const g = new Game(LEVELS[key], { seed: 1 });
      const zone = g.weather.zones.find((z) => z.type === 'waves');
      expect(zone).toBeTruthy();
      expect(zone.breakwaters.length).toBeGreaterThanOrEqual(2);
      expect(g.world.statics.filter((s) => s.def.kind === 'breakwater').length).toBe(zone.breakwaters.length);
    });
  }
});

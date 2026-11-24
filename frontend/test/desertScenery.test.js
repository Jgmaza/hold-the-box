// Fondo del desierto: la colocación no tapa el camino ni cae en el vacío, siempre sale igual, y las mallas están bien.
import { describe, expect, it } from 'vitest';
import {
  Geo, barrelGeo, boneGeo, boulderGeo, deadTreeGeo, layoutDecor, layoutDunes, layoutRocks, pearGeo, saguaroGeo, sandstoneGeo, sandstoneProfile, trackEdge, tuftGeo,
} from '../src/view/desertLayout.js';
import { LEVELS } from '../src/levels/index.js';
import { seeded } from '../src/view/nature.js';
import { World } from '../src/sim/world.js';

const DESERT = Object.keys(LEVELS).filter((k) => LEVELS[k].theme === 'desert');

/** Lo mismo que le pasa LevelView a buildCanyon. */
const setup = (key) => {
  const level = LEVELS[key];
  const world = new World(level);
  const avoid = world.statics.map(({ aabb: a }) => ({ minX: a.min.x, maxX: a.max.x, minZ: a.min.z, maxZ: a.max.z }));
  const zs = avoid.flatMap((a) => [a.minZ, a.maxZ]);
  return { avoid, gap: level.pit ?? null, z0: Math.min(...zs) - 24, z1: Math.max(...zs) + 28 };
};

const layout = (key, seed = 5) => {
  const o = setup(key);
  const rand = seeded(seed);
  const rocks = layoutRocks(rand, o);
  const decor = layoutDecor(rand, { ...o, rocks });
  return { ...o, rocks, decor };
};

describe('fondo del desierto: colocación', () => {
  it('hay mapas de desierto', () => {
    expect(DESERT.length).toBeGreaterThan(0);
  });

  for (const key of DESERT) {
    it(`${key}: nada del fondo cae sobre el camino ni dentro del vacío`, () => {
      const { avoid, gap, rocks, decor } = layout(key);
      expect(decor.length).toBeGreaterThan(30);
      expect(decor.length).toBeLessThan(400);
      for (const it of decor) {
        for (const a of avoid) {
          const inside = it.x > a.minX - 1 && it.x < a.maxX + 1 && it.z > a.minZ - 1 && it.z < a.maxZ + 1;
          expect(inside, `${it.kind} en (${it.x.toFixed(1)}, ${it.z.toFixed(1)})`).toBe(false);
        }
        if (gap && it.z > gap.z0 && it.z < gap.z1) expect(Math.abs(it.x)).toBeGreaterThanOrEqual(10);
      }
      for (const k of rocks) {
        const edge = trackEdge(avoid, k.z, k.r);
        expect(Math.abs(k.x) - k.r, `roca en z ${k.z.toFixed(1)}`).toBeGreaterThan(edge + 2);
      }
    });

    it(`${key}: mismo seed → mismo fondo`, () => {
      expect(layout(key, 9)).toEqual(layout(key, 9));
      expect(layout(key, 9).decor).not.toEqual(layout(key, 10).decor);
    });
  }

  it('hay de todo: saguaros, biznagas, nopales, árboles, cantos, matojos y huesos', () => {
    const kinds = new Set(DESERT.flatMap((k) => layout(k).decor.map((d) => d.kind)));
    for (const k of ['saguaro', 'barrel', 'pear', 'tree', 'bone', 'tuft', 'boulder']) expect(kinds, k).toContain(k);
    expect(kinds.has('arch') || kinds.has('slab')).toBe(false);
  });

  it('las dunas no caen en el vacío del cañón', () => {
    const gap = { z0: -20, z1: 0 };
    for (const d of layoutDunes(seeded(3), { z0: -60, z1: 40, gap })) {
      if (d.z > gap.z0 - 1 && d.z < gap.z1 + 1) expect(Math.abs(d.x)).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('fondo del desierto: mallas', () => {
  const pieces = { saguaroGeo, barrelGeo, pearGeo, deadTreeGeo, boneGeo, tuftGeo, boulderGeo };

  for (const [name, make] of Object.entries(pieces)) {
    it(`${name}: índices válidos, colores en rango y tamaño razonable`, () => {
      const g = make(seeded(4));
      expect(g.count).toBeGreaterThan(10);
      expect(g.count).toBeLessThan(20000);
      expect(g.c.length / 4).toBe(g.count);
      expect(Math.max(...g.i)).toBeLessThan(g.count);
      expect(g.c.every((v) => v >= 0 && v <= 1)).toBe(true);
      expect(g.p.every(Number.isFinite)).toBe(true);
      expect(g.normals().every(Number.isFinite)).toBe(true);
    });
  }

  it('la tinaja tiene labio arriba y está hundida en el centro', () => {
    const prof = sandstoneProfile({ r: 5, h: 8, bowl: 0.25 });
    const top = Math.max(...prof.map((q) => q[1]));
    const center = prof[prof.length - 1];
    expect(center[0]).toBe(0);
    expect(center[1]).toBeLessThan(top - 1);
    expect(prof[0][0]).toBeGreaterThan(5); // base ancha metida en la arena
    const g = sandstoneGeo(seeded(2), { r: 5, h: 8, bowl: 0.25, lip: 0.12 });
    expect(g.count).toBe(prof.length * 48);
  });

  it('la cara de afuera mira hacia afuera (normales de un tubo vertical)', () => {
    const g = new Geo().tube([0, 0, 0], [0, 2, 0], 0.5, 0.5, [0.5, 0.5, 0.5], { sides: 8 });
    const n = g.normals();
    for (let v = 0; v < g.count; v++) {
      const [x, y, z] = [g.p[v * 3], g.p[v * 3 + 1], g.p[v * 3 + 2]];
      if (y < 0.3 || y > 1.7) continue;
      expect(x * n[v * 3] + z * n[v * 3 + 2]).toBeGreaterThan(0);
    }
  });
});

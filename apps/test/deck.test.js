// Piso con huecos circulares: la geometría recorta los círculos y deja pared interior.
import { describe, expect, it } from 'vitest';
import { deckGeometry } from '../src/view/deck.js';

const box = { minX: -5, maxX: 5, minZ: -10, maxZ: 0, y: 1 };

const area = (g, onlyUp = true) => {
  let a = 0;
  const p = g.positions;
  for (let t = 0; t < g.indices.length; t += 3) {
    const [i, j, k] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]];
    if (onlyUp && g.normals[i * 3 + 1] !== 1) continue;
    a += Math.abs((p[j * 3] - p[i * 3]) * (p[k * 3 + 2] - p[i * 3 + 2]) - (p[k * 3] - p[i * 3]) * (p[j * 3 + 2] - p[i * 3 + 2])) / 2;
  }
  return a;
};

describe('deckGeometry', () => {
  it('sin huecos es un solo rectángulo', () => {
    const g = deckGeometry(box, []).top;
    expect(area(g)).toBeCloseTo(100);
    expect(g.positions.length).toBe(12);
  });

  it('con un hueco la cara de arriba pierde el área del círculo', () => {
    const r = 1.5;
    const g = deckGeometry(box, [{ x: 1, z: -5, r }], { seg: 40 }).top;
    expect(area(g)).toBeCloseTo(100 - Math.PI * r * r, 1);
  });

  it('dos huecos en el mismo tramo de Z también se recortan', () => {
    const g = deckGeometry(box, [{ x: -2.5, z: -5, r: 1 }, { x: 2.5, z: -5, r: 1 }], { seg: 40 }).top;
    expect(area(g)).toBeCloseTo(100 - 2 * Math.PI, 1);
  });

  it('el pozo baja hasta la profundidad pedida', () => {
    const g = deckGeometry(box, [{ x: 0, z: -5, r: 1 }], { wallDepth: 3 }).walls;
    const ys = g.positions.filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBeCloseTo(-2);
    expect(Math.max(...ys)).toBeCloseTo(1);
  });

  it('la pared interior mira hacia el centro del hueco', () => {
    const h = { x: 0, z: -5, r: 1 };
    const g = deckGeometry(box, [h], { seg: 8, wallDepth: 3 }).walls;
    for (let v = 0; v < g.positions.length / 3; v++) {
      const ny = g.normals[v * 3 + 1];
      if (ny !== 0) continue;
      const dx = h.x - g.positions[v * 3];
      const dz = h.z - g.positions[v * 3 + 2];
      expect(dx * g.normals[v * 3] + dz * g.normals[v * 3 + 2]).toBeGreaterThan(0);
    }
  });
});

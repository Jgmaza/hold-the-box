// Escenografía Kenney que choca: bounds medidos de los GLB, forma por modelo, giro, choques con la pareja
// y que en los mapas ningún prop tape el pasillo, los spawns ni los checkpoints.
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { KENNEY_BOUNDS } from '../src/levels/kenneyBounds.js';
import { collideKind, propCollider } from '../src/levels/kenneyColliders.js';
import { SCENERY_SETS } from '../src/levels/sections.js';
import { Game, IDLE, LEFT, jump, run } from './helpers.js';

const width = (a) => a.max.x - a.min.x;
const depth = (a) => a.max.z - a.min.z;

describe('colliders de props', () => {
  it('hay bounds medidos para todos los modelos que usan los sets y los barcos', () => {
    const arts = new Set(Object.values(SCENERY_SETS).flat());
    for (const L of Object.values(LEVELS)) for (const s of L.scenery ?? []) arts.add(s.art);
    for (const art of arts) expect(KENNEY_BOUNDS[art], art).toBeTruthy();
  });

  it('cada modelo choca con su forma: caja entera, solo tronco / mástil, o nada', () => {
    expect(collideKind('barrel')).toBe('box');
    expect(collideKind('castle-wall')).toBe('box');
    expect(collideKind('rocks-sand-a')).toBe('box');
    expect(collideKind('palm-bend')).toBe('trunk');
    expect(collideKind('flag-pirate-high')).toBe('pole');
    expect(collideKind('grass-patch')).toBe(null);
    expect(collideKind('ship-large')).toBe(null);
    expect(propCollider({ art: 'grass', x: 0, z: 0, top: 1, s: 0.4 })).toBe(null);
  });

  it('el tamaño sale del GLB por la escala, apoyado en el piso', () => {
    const b = KENNEY_BOUNDS.barrel;
    const a = propCollider({ art: 'barrel', x: 3, z: -2, top: 1, s: 0.4 });
    expect(width(a)).toBeCloseTo((b.max[0] - b.min[0]) * 0.4, 3);
    expect(a.min.y).toBeCloseTo(1, 3);
    expect(a.max.y).toBeCloseTo(1 + b.max[1] * 0.4, 3);
  });

  it('el giro rota el rectángulo: una muralla a 90° cambia ancho por fondo', () => {
    const a = propCollider({ art: 'castle-wall', x: 0, z: 0, top: 1, yaw: 0, s: 0.4 });
    const b = propCollider({ art: 'castle-wall', x: 0, z: 0, top: 1, yaw: 90, s: 0.4 });
    expect(width(b)).toBeCloseTo(depth(a), 3);
    expect(depth(b)).toBeCloseTo(width(a), 3);
  });

  it('las palmeras solo chocan en el tronco (las hojas no)', () => {
    const a = propCollider({ art: 'palm-bend', x: 0, z: 0, top: 1, s: 0.4 });
    expect(width(a)).toBeLessThan(0.4);
    expect(depth(a)).toBeLessThan(0.4);
  });
});

/** Isla de 12 × 12 con un barril a la izquierda de la pareja (escala `s`: 1 = 1.23 m de alto, 0.4 = como en los mapas). */
function withBarrel(x = -3, s = 1) {
  const g = new Game(
    {
      id: 'test-props',
      waterLevel: 0,
      spawn: { p1: { x: -0.8, y: 1, z: 0 }, p2: { x: 0.8, y: 1, z: 0 } },
      platforms: [{ id: 'isla', x: 0, z: 0, w: 12, d: 12, top: 1 }],
      scenery: [{ art: 'barrel', x, z: 0, top: 1, s }],
    },
    { seed: 1 },
  );
  g.setInputs(jump(), jump());
  run(g, 0.5, IDLE, IDLE);
  return g;
}

describe('choques con props', () => {
  it('la pareja que camina contra un barril se frena', () => {
    const g = withBarrel(-3);
    const edge = g.world.props[0].aabb.max.x;
    run(g, 2, LEFT, LEFT);
    expect(g.p1.pos.x - g.p1.radius).toBeGreaterThanOrEqual(edge - 0.01);
    expect(g.state).toBe('playing');
  });

  it('se puede subir encima de un barril de los mapas saltando', () => {
    const g = withBarrel(-2, 0.4);
    const top = g.world.props[0].aabb.max.y;
    run(g, 0.05, jump(LEFT), jump(LEFT));
    run(g, 0.22, LEFT, LEFT);
    run(g, 1, IDLE, IDLE);
    expect(g.p1.pos.y).toBeCloseTo(top, 1);
  });
});

describe('props en los mapas', () => {
  for (const [key, L] of Object.entries(LEVELS)) {
    it(`${key}: ningún prop tapa el pasillo central, los spawns ni los checkpoints`, () => {
      const g = new Game(L, { seed: 1 });
      expect(g.world.props.length).toBeGreaterThan(0);
      const spawns = [L.spawn, ...L.checkpoints.map((c) => c.spawn)].flatMap((s) => [s.p1, s.p2]);
      for (const { aabb: a, def } of g.world.props) {
        // Pasillo: ±1.9 m del centro de la plataforma donde está (deja la pareja con la caja).
        const p = L.platforms.find((pl) => !pl.kind && Math.abs((a.min.z + a.max.z) / 2 - pl.z) <= pl.d / 2 && Math.abs((a.min.x + a.max.x) / 2 - pl.x) <= pl.w / 2 + 0.5);
        if (p) expect(a.min.x > p.x + 1.9 || a.max.x < p.x - 1.9, `${def.art} en ${p.id}`).toBe(true);
        for (const s of spawns) {
          const inside = s.x > a.min.x - 0.4 && s.x < a.max.x + 0.4 && s.z > a.min.z - 0.4 && s.z < a.max.z + 0.4;
          expect(inside, `${def.art} tapa un spawn en z ${s.z}`).toBe(false);
        }
      }
    });
  }
});

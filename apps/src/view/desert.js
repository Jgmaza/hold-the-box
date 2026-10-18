// Cañón del desierto: arena con ondas, tinajas de arenisca, cactus y el vacío al lado del camino.
// El fondo (rocas, plantas, cantos, huesos) lo arma desertScenery.js. Aquí: el piso, el vacío del cañón y lo que se
// mueve cada frame (polvo, cardo, vagoneta). No chocan.
import { buildDesertScenery } from './desertScenery.js';
import { seeded } from './nature.js';

/**
 * @returns {{ update: (time: number) => void }}
 */
export function buildCanyon(g, P, parent, { minZ, maxZ, groundY, seed, gap = null, cart = false, carpet = true, avoid = [] }) {
  const z0 = minZ - 24;
  const z1 = maxZ + 28;
  const cz = (z0 + z1) / 2;
  const len = z1 - z0;
  const rand = seeded(seed + 17);
  const scenery = buildDesertScenery(g, P, parent, { z0, z1, groundY, seed, avoid, gap });

  g.prim('box', g.solid('#6a2e28', { mul: 0.7 }), {
    parent, pos: [0, groundY - 16, cz], scale: [90, 10, len + 16], shadows: false, name: 'fondo-canon',
  });

  // Piso de arena con ondas. Con `carpet` cubre también debajo del camino; sin él (laberinto con huecos) empieza
  // a los lados, más bajo, para que los huecos del camino se lean como caída.
  const FLOOR = 70; // medio ancho del piso de arena
  const sandBox = (x0, x1, a, b, y) => {
    if (b - a < 0.8 || x1 - x0 < 0.5) return;
    g.prim('box', scenery.sand(x1 - x0, b - a), {
      parent, pos: [(x0 + x1) / 2, y, (a + b) / 2], scale: [x1 - x0, 0.1, b - a], shadows: false, name: 'arena',
    });
  };
  const sandSpan = (a, b) => {
    if (carpet) {
      sandBox(-FLOOR, FLOOR, a, b, groundY - 0.04);
    } else {
      sandBox(-FLOOR, -6.5, a, b, groundY - 0.3);
      sandBox(6.5, FLOOR, a, b, groundY - 0.3);
    }
  };
  if (gap) {
    sandSpan(z0, gap.z0);
    sandSpan(gap.z1, z1);
    const a = Math.max(z0, gap.z0);
    const b = Math.min(z1, gap.z1);
    if (b - a > 1) {
      // A los lados del vacío sigue habiendo arena (con las rocas encima): el hueco es solo el cañón del medio.
      sandBox(-FLOOR, -9, a, b, groundY - 0.04);
      sandBox(9, FLOOR, a, b, groundY - 0.04);
      g.prim('box', g.solid('#2a1612', { mul: 0.45 }), {
        parent, pos: [0, groundY - 6, (a + b) / 2], scale: [18, 10, b - a], shadows: false, name: 'vacio',
      });
    }
  } else {
    sandSpan(z0, z1);
  }

  const dust = [];
  for (let i = 0; i < 18; i++) {
    const e = g.prim('sphere', g.solid('#f3ddb0', { unlit: true, opacity: 0.4 }), {
      parent, scale: [0.14, 0.08, 0.14], shadows: false, name: 'polvo',
    });
    dust.push({
      e,
      x: (rand() - 0.5) * 22,
      z: z0 + rand() * len,
      phase: rand() * 8,
      speed: 0.35 + rand() * 0.7,
    });
  }

  const weed = P.group('cardo', parent, [9, groundY + 0.35, z1]);
  const twig = g.solid('#c4a06a', { mul: 0.85 });
  for (const rot of [[0, 0, 0], [70, 20, 0], [0, 60, 70]]) {
    g.prim('sphere', twig, { parent: weed, pos: [0, 0, 0], rot, scale: [0.7, 0.16, 0.7], name: 'rama' });
  }

  let wagon = null;
  let wheels = [];
  if (cart) {
    wagon = g.group('vagoneta', parent);
    const wood = g.solid('#8a5a32', { mul: 0.9 });
    const iron = g.solid('#5c534c', { gloss: 0.45 });
    g.prim('box', wood, { parent: wagon, pos: [0, 0.35, 0], scale: [1.1, 0.55, 1.5], name: 'caja' });
    g.prim('box', iron, { parent: wagon, pos: [0, 0.12, 0], scale: [0.16, 0.06, 1.7], name: 'riel' });
    wheels = [-0.4, 0.4].map((z) => {
      const e = g.prim('cylinder', iron, { parent: wagon, pos: [0, 0.16, z], rot: [0, 0, 90], scale: [0.28, 0.12, 0.28], name: 'rueda' });
      return e;
    });
  }

  const span = z1 - z0;
  return {
    destroy() {
      scenery.destroy();
    },
    update(time) {
      scenery.update(time);
      for (const d of dust) {
        const z = z0 + ((d.z - z0 + time * d.speed * 2) % span);
        d.e.setPosition(d.x + Math.sin(time * 0.7 + d.phase) * 0.6, groundY + 0.8 + Math.sin(time * 1.6 + d.phase) * 0.45, z);
      }
      const u = (time * 2.4) % span;
      weed.setPosition(9.1, groundY + 0.32 + Math.abs(Math.sin(time * 6)) * 0.05, z1 - u);
      weed.setLocalEulerAngles(time * 40, time * 90, time * 70);
      if (wagon) {
        const czz = z1 - ((time * 3.2) % span);
        wagon.setPosition(-9.4, groundY + 0.05, czz);
        for (const w of wheels) w.setLocalEulerAngles(time * 140, 0, 90);
      }
    },
  };
}

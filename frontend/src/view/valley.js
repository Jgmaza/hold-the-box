// Valle de la aldea: río a cada lado del pueblo y sierras que cierran el pasto vacío.
// El agua y las cascadas son una textura 2D que se desplaza (el motor sigue siendo PlayCanvas).
import * as pc from 'playcanvas';
import { bush, palm, rock, seeded } from './nature.js';
import { grassCanvas } from './signs.js';

/** Onda que repite en los dos bordes, para que al deslizar la textura no se note el corte. */
function tileWave(u, v, fu, fv) {
  return Math.sin((u * fu + v * fv) * Math.PI * 2);
}

function paint(w, h, pixel) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = pixel(x / w, y / h);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function riverCanvas() {
  return paint(64, 128, (u, v) => {
    const n = tileWave(u, v, 3, 1) * 0.45 + tileWave(u, v, 1, 4) * 0.35 + tileWave(u, v, 5, 2) * 0.2;
    const foam = tileWave(u, v, 2, 6) > 0.72 ? 1 : 0;
    return [
      18 + n * 14 + foam * 170,
      92 + n * 28 + foam * 70,
      112 + n * 16 + foam * 50,
      255,
    ];
  });
}

function fallCanvas() {
  return paint(32, 128, (u, v) => {
    const streak = Math.pow(0.5 + 0.5 * tileWave(u, v, 8, 0), 6);
    const rush = 0.55 + 0.45 * tileWave(u, v, 0, 3);
    const a = Math.min(255, (70 + streak * 185) * rush);
    return [210 + streak * 45, 236, 238, a];
  });
}

function flowMaterial(g, canvas, { tiling, gloss = 0.55, opacity = 1, unlit = false }) {
  const tex = g.textureFromCanvas(canvas, { repeat: true });
  const mat = g.textured(tex, { unlit, twoSided: true, tint: unlit ? new pc.Color(1, 1, 1) : g.color('#d5fff6', 1.05) });
  mat.diffuseMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  if (mat.emissiveMap) mat.emissiveMapTiling = new pc.Vec2(tiling[0], tiling[1]);
  mat.gloss = gloss;
  mat.useMetalness = true;
  mat.metalness = 0;
  if (opacity < 1) {
    mat.opacity = opacity;
    mat.blendType = pc.BLEND_NORMAL;
    mat.depthWrite = false;
    if (unlit) {
      mat.opacityMap = tex;
      mat.opacityMapChannel = 'a';
    }
  }
  mat.update();
  return mat;
}

/**
 * Montañas y dos ríos paralelos al camino. Solo vista: no choca.
 * @returns {{ update: (time: number) => void }}
 */
export function buildValley(g, P, parent, { minZ, maxZ, groundY, seed, gap = null }) {
  const z0 = minZ - 28;
  const z1 = maxZ + 32;
  const cz = (z0 + z1) / 2;
  const len = z1 - z0;
  const rand = seeded(seed + 19);
  const flows = [];
  const pads = [];

  g.prim('box', g.solid('#2f5a34', { mul: 0.85, gloss: 0.05 }), {
    parent, pos: [0, groundY - 0.95, cz], scale: [220, 0.3, len + 20], shadows: false, name: 'suelo-valle',
  });

  const grass = g.textured(g.textureFromCanvas(grassCanvas(), { repeat: true }), { tint: g.color('#8fbf5a', 1.05) });
  grass.diffuseMapTiling = new pc.Vec2(8, Math.max(8, len / 6));
  grass.update();
  const grassSpan = (a, b) => {
    if (b - a < 0.8) return;
    g.prim('box', grass, {
      parent, pos: [0, groundY - 0.05, (a + b) / 2], scale: [26, 0.12, b - a], shadows: false, name: 'pasto',
    });
  };
  if (gap) {
    grassSpan(z0, gap.z0);
    grassSpan(gap.z1, z1);
    const a = Math.max(z0, gap.z0);
    const b = Math.min(z1, gap.z1);
    if (b - a > 1) {
      g.prim('box', g.solid('#1a120e', { mul: 0.5 }), {
        parent, pos: [0, groundY - 3.4, (a + b) / 2], scale: [20, 5.6, b - a], shadows: false, name: 'vacio',
      });
    }
  } else {
    grassSpan(z0, z1);
  }

  const waterMat = flowMaterial(g, riverCanvas(), { tiling: [2, Math.max(6, Math.round(len / 7))], gloss: 0.78 });
  flows.push({ mat: waterMat, speed: 0.28 });
  const fallMat = flowMaterial(g, fallCanvas(), { tiling: [1, 2], opacity: 0.82, unlit: true });
  flows.push({ mat: fallMat, speed: 1.15 });

  const bank = g.solid('#6d8f48', { gloss: 0.08 });
  const farBank = g.solid('#3f6b3c', { mul: 0.95 });
  const moss = g.solid('#3f7a40', { mul: 0.92, gloss: 0.06 });
  const stone = g.solid('#8b938c', { gloss: 0.1 });
  const peak = g.solid('#a3aaa4', { gloss: 0.08, mul: 1.05 });

  for (const side of [-1, 1]) {
    const xRiver = side * 16.4;
    g.prim('box', waterMat, {
      parent, pos: [xRiver, groundY - 0.38, cz], scale: [7.4, 0.07, len], shadows: false, name: 'rio',
    });
    g.prim('box', g.solid('#d7eee6', { opacity: 0.38, unlit: true }), {
      parent, pos: [side * 13.4, groundY - 0.3, cz], scale: [0.55, 0.05, len], shadows: false, name: 'espuma-orilla',
    });
    g.prim('box', bank, {
      parent, pos: [side * 12.7, groundY - 0.2, cz], scale: [2.6, 0.5, len], rot: [0, 0, side * -24], shadows: false, name: 'orilla',
    });
    g.prim('box', farBank, {
      parent, pos: [side * 20.4, groundY - 0.28, cz], scale: [4.2, 0.9, len], rot: [0, 0, side * 18], shadows: false, name: 'orilla-monte',
    });

    const padMat = g.solid('#3d8f45', { gloss: 0.2 });
    for (let z = z1 - 1; z > z0 + 1; z -= 2.6) {
      if (gap && z < gap.z1 && z > gap.z0) continue;
      if (rand() < 0.45) {
        const x = side * (15.4 + rand() * 1.6);
        const zz = z + 0.8;
        const pad = g.prim('sphere', padMat, {
          parent,
          pos: [x, groundY - 0.34, zz],
          scale: [0.55 + rand() * 0.35, 0.06, 0.42 + rand() * 0.2],
          shadows: false,
          name: 'nenufar',
        });
        pads.push({ e: pad, x, z: zz, y: groundY - 0.34, phase: z * 0.2 });
      }
    }

    for (let z = z1; z > z0; z -= 7) {
      const jitter = (rand() - 0.5) * 2.4;
      const x = side * (25 + rand() * 7) + jitter * 0.15;
      const h = 9 + rand() * 11;
      const w = 14 + rand() * 8;
      P.facet(parent, moss, [x, groundY - 1.2 + h * 0.22, z], [w, h * 0.78, w * 0.72], { segs: [7, 5], name: 'monte' });
      P.facet(parent, stone, [x + side * 2.2, groundY + h * 0.38, z + (rand() - 0.5) * 2], [w * 0.48, h * 0.5, w * 0.42], { segs: [6, 4], name: 'lomo' });
      if (rand() < 0.55) {
        P.facet(parent, peak, [x + side * 3.1, groundY + h * 0.68, z], [w * 0.22, h * 0.32, w * 0.2], { segs: [5, 4], name: 'pico' });
      }

      const shore = side * (13.1 + rand() * 1.4);
      rock(P, parent, [shore, groundY - 0.32, z + 1.2], 0.7 + rand() * 0.9, rand);
      if (rand() < 0.65) bush(P, parent, [side * (12.2 + rand() * 0.8), groundY, z - 1.4], 0.55 + rand() * 0.45, rand);
      if (rand() < 0.42) {
        palm(P, parent, [side * (14.2 + rand()), groundY - 0.15, z + 2.2], {
          height: 3.6 + rand() * 2.2,
          lean: 0.16,
          yaw: side > 0 ? 200 : -20,
          rand,
        });
      }
    }

    for (let z = z1 - 8; z > z0 + 8; z -= 24) {
      const h = 5.5 + rand() * 3.5;
      const wide = 1.3 + rand() * 1.1;
      g.prim('plane', fallMat, {
        parent,
        pos: [side * 19.2, groundY - 0.15 + h / 2, z],
        scale: [h, 1, wide],
        rot: [0, 0, side > 0 ? 90 : -90],
        shadows: false,
        name: 'cascada',
      });
      g.prim('sphere', g.solid('#e7f6f2', { opacity: 0.5, unlit: true }), {
        parent, pos: [side * 16.6, groundY - 0.28, z], scale: [1.8, 0.32, 1.5], shadows: false, name: 'salto',
      });
    }
  }

  return {
    update(time) {
      for (const f of flows) {
        f.mat.diffuseMapOffset.set(0, time * f.speed);
        if (f.mat.emissiveMap) f.mat.emissiveMapOffset.set(0, time * f.speed);
        f.mat.update();
      }
      for (const p of pads) p.e.setLocalPosition(p.x, p.y + Math.sin(time * 1.3 + p.phase) * 0.025, p.z);
    },
  };
}

// Fondo de los niveles, con el estilo del menú: cielo con degradado que sigue a la cámara
// e islas lejanas con palmeras a ambos lados del recorrido (repetibles por semilla).
import * as pc from 'playcanvas';
import { island, seeded } from './nature.js';

/**
 * @param {import('./parts.js').Parts} P
 * @param {pc.Entity} parent
 * @param {{ minZ: number, maxZ: number, seaY: number, seed?: number, clear?: number }} o
 *   clear = |x| mínimo libre (ancho del recorrido + barcos)
 * @returns {{ sky: pc.Entity, shores: {x,z,w,d,round:true}[] }}
 */
export function buildBackdrop(P, parent, { minZ, maxZ, seaY, seed = 1, clear = 16, theme, biome, islands = true } = {}) {
  const g = P.gfx;
  const rand = seeded(seed * 977 + 13);
  const look = theme === 'jungle' ? (biome === 'temple' ? 'ruins' : biome === 'canyon' ? 'canyon' : biome === 'village' ? 'village' : 'jungle') : 'beach';
  const sky = P.ball(parent, skyMaterial(g, look), [0, 0, 0], [400, 400, 400], { shadows: false, name: 'cielo' });

  const shores = [];
  if (!islands) return { sky, shores };
  let side = rand() < 0.5 ? -1 : 1;
  for (let z = maxZ + 10 - rand() * 10; z > minZ - 25; z -= 26 + rand() * 18) {
    const w = 10 + rand() * 16;
    const d = 6 + rand() * 8;
    const x = side * (clear + w / 2 + rand() * 22);
    const h = 1.6 + rand() * 2.4;
    island(P, parent, {
      x, z, w, d, h: look === 'canyon' ? h + 1.2 : h, seaY, look,
      palms: look === 'jungle' || look === 'village' || look === 'beach' ? 1 + Math.floor(rand() * 3) : 0,
      bushes: 2 + Math.floor(rand() * 3),
      rocks: look === 'canyon' ? 4 : 2,
      seed: Math.floor(rand() * 1e6),
    });
    shores.push({ x, z, w: w * 1.05, d: d * 1.05, round: true });
    side = rand() < 0.75 ? -side : side;
  }
  return { sky, shores };
}

/** Domo sin luz ni niebla: azul arriba → claro en el horizonte → color de niebla abajo. */
function skyMaterial(g, look = 'beach') {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  const jungle = look === 'jungle' || look === 'ruins' || look === 'canyon' || look === 'village';
  const horizon = look === 'ruins' ? '#cfc6b4' : look === 'canyon' ? '#c5d0d4' : look === 'jungle' || look === 'village' ? '#b8d4c0' : (g.palette.sky ?? '#8fd3f4');
  if (look === 'ruins') {
    grad.addColorStop(0, '#5a7a9a');
    grad.addColorStop(0.3, '#8aa8b8');
    grad.addColorStop(0.47, '#ddd4c4');
  } else if (look === 'canyon') {
    grad.addColorStop(0, '#4a6a88');
    grad.addColorStop(0.3, '#7a9aaa');
    grad.addColorStop(0.47, '#d0dde0');
  } else if (look === 'jungle' || look === 'village') {
    grad.addColorStop(0, '#3f7aaa');
    grad.addColorStop(0.3, '#6aa8c4');
    grad.addColorStop(0.47, '#c5ddd0');
  } else {
    grad.addColorStop(0, '#3f9fe0');
    grad.addColorStop(0.3, '#7cc6f2');
    grad.addColorStop(0.47, '#c9ecfb');
  }
  grad.addColorStop(0.5, horizon);
  grad.addColorStop(1, horizon);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const m = new pc.StandardMaterial();
  m.useLighting = false;
  m.useFog = false;
  m.diffuse = new pc.Color(0, 0, 0);
  m.emissive = new pc.Color(1, 1, 1);
  m.emissiveMap = g.textureFromCanvas(c);
  m.cull = pc.CULLFACE_NONE;
  m.depthWrite = false;
  m.update();
  g._owned.push(m);
  return m;
}

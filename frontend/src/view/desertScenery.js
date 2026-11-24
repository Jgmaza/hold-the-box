// Fondo del desierto: arena con ondas, tinajas de arenisca, cactus detallados, árboles secos, cantos y huesos.
// Solo se ve (no choca). La geometría y la colocación están en desertLayout.js; aquí se vuelven mallas de PlayCanvas.
// Cada tipo de pieza tiene unas pocas variantes, y cada variante es UNA malla con color por vértice (una llamada de
// dibujo por pieza colocada, aunque tenga cientos de espinas).
import * as pc from 'playcanvas';
import {
  barrelGeo, boneGeo, boulderGeo, deadTreeGeo, layoutDecor, layoutDunes, layoutRocks, pearGeo, saguaroGeo, sandstoneGeo, tuftGeo,
} from './desertLayout.js';
import { seeded } from './nature.js';

/** Arena: base clara con ondas de viento (luz arriba, sombra abajo) y grano fino. Se repite sin costura. */
export function sandCanvas() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ecca8e';
  ctx.fillRect(0, 0, S, S);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Manchas suaves de tono.
  for (let i = 0; i < 26; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 40 + rand() * 90;
    const tone = rand() < 0.5 ? 'rgba(214, 170, 108, 0.18)' : 'rgba(250, 222, 170, 0.2)';
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      const grd = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      grd.addColorStop(0, tone);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  // Ondas: líneas sinuosas (periódicas en X para que la textura se repita) con su sombra debajo.
  const rows = 22;
  for (let k = 0; k < rows; k++) {
    const y0 = (k / rows) * S + rand() * 6;
    const amp = 4 + rand() * 6;
    const f1 = 1 + Math.floor(rand() * 3);
    const f2 = 3 + Math.floor(rand() * 3);
    const ph = rand() * 6;
    const line = (dy, color, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      for (const oy of [-S, 0, S]) {
        ctx.beginPath();
        for (let x = 0; x <= S; x += 4) {
          const a = (x / S) * Math.PI * 2;
          const y = y0 + oy + dy + Math.sin(a * f1 + ph) * amp + Math.sin(a * f2 + ph * 2) * amp * 0.35;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };
    line(2.5, 'rgba(176, 128, 70, 0.32)', 3);
    line(0, 'rgba(255, 238, 200, 0.55)', 2);
  }
  // Grano.
  for (let i = 0; i < 5000; i++) {
    const t = rand();
    ctx.fillStyle = t < 0.5 ? 'rgba(170, 125, 70, 0.28)' : 'rgba(255, 245, 220, 0.35)';
    ctx.fillRect(rand() * S, rand() * S, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  return c;
}

/** Material de color por vértice (todas las piezas del fondo lo comparten). */
function vertexColorMaterial(g, { gloss = 0.12 } = {}) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(1, 1, 1);
  m.diffuseVertexColor = true;
  m.diffuseVertexColorChannel = 'rgb';
  m.gloss = gloss;
  m.metalness = 0;
  m.useMetalness = true;
  m.update();
  g._owned.push(m);
  return m;
}

function toMesh(device, geo) {
  const mesh = new pc.Mesh(device);
  mesh.setPositions(geo.p);
  mesh.setNormals(geo.normals());
  mesh.setColors(geo.c);
  mesh.setIndices(geo.i);
  mesh.update();
  return mesh;
}

function place(parent, mesh, material, { x, y, z, s = 1, yaw = 0, shadows = true, name = 'fondo' }) {
  const e = new pc.Entity(name);
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: shadows, receiveShadows: true });
  e.setLocalPosition(x, y, z);
  e.setLocalEulerAngles(0, yaw, 0);
  e.setLocalScale(s, s, s);
  parent.addChild(e);
  return e;
}

const PIECES = {
  saguaro: { make: saguaroGeo, variants: 4, shadows: true },
  barrel: { make: barrelGeo, variants: 3, shadows: true },
  pear: { make: pearGeo, variants: 3, shadows: true },
  tree: { make: deadTreeGeo, variants: 3, shadows: true },
  bone: { make: boneGeo, variants: 2, shadows: false },
  tuft: { make: tuftGeo, variants: 3, shadows: false },
  boulder: { make: boulderGeo, variants: 3, shadows: true },
};

/**
 * Arma el fondo del desierto.
 * @param {{ z0:number, z1:number, groundY:number, seed:number, avoid:{minX,maxX,minZ,maxZ}[], gap?:{z0,z1}|null }} o
 * @returns {{ update(time:number):void, destroy():void, sand: pc.Material }}
 */
export function buildDesertScenery(g, P, parent, { z0, z1, groundY, seed, avoid = [], gap = null }) {
  const device = g.device;
  const rand = seeded(seed + 131);
  const root = new pc.Entity('fondo-desierto');
  parent.addChild(root);
  const meshes = [];
  const mat = vertexColorMaterial(g);
  const rockMat = vertexColorMaterial(g, { gloss: 0.06 });

  // Arena con ondas (también la usa desert.js para el piso cerca del camino).
  const tex = g.textureFromCanvas(sandCanvas(), { repeat: true });
  const sandTiled = (w, d) => {
    const m = g.textured(tex);
    m.diffuseMapTiling = new pc.Vec2(w / 7, d / 7);
    m.gloss = 0.04;
    m.update();
    return m;
  };

  // Dunas: lomas bajas con la misma arena.
  const duneMat = sandTiled(10, 10);
  for (const d of layoutDunes(rand, { z0, z1, gap })) {
    P.ball(root, duneMat, [d.x, groundY - d.h * 0.35, d.z], [d.w, d.h * 2, d.d], { shadows: false, name: 'duna' });
  }

  // Arenisca: cada formación es su propia malla (tamaños y formas distintas), pero comparten el material.
  const rocks = layoutRocks(rand, { z0, z1, avoid, gap });
  for (const k of rocks) {
    const mesh = toMesh(device, sandstoneGeo(rand, k));
    meshes.push(mesh);
    place(root, mesh, rockMat, { x: k.x, y: groundY - 0.25, z: k.z, yaw: k.yaw, shadows: k.row !== 'far', name: `arenisca-${k.row}` });
  }

  // Variantes de cada pieza (pocas mallas, muchas copias).
  const variants = {};
  for (const [kind, def] of Object.entries(PIECES)) {
    variants[kind] = [];
    for (let v = 0; v < def.variants; v++) {
      const mesh = toMesh(device, def.make(rand));
      meshes.push(mesh);
      variants[kind].push(mesh);
    }
  }

  const sway = [];
  const decor = layoutDecor(rand, { z0, z1, avoid, gap, rocks });
  for (const [n, it] of decor.entries()) {
    const list = variants[it.kind];
    const e = place(root, list[n % list.length], mat, { x: it.x, y: groundY - 0.02, z: it.z, s: it.s, yaw: it.yaw, shadows: PIECES[it.kind].shadows, name: it.kind });
    if (it.kind === 'saguaro' || it.kind === 'tuft') sway.push({ e, yaw: it.yaw, phase: n * 1.7, amp: it.kind === 'tuft' ? 4 : 1.2 });
  }

  return {
    sand: sandTiled,
    rocks,
    decor,
    update(time) {
      for (const s of sway) s.e.setLocalEulerAngles(Math.sin(time * 1.2 + s.phase) * s.amp, s.yaw, Math.sin(time * 0.9 + s.phase) * s.amp * 0.7);
    },
    destroy() {
      for (const m of meshes) m.destroy();
      meshes.length = 0;
    },
  };
}

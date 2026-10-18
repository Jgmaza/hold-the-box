// Cañón del desierto: mesas rojas, arena y el vacío al lado del camino.
// El polvo, el cardo y la vagoneta se mueven cada frame en PlayCanvas. No chocan.
import * as pc from 'playcanvas';
import { cactus, seeded } from './nature.js';

/** Arenisca: bandas fuertes, barniz, grietas, relieve y oclusión. Solo las rocas. */
function rockMaps() {
  const S = 512;
  const albedo = document.createElement('canvas');
  const height = document.createElement('canvas');
  const ao = document.createElement('canvas');
  albedo.width = height.width = ao.width = S;
  albedo.height = height.height = ao.height = S;
  const a = albedo.getContext('2d');
  const h = height.getContext('2d');
  const o = ao.getContext('2d');
  let seed = 91;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  a.fillStyle = '#e6dfd6';
  a.fillRect(0, 0, S, S);
  h.fillStyle = '#9a9a9a';
  h.fillRect(0, 0, S, S);
  o.fillStyle = '#ececec';
  o.fillRect(0, 0, S, S);
  for (let y = 0; y < S;) {
    const band = 4 + Math.floor(rand() * 18);
    const t = 150 + Math.floor(rand() * 80);
    a.fillStyle = `rgb(${t}, ${Math.max(0, t - 12)}, ${Math.max(0, t - 24)})`;
    a.fillRect(0, y, S, band);
    const hv = 40 + Math.floor(rand() * 160);
    h.fillStyle = `rgb(${hv},${hv},${hv})`;
    h.fillRect(0, y, S, Math.max(2, band - 2));
    if (rand() < 0.35) {
      a.fillStyle = 'rgba(70, 28, 16, 0.45)';
      a.fillRect(0, y + band - 2, S, 2);
      h.fillStyle = '#111';
      h.fillRect(0, y + band - 2, S, 2);
      o.fillStyle = '#6a6a6a';
      o.fillRect(0, y + band - 3, S, 4);
    }
    y += band;
  }
  for (let i = 0; i < 18; i++) {
    const x = rand() * S;
    const drip = a.createLinearGradient(x, 0, x + 30, S);
    drip.addColorStop(0, 'rgba(90, 36, 18, 0)');
    drip.addColorStop(0.4, 'rgba(72, 28, 14, 0.45)');
    drip.addColorStop(1, 'rgba(50, 20, 12, 0)');
    a.fillStyle = drip;
    a.fillRect(x, 0, 10 + rand() * 22, S);
  }
  for (let i = 0; i < 700; i++) {
    const t = 140 + Math.floor(rand() * 90);
    a.fillStyle = `rgba(${t}, ${t - 8}, ${t - 16}, 0.4)`;
    a.fillRect(rand() * S, rand() * S, 1 + rand() * 3, 1 + rand() * 2);
  }
  for (let i = 0; i < 48; i++) {
    const x0 = rand() * S;
    const y0 = rand() * S;
    const x1 = x0 + (rand() - 0.5) * 40;
    const y1 = y0 + 30 + rand() * 90;
    a.strokeStyle = `rgba(36, 14, 8, ${0.45 + rand() * 0.4})`;
    a.lineWidth = 1 + rand() * 2.2;
    a.beginPath();
    a.moveTo(x0, y0);
    a.lineTo(x1, y1);
    a.stroke();
    h.strokeStyle = '#0e0e0e';
    h.lineWidth = 2 + rand() * 3;
    h.beginPath();
    h.moveTo(x0, y0);
    h.lineTo(x1, y1);
    h.stroke();
    o.strokeStyle = '#222';
    o.lineWidth = 5 + rand() * 6;
    o.beginPath();
    o.moveTo(x0, y0);
    o.lineTo(x1, y1);
    o.stroke();
  }
  const nrm = document.createElement('canvas');
  nrm.width = nrm.height = S;
  const n = nrm.getContext('2d');
  const src = h.getImageData(0, 0, S, S).data;
  const dst = n.createImageData(S, S);
  const at = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) / 255;
      const dy = (at(x, y + 1) - at(x, y - 1)) / 255;
      const iz = 1 / Math.hypot(dx * 2.4, dy * 2.4, 1);
      const i = (y * S + x) * 4;
      dst.data[i] = 128 - dx * 2.4 * iz * 127;
      dst.data[i + 1] = 128 - dy * 2.4 * iz * 127;
      dst.data[i + 2] = 128 + iz * 127;
      dst.data[i + 3] = 255;
    }
  }
  n.putImageData(dst, 0, 0);
  return { albedo, height, ao, normal: nrm };
}

function rockMat(g, maps, hex, tile = 2.6) {
  const m = g.textured(maps.albedo, { tint: g.color(hex) });
  m.gloss = 0.03;
  m.metalness = 0;
  m.useMetalness = true;
  m.normalMap = maps.normal;
  m.heightMap = maps.height;
  m.heightMapFactor = 0.035;
  m.aoMap = maps.ao;
  const uv = new pc.Vec2(tile, tile);
  m.diffuseMapTiling = uv;
  m.normalMapTiling = uv;
  m.heightMapTiling = uv;
  m.aoMapTiling = uv;
  m.update();
  return m;
}

const BEDS = [
  [0.55, 0.24, 0.13],
  [0.86, 0.4, 0.18],
  [0.68, 0.3, 0.14],
  [0.93, 0.55, 0.26],
  [0.48, 0.2, 0.11],
  [0.8, 0.36, 0.16],
  [0.97, 0.68, 0.38],
];
const CAP = [1.05, 0.82, 0.5];
const SHADE = [0.28, 0.12, 0.07];

function cross(a, b, c) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  let x = uy * vz - uz * vy;
  let y = uz * vx - ux * vz;
  let z = ux * vy - uy * vx;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** Cuatro vértices únicos por cara, para que cada plano de roca tenga su propia luz. */
function quad(buf, a, b, c, d, colA, colB, u0, v0, u1, v1) {
  let n = cross(a, b, c);
  const midX = (a[0] + b[0] + c[0]) / 3;
  const midZ = (a[2] + b[2] + c[2]) / 3;
  const flat = Math.abs(n[1]) > 0.7;
  const inward = !flat && midX * midX + midZ * midZ > 0.2 && n[0] * midX + n[2] * midZ < 0;
  if (inward || (flat && n[1] < 0)) {
    const nb = d;
    const nd = b;
    b = nb;
    d = nd;
    n = cross(a, b, c);
  }
  const base = buf.p.length / 3;
  const push = (pt, col, u, v) => {
    buf.p.push(pt[0], pt[1], pt[2]);
    buf.n.push(n[0], n[1], n[2]);
    buf.uv.push(u, v);
    buf.c.push(col[0], col[1], col[2], 1);
  };
  push(a, colA, u0, v0);
  push(b, colA, u1, v0);
  push(c, colB, u1, v1);
  push(d, colB, u0, v1);
  buf.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function tri(buf, a, b, c, col, u, v, mode) {
  let n = cross(a, b, c);
  if (mode === 'up' && n[1] < 0) {
    [b, c] = [c, b];
    n = cross(a, b, c);
  } else if (mode === 'out') {
    const mx = (a[0] + b[0] + c[0]) / 3;
    const my = (a[1] + b[1] + c[1]) / 3;
    const mz = (a[2] + b[2] + c[2]) / 3;
    if (n[0] * mx + n[1] * my + n[2] * mz < 0) {
      [b, c] = [c, b];
      n = cross(a, b, c);
    }
  }
  const base = buf.p.length / 3;
  for (const pt of [a, b, c]) {
    buf.p.push(pt[0], pt[1], pt[2]);
    buf.n.push(n[0], n[1], n[2]);
    buf.uv.push(u, v);
    buf.c.push(col[0], col[1], col[2], 1);
  }
  buf.i.push(base, base + 1, base + 2);
}

function radiusAt(i, sides, phase) {
  const a = (i / sides) * Math.PI * 2;
  return 0.8
    + 0.13 * Math.sin(a * 2 + phase)
    + 0.07 * Math.sin(a * 3 + phase * 1.6)
    + 0.045 * Math.sin(a * 5 + phase * 0.4);
}

function ringPts(sides, y, rx, rz, scale, phase, crackEvery) {
  const pts = [];
  for (let i = 0; i <= sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const crack = i % crackEvery === 0;
    const k = radiusAt(i % sides, sides, phase) * scale * (crack ? 0.9 : 1);
    pts.push([Math.cos(a) * rx * k, y, Math.sin(a) * rz * k]);
  }
  return pts;
}

function finishMesh(device, buf) {
  const mesh = new pc.Mesh(device);
  mesh.setPositions(buf.p);
  mesh.setNormals(buf.n);
  mesh.setUvs(0, buf.uv);
  mesh.setColors(buf.c);
  mesh.setIndices(buf.i);
  mesh.update();
  return mesh;
}

function placeMesh(parent, mesh, material, pos, rot) {
  const e = new pc.Entity('roca');
  const mi = new pc.MeshInstance(mesh, material);
  mi.castShadow = true;
  e.addComponent('render', { meshInstances: [mi], castShadows: true, receiveShadows: true });
  e.setLocalPosition(pos[0], pos[1], pos[2]);
  if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  parent.addChild(e);
  return e;
}

/**
 * Mesa de arenisca: contorno comido por el viento, capas duras que sobresalen
 * y capas blandas hundidas. La luz de PlayCanvas cae en cada cara de verdad.
 */
function mesaMesh(device, rand, { rx, rz, height, layers, sides }) {
  const buf = { p: [], n: [], uv: [], c: [], i: [] };
  const phase = rand() * 6;
  const crackEvery = 5 + Math.floor(rand() * 3);
  let y = -1.1;
  let scale = 1;
  let prev = null;
  for (let L = 0; L < layers; L++) {
    const hard = L % 2 === 0;
    const thick = (height / layers) * (hard ? 1.15 + rand() * 0.35 : 0.55 + rand() * 0.25);
    scale *= hard ? 0.97 : 0.9;
    const lip = hard ? 1.06 : 0.94;
    const tint = BEDS[L % BEDS.length];
    const dark = tint.map((v) => v * 0.72);
    const bottom = ringPts(sides, y, rx, rz, scale * lip * 0.98, phase + L * 0.17, crackEvery);
    const top = ringPts(sides, y + thick, rx, rz, scale * lip, phase + L * 0.17, crackEvery);
    for (let i = 0; i < sides; i++) {
      const crack = i % crackEvery === 0;
      const ca = crack ? SHADE : dark;
      const cb = crack ? SHADE : tint;
      quad(buf, bottom[i], bottom[i + 1], top[i + 1], top[i], ca, cb, i / sides * 2, y * 0.22, (i + 1) / sides * 2, (y + thick) * 0.22);
    }
    if (prev) {
      for (let i = 0; i < sides; i++) {
        quad(buf, prev[i], prev[i + 1], bottom[i + 1], bottom[i], tint, tint, i / sides * 2, y * 0.22, (i + 1) / sides * 2, y * 0.22);
      }
    }
    prev = top;
    y += thick;
  }
  const crown = [0, y + 0.28, 0];
  for (let i = 0; i < sides; i++) tri(buf, crown, prev[i], prev[i + 1], CAP, 0.5, y * 0.22, 'up');
  return finishMesh(device, buf);
}

function boulderMesh(device, rand) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  });
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const mid = (a, b) => {
    const v = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const next = [];
  for (const f of faces) {
    const a = verts[f[0]];
    const b = verts[f[1]];
    const c = verts[f[2]];
    const i = verts.length;
    verts.push(mid(a, b), mid(b, c), mid(c, a));
    next.push([f[0], i, i + 2], [i, f[1], i + 1], [i + 2, i + 1, f[2]], [i, i + 1, i + 2]);
  }
  faces = next;
  const p1 = rand() * 6;
  const p2 = rand() * 6;
  const buf = { p: [], n: [], uv: [], c: [], i: [] };
  const tone = BEDS[Math.floor(rand() * BEDS.length)];
  for (const f of faces) {
    const pts = f.map((vi) => {
      const v = verts[vi];
      const n = Math.sin(v[0] * 2.6 + p1) * Math.sin(v[2] * 2.2 + p2) * 0.32 + Math.sin(v[1] * 3.4 + v[0] + p2) * 0.18;
      let r = 1 + n;
      let y = v[1] * r;
      if (y < -0.12) y = -0.12;
      return [v[0] * r, y * 0.72, v[2] * r];
    });
    tri(buf, pts[0], pts[1], pts[2], tone, 0.2, 0.4, 'out');
  }
  return finishMesh(device, buf);
}

function wagonWheel(g, parent, pos, rot, wood, iron) {
  const e = g.group('rueda', parent, pos);
  e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
  g.prim('cylinder', iron, { parent: e, pos: [0, 0, 0], rot: [90, 0, 0], scale: [1.15, 0.07, 1.15], name: 'aro' });
  g.prim('cylinder', wood, { parent: e, pos: [0, 0, 0], rot: [90, 0, 0], scale: [0.92, 0.05, 0.92], name: 'llanta' });
  g.prim('cylinder', iron, { parent: e, pos: [0, 0, 0], rot: [90, 0, 0], scale: [0.18, 0.12, 0.18], name: 'buje' });
  for (let i = 0; i < 8; i++) {
    g.prim('box', wood, { parent: e, rot: [0, 0, (i / 8) * 180], scale: [1.02, 0.05, 0.05], name: 'radio' });
  }
}

function rockFence(g, parent, pos, yaw, wood, iron) {
  const e = g.group('cerca-roca', parent, pos);
  e.setLocalEulerAngles(0, yaw, 0);
  for (let i = 0; i < 4; i++) {
    const z = i * 1.28;
    g.prim('cylinder', wood, { parent: e, pos: [0, 0.62, z], scale: [0.09, 1.28, 0.09], name: 'poste' });
    g.prim('box', wood, { parent: e, pos: [0, 1.22, z], scale: [0.16, 0.08, 0.16], name: 'cabeza' });
    if (!i) continue;
    g.prim('cylinder', iron, { parent: e, pos: [0, 1.02, z - 0.64], rot: [90, 0, 0], scale: [0.018, 1.22, 0.018], name: 'alambre' });
    g.prim('cylinder', iron, { parent: e, pos: [0, 0.52, z - 0.64], rot: [90, 0, 0], scale: [0.018, 1.22, 0.018], name: 'alambre' });
  }
}

function butte(device, parent, material, meshes, rand, g, mats, { x, z, groundY, rx, rz, height, near, story }) {
  const mesh = mesaMesh(device, rand, { rx, rz, height, layers: near ? 8 : 5, sides: near ? 22 : 14 });
  meshes.push(mesh);
  const root = new pc.Entity('mesa');
  root.setLocalPosition(x, groundY, z);
  root.setLocalEulerAngles(0, (rand() - 0.5) * 18, 0);
  parent.addChild(root);
  placeMesh(root, mesh, material, [0, 0, 0]);
  const inward = -Math.sign(x) || -1;
  const n = near ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const rock = boulderMesh(device, rand);
    meshes.push(rock);
    const s = 0.7 + rand() * 1.1;
    const e = placeMesh(root, rock, material, [
      inward * rx * (0.72 + rand() * 0.28),
      -0.05,
      (rand() - 0.5) * rz * 1.3,
    ], [0, rand() * 360, 0]);
    e.setLocalScale(s * (0.8 + rand() * 0.5), s * (0.45 + rand() * 0.35), s * (0.7 + rand() * 0.5));
  }
  if (story && g) {
    wagonWheel(g, root, [inward * rx * 0.95, 0.15, rz * 0.15], [16, 24, 74], mats.wood, mats.iron);
    rockFence(g, root, [inward * rx * 1.05, 0.05, -rz * 0.2], inward > 0 ? 6 : 174, mats.wood, mats.iron);
  }
}

function mountainRange(device, parent, material, meshes, rand, g, mats, { z0, z1, groundY }) {
  for (const side of [-1, 1]) {
    let z = z1 - rand() * 4;
    let n = 0;
    while (z > z0) {
      const rx = 5 + rand() * 2.4;
      const rz = 4.2 + rand() * 2;
      butte(device, parent, material, meshes, rand, g, mats, {
        x: side * (14 + rand() * 2.2),
        z,
        groundY,
        rx,
        rz,
        height: 8 + rand() * 5,
        near: true,
        story: n === 0,
      });
      z -= rz * 2.1 + 4;
      n++;
    }
    z = z1 - 10;
    while (z > z0) {
      butte(device, parent, material, meshes, rand, g, mats, {
        x: side * (26 + rand() * 6),
        z,
        groundY,
        rx: 8 + rand() * 4,
        rz: 6 + rand() * 3,
        height: 13 + rand() * 7,
        near: false,
      });
      z -= 18 + rand() * 8;
    }
  }
  for (const side of [-1, 1]) {
    butte(device, parent, material, meshes, rand, g, mats, {
      x: side * (17 + rand()),
      z: (z0 + z1) * 0.5 + side * 8,
      groundY,
      rx: 2.1,
      rz: 1.7,
      height: 11 + rand() * 3,
      near: true,
    });
  }
  const zx = z1 - 18;
  butte(device, parent, material, meshes, rand, g, mats, { x: 12.6, z: zx, groundY, rx: 2.4, rz: 2.6, height: 7.5, near: true });
  butte(device, parent, material, meshes, rand, g, mats, { x: 18.4, z: zx, groundY, rx: 2.4, rz: 2.6, height: 7.2, near: true });
  butte(device, parent, material, meshes, rand, g, mats, { x: 15.5, z: zx, groundY: groundY + 6.2, rx: 4.6, rz: 2.2, height: 2.4, near: false });
}

/**
 * @returns {{ update: (time: number) => void }}
 */
export function buildCanyon(g, P, parent, { minZ, maxZ, groundY, seed, gap = null, cart = false, carpet = true }) {
  const z0 = minZ - 24;
  const z1 = maxZ + 28;
  const cz = (z0 + z1) / 2;
  const len = z1 - z0;
  const rand = seeded(seed + 17);
  const canvases = rockMaps();
  const maps = {
    albedo: g.textureFromCanvas(canvases.albedo, { repeat: true }),
    height: g.textureFromCanvas(canvases.height, { repeat: true }),
    ao: g.textureFromCanvas(canvases.ao, { repeat: true }),
    normal: g.textureFromCanvas(canvases.normal, { repeat: true }),
  };
  const mats = {
    shadow: rockMat(g, maps, '#5a241c', 1.5),
    dark: rockMat(g, maps, '#a84432', 2.1),
    clay: rockMat(g, maps, '#d2643f', 2.5),
    rust: rockMat(g, maps, '#c45632', 2.8),
    ochre: rockMat(g, maps, '#d4924a', 3.1),
    band: rockMat(g, maps, '#e08a4a', 3.4),
    sand: rockMat(g, maps, '#e7c48a', 1.8),
    scree: rockMat(g, maps, '#b86a3c', 1.5),
    dust: g.solid('#e6c48a', { gloss: 0.02, mul: 0.95 }),
    crack: rockMat(g, maps, '#3a1812', 4.2),
    wood: g.solid('#6a4a32', { gloss: 0.06, mul: 0.85 }),
    iron: g.solid('#4a4038', { gloss: 0.18, mul: 0.7 }),
  };
  const stone = rockMat(g, maps, '#ffffff', 1);
  stone.diffuseVertexColor = true;
  stone.diffuseVertexColorChannel = 'rgb';
  stone.update();
  const meshes = [];

  g.prim('box', g.solid('#6a2e28', { mul: 0.7 }), {
    parent, pos: [0, groundY - 16, cz], scale: [90, 10, len + 16], shadows: false, name: 'fondo-canon',
  });

  const sand = g.solid('#e4bc78', { mul: 0.96, gloss: 0.04 });
  const sandSpan = (a, b) => {
    if (!carpet || b - a < 0.8) return;
    g.prim('box', sand, {
      parent, pos: [0, groundY - 0.04, (a + b) / 2], scale: [16, 0.1, b - a], shadows: false, name: 'arena',
    });
  };
  if (gap) {
    sandSpan(z0, gap.z0);
    sandSpan(gap.z1, z1);
    const a = Math.max(z0, gap.z0);
    const b = Math.min(z1, gap.z1);
    if (b - a > 1) {
      g.prim('box', g.solid('#2a1612', { mul: 0.45 }), {
        parent, pos: [0, groundY - 6, (a + b) / 2], scale: [18, 10, b - a], shadows: false, name: 'vacio',
      });
    }
  } else {
    sandSpan(z0, z1);
  }

  mountainRange(g.device, parent, stone, meshes, rand, g, mats, { z0, z1, groundY });

  if (!carpet) {
    const berm = g.solid('#e8c48a', { mul: 0.92, gloss: 0.04 });
    for (const side of [-1, 1]) {
      g.prim('box', berm, {
        parent, pos: [side * 10, groundY - 0.42, cz], scale: [9, 0.28, len], shadows: false, name: 'berma',
      });
    }
    for (let i = 0; i < 22; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (6.4 + rand() * 4.2);
      const z = z0 + rand() * (z1 - z0);
      const s = 2.4 + rand() * 2.6;
      P.ball(parent, sand, [x, groundY - 0.15, z], [s * 1.5, 0.5, s], { name: 'duna' });
    }
  }

  const plants = [];
  const plantN = carpet ? 10 : 12;
  for (let i = 0; i < plantN; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (carpet ? 7.2 + rand() * 1.4 : 8.2 + rand() * 2.4);
    const z = z0 + rand() * (z1 - z0);
    if (gap && z > gap.z0 && z < gap.z1) continue;
    const kind = i % 5 === 0 ? 'barrel' : i % 4 === 0 ? 'pear' : 'saguaro';
    const e = cactus(P, parent, [x, groundY, z], {
      h: kind === 'barrel' ? 0.7 + rand() * 0.25 : kind === 'pear' ? 0.95 + rand() * 0.25 : 2.2 + rand() * 1.4,
      yaw: rand() * 50,
      kind,
    });
    plants.push({ e, phase: rand() * 6 });
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
      for (const mesh of meshes) mesh.destroy();
      meshes.length = 0;
    },
    update(time) {
      for (const p of plants) {
        p.e.setLocalEulerAngles(Math.sin(time * 1.3 + p.phase) * 2.5, 0, Math.sin(time * 1.1 + p.phase) * 1.6);
      }
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

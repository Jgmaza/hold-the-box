// Malla original de la pata del gato (sin modelo de terceros).
// Origen en el hombro, la punta de las garras mira a +Z. Unidad: metros.
// Uso: node apps/scripts/make-paw-glb.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FUR = [0.86, 0.45, 0.2];
const FUR_DARK = [0.62, 0.3, 0.12];
const PAD = [0.93, 0.58, 0.52];
const CLAW = [0.95, 0.93, 0.88];

const positions = [];
const normals = [];
const colors = [];
const indices = [];

function pushVert(p, n, c) {
  const i = positions.length / 3;
  positions.push(p[0], p[1], p[2]);
  const len = Math.hypot(n[0], n[1], n[2]) || 1;
  normals.push(n[0] / len, n[1] / len, n[2] / len);
  colors.push(c[0], c[1], c[2], 1);
  return i;
}

function addEllipsoid(cx, cy, cz, rx, ry, rz, color, seg = 14, rings = 10) {
  const grid = [];
  for (let y = 0; y <= rings; y++) {
    const phi = (y / rings) * Math.PI;
    const row = [];
    for (let x = 0; x <= seg; x++) {
      const theta = (x / seg) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      row.push(pushVert(
        [cx + nx * rx, cy + ny * ry, cz + nz * rz],
        [nx / rx, ny / ry, nz / rz],
        color,
      ));
    }
    grid.push(row);
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) {
      const a = grid[y][x];
      const b = grid[y + 1][x];
      const c = grid[y + 1][x + 1];
      const d = grid[y][x + 1];
      indices.push(a, b, d, b, c, d);
    }
  }
}

function addTube(z0, z1, r0, r1, y0, y1, color, seg = 16) {
  const steps = 7;
  const rows = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const z = z0 + (z1 - z0) * t;
    const y = y0 + (y1 - y0) * t;
    const r = r0 + (r1 - r0) * t;
    const row = [];
    for (let x = 0; x <= seg; x++) {
      const a = (x / seg) * Math.PI * 2;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      row.push(pushVert([nx * r, y + ny * r, z], [nx, ny, 0], color));
    }
    rows.push(row);
  }
  for (let i = 0; i < steps; i++) {
    for (let x = 0; x < seg; x++) {
      const a = rows[i][x];
      const b = rows[i + 1][x];
      const c = rows[i + 1][x + 1];
      const d = rows[i][x + 1];
      indices.push(a, b, d, b, c, d);
    }
  }
}

function addCone(bx, by, bz, tx, ty, tz, r, color, seg = 8) {
  const dx = tx - bx;
  const dy = ty - by;
  const dz = tz - bz;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ax = dx / len;
  const ay = dy / len;
  const az = dz / len;
  let ux = 0;
  let uy = 1;
  let uz = 0;
  if (Math.abs(ay) > 0.9) {
    ux = 1;
    uy = 0;
  }
  let rx = ay * uz - az * uy;
  let ry = az * ux - ax * uz;
  let rz = ax * uy - ay * ux;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  const px = ay * rz - az * ry;
  const py = az * rx - ax * rz;
  const pz = ax * ry - ay * rx;
  const tip = pushVert([tx, ty, tz], [ax, ay, az], color);
  const ring = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const ox = Math.cos(a) * rx + Math.sin(a) * px;
    const oy = Math.cos(a) * ry + Math.sin(a) * py;
    const oz = Math.cos(a) * rz + Math.sin(a) * pz;
    ring.push(pushVert(
      [bx + ox * r, by + oy * r, bz + oz * r],
      [ox * 0.85 + ax * 0.15, oy * 0.85 + ay * 0.15, oz * 0.85 + az * 0.15],
      color,
    ));
  }
  for (let i = 0; i < seg; i++) indices.push(tip, ring[i], ring[i + 1]);
}

addTube(0.02, 0.16, 0.042, 0.034, 0, -0.015, FUR);
addEllipsoid(0, -0.02, 0.175, 0.04, 0.032, 0.04, FUR_DARK, 12, 8);
addEllipsoid(0, -0.03, 0.24, 0.085, 0.032, 0.055, FUR, 16, 10);
addEllipsoid(0, -0.048, 0.235, 0.042, 0.014, 0.032, PAD, 10, 6);

const toes = [
  [-0.055, 0.285],
  [-0.02, 0.3],
  [0.02, 0.3],
  [0.055, 0.285],
];
for (const [x, z] of toes) {
  addEllipsoid(x, -0.02, z, 0.022, 0.016, 0.028, FUR, 10, 8);
  addEllipsoid(x, -0.032, z - 0.004, 0.012, 0.007, 0.014, PAD, 8, 6);
  addCone(x, -0.018, z + 0.02, x, -0.028, z + 0.055, 0.007, CLAW, 7);
}

const vertCount = positions.length / 3;
let minX = Infinity;
let minY = Infinity;
let minZ = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
let maxZ = -Infinity;
for (let i = 0; i < vertCount; i++) {
  const x = positions[i * 3];
  const y = positions[i * 3 + 1];
  const z = positions[i * 3 + 2];
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  minZ = Math.min(minZ, z);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
  maxZ = Math.max(maxZ, z);
}

const posBuf = Buffer.from(new Float32Array(positions).buffer);
const nrmBuf = Buffer.from(new Float32Array(normals).buffer);
const colBuf = Buffer.from(new Float32Array(colors).buffer);
const idxBuf = Buffer.from(new Uint16Array(indices).buffer);

function pad4(buf, fill = 0) {
  const extra = (4 - (buf.length % 4)) % 4;
  return extra ? Buffer.concat([buf, Buffer.alloc(extra, fill)]) : buf;
}

const chunks = [posBuf, nrmBuf, colBuf, idxBuf].map((b) => pad4(b));
const bin = Buffer.concat(chunks);
const offsets = [];
let cursor = 0;
for (const chunk of chunks) {
  offsets.push(cursor);
  cursor += chunk.length;
}

const gltf = {
  asset: { version: '2.0', generator: 'no-sueltes-pata' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'pata-gato' }],
  materials: [{
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.62 },
    doubleSided: true,
  }],
  meshes: [{
    name: 'pata',
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 },
      indices: 3,
      material: 0,
    }],
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
    { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: vertCount, type: 'VEC4' },
    { bufferView: 3, componentType: 5123, count: indices.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: offsets[0], byteLength: posBuf.length, target: 34962 },
    { buffer: 0, byteOffset: offsets[1], byteLength: nrmBuf.length, target: 34962 },
    { buffer: 0, byteOffset: offsets[2], byteLength: colBuf.length, target: 34962 },
    { buffer: 0, byteOffset: offsets[3], byteLength: idxBuf.length, target: 34963 },
  ],
  buffers: [{ byteLength: bin.length }],
};

const json = pad4(Buffer.from(JSON.stringify(gltf)), 0x20);
const total = 12 + 8 + json.length + 8 + bin.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(total, 8);
const jsonHead = Buffer.alloc(8);
jsonHead.writeUInt32LE(json.length, 0);
jsonHead.writeUInt32LE(0x4e4f534a, 4);
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(bin.length, 0);
binHead.writeUInt32LE(0x004e4942, 4);

const out = join(dirname(fileURLToPath(import.meta.url)), '../../deliveries/luis/models/pata-gato.glb');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, jsonHead, json, binHead, bin]));
console.log(`pata-gato.glb  verts=${vertCount}  tris=${indices.length / 3}  largo=${maxZ.toFixed(3)} m`);

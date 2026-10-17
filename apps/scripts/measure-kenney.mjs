// Mide los modelos Kenney (apps/public/kenney/*.glb) y escribe sus bounds en src/levels/kenneyBounds.js.
// La simulación corre sin navegador (tests), así que los colliders de los props salen de esta tabla.
// Bounds = min/max reales de los vértices (accessor POSITION) transformados por los nodos de la escena,
// en unidades del modelo (sin la escala `s` del nivel). Volver a correr cuando lleguen modelos nuevos:
//   node apps/scripts/measure-kenney.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'public/kenney');
const out = join(root, 'src/levels/kenneyBounds.js');

/** JSON del GLB (chunk 0). */
function readGltf(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file}: no es GLB`);
  const len = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + len).toString('utf8'));
}

// Matrices 4x4 column-major (como glTF).
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function mul(a, b) {
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) r[c * 4 + row] += a[k * 4 + row] * b[c * 4 + k];
  return r;
}

function nodeMatrix(n) {
  if (n.matrix) return n.matrix;
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

const apply = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

function measure(gltf) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const visit = (index, parent) => {
    const node = gltf.nodes[index];
    const m = mul(parent, nodeMatrix(node));
    if (node.mesh !== undefined) {
      for (const prim of gltf.meshes[node.mesh].primitives) {
        const acc = gltf.accessors[prim.attributes.POSITION];
        if (!acc.min || !acc.max) continue;
        // Las 8 esquinas del AABB local, pasadas al espacio del modelo.
        for (let i = 0; i < 8; i++) {
          const p = apply(m, [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]]);
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k], p[k]);
            max[k] = Math.max(max[k], p[k]);
          }
        }
      }
    }
    for (const c of node.children ?? []) visit(c, m);
  };
  const scene = gltf.scenes[gltf.scene ?? 0];
  for (const n of scene.nodes) visit(n, identity());
  const r = (v) => Math.round(v * 1000) / 1000;
  return { min: min.map(r), max: max.map(r) };
}

const files = readdirSync(dir).filter((f) => f.endsWith('.glb')).sort();
const bounds = {};
for (const f of files) bounds[f.replace(/\.glb$/, '')] = measure(readGltf(join(dir, f)));

const lines = Object.entries(bounds).map(([k, b]) => `  '${k}': { min: [${b.min.join(', ')}], max: [${b.max.join(', ')}] },`);
writeFileSync(
  out,
  `// GENERADO por apps/scripts/measure-kenney.mjs — no editar a mano.
// Bounds de cada modelo Kenney en unidades del modelo (antes de la escala \`s\` del nivel).
export const KENNEY_BOUNDS = {
${lines.join('\n')}
};
`,
);
console.log(`[kenney] ${files.length} modelos medidos → ${out}`);

// Malla original del atado de TNT de la caja bomba (sin modelo de terceros).
// Origen en el centro de la tapa de la caja (y = 0 es la tapa). X va de P1 a P2, +Z mira a la cámara.
// La caja mide 1.0 x 0.7 x 0.8; las sogas la rodean entera. Unidad: metros.
// El reloj, el LED, la mecha que se acorta y la chispa los pone boxView.js (cambian en vivo).
// Uso: node apps/scripts/make-bomb-glb.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// glTF guarda el color por vértice en lineal: el hex (sRGB) se convierte para que salga igual que la paleta.
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hex = (h) => [1, 3, 5].map((i) => toLinear(parseInt(h.slice(i, i + 2), 16) / 255));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

const RED = hex('#e8453c');
const RED_DARK = hex('#9e2420');
const CAP = hex('#f3e2b8');
const CAP_CORE = hex('#ffcc33');
const LABEL = hex('#f7e9a8');
const LABEL_INK = hex('#8a1f1a');
const TAPE = hex('#9ea3aa');
const TAPE_DARK = hex('#7c8188');
const PCB = hex('#1f5a37');
const PANEL = hex('#1c1c1f');
const HOUSING = hex('#38383d');
const METAL = hex('#c9ccd1');
const BRASS = hex('#d1a043');
const BUTTON = hex('#e2261d');
const ROPE = hex('#d7c4a3');
const ROPE_DARK = hex('#a8916c');
const FUSE = hex('#d9bf8a');
const FUSE_DARK = hex('#a8874f');
const WIRES = ['#3cb85a', '#3d7fe0', '#ffd23a', '#ff8a2a', '#e2261d', '#222226'].map(hex);

// Medidas que boxView.js replica (sumándoles S.h / 2).
const R = 0.058; // radio de cada cartucho
const L = 0.56; // largo de los cartuchos
const Y0 = 0.012; // separación con la tapa (la cinta pasa por debajo)
const YB = Y0 + R;
const YT = YB + Math.sqrt((2 * R) ** 2 - 0.06 ** 2);
const BOTTOM_Z = [-0.18, -0.06, 0.06, 0.18];
const TOP_Z = [-0.12, 0, 0.12];
const BOARD_Y = YT + R + 0.0075; // apoya sobre la cinta
const T = BOARD_Y + 0.026; // cara superior del panel negro
const DISPLAY = { x: -0.035, z: 0.02, w: 0.13, h: 0.032, d: 0.072, tilt: 18 };
const LED = { x: 0.05, z: 0.047 };
const FUSE_TIP = [0.345, 0.222, 0.12];

const positions = [];
const normals = [];
const colors = [];
const indices = [];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const perp = (t) => norm(cross(Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], t));
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function pushVert(p, n, c) {
  const i = positions.length / 3;
  positions.push(p[0], p[1], p[2]);
  const nn = norm(n);
  normals.push(nn[0], nn[1], nn[2]);
  colors.push(c[0], c[1], c[2], 1);
  return i;
}

function quad(a, b, c, d) {
  indices.push(a, b, c, a, c, d);
}

function addEllipsoid(c, r, color, seg = 14, rings = 10) {
  const grid = [];
  for (let y = 0; y <= rings; y++) {
    const phi = (y / rings) * Math.PI;
    const row = [];
    for (let x = 0; x <= seg; x++) {
      const theta = (x / seg) * Math.PI * 2;
      const n = [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)];
      const col = typeof color === 'function' ? color(n) : color;
      row.push(pushVert([c[0] + n[0] * r[0], c[1] + n[1] * r[1], c[2] + n[2] * r[2]], [n[0] / r[0], n[1] / r[1], n[2] / r[2]], col));
    }
    grid.push(row);
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) quad(grid[y][x], grid[y + 1][x], grid[y + 1][x + 1], grid[y][x + 1]);
  }
}

function addDisk(c, n, r, color, seg = 18) {
  const u = perp(n);
  const v = cross(n, u);
  const center = pushVert(c, n, color);
  const ring = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    ring.push(pushVert(add(c, add(scale(u, Math.cos(a) * r), scale(v, Math.sin(a) * r))), n, color));
  }
  for (let i = 0; i < seg; i++) indices.push(center, ring[i], ring[i + 1]);
}

/**
 * Tubo que sigue una lista de puntos (marco transportado, sin giros raros).
 * `radius` y `color` pueden ser funciones: radius(t), color(normal, t, vuelta).
 */
function addPath(pts, radius, color, { seg = 10, caps = true, capColor = null } = {}) {
  const n = pts.length;
  const tan = pts.map((_, i) => norm(sub(pts[Math.min(i + 1, n - 1)], pts[Math.max(i - 1, 0)])));
  let u = perp(tan[0]);
  const rings = [];
  for (let i = 0; i < n; i++) {
    const t = tan[i];
    u = norm(sub(u, scale(t, dot(u, t))));
    const v = cross(t, u);
    const f = i / (n - 1);
    const r = typeof radius === 'function' ? radius(f) : radius;
    const ring = [];
    for (let k = 0; k <= seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      const nr = add(scale(u, Math.cos(a)), scale(v, Math.sin(a)));
      const col = typeof color === 'function' ? color(nr, f, k / seg) : color;
      ring.push(pushVert(add(pts[i], scale(nr, r)), nr, col));
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < seg; k++) quad(rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]);
  }
  if (caps) {
    const cc = (f) => capColor ?? (typeof color === 'function' ? color(tan[0], f, 0) : color);
    const r0 = typeof radius === 'function' ? radius(0) : radius;
    const r1 = typeof radius === 'function' ? radius(1) : radius;
    addDisk(pts[0], scale(tan[0], -1), r0, cc(0), seg);
    addDisk(pts[n - 1], tan[n - 1], r1, cc(1), seg);
  }
}

const cylinder = (a, b, r, color, opts) => addPath([a, b], r, color, { seg: 16, ...opts });

/** Caja con giro opcional alrededor de X (grados). */
function addBox(c, s, color, rotX = 0) {
  const a = (rotX * Math.PI) / 180;
  const rot = (p) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
  const h = scale(s, 0.5);
  const faces = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
  ];
  for (const [n, e1, e2] of faces) {
    const corner = (s1, s2) => {
      const p = [0, 1, 2].map((i) => (n[i] + e1[i] * s1 + e2[i] * s2) * h[i]);
      return pushVert(add(c, rot(p)), rot(n), color);
    };
    quad(corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1));
  }
}

/** Curva suave que pasa por todos los puntos de control. */
function catmull(ctrl, per = 8) {
  const out = [];
  const P = (i) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const p0 = P(i - 1);
      const p1 = P(i);
      const p2 = P(i + 1);
      const p3 = P(i + 2);
      out.push([0, 1, 2].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)));
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/** Contorno (z, y) del atado, inflado `r` sobre los centros de los cartuchos de afuera. */
function hullOutline(r, steps = 8) {
  const hull = [[BOTTOM_Z[0], YB], [BOTTOM_Z[3], YB], [TOP_Z[2], YT], [TOP_Z[0], YT]];
  const out = [];
  for (let i = 0; i < hull.length; i++) {
    const prev = hull[(i + hull.length - 1) % hull.length];
    const cur = hull[i];
    const next = hull[(i + 1) % hull.length];
    let a1 = Math.atan2(-(cur[0] - prev[0]), cur[1] - prev[1]);
    let a2 = Math.atan2(-(next[0] - cur[0]), next[1] - cur[1]);
    a1 = Math.atan2(Math.sin(a1), Math.cos(a1));
    while (a2 < a1) a2 += Math.PI * 2;
    for (let s = 0; s <= steps; s++) {
      const a = a1 + ((a2 - a1) * s) / steps;
      out.push({ z: cur[0] + Math.cos(a) * r, y: cur[1] + Math.sin(a) * r, nz: Math.cos(a), ny: Math.sin(a) });
    }
  }
  return out;
}

// ---------- Cartuchos ----------
const sticks = [...BOTTOM_Z.map((z) => [YB, z]), ...TOP_Z.map((z) => [YT, z])];
sticks.forEach(([y, z], idx) => {
  const tone = 0.96 + ((idx * 37) % 7) * 0.012;
  const body = (n, f) => {
    const lit = mix(RED_DARK, RED, 0.5 + 0.5 * n[1]);
    const rim = Math.min(f, 1 - f) < 0.02 ? 0.82 : 1;
    return mul(lit, tone * rim);
  };
  const pts = [];
  for (let i = 0; i <= 12; i++) pts.push([-L / 2 + (L * i) / 12, y, z]);
  addPath(pts, R, body, { seg: 22, caps: false });
  for (const s of [-1, 1]) {
    addDisk([s * L / 2, y, z], [s, 0, 0], R * 0.97, CAP, 22);
    addDisk([s * (L / 2 + 0.0012), y, z], [s, 0, 0], R * 0.55, CAP_CORE, 18);
    addDisk([s * (L / 2 + 0.0022), y, z], [s, 0, 0], R * 0.16, mul(CAP_CORE, 0.7), 10);
  }
});

// Etiqueta en el cartucho de adelante, mirando a la cámara.
function addArcBand(x0, x1, cy, cz, r, a0, a1, color, steps = 14) {
  const rows = [];
  for (let s = 0; s <= steps; s++) {
    const a = ((a0 + ((a1 - a0) * s) / steps) * Math.PI) / 180;
    const n = [0, Math.sin(a), Math.cos(a)];
    rows.push([x0, x1].map((x) => pushVert([x, cy + n[1] * r, cz + n[2] * r], n, color)));
  }
  for (let s = 0; s < steps; s++) quad(rows[s][0], rows[s + 1][0], rows[s + 1][1], rows[s][1]);
}
addArcBand(-0.1, 0.09, YB, BOTTOM_Z[3], R + 0.0012, -35, 70, LABEL);
addArcBand(-0.075, 0.065, YB, BOTTOM_Z[3], R + 0.0022, 30, 46, LABEL_INK, 4);
addArcBand(-0.075, 0.03, YB, BOTTOM_Z[3], R + 0.0022, 6, 16, LABEL_INK, 3);
addArcBand(-0.075, 0.0, YB, BOTTOM_Z[3], R + 0.0022, -14, -8, LABEL_INK, 2);

// ---------- Cinta gris ----------
function addTape(xc, w, seed) {
  const loop = hullOutline(R + 0.0065, 10);
  loop.push(loop[0]);
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5);
  const jitters = loop.map(() => [rand() * 0.006, rand() * 0.006]);
  jitters[jitters.length - 1] = jitters[0];
  const rows = loop.map((p, i) => {
    const n = [0, p.ny, p.nz];
    const jitter = jitters[i];
    return [
      pushVert([xc - w / 2 + jitter[0], p.y, p.z], n, TAPE_DARK),
      pushVert([xc - w / 4, p.y + p.ny * 0.0008, p.z + p.nz * 0.0008], n, TAPE),
      pushVert([xc + w / 4, p.y + p.ny * 0.0008, p.z + p.nz * 0.0008], n, mix(TAPE, [1, 1, 1], 0.12)),
      pushVert([xc + w / 2 + jitter[1], p.y, p.z], n, TAPE_DARK),
    ];
  });
  for (let i = 0; i < rows.length - 1; i++) {
    for (let k = 0; k < 3; k++) quad(rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]);
  }
}
addTape(-0.15, 0.072, 11);
addTape(0.15, 0.072, 29);

// ---------- Sogas que amarran el atado a la caja (le dan la vuelta entera) ----------
const ROPE_R = 0.012;
const ropeColor = (len) => (n, f, k) => {
  const stripe = Math.sin(k * Math.PI * 4 + f * len * 140);
  return mix(ROPE_DARK, ROPE, 0.5 + 0.5 * stripe);
};
function addRope(x) {
  const top = hullOutline(R + ROPE_R + 0.001, 8).filter((p) => p.y >= YB - 0.001);
  // Ordena de adelante (+z) hacia atrás sobre la parte de arriba.
  const iStart = top.findIndex((p) => p.nz > 0.99);
  const arc = [...top.slice(iStart), ...top.slice(0, iStart)].filter((p, i, arr) => i === 0 || p.nz < arr[i - 1].nz - 1e-4);
  const F = 0.4 + ROPE_R;
  const B = -0.7 - ROPE_R;
  const ctrl = [
    [x, -0.35, F],
    [x, -0.04, F],
    [x, ROPE_R * 0.7, 0.4 + ROPE_R * 0.7],
    [x, ROPE_R, 0.37],
    [x, ROPE_R, 0.29],
    ...arc.map((p) => [x, p.y, p.z]),
    [x, ROPE_R, -0.29],
    [x, ROPE_R, -0.37],
    [x, ROPE_R * 0.7, -0.4 - ROPE_R * 0.7],
    [x, -0.04, -F],
    [x, -0.35, -F],
    [x, B + 0.04, -F],
    [x, B + ROPE_R * 0.3, -0.4 - ROPE_R * 0.7],
    [x, B, -0.37],
    [x, B, 0.37],
    [x, B + ROPE_R * 0.3, 0.4 + ROPE_R * 0.7],
    [x, B + 0.04, F],
    [x, -0.52, F],
    [x, -0.35, F],
  ];
  const pts = catmull(ctrl, 4);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(...sub(pts[i], pts[i - 1]));
  addPath(pts, ROPE_R, ropeColor(len), { seg: 10, caps: false });

  // Nudo arriba, del lado de la cámara, con dos puntas sueltas.
  const knot = [x, YT + R + ROPE_R + 0.004, 0.075];
  addEllipsoid(knot, [0.022, 0.016, 0.026], (n) => mix(ROPE_DARK, ROPE, 0.55 + 0.45 * n[1]), 12, 8);
  addEllipsoid(add(knot, [0, 0.006, -0.012]), [0.017, 0.013, 0.017], ROPE, 10, 6);
  for (const side of [-1, 1]) {
    const end = catmull([knot, add(knot, [side * 0.02, 0.008, 0.02]), add(knot, [side * 0.034, -0.012, 0.045])], 5);
    addPath(end, (f) => ROPE_R * 0.8 * (1 - f * 0.35), ropeColor(0.06), { seg: 8 });
  }
}
addRope(-0.215);
addRope(0.215);

// ---------- Placa del detonador ----------
addBox([0, BOARD_Y + 0.006, 0], [0.272, 0.012, 0.18], PCB);
addBox([0, BOARD_Y + 0.019, 0], [0.252, 0.014, 0.16], PANEL);
for (const sx of [-1, 1]) {
  for (const sz of [-1, 1]) addEllipsoid([sx * 0.128, BOARD_Y + 0.012, sz * 0.082], [0.006, 0.003, 0.006], METAL, 8, 4);
}
// Pistas de cobre asomando en el borde verde.
for (let i = 0; i < 5; i++) addBox([-0.1 + i * 0.05, BOARD_Y + 0.0125, 0.086], [0.03, 0.001, 0.003], BRASS);

// Carcasa del reloj, inclinada hacia la cámara. La pantalla la pone boxView.
addBox([DISPLAY.x, T + DISPLAY.h / 2, DISPLAY.z], [DISPLAY.w, DISPLAY.h, DISPLAY.d], HOUSING, DISPLAY.tilt);
for (const sx of [-1, 1]) addEllipsoid([DISPLAY.x + sx * 0.058, T + 0.004, DISPLAY.z + 0.04], [0.005, 0.004, 0.005], METAL, 8, 4);

// Botón rojo con base.
cylinder([0.095, T, 0.04], [0.095, T + 0.008, 0.04], 0.028, HOUSING);
cylinder([0.095, T + 0.008, 0.04], [0.095, T + 0.019, 0.04], 0.021, BUTTON, { caps: false });
addEllipsoid([0.095, T + 0.019, 0.04], [0.021, 0.009, 0.021], (n) => mix(BUTTON, [1, 0.7, 0.6], Math.max(0, n[1] - 0.6) * 0.8), 16, 8);

// Perilla moleteada con su rayita.
cylinder([0.095, T, -0.045], [0.095, T + 0.022, -0.045], 0.015, (n, f, k) => (Math.floor(k * 24) % 2 ? METAL : mul(METAL, 0.72)), { capColor: METAL });
addBox([0.095, T + 0.0228, -0.039], [0.003, 0.002, 0.011], PANEL);

// Chip con patitas y su puntito.
addBox([0.05, T + 0.005, -0.005], [0.03, 0.01, 0.042], hex('#111114'));
addEllipsoid([0.043, T + 0.0102, -0.02], [0.003, 0.0008, 0.003], mul(METAL, 0.8), 6, 3);
for (const sx of [-1, 1]) {
  for (let i = 0; i < 4; i++) addBox([0.05 + sx * 0.0175, T + 0.002, -0.02 + i * 0.01], [0.006, 0.004, 0.004], METAL);
}

// Base del LED (el LED lo prende boxView).
cylinder([LED.x, T, LED.z], [LED.x, T + 0.004, LED.z], 0.011, HOUSING);

// Bornera: 6 bornes con tornillo y el color de su cable.
const TERM_Y = T + 0.007;
const termX = (i) => -0.11 + i * 0.024;
addBox([-0.05, TERM_Y, -0.062], [0.152, 0.014, 0.022], hex('#2a2a2e'));
for (let i = 0; i < 6; i++) {
  addBox([termX(i), TERM_Y + 0.0075, -0.056], [0.012, 0.002, 0.008], WIRES[i]);
  addDisk([termX(i), TERM_Y + 0.0072, -0.066], [0, 1, 0], 0.0055, METAL, 10);
  addBox([termX(i), TERM_Y + 0.0074, -0.066], [0.008, 0.0012, 0.0016], mul(METAL, 0.5));
}

// ---------- Cables ----------
const WIRE_R = 0.0045;
const wireStart = (i) => [termX(i), TERM_Y, -0.074];

// Cuatro cables rectos a las puntas izquierdas de los cartuchos.
const leftTargets = [[YT, TOP_Z[0]], [YT, TOP_Z[1]], [YT, TOP_Z[2]], [YB, BOTTOM_Z[1]]];
leftTargets.forEach(([y, z], i) => {
  const cap = -L / 2 - 0.004;
  const ctrl = [
    wireStart(i),
    [termX(i) - 0.006, T + 0.022, -0.098],
    [-0.19 - i * 0.012, T + 0.042 - i * 0.006, (-0.1 + z) / 2 - 0.02],
    [-0.315 - i * 0.004, y + 0.03, z],
    [cap - 0.012, y, z],
  ];
  addPath(catmull(ctrl, 10), WIRE_R, WIRES[i], { seg: 8 });
  cylinder([cap - 0.012, y, z], [cap + 0.004, y, z], 0.0075, METAL);
});

/** Cable en espiral (tipo resorte) alrededor de una curva. Arranca y termina recto. */
function addCoil(lead, ctrl, color) {
  addPath(catmull(lead, 8), WIRE_R, color, { seg: 8 });
  const center = catmull(ctrl, 24);
  const acc = [0];
  for (let i = 1; i < center.length; i++) acc.push(acc[i - 1] + Math.hypot(...sub(center[i], center[i - 1])));
  const total = acc[acc.length - 1];
  const turns = Math.round(total / 0.017);
  const samples = turns * 10;
  const at = (d) => {
    let i = 1;
    while (i < acc.length - 1 && acc[i] < d) i++;
    const t = (d - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
    return add(center[i - 1], scale(sub(center[i], center[i - 1]), t));
  };
  const pts = [];
  let u = null;
  for (let s = 0; s <= samples; s++) {
    const f = s / samples;
    const d = f * total;
    const p = at(d);
    const t = norm(sub(at(Math.min(total, d + 0.004)), at(Math.max(0, d - 0.004))));
    u = u ? norm(sub(u, scale(t, dot(u, t)))) : perp(t);
    const v = cross(t, u);
    const r = 0.019 * smooth(0, 0.05, f) * (1 - smooth(0.95, 1, f));
    const a = f * turns * Math.PI * 2;
    pts.push(add(p, add(scale(u, Math.cos(a) * r), scale(v, Math.sin(a) * r))));
  }
  addPath(pts, WIRE_R, color, { seg: 6 });
  const end = ctrl[ctrl.length - 1];
  addDisk([end[0], 0.0012, end[2]], [0, 1, 0], 0.02, HOUSING, 14);
  cylinder([end[0], 0.001, end[2]], [end[0], 0.012, end[2]], 0.009, HOUSING);
}

addCoil(
  [wireStart(4), [termX(4), T + 0.03, -0.1], [0.02, T + 0.05, -0.12]],
  [[0.02, T + 0.05, -0.12], [0.18, T + 0.065, -0.15], [0.32, 0.2, -0.17], [0.375, 0.07, -0.18], [0.39, 0.012, -0.18]],
  WIRES[4],
);
addCoil(
  [wireStart(5), [termX(5), T + 0.026, -0.098], [0.03, T + 0.04, -0.125]],
  [[0.03, T + 0.04, -0.125], [-0.01, T + 0.03, -0.24], [-0.06, 0.15, -0.31], [-0.1, 0.04, -0.33], [-0.11, 0.012, -0.33]],
  WIRES[5],
);

// ---------- Mecha: casquillo y el primer tramo curvo (el resto lo acorta boxView) ----------
const fuseZ = TOP_Z[2];
cylinder([L / 2 - 0.004, YT, fuseZ], [L / 2 + 0.022, YT, fuseZ], 0.013, BRASS);
cylinder([L / 2 + 0.008, YT, fuseZ], [L / 2 + 0.013, YT, fuseZ], 0.0145, mul(BRASS, 0.75), { caps: false });
const fusePts = catmull([[L / 2 + 0.02, YT, fuseZ], [0.322, YT + 0.006, fuseZ], [0.338, 0.196, fuseZ], FUSE_TIP], 6);
addPath(fusePts, 0.009, (n, f, k) => mix(FUSE_DARK, FUSE, 0.5 + 0.5 * Math.sin(k * Math.PI * 4 + f * 30)), { seg: 10 });

// Que todos los triángulos miren hacia afuera (el material es de dos caras con luz de dos caras).
for (let i = 0; i < indices.length; i += 3) {
  const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
  const P = (j) => [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]];
  const N = (j) => [normals[j * 3], normals[j * 3 + 1], normals[j * 3 + 2]];
  const fn = cross(sub(P(b), P(a)), sub(P(c), P(a)));
  if (dot(fn, add(N(a), add(N(b), N(c)))) < 0) {
    indices[i + 1] = c;
    indices[i + 2] = b;
  }
}

const vertCount = positions.length / 3;
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < vertCount; i++) {
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], positions[i * 3 + k]);
    max[k] = Math.max(max[k], positions[i * 3 + k]);
  }
}

const posBuf = Buffer.from(new Float32Array(positions).buffer);
const nrmBuf = Buffer.from(new Float32Array(normals).buffer);
const colBuf = Buffer.from(new Uint8Array(colors.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255))).buffer);
if (vertCount > 65535) throw new Error(`demasiados vértices para índices de 16 bits: ${vertCount}`);
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
  asset: { version: '2.0', generator: 'hold-the-box-bomba' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'caja-bomba' }],
  materials: [{
    pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.6 },
    doubleSided: true,
  }],
  meshes: [{
    name: 'atado-tnt',
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 },
      indices: 3,
      material: 0,
    }],
  }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min, max },
    { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
    { bufferView: 2, componentType: 5121, normalized: true, count: vertCount, type: 'VEC4' },
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

const out = join(dirname(fileURLToPath(import.meta.url)), '../../deliveries/luis/models/caja-bomba.glb');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, jsonHead, json, binHead, bin]));
console.log(`caja-bomba.glb  verts=${vertCount}  tris=${indices.length / 3}`);
console.log(`  min=${min.map((v) => v.toFixed(3)).join(', ')}  max=${max.map((v) => v.toFixed(3)).join(', ')}`);
console.log(`  panel T=${T.toFixed(4)}  mecha=${FUSE_TIP.join(', ')}`);

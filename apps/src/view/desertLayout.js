// Fondo del desierto, la parte pura (sin PlayCanvas): geometría por vértices y dónde va cada pieza.
// La usa desertScenery.js para armar las mallas; se prueba en test/desertScenery.test.js.
//
// Geometría: todo se arma con `lathe` (un perfil que gira alrededor del eje Y, como un torno) y se coloca con una
// matriz 3×3 + traslación. Esferas, tubos, pencas, tinajas de arenisca… son perfiles distintos. Cada tipo de pieza se
// junta en UNA malla con color por vértice: una pieza = una llamada de dibujo, aunque tenga cientos de espinas.

// ------------------------------------------------------------------ matrices 3×3 (fila mayor)

const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul3(a, b) {
  const r = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  }
  return r;
}

/** Rotación por ángulos de Euler en grados (X, luego Y, luego Z, como PlayCanvas). */
export function euler(x = 0, y = 0, z = 0) {
  const [a, b, c] = [x, y, z].map((d) => (d * Math.PI) / 180);
  const rx = [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
  const ry = [Math.cos(b), 0, Math.sin(b), 0, 1, 0, -Math.sin(b), 0, Math.cos(b)];
  const rz = [Math.cos(c), -Math.sin(c), 0, Math.sin(c), Math.cos(c), 0, 0, 0, 1];
  return mul3(ry, mul3(rx, rz));
}

/** Rotación que lleva +Y a `dir` (Rodrigues). */
export function alignY(dir) {
  const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const d = [dir[0] / l, dir[1] / l, dir[2] / l];
  const c = d[1]; // coseno con +Y
  if (c > 0.99999) return I3.slice();
  if (c < -0.99999) return [1, 0, 0, 0, -1, 0, 0, 0, -1];
  // eje = Y × d
  const ax = [d[2], 0, -d[0]];
  const s = Math.hypot(ax[0], ax[2]);
  const [x, y, z] = [ax[0] / s, ax[1] / s, ax[2] / s];
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

const apply = (m, p) => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
];

// ------------------------------------------------------------------ colores

export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lin = (v) => clamp01(v) ** 2.2;

// ------------------------------------------------------------------ geometría

/** Acumula vértices (posición + color) e índices; `finish()` calcula normales suaves. */
export class Geo {
  constructor() {
    this.p = [];
    this.c = [];
    this.i = [];
  }

  get count() {
    return this.p.length / 3;
  }

  /**
   * Superficie de revolución. `profile` = [[r, y], ...] de abajo hacia arriba (o del borde de afuera al centro):
   * con r > 0 la cara mira hacia afuera. `rad(θ, y)` deforma el radio (costillas, irregularidad);
   * `color(y01, θ, k, i)` pinta cada vértice (k = deformación de ese vértice, i = punto del perfil); `m` / `t` lo colocan.
   */
  lathe(profile, { sides = 16, rad = null, color, m = I3, t = [0, 0, 0] } = {}) {
    const base = this.count;
    const ymin = Math.min(...profile.map((q) => q[1]));
    const span = Math.max(1e-6, Math.max(...profile.map((q) => q[1])) - ymin);
    for (const [i, [r, y]] of profile.entries()) {
      for (let j = 0; j < sides; j++) {
        const a = (j / sides) * Math.PI * 2;
        const k = rad ? rad(a, y) : 1;
        const p = apply(m, [Math.cos(a) * r * k, y, Math.sin(a) * r * k]);
        this.p.push(p[0] + t[0], p[1] + t[1], p[2] + t[2]);
        const col = color((y - ymin) / span, a, k, i);
        // Los colores se piensan en sRGB (como en un selector de color); el color por vértice va en lineal.
        this.c.push(lin(col[0]), lin(col[1]), lin(col[2]), 1);
      }
    }
    for (let i = 0; i + 1 < profile.length; i++) {
      for (let j = 0; j < sides; j++) {
        const a = base + i * sides + j;
        const b = base + (i + 1) * sides + j;
        const c = base + i * sides + ((j + 1) % sides);
        const d = base + (i + 1) * sides + ((j + 1) % sides);
        this.i.push(a, b, c, b, d, c);
      }
    }
    return this;
  }

  /** Elipsoide de radios rx, ry, rz centrado en `at`, girado por `m`. */
  ellipsoid(at, [rx, ry, rz], color, { m = I3, rings = 8, sides = 12, rad = null } = {}) {
    const prof = [];
    for (let i = 0; i <= rings; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / rings;
      prof.push([Math.cos(a), Math.sin(a)]);
    }
    const s = mul3(m, [rx, 0, 0, 0, ry, 0, 0, 0, rz]);
    const fn = typeof color === 'function' ? color : () => color;
    return this.lathe(prof, { sides, rad, color: fn, m: s, t: at });
  }

  /** Tubo redondeado (cápsula) de `a` a `b`, radio r0 → r1. */
  tube(a, b, r0, r1, color, { sides = 10, rad = null } = {}) {
    const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L = Math.hypot(dir[0], dir[1], dir[2]);
    const prof = [];
    const cap = 3;
    for (let i = 0; i <= cap; i++) {
      const q = -Math.PI / 2 + (Math.PI / 2) * (i / cap);
      prof.push([Math.cos(q) * r0, Math.sin(q) * r0]);
    }
    for (let i = 1; i < 4; i++) prof.push([r0 + ((r1 - r0) * i) / 4, (L * i) / 4]);
    for (let i = 0; i <= cap; i++) {
      const q = (Math.PI / 2) * (i / cap);
      prof.push([Math.cos(q) * r1, L + Math.sin(q) * r1]);
    }
    const fn = typeof color === 'function' ? color : () => color;
    return this.lathe(prof, { sides, rad, color: fn, m: alignY(dir), t: a });
  }

  /** Normales suaves: suma de las normales de los triángulos que tocan cada vértice. */
  normals() {
    const n = new Array(this.p.length).fill(0);
    const p = this.p;
    for (let k = 0; k < this.i.length; k += 3) {
      const [a, b, c] = [this.i[k] * 3, this.i[k + 1] * 3, this.i[k + 2] * 3];
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const v of [a, b, c]) {
        n[v] += nx;
        n[v + 1] += ny;
        n[v + 2] += nz;
      }
    }
    for (let v = 0; v < n.length; v += 3) {
      const l = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
      n[v] /= l;
      n[v + 1] /= l;
      n[v + 2] /= l;
    }
    return n;
  }
}

// ------------------------------------------------------------------ piezas

const C = {
  cactus: hex('#4f8a3a'),
  cactusDark: hex('#2f5e26'),
  cactusLight: hex('#78ad52'),
  spine: hex('#f4ecd2'),
  flowerY: hex('#f4c542'),
  flowerR: hex('#e0503c'),
  fruit: hex('#c8325a'),
  wood: hex('#7d6553'),
  woodDark: hex('#56443a'),
  woodLight: hex('#a08670'),
  bone: hex('#efe6d2'),
  boneShade: hex('#cfc2a6'),
  straw: hex('#c9a465'),
  rockDeep: hex('#7e2f1c'),
  rockDark: hex('#a8432a'),
  rock: hex('#c95b33'),
  rockWarm: hex('#dc7442'),
  rockLip: hex('#eb9a5e'),
};

/** Costillas del cactus: el radio sube y baja `n` veces por vuelta. */
const ribbed = (n, depth) => (a) => 1 + depth * Math.cos(a * n);
/** Color de cactus: verde con valles oscuros y crestas claras. */
const cactusColor = (y01, a, k) => mix(mix(C.cactusDark, C.cactus, clamp01((k - 0.93) * 8)), C.cactusLight, clamp01((k - 1.04) * 10) * 0.6 + y01 * 0.08);

/** Espinas sobre las crestas de un tubo vertical (o casi). */
function spines(geo, rand, { from, to, r, ribs, n, len = 0.09, color = C.spine }) {
  for (let s = 0; s < n; s++) {
    const a = (Math.floor(rand() * ribs) / ribs) * Math.PI * 2;
    const t = rand();
    const y = from[1] + (to[1] - from[1]) * t;
    const x = from[0] + (to[0] - from[0]) * t;
    const z = from[2] + (to[2] - from[2]) * t;
    const out = [Math.cos(a), 0.25 + rand() * 0.3, Math.sin(a)];
    const base = [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
    geo.tube(base, [base[0] + out[0] * len, base[1] + out[1] * len, base[2] + out[2] * len], 0.012, 0.004, color, { sides: 3 });
  }
}

/** Saguaro: tronco con costillas, 1–3 brazos con codo, espinas y a veces flores arriba. */
export function saguaroGeo(rand) {
  const g = new Geo();
  const h = 3.2 + rand() * 1.4;
  const r = 0.3;
  const ribs = 11;
  g.tube([0, -0.1, 0], [0, h, 0], r * 1.06, r * 0.92, cactusColor, { sides: 33, rad: ribbed(ribs, 0.07) });
  spines(g, rand, { from: [0, 0.2, 0], to: [0, h - 0.1, 0], r: r * 1.02, ribs, n: 70 });
  const arms = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < arms; i++) {
    const yaw = (i / arms) * Math.PI * 2 + rand() * 0.8;
    const ux = Math.cos(yaw);
    const uz = Math.sin(yaw);
    const y = h * (0.35 + rand() * 0.3);
    const out = 0.55 + rand() * 0.3;
    const up = 0.9 + rand() * 1.0;
    const ar = r * (0.62 + rand() * 0.12);
    const elbow = [ux * out, y + 0.18, uz * out];
    g.tube([ux * r * 0.6, y, uz * r * 0.6], elbow, ar, ar, cactusColor, { sides: 21, rad: ribbed(7, 0.08) });
    const tip = [ux * (out + 0.05), y + 0.18 + up, uz * (out + 0.05)];
    g.tube(elbow, tip, ar, ar * 0.9, cactusColor, { sides: 21, rad: ribbed(7, 0.08) });
    spines(g, rand, { from: elbow, to: tip, r: ar, ribs: 7, n: 18 });
    if (rand() < 0.4) g.ellipsoid([tip[0], tip[1] + ar * 0.9, tip[2]], [0.08, 0.06, 0.08], C.flowerY, { rings: 4, sides: 6 });
  }
  if (rand() < 0.6) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + rand();
      g.ellipsoid([Math.cos(a) * 0.13, h + r * 0.85, Math.sin(a) * 0.13], [0.08, 0.06, 0.08], k % 2 ? C.flowerY : C.flowerR, { rings: 4, sides: 6 });
    }
  }
  return g;
}

/** Biznaga (cactus barril): bola achatada con costillas marcadas, espinas y corona de flores. */
export function barrelGeo(rand) {
  const g = new Geo();
  const r = 0.38 + rand() * 0.14;
  const h = r * (1.1 + rand() * 0.4);
  const ribs = 14;
  const prof = [];
  for (let i = 0; i <= 10; i++) {
    const q = -0.15 + (Math.PI / 2 + 0.15) * (i / 10);
    prof.push([Math.cos(q) * r * (i === 10 ? 0.02 : 1), h * 0.5 + Math.sin(q) * h * 0.5]);
  }
  g.lathe(prof, { sides: 42, rad: ribbed(ribs, 0.09), color: cactusColor });
  for (let s = 0; s < 46; s++) {
    const a = (Math.floor(rand() * ribs) / ribs) * Math.PI * 2;
    const q = rand() * 1.3;
    const y = h * 0.5 + Math.sin(q) * h * 0.5;
    const rr = Math.cos(q) * r * 1.08;
    const base = [Math.cos(a) * rr, y, Math.sin(a) * rr];
    const L = 0.1;
    g.tube(base, [base[0] + Math.cos(a) * L, base[1] + L * 0.5, base[2] + Math.sin(a) * L], 0.012, 0.004, hex('#e8c58a'), { sides: 3 });
  }
  const flower = rand() < 0.5 ? C.flowerY : C.flowerR;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    g.ellipsoid([Math.cos(a) * r * 0.3, h + 0.02, Math.sin(a) * r * 0.3], [0.07, 0.05, 0.07], flower, { rings: 4, sides: 6 });
  }
  return g;
}

/** Nopal: pencas ovaladas encadenadas, con puntitos de espina y tunas en los bordes de arriba. */
export function pearGeo(rand) {
  const g = new Geo();
  const pads = [];
  const add = (at, yaw, tilt, s, depth) => {
    const m = mul3(euler(0, yaw, tilt), I3);
    const rx = 0.32 * s;
    const ry = 0.42 * s;
    g.ellipsoid(at, [rx, ry, 0.07 * s], (y01) => mix(C.cactusDark, C.cactusLight, 0.35 + y01 * 0.4), { m, rings: 8, sides: 14 });
    // puntitos: pequeñas bolitas claras en las dos caras
    for (let d = 0; d < 7; d++) {
      const u = (rand() - 0.5) * 1.3 * rx;
      const v = (rand() - 0.5) * 1.4 * ry;
      if ((u / rx) ** 2 + (v / ry) ** 2 > 0.7) continue;
      for (const side of [-1, 1]) {
        const p = apply(m, [u, v, side * 0.072 * s]);
        g.ellipsoid([at[0] + p[0], at[1] + p[1], at[2] + p[2]], [0.018, 0.018, 0.018], C.spine, { rings: 2, sides: 4 });
      }
    }
    pads.push({ at, m, rx, ry });
    if (depth <= 0) return;
    const kids = depth > 1 ? 2 : 1 + Math.floor(rand() * 2);
    for (let k = 0; k < kids; k++) {
      const side = k === 0 ? -1 : 1;
      const off = apply(m, [side * rx * 0.55, ry * 0.9, 0]);
      add([at[0] + off[0], at[1] + off[1] + ry * 0.35, at[2] + off[2]], yaw + (rand() - 0.5) * 70, tilt + side * (18 + rand() * 18), s * 0.85, depth - 1);
    }
  };
  add([0, 0.38, 0], rand() * 360, (rand() - 0.5) * 12, 1, 2);
  for (const p of pads) {
    if (rand() < 0.55) continue;
    for (let f = 0; f < 2 + Math.floor(rand() * 2); f++) {
      const u = (rand() - 0.5) * p.rx * 1.2;
      const q = apply(p.m, [u, p.ry * 0.95, 0]);
      g.ellipsoid([p.at[0] + q[0], p.at[1] + q[1] + 0.04, p.at[2] + q[2]], [0.05, 0.065, 0.05], C.fruit, { rings: 4, sides: 6 });
    }
  }
  return g;
}

/** Árbol seco retorcido: tronco que gira y se ramifica 3 veces, ramas cada vez más finas. */
export function deadTreeGeo(rand) {
  const g = new Geo();
  const wood = (y01, a) => mix(C.woodDark, C.woodLight, 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(a * 3 + y01 * 9)));
  const branch = (from, dir, len, r, depth) => {
    let p = from;
    let d = dir;
    const segs = 3;
    for (let s = 0; s < segs; s++) {
      const L = len / segs;
      d = [d[0] + (rand() - 0.5) * 0.7, d[1] + (rand() - 0.2) * 0.25, d[2] + (rand() - 0.5) * 0.7];
      const l = Math.hypot(...d);
      d = d.map((v) => v / l);
      const q = [p[0] + d[0] * L, p[1] + d[1] * L, p[2] + d[2] * L];
      const r0 = r * (1 - s / segs * 0.45);
      const r1 = r * (1 - (s + 1) / segs * 0.45);
      g.tube(p, q, r0, r1, wood, { sides: depth > 1 ? 9 : 6, rad: (a, y) => 1 + 0.12 * Math.sin(a * 3 + y * 4) });
      p = q;
    }
    if (depth <= 0) return;
    const kids = 2 + (rand() < 0.4 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const yaw = rand() * Math.PI * 2;
      const nd = [d[0] * 0.5 + Math.cos(yaw) * 0.8, d[1] * 0.6 + 0.35, d[2] * 0.5 + Math.sin(yaw) * 0.8];
      branch(p, nd, len * (0.55 + rand() * 0.2), r * 0.55, depth - 1);
    }
  };
  // raíces que asoman
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + rand();
    g.tube([0, 0.15, 0], [Math.cos(a) * 0.55, -0.05, Math.sin(a) * 0.55], 0.12, 0.04, wood, { sides: 6 });
  }
  branch([0, -0.05, 0], [0.15, 1, 0.05], 1.6 + rand() * 0.6, 0.2, 3);
  return g;
}

/** Hueso suelto (fémur) o cráneo de vaca con cuernos. */
export function boneGeo(rand) {
  const g = new Geo();
  const col = (y01) => mix(C.boneShade, C.bone, 0.4 + y01 * 0.6);
  if (rand() < 0.5) {
    const L = 0.7;
    g.tube([-L / 2, 0.06, 0], [L / 2, 0.06, 0], 0.04, 0.04, col, { sides: 6 });
    for (const x of [-L / 2, L / 2]) for (const z of [-0.04, 0.04]) g.ellipsoid([x, 0.07, z], [0.06, 0.055, 0.055], col, { rings: 4, sides: 7 });
  } else {
    g.ellipsoid([0, 0.12, 0], [0.16, 0.12, 0.22], col, { rings: 6, sides: 10 });
    g.ellipsoid([0, 0.08, 0.2], [0.08, 0.07, 0.12], col, { rings: 4, sides: 8 });
    for (const s of [-1, 1]) {
      g.tube([s * 0.12, 0.16, -0.08], [s * 0.38, 0.28, -0.12], 0.04, 0.02, col, { sides: 6 });
      g.ellipsoid([s * 0.06, 0.16, 0.04], [0.035, 0.03, 0.02], C.woodDark, { rings: 3, sides: 5 });
    }
  }
  return g;
}

/** Matojo seco: hojitas de paja abiertas en abanico. */
export function tuftGeo(rand) {
  const g = new Geo();
  const n = 9 + Math.floor(rand() * 6);
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2;
    const L = 0.35 + rand() * 0.35;
    const lean = 0.3 + rand() * 0.6;
    g.tube([0, 0, 0], [Math.cos(a) * L * lean, L, Math.sin(a) * L * lean], 0.025, 0.006, mix(C.straw, C.woodLight, rand() * 0.5), { sides: 3 });
  }
  return g;
}

/** Canto rodado de arenisca, redondo e irregular. */
export function boulderGeo(rand) {
  const g = new Geo();
  const p1 = rand() * 6;
  const p2 = rand() * 6;
  g.ellipsoid([0, 0.35, 0], [0.75, 0.5, 0.6], (y01) => mix(C.rockDark, C.rockWarm, y01), {
    rings: 8,
    sides: 14,
    rad: (a, y) => 1 + 0.12 * Math.sin(a * 2 + p1) + 0.08 * Math.sin(a * 3 + p2 + y * 2),
  });
  return g;
}

/**
 * Perfil de una "tinaja" de arenisca (como en la referencia): base ancha metida en la arena, panza, cuello,
 * labio grueso y redondeado, y arriba hundida. `bowl` = qué tan hondo (0 = mesa plana).
 */
export function sandstoneProfile({ r = 5, h = 7, bowl = 0.22, lip = 0.13 } = {}) {
  const key = [
    [1.12, -0.06], [1.08, 0.02], [0.98, 0.12], [0.92, 0.28], [0.96, 0.45], [0.97, 0.6], [0.92, 0.74],
    [0.86, 0.84], [0.9, 0.92], [0.92, 0.97], [0.88, 1.0], [0.82, 1.01],
    [0.82 - lip, 0.99], [0.82 - lip - 0.06, 1 - bowl * 0.45], [0.45, 1 - bowl * 0.9], [0.0, 1 - bowl],
  ];
  // Suavizado: tres puntos por tramo (Catmull-Rom) para que las vetas tengan dónde dibujarse.
  const out = [];
  for (let i = 0; i < key.length - 1; i++) {
    const p0 = key[Math.max(0, i - 1)];
    const p1 = key[i];
    const p2 = key[i + 1];
    const p3 = key[Math.min(key.length - 1, i + 2)];
    for (let s = 0; s < 3; s++) {
      const t = s / 3;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([Math.max(0, f(p0[0], p1[0], p2[0], p3[0])) * r, f(p0[1], p1[1], p2[1], p3[1]) * h]);
    }
  }
  out.push([0, key[key.length - 1][1] * h]);
  return out;
}

/** Tinaja / mesa de arenisca con forma irregular y vetas horizontales. */
export function sandstoneGeo(rand, { r, h, bowl, lip }) {
  const g = new Geo();
  const ph = [rand() * 6, rand() * 6, rand() * 6, rand() * 6];
  const bandF = 2.2 + rand() * 1.4;
  const rad = (a, y) => {
    const v = y / h;
    return 1
      + 0.07 * Math.sin(a * 2 + ph[0] + v * 1.5)
      + 0.05 * Math.sin(a * 3 + ph[1])
      + 0.035 * Math.sin(a * 5 + ph[2] + v * 3)
      + 0.025 * Math.sin(a * 9 + ph[3] + v * 6);
  };
  const prof = sandstoneProfile({ r, h, bowl, lip });
  const top = Math.max(...prof.map((q) => q[1]));
  // Índice del primer punto del labio hacia adentro: de ahí en adelante es el interior (más oscuro).
  const inner = prof.findIndex((q, i) => i > 0 && q[0] < prof[i - 1][0] && q[1] >= top * 0.97);
  g.lathe(prof, {
    sides: 48,
    rad,
    color: (y01, a, k, i) => {
      const y = prof[i][1];
      const v = clamp01(y / h);
      // vetas: bandas que suben y bajan un poco alrededor
      const band = 0.5 + 0.5 * Math.sin((y + Math.sin(a * 2 + ph[0]) * 0.18) * bandF);
      let col = mix(C.rockDeep, C.rockDark, clamp01(v * 2.2));
      col = mix(col, C.rock, clamp01((v - 0.25) * 2));
      col = mix(col, C.rockWarm, band * 0.45 * v);
      col = mix(col, C.rockLip, clamp01((v - 0.86) * 7) * 0.8);
      col = mix(col, C.rockDeep, (1 - k) * 2.5); // huecos más oscuros
      if (inner > 0 && i >= inner) col = mix(col, C.rockDeep, 0.35 + 0.3 * clamp01((i - inner) / 6));
      return col;
    },
  });
  return g;
}

// ------------------------------------------------------------------ colocación

/** Borde del camino en `z`: el |x| más grande de las plataformas que pasan por ahí (0 si no hay). Los `spot` no cuentan. */
export function trackEdge(avoid, z, margin = 1.5) {
  let edge = 0;
  for (const a of avoid) {
    if (a.spot || z < a.minZ - margin || z > a.maxZ + margin) continue;
    edge = Math.max(edge, Math.abs(a.minX), Math.abs(a.maxX));
  }
  return edge;
}

const inGap = (gap, z, x, pad = 1) => !!gap && z > gap.z0 - pad && z < gap.z1 + pad && Math.abs(x) < 10;

/**
 * Formaciones de arenisca a los lados: una fila cercana de tinajas grandes (como paredes del cañón),
 * una intermedia salteada y una lejana de mesas altas. Devuelve [{ x, z, r, h, bowl, lip, yaw, row }].
 */
export function layoutRocks(rand, { z0, z1, avoid = [], gap = null }) {
  const rocks = [];
  for (const side of [-1, 1]) {
    let z = z1 - rand() * 4;
    while (z > z0) {
      const r = 4 + rand() * 2.6;
      const edge = Math.max(6, trackEdge(avoid, z, r));
      const inner = edge + 4.8 + rand() * 2.4; // borde de adentro de la roca: deja la franja de cactus a la vista
      rocks.push({ x: side * (inner + r), z, r, h: 5 + rand() * 4, bowl: 0.16 + rand() * 0.14, lip: 0.1 + rand() * 0.06, yaw: rand() * 360, row: 'near' });
      z -= r * 1.7 + rand() * 2.5;
    }
    z = z1 - 8 - rand() * 6;
    while (z > z0) {
      const r = 2.6 + rand() * 1.8;
      rocks.push({ x: side * (26 + rand() * 4), z, r, h: 7 + rand() * 4, bowl: 0.1 + rand() * 0.1, lip: 0.1, yaw: rand() * 360, row: 'mid' });
      z -= 10 + rand() * 9;
    }
    z = z1 - rand() * 10;
    while (z > z0 - 10) {
      const r = 7 + rand() * 4;
      rocks.push({ x: side * (38 + rand() * 6), z, r, h: 12 + rand() * 7, bowl: 0.04 + rand() * 0.05, lip: 0.08, yaw: rand() * 360, row: 'far' });
      z -= 15 + rand() * 7;
    }
  }
  return rocks.filter((k) => !inGap(gap, k.z, Math.abs(k.x) - k.r, 2));
}

/**
 * Adornos entre el camino y las rocas, por bandas: cerca biznagas, nopales, matojos, huesos y cantos;
 * más lejos saguaros, árboles secos y cantos. Nada sobre el camino, en el vacío ni dentro de una roca. Devuelve [{ kind, x, z, s, yaw }].
 */
export function layoutDecor(rand, { z0, z1, avoid = [], gap = null, rocks = [], keep = 1.2 }) {
  const items = [];
  const free = (x, z, rad) => {
    if (inGap(gap, z, x)) return false;
    for (const a of avoid) {
      if (x > a.minX - keep - rad && x < a.maxX + keep + rad && z > a.minZ - keep - rad && z < a.maxZ + keep + rad) return false;
    }
    for (const k of rocks) if (Math.hypot(x - k.x, z - k.z) < k.r * 1.12 + rad) return false;
    for (const it of items) if (Math.hypot(x - it.x, z - it.z) < it.rad + rad) return false;
    return true;
  };
  // `rad` = lo que ocupa para chequear si cabe; `room` = lo que reserva para las piezas que vengan después.
  const put = (kind, x, z, s, rad, { room = rad, yaw = rand() * 360 } = {}) => {
    if (!free(x, z, rad)) return false;
    items.push({ kind, x, z, s, yaw, rad: room });
    return true;
  };
  const pick = (table) => {
    let u = rand() * table.reduce((n, [, w]) => n + w, 0);
    for (const [k, w] of table) if ((u -= w) <= 0) return k;
    return table[0][0];
  };
  const NEAR = [['barrel', 3], ['pear', 3], ['tuft', 3], ['saguaro', 1.5], ['boulder', 1.5], ['bone', 1]];
  const MID = [['saguaro', 6], ['tree', 2], ['pear', 1], ['boulder', 1.5]];
  const RAD = { barrel: 0.6, pear: 0.9, tuft: 0.5, boulder: 0.9, bone: 0.5, saguaro: 1.0, tree: 1.4 };
  for (let z = z1; z > z0; z -= 1.4 + rand() * 1.0) {
    for (const side of [-1, 1]) {
      const edge = trackEdge(avoid, z);
      if (rand() < 0.85) {
        const k = pick(NEAR);
        put(k, side * (edge + keep + 0.4 + rand() * 2.0), z + (rand() - 0.5), 0.9 + rand() * 0.5, RAD[k]);
      }
      if (rand() < 0.8) {
        const k = pick(MID);
        put(k, side * (edge + keep + 2.4 + rand() * 2.6), z + (rand() - 0.5), 0.9 + rand() * 0.4, RAD[k]);
      }
    }
  }
  return items.map(({ rad, ...it }) => it);
}

/** Dunas bajas entre las rocas y el horizonte. */
export function layoutDunes(rand, { z0, z1, gap = null }) {
  const out = [];
  for (let z = z1; z > z0; z -= 5 + rand() * 5) {
    for (const side of [-1, 1]) {
      const x = side * (17 + rand() * 12);
      if (inGap(gap, z, x)) continue;
      out.push({ x, z, w: 6 + rand() * 6, d: 4 + rand() * 5, h: 0.5 + rand() * 0.8 });
    }
  }
  return out;
}

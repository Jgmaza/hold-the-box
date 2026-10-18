// Cabeza low-poly de los personajes (caras planas, como en las imágenes de referencia).
// Una malla por personaje: forma de cabeza con mandíbula, mentón, pómulos, arco de las cejas, cuencas de los ojos y
// nariz; el pelo y la barba son casquetes low-poly encima, con el borde biselado (se ve el grosor).
// Mira hacia -Z. Coordenadas locales: centro de la cabeza en (0, HEAD.y, 0).

/** Centro y radios de la cabeza. */
export const HEAD = { y: 1.36, rx: 0.245, ry: 0.285, rz: 0.255 };

const ROWS = 22; // paralelos
const COLS = 28; // meridianos (una columna al centro de la cara: la nariz sale en arista)

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;
const norm = ([x, y, z]) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

/** Punto de la cabeza (sin pelo) en la dirección unitaria u = [ux, uy, uz]. `spec.nose` / `spec.chin`: tamaños. */
export function headShape([ux, uy, uz], { nose = 1, chin = 1 } = {}) {
  const front = Math.max(0, -uz);
  const low = smooth(-0.1, -0.95, uy); // la mandíbula se angosta hacia abajo
  const x = ux * HEAD.rx * (1 - 0.3 * low);
  const y = uy * HEAD.ry * (1 - 0.04 * smooth(0.6, 1, uy));
  let z = uz * HEAD.rz * (1 - 0.1 * low) * (uz < 0 ? 1 - 0.07 * front * front : 1.04);
  const gx = (c, w) => Math.exp(-(((ux - c) / w) ** 2));
  const gy = (c, w) => Math.exp(-(((uy - c) / w) ** 2));
  const pair = (c, w) => gx(c, w) + gx(-c, w);
  let out = 0;
  out += nose * (0.085 * gy(-0.2, 0.09) + 0.032 * gy(-0.02, 0.1)) * gx(0, 0.1); // puente y punta
  out += nose * 0.018 * gy(-0.2, 0.08) * pair(0.22, 0.08); // aletas
  out += 0.014 * gy(0.2, 0.08) * pair(0.31, 0.2); // arco de las cejas
  out -= 0.012 * gy(0, 0.08) * pair(0.31, 0.1); // cuencas de los ojos
  out += 0.016 * gy(-0.2, 0.1) * pair(0.59, 0.12); // pómulos
  out += chin * 0.022 * gy(-0.56, 0.12) * gx(0, 0.25); // mentón
  out += 0.006 * gy(-0.38, 0.06) * gx(0, 0.2); // labios
  z -= out * front;
  return [x, y, z];
}

/**
 * Punto de la cara en (x, y) del mundo del personaje, `out` metros hacia afuera de la piel (para pegar ojos, cejas, boca).
 * Invierte headShape por la cara de adelante.
 */
export function headSurface(spec, x, y, out = 0) {
  const ty = y - HEAD.y;
  let ux = x / HEAD.rx;
  let uy = ty / HEAD.ry;
  let p = [0, 0, 0];
  for (let i = 0; i < 12; i++) {
    const uz = -Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy));
    p = headShape([ux, uy, uz], spec);
    ux = Math.max(-0.99, Math.min(0.99, ux + (x - p[0]) / HEAD.rx));
    uy = Math.max(-0.99, Math.min(0.99, uy + (ty - p[1]) / HEAD.ry));
  }
  const n = norm(p);
  return [p[0] + n[0] * out, HEAD.y + p[1] + n[1] * out, p[2] + n[2] * out];
}

/** Geometría de caras planas a partir de triángulos [[a, b, c], ...] (vértices [x, y, z], salen hacia afuera del origen). */
export function flatGeometry(tris, colors = null) {
  const n = tris.length * 3;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const cols = colors ? new Uint8Array(n * 4) : null;
  const indices = new Uint16Array(n);
  tris.forEach(([a, b0, c0], t) => {
    let [b, c] = [b0, c0];
    let nrm = norm(cross(sub(b, a), sub(c, a)));
    const mid = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    if (nrm[0] * mid[0] + nrm[1] * mid[1] + nrm[2] * mid[2] < 0) {
      [b, c] = [c, b];
      nrm = nrm.map((v) => -v);
    }
    [a, b, c].forEach((v, k) => {
      const i = t * 3 + k;
      positions.set(v, i * 3);
      normals.set(nrm, i * 3);
      indices[i] = i;
      if (cols) cols.set([...colors[t], 255], i * 4);
    });
  });
  return { positions, normals, indices, ...(cols ? { colors: cols } : {}) };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Triángulos de una malla en grilla (filas × columnas) de puntos `at(i, j)`, sin los triángulos degenerados de los polos. */
function gridTris(rows, cols, at) {
  const tris = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      if (i > 0) tris.push([a, c, d]);
      if (i < rows - 1) tris.push([a, b, c]);
    }
  }
  return tris;
}

/** Esfera low-poly de diámetro 1 (ojos, orejas, bigotes): `w` meridianos, `h` paralelos. */
export function facetSphere(w = 8, h = 6) {
  const at = (i, j) => {
    const phi = (i / h) * Math.PI;
    const th = (j / w) * Math.PI * 2;
    return [0.5 * Math.sin(phi) * Math.sin(th), 0.5 * Math.cos(phi), -0.5 * Math.sin(phi) * Math.cos(th)];
  };
  return flatGeometry(gridTris(h, w, at));
}

const dir = (phi, th) => [Math.sin(phi) * Math.sin(th), Math.cos(phi), -Math.sin(phi) * Math.cos(th)];
const DEG = Math.PI / 180;

/** Interpola por tramos una lista de [ángulo, valor] según |θ| (en grados, 0 = frente, 180 = nuca). */
const keys = (list) => (thDeg) => {
  const t = Math.abs(((thDeg + 540) % 360) - 180);
  for (let k = 1; k < list.length; k++) {
    if (t <= list[k][0]) return lerp(list[k - 1][1], list[k][1], (t - list[k - 1][0]) / (list[k][0] - list[k - 1][0]));
  }
  return list[list.length - 1][1];
};

/**
 * Nacimiento del pelo (ángulo desde la coronilla, en grados) alrededor de la cabeza, y grosor. Estilos:
 * 'short' corto, 'side' de lado con volumen, 'back' pegado bajo un gorro, 'bob' melena hasta la mandíbula.
 */
const HAIR = {
  short: { line: keys([[0, 60], [30, 64], [55, 76], [72, 102], [88, 100], [110, 106], [140, 118], [180, 122]]), lift: (top) => 0.018 + 0.022 * top },
  side: { line: keys([[0, 58], [30, 62], [55, 74], [72, 98], [88, 97], [110, 104], [140, 116], [180, 120]]), lift: (top, x) => 0.02 + 0.045 * top * (x > 0 ? 1.15 : 0.8) },
  back: { line: keys([[0, 70], [45, 78], [72, 102], [88, 100], [110, 106], [140, 118], [180, 122]]), lift: () => 0.012 },
  bob: { line: keys([[0, 62], [35, 70], [50, 86], [62, 116], [80, 124], [180, 124]]), lift: (top) => 0.022 - 0.01 * top },
};

/** Barba: hasta dónde sube (ángulo desde la coronilla) — bajo el labio adelante, por la mandíbula hasta las patillas. */
const BEARD = keys([[0, 118], [25, 112], [45, 103], [70, 93], [85, 88], [100, 96], [130, 122], [180, 140]]);

/** Punto de la cabeza (local) en (phi, θ) en grados, `out` hacia afuera. */
function at(spec, phiDeg, thDeg, out = 0) {
  const p = headShape(dir(phiDeg * DEG, thDeg * DEG), spec);
  const n = norm(p);
  return [p[0] + n[0] * out, p[1] + n[1] * out, p[2] + n[2] * out];
}

/**
 * Casquete low-poly sobre la cabeza: de `from` (polo, en grados) hasta `line(θ)`, levantado `lift(p)`, con un borde
 * biselado que baja hasta la piel (así se ve el grosor, como en las referencias).
 */
function cap(spec, { from, line, lift, rows, cols = 28 }) {
  const tris = [];
  const ring = [];
  const dirSign = Math.sign(line(0) - from);
  for (let r = 0; r <= rows + 1; r++) {
    ring.push([]);
    for (let c = 0; c < cols; c++) {
      const th = (c / cols) * 360;
      if (r <= rows) {
        const phi = lerp(from, line(th), r / rows);
        const p0 = at(spec, phi, th);
        ring[r].push(at(spec, phi, th, lift(p0)));
      } else ring[r].push(at(spec, line(th) + dirSign * 4, th, 0.001)); // bisel hasta la piel
    }
  }
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = ring[r][c];
      const b = ring[r + 1][c];
      const cc = ring[r + 1][(c + 1) % cols];
      const d = ring[r][(c + 1) % cols];
      if (r > 0) tris.push([a, cc, d]);
      tris.push([a, b, cc]);
    }
  }
  return tris;
}

/**
 * Cabeza low-poly: piel + casquete de pelo + barba, todo con caras planas. `colors`: { skin, hair, beard } como
 * [r, g, b] 0..1 (sRGB). Cada cara lleva un leve cambio de tono (como el sombreado de las referencias).
 */
export function headGeometry(spec, colors) {
  const tris = [];
  const triColors = [];
  let seed = 7;
  const add = (list, color) => {
    for (const t of list) {
      seed = (seed * 16807) % 2147483647;
      const k = 0.95 + (seed / 2147483647) * 0.1;
      tris.push(t);
      triColors.push(color.map((v) => Math.round(Math.min(1, v * k) * 255)));
    }
  };
  add(
    gridTris(ROWS, COLS, (i, j) => headShape(dir((i / ROWS) * Math.PI, (j / COLS) * Math.PI * 2), spec)),
    colors.skin,
  );
  const style = HAIR[spec.hair?.style];
  if (style) add(cap(spec, { from: 0, line: style.line, lift: (p) => style.lift(smooth(0, 0.27, p[1]), p[0]), rows: 8 }), colors.hair);
  if (spec.beard) add(cap(spec, { from: 180, line: BEARD, lift: (p) => 0.014 + 0.01 * smooth(-0.15, -0.26, p[1]), rows: 6 }), colors.beard);
  return flatGeometry(tris, triColors);
}

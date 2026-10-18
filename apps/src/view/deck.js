// Piso de una isla con huecos circulares: cara de arriba con los círculos recortados + pared interior de cada hueco.
// Geometría pura (sin PlayCanvas), se prueba en test/deck.test.js.
//
// La cara de arriba se corta en franjas a lo largo de Z; en cada franja el hueco es un trapecio (el círculo se aproxima
// con `seg` franjas), y a izquierda y derecha quedan cuadriláteros que lo rodean. Las paredes bajan `wallDepth` (hasta el
// agua): un pozo hondo. Devuelve dos mallas, `top` (el piso) y `walls` (los pozos), para darles material distinto.

/**
 * @param {{minX:number, maxX:number, minZ:number, maxZ:number, y:number}} box  rectángulo del piso (y = altura de arriba)
 * @param {{x:number, z:number, r:number}[]} holes
 * @param {{wallDepth?:number, seg?:number, uvScale?:number}} [o]  wallDepth = profundidad de los pozos, seg = franjas por círculo
 * @returns {{top: Mesh, walls: Mesh}}  con Mesh = {positions, normals, uvs, indices}
 */
export function deckGeometry({ minX, maxX, minZ, maxZ, y }, holes, { wallDepth = 0.14, seg = 20, uvScale = 0.5 } = {}) {
  const top = { positions: [], normals: [], uvs: [], indices: [] };
  const walls = { positions: [], normals: [], uvs: [], indices: [] };

  const vert = ({ positions, normals, uvs }, x, vy, z, n, u = (x - minX) * uvScale, v = (z - minZ) * uvScale) => {
    positions.push(x, vy, z);
    normals.push(n[0], n[1], n[2]);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  // Cuadrilátero a-b-c-d (en sentido que mira hacia `n`); se parte en dos triángulos.
  const quad = (m, a, b, c, d, n) => {
    const i = [a, b, c, d].map((p) => vert(m, p[0], p[1], p[2], n));
    m.indices.push(i[0], i[1], i[2], i[0], i[2], i[3]);
  };

  // Cortes en Z: los bordes de la isla y, por cada hueco, `seg` cortes (más juntos en los polos para que el círculo salga redondo).
  const cuts = new Set([minZ, maxZ]);
  for (const h of holes) {
    for (let k = 0; k <= seg; k++) cuts.add(h.z - h.r * Math.cos((Math.PI * k) / seg));
  }
  const zs = [...cuts].filter((z) => z >= minZ && z <= maxZ).sort((a, b) => a - b);
  const half = (h, z) => Math.sqrt(Math.max(0, h.r * h.r - (z - h.z) * (z - h.z)));

  const UP = [0, 1, 0];
  for (let s = 0; s + 1 < zs.length; s++) {
    const za = zs[s];
    const zb = zs[s + 1];
    if (zb - za < 1e-6) continue;
    const zm = (za + zb) / 2;
    const here = holes.filter((h) => zm > h.z - h.r && zm < h.z + h.r).sort((a, b) => a.x - b.x);
    let xa = minX; // borde izquierdo de lo que falta de piso en este z (a z = za)
    let xb = minX; // ... y a z = zb
    for (const h of here) {
      const la = Math.max(xa, h.x - half(h, za));
      const lb = Math.max(xb, h.x - half(h, zb));
      if (la > xa || lb > xb) quad(top, [xa, y, za], [xb, y, zb], [lb, y, zb], [la, y, za], UP);
      xa = h.x + half(h, za);
      xb = h.x + half(h, zb);
    }
    quad(top, [xa, y, za], [xb, y, zb], [maxX, y, zb], [maxX, y, za], UP);
  }

  // Pared interior de cada hueco (mira hacia el centro), de la cara de arriba hacia abajo `depth`.
  for (const h of holes) {
    const pts = [];
    for (let k = 0; k <= seg; k++) {
      const z = h.z - h.r * Math.cos((Math.PI * k) / seg);
      pts.push([z, half(h, z)]);
    }
    for (const sign of [-1, 1]) {
      for (let k = 0; k < seg; k++) {
        const [za, wa] = pts[k];
        const [zb, wb] = pts[k + 1];
        const pa = [h.x + sign * wa, za];
        const pb = [h.x + sign * wb, zb];
        const mx = h.x - (pa[0] + pb[0]) / 2;
        const mz = h.z - (pa[1] + pb[1]) / 2;
        const l = Math.hypot(mx, mz) || 1;
        quad(walls, [pa[0], y, pa[1]], [pb[0], y, pb[1]], [pb[0], y - wallDepth, pb[1]], [pa[0], y - wallDepth, pa[1]], [mx / l, 0, mz / l]);
      }
    }
  }
  return { top, walls };
}

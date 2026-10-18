// Colisiones con cajas alineadas a los ejes (AABB). Todo el nivel se arma con cajas.

const EPS = 1e-4;
const STEP_UP = 0.12; // bordes más bajos que esto se suben solos (uniones, plataformas al ras)
const HOLE_INSET = 0.5; // fracción del radio del cuerpo: cae cuando su centro está a menos de (r - esto) del centro del hueco

export function makeAABB(minX, minY, minZ, maxX, maxY, maxZ) {
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}

/** Plataforma descrita por su superficie: centro (x, z), ancho w (X), fondo d (Z), altura del piso `top`. */
export function platformAABB({ x, z, w, d, top, h = 1.5 }) {
  return makeAABB(x - w / 2, top - h, z - d / 2, x + w / 2, top, z + d / 2);
}

/** Solapamiento estricto: tocarse justo en el borde no cuenta (pararse encima no bloquea). */
export function overlaps(a, b) {
  return (
    a.min.x < b.max.x - EPS &&
    a.max.x > b.min.x + EPS &&
    a.min.y < b.max.y - EPS &&
    a.max.y > b.min.y + EPS &&
    a.min.z < b.max.z - EPS &&
    a.max.z > b.min.z + EPS
  );
}

export function containsPoint(box, p) {
  return (
    p.x >= box.min.x && p.x <= box.max.x &&
    p.y >= box.min.y && p.y <= box.max.y &&
    p.z >= box.min.z && p.z <= box.max.z
  );
}

/**
 * Pozo circular del collider (`holes: [{x, z, r}]`) que ocupa al cuerpo, o null. Ahí no hay piso: cae.
 * Sobre el piso, el cuerpo cae cuando más o menos la mitad de su ancho ya está sobre el vacío; ya por debajo del piso
 * sigue "dentro" del pozo mientras lo toque (ver `constrainShafts`).
 */
export function inHole(c, body) {
  const holes = c.holes;
  if (!holes) return null;
  const { pos, radius } = body;
  const below = pos.y < c.aabb.max.y - STEP_UP;
  const reach = below ? radius : -radius * HOLE_INSET;
  return holes.find((h) => Math.hypot(pos.x - h.x, pos.z - h.z) <= h.r + reach) ?? null;
}

/**
 * Los pozos tienen paredes: quien ya cayó por debajo del piso no puede salir de costado (ni atravesar el borde).
 * Se queda dentro del círculo hasta que llega al agua.
 */
function constrainShafts(body, colliders) {
  for (const c of colliders) {
    if (!c.holes || body.pos.y >= c.aabb.max.y - STEP_UP) continue;
    const h = inHole(c, body);
    if (!h) continue;
    const limit = h.r - body.radius * HOLE_INSET;
    const dx = body.pos.x - h.x;
    const dz = body.pos.z - h.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= limit || dist === 0) continue;
    const k = limit / dist;
    body.pos.x = h.x + dx * k;
    body.pos.z = h.z + dz * k;
    // Sin velocidad hacia la pared (si no, se quedaría "pegado" empujándola).
    const nx = dx / dist;
    const nz = dz / dist;
    const out = body.vel.x * nx + body.vel.z * nz;
    if (out > 0) {
      body.vel.x -= out * nx;
      body.vel.z -= out * nz;
    }
  }
}

/** AABB de un jugador con los pies en `pos`. Escribe en `out` para no crear basura. */
export function bodyAABB(pos, radius, height, out) {
  out.min.x = pos.x - radius;
  out.min.y = pos.y;
  out.min.z = pos.z - radius;
  out.max.x = pos.x + radius;
  out.max.y = pos.y + height;
  out.max.z = pos.z + radius;
  return out;
}

/** Punto más cercano a (px, pz) sobre el segmento (ax, az)-(bx, bz) en el plano XZ. */
export function closestOnSegmentXZ(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  const t = lenSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq)) : 0;
  return { x: ax + abx * t, z: az + abz * t, t };
}

/**
 * Mueve un cuerpo eje por eje (X, Z, Y) resolviendo choques contra `colliders`.
 * `body` necesita: pos, vel, radius, height. Devuelve info del choque vertical.
 */
export function moveBody(body, dx, dy, dz, colliders, scratch) {
  const result = { hitGround: null, hitCeiling: false, hitWall: false };
  const box = scratch;

  if (dx !== 0 && moveHorizontal(body, 'x', dx, colliders, box)) result.hitWall = true;
  if (dz !== 0 && moveHorizontal(body, 'z', dz, colliders, box)) result.hitWall = true;

  if (dy !== 0) {
    body.pos.y += dy;
    bodyAABB(body.pos, body.radius, body.height, box);
    for (const c of colliders) {
      if (!overlaps(box, c.aabb) || inHole(c, body)) continue;
      if (dy < 0) {
        body.pos.y = c.aabb.max.y;
        result.hitGround = c;
      } else {
        body.pos.y = c.aabb.min.y - body.height;
        result.hitCeiling = true;
      }
      bodyAABB(body.pos, body.radius, body.height, box);
    }
  }

  constrainShafts(body, colliders);
  return result;
}

function moveHorizontal(body, axis, delta, colliders, box) {
  let hit = false;
  body.pos[axis] += delta;
  bodyAABB(body.pos, body.radius, body.height, box);
  for (const c of colliders) {
    if (!overlaps(box, c.aabb) || inHole(c, body)) continue;
    // Borde bajito: subirlo en vez de chocar.
    const rise = c.aabb.max.y - body.pos.y;
    if (rise <= STEP_UP) {
      body.pos.y = c.aabb.max.y;
      bodyAABB(body.pos, body.radius, body.height, box);
      continue;
    }
    // Salir por la cara contraria al movimiento... salvo que eso empuje más de lo que se movió
    // (ya estaba adentro): entonces salir por la cara más cercana. Evita teletransportes.
    const lo = c.aabb.min[axis] - body.radius;
    const hi = c.aabb.max[axis] + body.radius;
    let target = delta > 0 ? lo : hi;
    if (Math.abs(target - body.pos[axis]) > Math.abs(delta) + 0.01) {
      target = Math.abs(lo - body.pos[axis]) < Math.abs(hi - body.pos[axis]) ? lo : hi;
    }
    body.pos[axis] = target;
    bodyAABB(body.pos, body.radius, body.height, box);
    hit = true;
  }
  return hit;
}

/**
 * Si una plataforma móvil se metió dentro del cuerpo, lo saca por el eje de menor penetración.
 * Prefiere subirlo si sus pies están cerca del piso de la plataforma.
 */
export function depenetrate(body, collider, scratch) {
  const a = bodyAABB(body.pos, body.radius, body.height, scratch);
  const b = collider.aabb;
  if (!overlaps(a, b)) return false;

  const up = b.max.y - a.min.y;
  if (up <= 0.35) {
    body.pos.y += up;
    return true;
  }
  // Nunca hacia abajo: eso lo metería en el piso.
  const pushes = [
    { axis: 'x', d: b.max.x - a.min.x },
    { axis: 'x', d: -(a.max.x - b.min.x) },
    { axis: 'z', d: b.max.z - a.min.z },
    { axis: 'z', d: -(a.max.z - b.min.z) },
  ];
  let best = pushes[0];
  for (const p of pushes) if (Math.abs(p.d) < Math.abs(best.d)) best = p;
  body.pos[best.axis] += best.d;
  return true;
}

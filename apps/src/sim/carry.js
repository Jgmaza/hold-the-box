// Unión entre jugadores: la caja los mantiene a una distancia (resorte + límites duros).
// Se corrige la POSICIÓN en el plano XZ (estable, sin explosiones) y pasa por las colisiones.
import { CONFIG } from '../config.js';
import { clamp } from './math.js';

export function solveCarry(p1, p2, dt, colliders) {
  const C = CONFIG.carry;
  let dx = p2.pos.x - p1.pos.x;
  let dz = p2.pos.z - p1.pos.z;
  let dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 1e-4) {
    dx = 1;
    dz = 0;
    dist = 1e-4;
  }
  const nx = dx / dist;
  const nz = dz / dist;

  // Resorte suave hacia la distancia de reposo...
  let corr = (dist - C.restDistance) * (1 - Math.exp(-C.stiffness * dt));
  // ...y límites duros.
  const after = dist - corr;
  if (after > C.maxDistance) corr += after - C.maxDistance;
  else if (after < C.minDistance) corr -= C.minDistance - after;
  if (Math.abs(corr) < 1e-6) return dist;

  // El que pisa suelo pesa más: el que está en el aire es el que se mueve.
  const w1 = p1.grounded ? C.groundedWeight : C.airWeight;
  const w2 = p2.grounded ? C.groundedWeight : C.airWeight;
  const share1 = clamp(w2 / (w1 + w2), 0, 1);
  const share2 = 1 - share1;

  // corr > 0: acercarse. p1 va hacia p2 (+n), p2 hacia p1 (-n).
  p1.move(nx * corr * share1, 0, nz * corr * share1, colliders);
  p2.move(-nx * corr * share2, 0, -nz * corr * share2, colliders);
  return dist;
}

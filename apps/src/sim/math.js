// Utilidades matemáticas sin dependencias (la simulación no importa PlayCanvas).

export const DEG = 180 / Math.PI;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Acerca `current` a `target` con suavizado exponencial (tau en segundos). */
export const damp = (current, target, tau, dt) =>
  tau <= 0 ? target : target + (current - target) * Math.exp(-dt / tau);

/** Acerca `current` a `target` sin pasarse, a velocidad `maxDelta`. */
export const approach = (current, target, maxDelta) =>
  current < target ? Math.min(current + maxDelta, target) : Math.max(current - maxDelta, target);

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const copy3 = (out, a) => {
  out.x = a.x;
  out.y = a.y;
  out.z = a.z;
  return out;
};

/** Longitud de un vector 2D (x, z). */
export const len2 = (x, z) => Math.sqrt(x * x + z * z);

/**
 * Aleatorio con semilla (mulberry32): misma semilla → misma secuencia (tests reproducibles).
 * next() en [0, 1) · range(a, b) en [a, b) · chance(p) true con probabilidad p.
 */
export function makeRng(seed = 1) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    chance: (p) => next() < p,
  };
}

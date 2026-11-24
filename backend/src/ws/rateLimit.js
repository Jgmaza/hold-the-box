// Límites del WebSocket (#9). Token bucket: `rate` fichas por segundo, hasta `burst` acumuladas.

export class TokenBucket {
  constructor(rate, burst, now = Date.now) {
    this.rate = rate;
    this.burst = burst;
    this.now = now;
    this.tokens = burst;
    this.last = now();
  }

  take() {
    const t = this.now();
    this.tokens = Math.min(this.burst, this.tokens + ((t - this.last) / 1000) * this.rate);
    this.last = t;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }

  get full() {
    return this.tokens + ((this.now() - this.last) / 1000) * this.rate >= this.burst;
  }
}

/** Por conexión: `input` 90/s (ráfaga 120) se descarta en silencio; el resto 20/s (ráfaga 40) responde RATE_LIMITED. */
export class MessageLimiter {
  constructor({ abuseCloseMs, now = Date.now }) {
    this.input = new TokenBucket(90, 120, now);
    this.control = new TokenBucket(20, 40, now);
    this.abuseCloseMs = abuseCloseMs;
    this.now = now;
    this.streakStart = null; // primera vez rechazado en la racha actual
    this.lastReject = null;
  }

  /** @returns {'ok' | 'drop' | 'limited' | 'close'} */
  check(t) {
    if (t === 'input') return this.input.take() ? 'ok' : 'drop';
    if (this.control.take()) return 'ok';
    // Una racha se corta si pasa 1 s sin rechazos; los mensajes que sí pasan durante el abuso no la cortan.
    const n = this.now();
    if (this.lastReject === null || n - this.lastReject > 1000) this.streakStart = n;
    this.lastReject = n;
    return n - this.streakStart >= this.abuseCloseMs ? 'close' : 'limited';
  }
}

/** Upgrades por IP: `perSec` por segundo (ráfaga = perSec). */
export class UpgradeLimiter {
  constructor(perSec, now = Date.now) {
    this.perSec = perSec;
    this.now = now;
    this.byIp = new Map();
  }

  allow(ip) {
    let b = this.byIp.get(ip);
    if (!b) this.byIp.set(ip, (b = new TokenBucket(this.perSec, this.perSec, this.now)));
    return b.take();
  }

  /** Olvida las IPs con el cubo lleno (inactivas). */
  prune() {
    for (const [ip, b] of this.byIp) if (b.full) this.byIp.delete(ip);
  }
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const isLoopback = (ip) => LOOPBACK.has(ip);

/** IP del cliente en el upgrade (fuera de Fastify): X-Forwarded-For solo si confiamos en el proxy. */
export function upgradeIp(req, trustProxy) {
  if (trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? '';
}

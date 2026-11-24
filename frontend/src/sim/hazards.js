// Obstáculos del nivel: plataforma móvil, rodillo giratorio y chorro de agua.
import { CONFIG } from '../config.js';
import { closestOnSegmentXZ, makeAABB, platformAABB } from './collision.js';
import { len2, v3 } from './math.js';

/** Va y vuelve entre `from` y `to` con suavizado (se frena en los extremos). */
export class MovingPlatform {
  constructor(def) {
    this.def = def;
    this.w = def.w;
    this.d = def.d;
    this.h = def.h ?? 0.6;
    this.from = { x: def.x, z: def.z, top: def.top };
    this.to = { x: def.to.x ?? def.x, z: def.to.z ?? def.z, top: def.to.top ?? def.top };
    this.period = def.period ?? 6;
    this.phase = def.phase ?? 0;
    this.pos = { x: def.x, z: def.z, top: def.top };
    this.aabb = platformAABB({ ...this.pos, w: this.w, d: this.d, h: this.h });
    this.delta = v3();
    this.moving = true;
  }

  update(time) {
    const s = 0.5 - 0.5 * Math.cos((2 * Math.PI * (time + this.phase)) / this.period);
    const nx = this.from.x + (this.to.x - this.from.x) * s;
    const nz = this.from.z + (this.to.z - this.from.z) * s;
    const nt = this.from.top + (this.to.top - this.from.top) * s;
    this.delta.x = nx - this.pos.x;
    this.delta.y = nt - this.pos.top;
    this.delta.z = nz - this.pos.z;
    this.pos.x = nx;
    this.pos.z = nz;
    this.pos.top = nt;
    const a = platformAABB({ x: nx, z: nz, top: nt, w: this.w, d: this.d, h: this.h });
    this.aabb.min = a.min;
    this.aabb.max = a.max;
  }

  /** Sin saltos de delta al reiniciar (p. ej. tras un respawn). */
  sync(time) {
    this.update(time);
    this.delta.x = this.delta.y = this.delta.z = 0;
  }
}

/**
 * Rodillo: barra que gira a ras del piso alrededor de un pilar. Hay que saltarla JUNTOS.
 * Empuja al jugador, le quita control un momento, sacude la caja y le quita contenido.
 */
export class Sweeper {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.z = def.z;
    this.top = def.top;
    this.length = def.length ?? 5; // radio de la barra (va de -length a +length)
    this.armHeight = def.armHeight ?? 0.45; // centro de la barra sobre el piso
    this.armRadius = def.armRadius ?? 0.22;
    this.speed = def.speed ?? 70; // grados/s
    this.angle = def.startAngle ?? 0;
    this.cooldown = new Map();
    // El pilar central es sólido.
    this.pillar = { aabb: makeAABB(def.x - 0.3, def.top, def.z - 0.3, def.x + 0.3, def.top + 1.1, def.z + 0.3) };
  }

  update(time) {
    this.angle = (this.def.startAngle ?? 0) + this.speed * time;
  }

  endpoints() {
    const a = (this.angle * Math.PI) / 180;
    const cx = Math.cos(a) * this.length;
    const cz = Math.sin(a) * this.length;
    return { ax: this.x - cx, az: this.z - cz, bx: this.x + cx, bz: this.z + cz, a };
  }

  /** Devuelve true si golpeó al jugador en este paso. */
  hit(player, dt) {
    const cd = (this.cooldown.get(player) ?? 0) - dt;
    this.cooldown.set(player, cd);

    const barY = this.top + this.armHeight;
    const feet = player.pos.y;
    if (feet > barY + this.armRadius || feet + player.height < barY - this.armRadius) return false;

    const { ax, az, bx, bz, a } = this.endpoints();
    const c = closestOnSegmentXZ(player.pos.x, player.pos.z, ax, az, bx, bz);
    let dx = player.pos.x - c.x;
    let dz = player.pos.z - c.z;
    const dist = len2(dx, dz);
    const minDist = this.armRadius + player.radius;
    if (dist >= minDist) return false;

    // Dirección de barrido (tangente al giro) en el punto de contacto.
    const sign = Math.sign(this.speed) || 1;
    const side = (c.t - 0.5) >= 0 ? 1 : -1; // cada mitad de la barra barre hacia lados opuestos
    const tx = -Math.sin(a) * sign * side;
    const tz = Math.cos(a) * sign * side;
    if (dist < 1e-4) {
      dx = tx;
      dz = tz;
    }
    const n = len2(dx, dz) || 1;
    // Sacarlo de la barra por el lado en el que está.
    const push = minDist - dist + 0.02;
    player.pos.x += (dx / n) * push;
    player.pos.z += (dz / n) * push;

    // Solo golpea si la barra viene hacia él (si se aleja, apenas lo roza).
    if (dx * tx + dz * tz < 0) return false;
    if (cd > 0) return false;
    this.cooldown.set(player, CONFIG.hazards.sweeperHitCooldown);
    const H = CONFIG.hazards;
    player.knock(tx * H.sweeperKnockback, H.sweeperLift, tz * H.sweeperKnockback);
    return true;
  }
}

/** Chorro de agua periódico: avisa (burbujas), dispara, descansa. Moja la caja si está encima. */
export class Geyser {
  constructor(def) {
    this.def = def;
    this.x = def.x;
    this.z = def.z;
    this.baseY = def.baseY ?? def.top ?? 1;
    this.radius = def.radius ?? 1;
    this.height = def.height ?? 4;
    this.period = def.period ?? 3.2;
    this.activeTime = def.activeTime ?? 1.2;
    this.warnTime = def.warnTime ?? 0.7;
    this.offset = def.offset ?? 0;
    this.phase = 'idle'; // 'idle' | 'warn' | 'active'
    this.level = 0; // 0..1 altura visual del chorro
  }

  update(time) {
    const t = (((time + this.offset) % this.period) + this.period) % this.period;
    if (t < this.activeTime) {
      this.phase = 'active';
      this.level = Math.min(1, t / 0.15);
    } else if (t > this.period - this.warnTime) {
      this.phase = 'warn';
      this.level = 0;
    } else {
      this.phase = 'idle';
      this.level = Math.max(0, 1 - (t - this.activeTime) / 0.25);
    }
  }

  covers(p) {
    if (this.phase !== 'active') return false;
    if (len2(p.x - this.x, p.z - this.z) > this.radius) return false;
    return p.y >= this.baseY - 0.5 && p.y <= this.baseY + this.height;
  }
}

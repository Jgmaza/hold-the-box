// Partículas simples con un pool de esferitas: gotas de agua, contenido que se fuga, splash.
import { CONFIG } from '../config.js';

export class Particles {
  constructor(gfx, size = 140) {
    this.gfx = gfx;
    this.pool = [];
    this.waterLevel = 0;
    const root = gfx.group('particles');
    for (let i = 0; i < size; i++) {
      const e = gfx.prim('sphere', gfx.solid('foam', { unlit: true }), { parent: root, scale: [0.1, 0.1, 0.1], shadows: false });
      e.enabled = false;
      this.pool.push({ e, life: 0, max: 1, size: 0.1, vx: 0, vy: 0, vz: 0, x: 0, y: 0, z: 0, gravity: 1 });
    }
    this._next = 0;
  }

  emit(x, y, z, vx, vy, vz, { color = 'foam', life = 0.8, size = 0.1, gravity = 1 } = {}) {
    const p = this.pool[this._next];
    this._next = (this._next + 1) % this.pool.length;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = p.max = life;
    p.size = size;
    p.gravity = gravity;
    const mat = this.gfx.solid(color, { unlit: true });
    p.e.render.material = mat;
    p.e.enabled = true;
  }

  /** Explosión de gotas (splash al caer al agua). */
  burst(x, y, z, count, { color = 'foam', speed = 4, up = 6, life = 0.9, size = 0.14 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.emit(x, y, z, Math.cos(a) * s, up * (0.5 + Math.random() * 0.7), Math.sin(a) * s, {
        color,
        life: life * (0.6 + Math.random() * 0.5),
        size: size * (0.6 + Math.random() * 0.8),
      });
    }
  }

  update(dt) {
    const g = CONFIG.physics.gravity;
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= g * p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.life <= 0 || p.y < this.waterLevel - 0.2) {
        p.life = 0;
        p.e.enabled = false;
        continue;
      }
      const s = p.size * Math.min(1, (p.life / p.max) * 2);
      p.e.setPosition(p.x, p.y, p.z);
      p.e.setLocalScale(s, s, s);
    }
  }
}

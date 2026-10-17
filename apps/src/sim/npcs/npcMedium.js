// NPC medium: "niño con pistola de agua". Ve más lejos y más ancho (CONFIG.npcs.medium).
// Ataque: guarda distancia, avisa (windup) y dispara un chorro en arco hacia donde VA a estar la caja → la moja.
// Apunta con algo de adelanto (`lead`): quedarse quietos o ir lentos y desordenados = chorro en la caja.
import { len2 } from '../math.js';
import { Npc } from './npc.js';

export class MediumNpc extends Npc {
  static difficulty = 'medium';

  startAttack(game, service) {
    super.startAttack(game, service);
    this.timer = this.T.windup;
    service.emit('npc:windup', { id: this.id, difficulty: this.difficulty });
  }

  updateAttack(dt, game, service) {
    const T = this.T;
    const c = game.box.center;
    const dx = c.x - this.pos.x;
    const dz = c.z - this.pos.z;
    const d = len2(dx, dz);
    // Si se le acercan, retrocede (sin salirse de su plataforma).
    if (d < T.keepDistance && d > 1e-3) {
      this.pos.x -= (dx / d) * T.wanderSpeed * dt;
      this.pos.z -= (dz / d) * T.wanderSpeed * dt;
      this._clampToPlatform();
    }
    this.face(c, dt);
    this.windup = Math.min(1, 1 - this.timer / T.windup);
    if (this.timer > 0) return;

    this._shoot(game, service);
    this.finishAttack();
  }

  _shoot(game, service) {
    const T = this.T;
    const c = game.box.center;
    const [p1, p2] = game.players;
    const from = {
      x: this.pos.x + Math.sin(this.facing) * (this.radius + 0.2),
      y: this.pos.y + this.height * 0.75,
      z: this.pos.z + Math.cos(this.facing) * (this.radius + 0.2),
    };
    // Adelanto: hacia donde estará la caja cuando llegue el chorro (velocidad del grupo).
    const gvx = ((p1.actualVel.x + p2.actualVel.x) / 2) * T.lead;
    const gvz = ((p1.actualVel.z + p2.actualVel.z) / 2) * T.lead;
    let t = len2(c.x - from.x, c.z - from.z) / T.shotSpeed;
    const tx = c.x + gvx * t;
    const tz = c.z + gvz * t;
    t = Math.max(0.15, len2(tx - from.x, tz - from.z) / T.shotSpeed);
    // Tiro parabólico que pasa por (tx, c.y, tz) en t segundos.
    const vel = {
      x: (tx - from.x) / t,
      y: (c.y - from.y + 0.5 * T.shotGravity * t * t) / t,
      z: (tz - from.z) / t,
    };
    service.spawnProjectile(this, from, vel);
  }
}

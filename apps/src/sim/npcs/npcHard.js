// NPC hard: "perro mojado". Ve en 360° y de lejos, rápido y reacciona al toque (CONFIG.npcs.hard).
// Ataque: persigue la caja, frena a `dashRange` (aviso) y EMBISTE en línea recta.
// Si choca: empujón fuerte + sacudida grande + se bota contenido + se moja (se sacude encima).
// Si falla queda aturdido (`stunTime`): esa es la ventana para pasar. Hay que provocarlo y cruzar coordinados.
// Con `alwaysChase` (por defecto) persigue SIEMPRE a la pareja, sin necesidad de verla, dentro de su isla.
import { CONFIG } from '../../config.js';
import { len2 } from '../math.js';
import { Npc } from './npc.js';

export class HardNpc extends Npc {
  static difficulty = 'hard';

  reset() {
    super.reset();
    this.phase = null; // 'chase' | 'windup' | 'dash' mientras ataca
    this.dashDir = { x: 0, z: 1 };
  }

  startAttack(game, service) {
    super.startAttack(game, service);
    this.phase = 'chase';
    this.timer = this.T.chaseTime;
  }

  finishAttack(opts) {
    this.phase = null;
    super.finishAttack(opts);
  }

  updateAttack(dt, game, service) {
    const T = this.T;
    const c = game.box.center;
    const dx = c.x - this.pos.x;
    const dz = c.z - this.pos.z;
    const d = len2(dx, dz);

    if (this.phase === 'chase') {
      // Solo embiste si la caja ya pisa su isla: si la esperan en el puente, aguanta en el borde mirándolos.
      if (d <= T.dashRange && this.onMyPlatform(c, 0.3)) {
        this.phase = 'windup';
        this.timer = T.windup;
        service.emit('npc:windup', { id: this.id, difficulty: this.difficulty });
        return;
      }
      this.moveToward(c.x, c.z, T.chaseSpeed, dt);
      // alwaysChase: no se rinde nunca.
      if (!T.alwaysChase && (this.timer <= 0 || !this.canSee(c, CONFIG.npcs.loseSightFactor, true))) this.finishAttack();
      return;
    }

    if (this.phase === 'windup') {
      // Se agacha mirando la caja (el aviso). La dirección de la embestida se fija al final.
      this.face(c, dt);
      this.windup = Math.min(1, 1 - this.timer / T.windup);
      if (this.timer > 0) return;
      this.phase = 'dash';
      this.timer = T.dashTime;
      this.windup = 0;
      this.dashDir.x = d > 1e-4 ? dx / d : Math.sin(this.facing);
      this.dashDir.z = d > 1e-4 ? dz / d : Math.cos(this.facing);
      this.facing = Math.atan2(this.dashDir.x, this.dashDir.z);
      return;
    }

    // Embestida en línea recta: no corrige el rumbo. Si el borde de su plataforma lo frena, se acaba.
    const bx = this.pos.x;
    const bz = this.pos.z;
    this.pos.x += this.dashDir.x * T.dashSpeed * dt;
    this.pos.z += this.dashDir.z * T.dashSpeed * dt;
    this._clampToPlatform();
    const atEdge = len2(this.pos.x - bx, this.pos.z - bz) < T.dashSpeed * dt * 0.5;
    const hit = this.touching(game.players, 0.1);
    if (hit) {
      service.hitPlayer(this, hit, { knock: T.knock, lift: T.lift, dirX: this.dashDir.x, dirZ: this.dashDir.z });
      service.hitBox(this, { damage: T.damage, wet: T.wet, kick: T.kickDeg, player: hit });
      return this.finishAttack();
    }
    if (this.timer <= 0 || atEdge) this.finishAttack({ stun: T.stunTime });
  }
}

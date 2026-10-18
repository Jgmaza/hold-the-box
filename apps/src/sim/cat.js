// Gato dentro de la caja. La rabia (0–100) sube con el tiempo.
// Juntos la frenan, separados la aceleran. No se borra al caminar bien.
// Al llegar a umbrales: asoma la pata, araña, y luego rompe el contenido.
// En el último tramo, quedarse quieto vacía la caja. Cruzar corriendo no.
import { CONFIG } from '../config.js';

export class Cat {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = 'calm'; // calm | warn | swipe
    this.rage = 0;
    this.cooldown = 0;
    this.swipeLeft = 0;
    this.anim = 0; // 0 escondido, 1 pata fuera (lo lee la vista)
    this.side = 2; // 1 = lado de P1, 2 = lado de P2
    this.victim = 0;
    this._hurtAcc = 0;
    this._warned = false;
    this._toldShred = false;
    this._toldGoal = false;
  }

  update(dt, game) {
    const C = CONFIG.box.cat;
    if (!C.enabled || game.box.dropped) {
      this._hide(dt);
      return;
    }
    if (game.box.invuln > 0) {
      this._hide(dt);
      return;
    }

    const stalling = this._stallingAtGoal(game);
    let rate = C.ragePerSec * (this._upset(game) ? C.desyncMul : C.calmMul);
    if (stalling) rate += C.goalRagePerSec;
    this.rage = Math.min(100, this.rage + rate * dt);

    this.swipeLeft = Math.max(0, this.swipeLeft - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.swipeLeft > 0) {
      this.phase = 'swipe';
      this.anim = 1;
    } else if (this.rage >= C.warnRage) {
      if (!this._warned) {
        this._warned = true;
        this._pickSide(game);
        game.events.emit('cat:warn', { player: this.side });
      }
      this.phase = 'warn';
      this.anim = 1;
    } else {
      this.phase = 'calm';
      this.anim = this.rage / Math.max(C.warnRage, 0.01);
    }

    if (this.rage >= C.scratchRage && this.cooldown <= 0 && this.swipeLeft <= 0) {
      this._scratch(game);
    }

    if (stalling) {
      if (!this._toldGoal) {
        this._toldGoal = true;
        game.events.emit('cat:goal', {});
      }
      this._hurt(game, C.goalDrainPerSec * dt);
    } else if (this.rage >= C.damageRage && C.chipPerSec > 0) {
      if (!this._toldShred) {
        this._toldShred = true;
        game.events.emit('cat:shred', {});
      }
      this._hurt(game, C.chipPerSec * dt);
    }
  }

  _hide(dt) {
    this.phase = 'calm';
    this.anim = Math.max(0, this.anim - dt * 4);
  }

  /** Galletas en estación: baja rage y corta el zarpazo en curso. */
  calm(amount) {
    if (amount <= 0) return 0;
    const before = this.rage;
    this.rage = Math.max(0, this.rage - amount);
    if (this.phase === 'swipe' || this.phase === 'windup') {
      this.phase = 'calm';
      this.anim = 0;
      this.swipeLeft = 0;
    }
    return before - this.rage;
  }

  _upset(game) {
    const b = game.box;
    return b.sync < CONFIG.box.cat.syncThreshold || b.state !== 'upright';
  }

  /** Terraza de la meta y casi sin avanzar hacia ella. */
  _stallingAtGoal(game) {
    const goal = game.level.goal;
    if (!goal) return false;
    const C = CONFIG.box.cat;
    if (game.box.center.z > goal.z + C.goalLead) return false;
    const vz = (game.p1.actualVel.z + game.p2.actualVel.z) / 2;
    return -vz < C.hurrySpeed;
  }

  _hurt(game, amount) {
    this._hurtAcc += amount;
    if (this._hurtAcc < 1) return;
    const n = Math.floor(this._hurtAcc);
    this._hurtAcc -= n;
    game.box.damage(n, 'cat');
  }

  /** El lado que ya va peor, o quien más está tirando si la caja sigue derecha. */
  _pickSide(game) {
    const roll = game.box.tilt.roll;
    if (Math.abs(roll) > 4) this.side = roll > 0 ? 2 : 1;
    else this.side = game.p1.inputMagnitude >= game.p2.inputMagnitude ? 1 : 2;
  }

  _scratch(game) {
    const C = CONFIG.box.cat;
    const victim = this.side === 1 ? game.p1 : game.p2;
    const b = game.box;
    let dx = victim.pos.x - b.center.x;
    let dz = victim.pos.z - b.center.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    victim.knock(dx * C.knock, C.knockUp, dz * C.knock);
    victim.knockTimer = C.controlTime;
    b.damage(C.scratchDamage, 'cat');
    const sign = this.side === 1 ? -1 : 1;
    b.kick(sign * C.kick, C.kick * 0.35);
    this.phase = 'swipe';
    this.anim = 1;
    this.swipeLeft = C.swipeHold;
    this.cooldown = C.cooldown;
    this.victim = this.side;
    game.events.emit('cat:scratch', { player: this.side });
  }
}

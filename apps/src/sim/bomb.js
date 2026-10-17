// Mecha de la caja bomba. El reloj corre mientras se juega.
// Llegar a la meta cambia el estado y este update deja de llamarse.
// En cero marca exploded; la derrota la pone Game.
import { CONFIG } from '../config.js';

export class Bomb {
  constructor() {
    this.reset();
  }

  reset() {
    this.timeLeft = CONFIG.box.bomb.fuseTime;
    this.exploded = false;
    this._beepAcc = 0;
    this._warned = false;
  }

  update(dt, game) {
    if (!CONFIG.box.bomb.enabled || this.exploded || game.box.dropped) return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) {
      this.exploded = true;
      game.events.emit('bomb:explode', {});
      return;
    }
    const warn = CONFIG.box.bomb.warnTime;
    if (!this._warned && this.timeLeft <= warn) {
      this._warned = true;
      game.events.emit('bomb:warn', { timeLeft: this.timeLeft });
    }
    this._beepAcc += dt;
    const interval = this.timeLeft <= 8 ? 0.28 : this.timeLeft <= warn ? 0.55 : 1.1;
    if (this._beepAcc >= interval) {
      this._beepAcc = 0;
      game.events.emit('bomb:beep', { timeLeft: this.timeLeft });
    }
  }
}

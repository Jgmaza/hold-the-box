// Mecha de la caja bomba. El reloj corre mientras se juega.
// Llegar a la meta cambia el estado y este update deja de llamarse.
// En cero marca exploded; la derrota la pone Game.
// Golpes y agua le quitan segundos (Box llama a hit / drain en vez de restar contenido o mojar).
import { CONFIG } from '../config.js';

export class Bomb {
  constructor() {
    this.reset();
  }

  reset() {
    this.timeLeft = CONFIG.box.bomb.fuseTime;
    this.exploded = false;
    this.sinceBeep = 0; // segundos desde el último tic (el LED de la caja lo lee)
    this.sinceDrain = Infinity; // segundos desde la última vez que el agua o el viento le quitaron vida
    this._warned = false;
  }

  /** Golpe: resta segundos de una vez y avisa (la UI muestra «−3 s»). */
  hit(seconds, cause, events) {
    if (this.exploded || seconds <= 0) return;
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    events?.emit('bomb:hit', { seconds, cause, timeLeft: this.timeLeft });
  }

  /** Desgaste continuo (chorros, lluvia, ola, viento). Sin evento: pasaría cada cuadro. */
  drain(seconds) {
    if (this.exploded || seconds <= 0) return;
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    this.sinceDrain = 0;
  }

  update(dt, game) {
    if (!CONFIG.box.bomb.enabled || this.exploded || game.box.dropped) return;
    this.sinceDrain += dt;
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
    this.sinceBeep += dt;
    const interval = this.timeLeft <= 8 ? 0.28 : this.timeLeft <= warn ? 0.55 : 1.1;
    if (this.sinceBeep >= interval) {
      this.sinceBeep = 0;
      game.events.emit('bomb:beep', { timeLeft: this.timeLeft });
    }
  }
}

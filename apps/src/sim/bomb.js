// Salud de la caja bomba (0..100). No baja sola: la dañan golpes y agua (Box llama a hit / drain
// en vez de restar contenido o mojar) y la falta de sincronía (aquí, en update).
// En 0 marca exploded; la derrota la pone Game.
import { CONFIG } from '../config.js';

export class Bomb {
  constructor() {
    this.reset();
  }

  /** `health`: con cuánto arranca (al reintentar, la que tenía en el checkpoint). */
  reset(health = 100) {
    this.health = health;
    this.exploded = false;
    this.sinceBeep = 0; // segundos desde el último tic (el LED de la caja lo lee)
    this.sinceDrain = Infinity; // segundos desde la última vez que el agua o el viento la dañaron
    this.desync = 0; // 0 = van bien, 1 = sincronía 0 (máximo daño)
    this._warned = health <= CONFIG.box.bomb.warnHealth;
  }

  /** Golpe: resta de una vez y avisa (la UI muestra «−8 %»). */
  hit(amount, cause, events) {
    if (this.exploded || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    events?.emit('bomb:hit', { amount, cause, health: this.health });
  }

  /** Daño continuo (chorros, lluvia, ola, viento). Sin evento: pasaría cada cuadro. */
  drain(amount) {
    if (this.exploded || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.sinceDrain = 0;
  }

  /** Reparación en estación de recuperación (nunca daña). */
  heal(amount) {
    if (this.exploded || amount <= 0) return 0;
    const before = this.health;
    this.health = Math.min(100, this.health + amount);
    return this.health - before;
  }

  update(dt, game) {
    if (!CONFIG.box.bomb.enabled || this.exploded || game.box.dropped) return;
    const B = CONFIG.box.bomb;
    const box = game.box;
    this.sinceDrain += dt;
    const canHurt = game.respawnTimer <= 0 && box.invuln <= 0;
    const desync = canHurt ? Math.max(0, (B.desyncBelow - box.sync) / B.desyncBelow) : 0;
    if (desync > 0 && this.desync === 0) game.events.emit('bomb:desync', {});
    this.desync = desync;
    this.health = Math.max(0, this.health - desync * B.desyncPerSec * dt);
    if (this.health <= 0) {
      this.exploded = true;
      game.events.emit('bomb:explode', {});
      return;
    }
    if (!this._warned && this.health <= B.warnHealth) {
      this._warned = true;
      game.events.emit('bomb:warn', { health: this.health });
    }
    // El tic se acelera cuanto más dañada está.
    this.sinceBeep += dt;
    const interval = this.health <= 10 ? 0.28 : this.health <= B.warnHealth ? 0.55 : this.health <= 50 ? 0.8 : 1.1;
    if (this.sinceBeep >= interval) {
      this.sinceBeep = 0;
      game.events.emit('bomb:beep', { health: this.health });
    }
  }
}

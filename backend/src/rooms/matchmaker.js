// Matchmaking rápido ("jugar sin código"): una cola en memoria que agrupa jugadores en salas automáticas.
//   · `solo` se empareja con otro `solo` (forman un dúo); `duo` ya viene como dúo de sofá.
//   · Agrupa por nivel (o `any` si no eligió) y llena salas de hasta `matchmakerMaxDuos` dúos, o arranca
//     antes por tiempo (`matchmakerFillSec` con ≥2 dúos, `matchmakerSoloSec` con 1).
//   · La sala creada es `auto` (sin host) y arranca sola tras `matchmakerAutoStartSec`.
import { randomInt } from 'node:crypto';

export class Matchmaker {
  /**
   * @param {{ rooms: import('./roomManager.js').RoomManager, env: object, logger?: object }} opts
   */
  constructor({ rooms, env, logger }) {
    this.rooms = rooms;
    this.env = env;
    this.log = logger ?? console;
    this.queue = new Map(); // userId → { user, mode, level, since, priority }
    this._timer = null;
    this._statusTimer = null;
  }

  get size() {
    return this.queue.size;
  }

  isQueued(userId) {
    return this.queue.has(userId);
  }

  join(user, { mode, level = null }) {
    this.rooms.leave(user.id); // no se puede estar en cola y en sala a la vez
    this.queue.set(user.id, { user, mode, level: level ?? null, since: Date.now(), priority: 0 });
    this._ensureTimers();
    this._status(user.id);
  }

  leave(userId) {
    this.queue.delete(userId);
  }

  /** Avanza la agrupación. Público para tests (el ticker lo llama cada `matchmakerTickMs`). */
  tick(now = Date.now()) {
    const byLevel = new Map();
    for (const e of this.queue.values()) {
      const key = e.level ?? 'any';
      if (!byLevel.has(key)) byLevel.set(key, []);
      byLevel.get(key).push(e);
    }
    for (const [level, entries] of byLevel) this._fill(level, entries, now);
  }

  _fill(level, entries, now) {
    const C = this.env;
    // `solo` se empareja de 2 en 2 (los impares esperan); `duo` ya es un dúo completo.
    const solos = entries
      .filter((e) => e.mode === 'solo')
      .sort((a, b) => b.priority - a.priority || a.since - b.since);
    const units = entries.filter((e) => e.mode === 'duo').map((e) => ({ players: [e], since: e.since }));
    while (solos.length >= 2) {
      const a = solos.shift();
      const b = solos.shift();
      units.push({ players: [a, b], since: Math.min(a.since, b.since) });
    }
    units.sort((a, b) => a.since - b.since);
    if (!units.length) return;

    const full = units.length >= C.matchmakerMaxDuos;
    const byTime2 = units.length >= 2 && now - units[0].since >= C.matchmakerFillSec * 1000;
    const byTime1 = units.length === 1 && now - units[0].since >= C.matchmakerSoloSec * 1000;
    if (!full && !byTime2 && !byTime1) return;

    this._makeRoom(units.slice(0, C.matchmakerMaxDuos), level);
  }

  _makeRoom(units, level) {
    for (const u of units) for (const e of u.players) this.queue.delete(e.user.id);
    const teams = units.map((u) => u.players.map((e) => e.user));
    const room = this.rooms.createAutoRoom({ teams, level: level === 'any' ? null : level });
    for (const u of units) {
      for (const e of u.players) this.rooms.hub.sendTo(e.user.id, 'queue:matched', { code: room.code });
    }
  }

  _ensureTimers() {
    if (!this._timer) {
      this._timer = setInterval(() => this.tick(), this.env.matchmakerTickMs);
      this._timer.unref?.();
    }
    if (!this._statusTimer) {
      this._statusTimer = setInterval(() => this._statusAll(), 2000);
      this._statusTimer.unref?.();
    }
  }

  _status(userId) {
    const e = this.queue.get(userId);
    if (e) this.rooms.hub.sendTo(userId, 'queue:status', this._statusOf(e));
  }

  _statusAll() {
    for (const e of this.queue.values()) this.rooms.hub.sendTo(e.userId, 'queue:status', this._statusOf(e));
  }

  _statusOf(e) {
    const now = Date.now();
    const bucket = [...this.queue.values()].filter(
      (x) => (x.level ?? 'any') === (e.level ?? 'any') && x.mode === e.mode,
    );
    bucket.sort((a, b) => a.since - b.since);
    return {
      mode: e.mode,
      level: e.level,
      position: bucket.findIndex((x) => x.user.id === e.user.id) + 1,
      waiting: Math.round((now - e.since) / 1000),
      etaSec: Math.max(0, Math.round(this.env.matchmakerFillSec - (now - e.since) / 1000)),
    };
  }

  close() {
    if (this._timer) clearInterval(this._timer);
    if (this._statusTimer) clearInterval(this._statusTimer);
    this._timer = this._statusTimer = null;
    this.queue.clear();
  }
}

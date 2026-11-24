// Partida online: N dúos en el mismo mapa, en lockstep, simulados por el servidor (autoritativo).
//
//   countdown ──(countdownMs)──▶ playing ──(todos terminaron | eliminados | timeLimit)──▶ ended
//
// `advance(dtSec)` es puro respecto al reloj (lo llama el ticker de RoomManager o un test).
// Salidas por callbacks (RoomManager arma el mensaje de cada destinatario):
//   onSnapshot(common, owns)  common = parte para todos; owns = Map(teamId → mundo de ese dúo)
//   onEvents(list)            list = [{ duo, e, d, t, private? }] — los privados solo van a ese dúo
//   onEnd(results)
import { CONFIG, LEVELS, selectBox, World } from '../game/index.js';
import { CrossDuoCollider } from './collisions.js';
import { Duo } from './duo.js';
import { COALESCED_EVENTS } from './events.js';
import { matchSnapshot, ownSnapshot } from './snapshot.js';

const MAX_FRAME = 0.25; // s: si el proceso se congela, no intentamos recuperar más de esto

export class Match {
  /**
   * @param {{ id: string, level: string, boxProfile: string, seed: number,
   *           teams: { teamId: number, players: Record<1|2, {userId: string, name: string}> }[],
   *           countdownSec: number, timeLimitSec: number, snapshotHz: number, ghostSec: number,
   *           onSnapshot?: Function, onEvents?: Function, onEnd?: Function }} opts
   */
  constructor(opts) {
    this.id = opts.id;
    this.levelKey = opts.level;
    this.level = LEVELS[opts.level];
    this.boxProfile = opts.boxProfile;
    this.seed = opts.seed;
    this.timeLimit = opts.timeLimitSec;
    this.snapshotEvery = 1 / opts.snapshotHz;
    this.countdown = opts.countdownSec;
    this.onSnapshot = opts.onSnapshot ?? (() => {});
    this.onEvents = opts.onEvents ?? (() => {});
    this.onEnd = opts.onEnd ?? (() => {});
    this.state = 'countdown';
    this.startedAt = null; // Date al acabar la cuenta atrás (historial, #8)
    this.time = 0;
    this.tick = 0;
    this._acc = 0;
    this._snapAcc = 0;
    this._events = [];
    this.collider = new CrossDuoCollider();
    this.results = null;

    const emit = (duo, e, d, isPrivate = false) => {
      const ev = { duo, e, d, t: Math.round(this.time * 1000) / 1000 };
      if (isPrivate) ev.private = true;
      if (COALESCED_EVENTS.has(e)) {
        const i = this._events.findIndex((x) => x.duo === duo && x.e === e);
        if (i !== -1) return void (this._events[i] = ev);
      }
      this._events.push(ev);
    };
    this._emit = emit;
    selectBox(this.boxProfile);
    // Mundo compartido: un único `World` por partida (vidrio, plataformas, colisiones). Cada dúo apunta al mismo,
    // así lo que uno rompe lo ven todos. NPCs y clima siguen por dúo por ahora (ver issue #13).
    this.sharedWorld = new World(this.level);
    this.duos = opts.teams.map(
      (t) => new Duo({ teamId: t.teamId, players: t.players, level: this.level, seed: this.seed, ghostSec: opts.ghostSec, emit, world: this.sharedWorld }),
    );
  }

  /** Info pública para `match:start`. */
  describe() {
    return {
      matchId: this.id,
      level: this.levelKey,
      boxProfile: this.boxProfile,
      seed: this.seed,
      countdownSec: this.countdown,
      timeLimitSec: this.timeLimit,
      fixedStep: CONFIG.physics.fixedStep,
      duos: this.duos.map((d) => ({
        id: d.teamId,
        players: [1, 2].map((slot) => {
          const p = d.players[slot];
          return { slot, userId: p.userId, name: p.name, char: p.char, alt: p.alt };
        }),
      })),
      // Estado inicial de todos los dúos (cuenta atrás). El mundo propio inicial = Game(level, seed) recién creado.
      snapshot: matchSnapshot(this),
    };
  }

  duoOf(userId) {
    return this.duos.find((d) => d.slotOf(userId).length > 0) ?? null;
  }

  setInput(userId, msg) {
    if (this.state !== 'playing') return false;
    const duo = this.duoOf(userId);
    if (!duo || !duo.slotOf(userId).includes(msg.slot)) return false;
    duo.setInput(msg.slot, msg);
    return true;
  }

  setOnline(userId, online) {
    const duo = this.duoOf(userId);
    if (!duo) return;
    for (const slot of duo.slotOf(userId)) duo.setOnline(slot, online);
    if (!online) this._emit(duo.teamId, 'player:disconnected', { userId });
  }

  /** Se fue y no volvió en la gracia (o volvió: on=false). Solo cambia el ranking; su input ya es neutro. */
  markAbandoned(userId, on = true) {
    const duo = this.duoOf(userId);
    if (!duo) return;
    if (on) duo.abandoned.add(userId);
    else duo.abandoned.delete(userId);
  }

  advance(dtSec) {
    if (this.state === 'ended') return;
    const dt = Math.min(dtSec, MAX_FRAME);
    if (this.state === 'countdown') {
      this.countdown -= dt;
      if (this.countdown <= 0) this._begin();
      return;
    }
    // CONFIG.box es global en la sim: se fija el perfil de ESTA partida antes de simular (JS = un solo hilo).
    selectBox(this.boxProfile);
    const step = CONFIG.physics.fixedStep;
    this._acc += dt;
    while (this._acc >= step && this.state === 'playing') {
      this._step(step);
      this._acc -= step;
    }
    this._snapAcc += dt;
    if (this._snapAcc >= this.snapshotEvery || this.state === 'ended') {
      this._snapAcc %= this.snapshotEvery;
      this.flush();
    }
  }

  /** Emite snapshot + eventos acumulados. */
  flush() {
    if (this._events.length) {
      const list = this._events;
      this._events = [];
      this.onEvents(list);
    }
    this.onSnapshot(matchSnapshot(this), this.ownSnapshots());
  }

  /** Map(teamId → mundo de ese dúo). */
  ownSnapshots() {
    return new Map(this.duos.map((d) => [d.teamId, ownSnapshot(d)]));
  }

  _begin() {
    this.state = 'playing';
    this.startedAt = new Date();
    this.countdown = 0;
    selectBox(this.boxProfile);
    for (const d of this.duos) d.begin();
    this.flush();
  }

  _step(dt) {
    this.time += dt;
    this.tick++;
    for (const duo of this.duos) {
      const changed = duo.step(dt, this.time);
      if (changed === 'finished') this._emit(duo.teamId, 'duo:finished', { time: duo.finishTime, ...duo.result });
      if (changed === 'eliminated') this._emit(duo.teamId, 'duo:eliminated', { checkpoint: duo.game.checkpointIndex });
    }
    this.collider.resolve(this.duos, this.time, this._emit);
    const racing = this.duos.some((d) => d.status === 'racing');
    if (!racing) this._end('allDone');
    else if (this.time >= this.timeLimit) this._end('timeLimit');
  }

  _end(reason) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.results = {
      reason,
      time: Math.round(this.time * 1000) / 1000,
      startedAt: this.startedAt?.toISOString() ?? null, // null si se cortó en la cuenta atrás
      ranking: this.ranking(),
    };
    this.flush();
    this.onEnd(this.results);
  }

  /** Terminar desde fuera (sala vacía, servidor apagándose). */
  abort() {
    this._end('aborted');
  }

  /** Llegaron (por tiempo) > no llegaron (checkpoint desc, distancia a la meta asc). */
  ranking() {
    const rows = this.duos.map((d) => ({
      duo: d,
      teamId: d.teamId,
      status: d.status === 'racing' ? 'dnf' : d.status,
      finishTime: d.finishTime,
      checkpoint: d.game.checkpointIndex,
      distance: d.distanceToGoal(),
      lives: d.game.lives,
      rating: d.result?.rating ?? null,
      integrity: Math.round(d.game.box.integrity),
      wetness: Math.round(d.game.box.wetness),
      players: [1, 2].map((slot) => ({
        slot,
        userId: d.players[slot].userId,
        name: d.players[slot].name,
        abandoned: d.abandoned.has(d.players[slot].userId),
      })),
    }));
    rows.sort((a, b) => {
      const fa = a.status === 'finished';
      const fb = b.status === 'finished';
      if (fa !== fb) return fa ? -1 : 1;
      if (fa) return a.finishTime - b.finishTime;
      if (a.checkpoint !== b.checkpoint) return b.checkpoint - a.checkpoint;
      return a.distance - b.distance;
    });
    return rows.map(({ duo, distance, ...row }, i) => ({
      ...row,
      placement: i + 1,
      finishTime: row.finishTime === null ? null : Math.round(row.finishTime * 1000) / 1000,
      distance: Math.round(distance * 10) / 10,
    }));
  }
}

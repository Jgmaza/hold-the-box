// RoomManager: dueño de todas las salas y partidas del proceso (estado en memoria = lo más rápido).
// Recibe mensajes ya validados del gateway, cambia salas y avisa por el Hub.
// Un único ticker (setInterval) avanza todas las partidas activas.
import { randomInt, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pack } from 'msgpackr';
import { AppError, ERR } from '../errors.js';
import { Match } from '../match/match.js';
import { matchSnapshot as matchSnapshotOf } from '../match/snapshot.js';
import { EMOTE_COOLDOWN_MS } from '../social/emotes.js';
import { uniqueCode } from './codes.js';
import { Matchmaker } from './matchmaker.js';
import { Room } from './room.js';

export class RoomManager {
  /**
   * @param {{ hub: import('../ws/hub.js').Hub, env: object, logger?: object,
   *           onMatchEnd?: (room: Room, results: object) => void|Promise<void>,
   *           onPresence?: (userIds: string[]) => void, onRoomClosed?: (code: string) => void }} opts
   *   onPresence: estos usuarios pudieron cambiar de sala o de estado de sala (social/presence.js). Sin I/O.
   *   onRoomClosed: la sala ya no admite jugadores nuevos (empezó la partida o se destruyó). Sin I/O.
   */
  constructor({ hub, env, logger, onMatchEnd, metrics, onPresence, onRoomClosed }) {
    this.hub = hub;
    this.env = env;
    this.log = logger ?? console;
    this.metrics = metrics ?? null;
    this.onMatchEnd = onMatchEnd ?? (() => {});
    this.onPresence = onPresence ?? (() => {});
    this.onRoomClosed = onRoomClosed ?? (() => {});
    this.rooms = new Map(); // code → Room
    this.userRoom = new Map(); // userId → code
    this.matches = new Map(); // Match activo → Room
    this._timer = null;
    this._timeouts = new Set();
    this._grace = new Map(); // userId → timeout: desconectado, esperando a que vuelva
    this._lastEmote = new Map(); // userId → timestamp del último emote (rate limit)
    this.stats = { lastTickMs: 0, maxTickMs: 0 };
    this.matchmaker = new Matchmaker({ rooms: this, env, logger: this.log });
  }

  // ------------------------------------------------------------------ consultas

  get(code) {
    return this.rooms.get(code) ?? null;
  }

  roomOf(userId) {
    const code = this.userRoom.get(userId);
    return code ? this.rooms.get(code) : null;
  }

  listPublic() {
    return [...this.rooms.values()].filter((r) => !r.isPrivate).map((r) => r.summary());
  }

  _require(userId) {
    const room = this.roomOf(userId);
    if (!room) throw new AppError(ERR.NOT_IN_ROOM, 'no estás en ninguna sala');
    return room;
  }

  // ------------------------------------------------------------------ mensajes (desde el gateway)

  /** @returns {object|undefined} datos extra del ack */
  handle(user, t, d) {
    switch (t) {
      case 'room:create':
        return this.create(user, d);
      case 'room:join':
        return this.join(user, d.code);
      case 'room:spectate':
        return this.spectate(user, d.code);
      case 'match:watch':
        return this.watch(user.id, d.duo);
      case 'room:leave':
        return this.leave(user.id);
      case 'room:setTeam': {
        const room = this._require(user.id);
        room.setTeam(user.id, d.teamId, d.slots);
        return this._changed(room);
      }
      case 'room:ready': {
        const room = this._require(user.id);
        room.setReady(user.id, d.ready);
        return this._changed(room);
      }
      case 'room:settings': {
        const room = this._require(user.id);
        room.updateSettings(user.id, d);
        return this._changed(room);
      }
      case 'room:kick': {
        const room = this._require(user.id);
        room.kick(user.id, d.userId);
        this.userRoom.delete(d.userId);
        this.hub.sendTo(d.userId, 'room:kicked', { code: room.code });
        this.onPresence([d.userId]);
        return this._changed(room);
      }
      case 'room:setChars': {
        const room = this._require(user.id);
        room.setChars(user.id, d);
        return this._changed(room);
      }
      case 'room:start':
        return this.start(user.id);
      case 'input':
        return this.input(user.id, d);
      case 'emote':
        return this.emote(user, d);
      case 'queue:join':
        return this.matchmaker.join(user, d);
      case 'queue:leave':
        this.matchmaker.leave(user.id);
        return;
      default:
        throw new AppError('UNKNOWN_TYPE', `sin handler: ${t}`);
    }
  }

  create(user, opts) {
    this.leave(user.id);
    const code = uniqueCode((c) => this.rooms.has(c));
    const room = new Room({
      code,
      host: user,
      level: opts.level,
      maxDuos: Math.min(opts.maxDuos ?? this.env.maxDuosDefault, this.env.maxDuosLimit),
      isPrivate: opts.isPrivate,
      boxProfile: opts.boxProfile,
      maxSpectators: this.env.maxSpectators,
    });
    this.rooms.set(code, room);
    this.userRoom.set(user.id, code);
    this.log.info?.({ code, host: user.id }, 'room created');
    this._changed(room);
    return { code };
  }

  join(user, code) {
    const room = this.rooms.get(code);
    if (!room) throw new AppError(ERR.ROOM_NOT_FOUND, `no existe la sala ${code}`, 404);
    if (this.userRoom.get(user.id) === code) return this._changed(room), { code };
    this.leave(user.id);
    room.addMember(user);
    this.userRoom.set(user.id, code);
    this._changed(room);
    return { code };
  }

  /** Entra a mirar (también con la partida en curso). No ocupa puesto de jugador. */
  spectate(user, code) {
    const room = this.rooms.get(code);
    if (!room) throw new AppError(ERR.ROOM_NOT_FOUND, `no existe la sala ${code}`, 404);
    if (this.userRoom.get(user.id) !== code) {
      this.leave(user.id);
      room.addMember(user, { spectate: true });
      this.userRoom.set(user.id, code);
    }
    this._changed(room);
    this._sendMatchTo(room, user.id);
    return { code };
  }

  /** Cambia el dúo que se mira (espectadores y jugadores cuyo dúo ya terminó). */
  watch(userId, duoId) {
    const room = this._require(userId);
    const match = room.match;
    if (!match || match.state === 'ended') throw new AppError(ERR.NOT_IN_MATCH, 'no hay partida en curso');
    if (!match.duos.some((d) => d.teamId === duoId)) throw new AppError(ERR.BAD_REQUEST, `el dúo ${duoId} no está en la partida`);
    room.members.get(userId).watch = duoId;
    if (match.state === 'playing') this._sendSnapshot(room, match, null, match.ownSnapshots(), [userId]);
    return { duo: this._viewTeam(room, match, userId) };
  }

  leave(userId) {
    this._clearGrace(userId);
    const room = this.roomOf(userId);
    if (!room) return;
    this.userRoom.delete(userId);
    room.match?.setOnline(userId, false);
    const { empty } = room.removeMember(userId);
    this.onPresence([userId]);
    if (empty) return this._destroy(room);
    this._changed(room);
  }

  start(userId) {
    const room = this._require(userId);
    const teams = room.startableTeams(userId);
    return this._startMatch(room, teams);
  }

  _startMatch(room, teams) {
    const match = new Match({
      id: randomUUID(),
      level: room.level,
      boxProfile: room.boxProfile,
      seed: randomInt(2 ** 31),
      teams,
      countdownSec: this.env.countdownMs / 1000,
      timeLimitSec: this.env.matchTimeLimitSec,
      snapshotHz: this.env.snapshotHz,
      ghostSec: this.env.spawnGhostSec,
      onSnapshot: (common, owns) => this._sendSnapshot(room, match, common, owns),
      onEvents: (events) => this._sendEvents(room, match, events),
      onEnd: (results) => this._matchEnded(room, match, results),
    });
    room.match = match;
    room.state = 'countdown';
    this.onRoomClosed(room.code);
    this.matches.set(match, room);
    this._ensureTicker();
    this._toRoom(room, 'match:start', match.describe());
    this._changed(room);
    this.log.info?.({ code: room.code, matchId: match.id, duos: teams.length }, 'match start');
    return { matchId: match.id };
  }

  /** Sala automática (matchmaking): sin host; el matchmaker sentó a los dúos en `teams`. */
  createAutoRoom({ teams, level }) {
    const code = uniqueCode((c) => this.rooms.has(c));
    const room = new Room({
      code,
      host: null,
      level: level ?? 'muelle',
      maxDuos: this.env.matchmakerMaxDuos,
      isPrivate: false,
      boxProfile: 'vip',
      maxSpectators: this.env.maxSpectators,
      auto: true,
    });
    this.rooms.set(code, room);
    teams.forEach((users, teamId) => {
      if (users.length === 1) {
        const u = users[0];
        room.addAutoMember(u);
        room.setTeam(u.id, teamId, [1, 2]); // dúo de sofá
        this.userRoom.set(u.id, code);
      } else {
        const [u1, u2] = users;
        room.addAutoMember(u1);
        room.addAutoMember(u2);
        room.setTeam(u1.id, teamId, [1]);
        room.setTeam(u2.id, teamId, [2]);
        this.userRoom.set(u1.id, code);
        this.userRoom.set(u2.id, code);
      }
    });
    this.log.info?.({ code, duos: teams.length }, 'auto room created');
    room.autoStartAt = Date.now() + this.env.matchmakerAutoStartSec * 1000;
    this._changed(room);
    this._later(() => this.autoStart(room), this.env.matchmakerAutoStartSec * 1000);
    return room;
  }

  /** Arranca una sala automática cuando se cumple su cuenta atrás (si le queda al menos un dúo). */
  autoStart(room) {
    if (this.rooms.get(room.code) !== room) return;
    if (room.state !== 'lobby' || room.match) return;
    const teams = room.autoStartTeams();
    if (!teams) return; // se quedó sin dúos: no arranca
    room.autoStartAt = null;
    this._startMatch(room, teams);
  }

  input(userId, d) {
    const room = this.roomOf(userId);
    room?.match?.setInput(userId, d);
  }

  /** Emote / frase rápida: se reenvía a toda la sala (con dúo/slot en partida). Rate limit 1 cada 1,5 s. */
  emote(user, d) {
    const room = this.roomOf(user.id);
    if (!room) return; // fuera de sala: se ignora (sin error)
    const now = Date.now();
    const last = this._lastEmote.get(user.id) ?? 0;
    if (now - last < EMOTE_COOLDOWN_MS) return; // spam: descartar
    this._lastEmote.set(user.id, now);

    const m = room.members.get(user.id);
    let duo = m?.teamId ?? null;
    let slot = m?.slots[0] ?? null;
    const matchDuo = room.match?.duoOf(user.id);
    if (matchDuo) {
      duo = matchDuo.teamId;
      slot = matchDuo.slotOf(user.id)[0] ?? null;
    }
    this._toRoom(room, 'emote', { userId: user.id, duo, slot, id: d.id, t: now });
  }

  // ------------------------------------------------------------------ conexión

  /**
   * Reconexión dentro de la gracia: conserva sala, dúo y puesto (en lobby, sin "listo"); en partida recibe
   * room:state + match:start {resume} + snapshot completo al instante.
   */
  onConnect(user) {
    this._clearGrace(user.id);
    const room = this.roomOf(user.id);
    if (!room) return;
    const m = room.members.get(user.id);
    if (m) {
      m.online = true;
      m.offlineSince = null;
      if (room.state === 'lobby') m.ready = false;
      if (m.abandoned) {
        m.abandoned = false;
        room.match?.markAbandoned(user.id, false);
      }
    }
    room.match?.setOnline(user.id, true);
    this._changed(room);
    this._sendMatchTo(room, user.id, { resume: true });
  }

  /** Se cortó: no se le saca al instante; tiene `reconnectGraceMs` para volver (ver _graceExpired). */
  onDisconnect(userId) {
    const room = this.roomOf(userId);
    if (!room) return;
    const m = room.members.get(userId);
    if (m) {
      m.online = false;
      m.offlineSince = Date.now();
    }
    room.match?.setOnline(userId, false);
    this._changed(room);
    this._clearGrace(userId);
    const h = setTimeout(() => this._graceExpired(userId), this.env.reconnectGraceMs);
    h.unref?.();
    this._grace.set(userId, h);
  }

  /** No volvió a tiempo: en lobby / resultados sale de la sala; en partida queda `abandoned` y sale al terminar. */
  _graceExpired(userId) {
    this._grace.delete(userId);
    const room = this.roomOf(userId);
    const m = room?.members.get(userId);
    if (!m || m.online) return;
    if (room.state === 'lobby' || room.state === 'results') return this.leave(userId);
    m.abandoned = true;
    room.match?.markAbandoned(userId);
    this._changed(room);
  }

  _clearGrace(userId) {
    const h = this._grace.get(userId);
    if (h) clearTimeout(h);
    this._grace.delete(userId);
  }

  /** match:start (+ snapshot inmediato) para quien llega con la partida ya empezada. */
  _sendMatchTo(room, userId, extra = {}) {
    const match = room.match;
    if (!match || match.state === 'ended') return;
    const spectate = !match.duoOf(userId);
    this.hub.sendTo(userId, 'match:start', { ...match.describe(), ...extra, ...(spectate ? { spectate: true } : {}) });
    if (match.state === 'playing') this._sendSnapshot(room, match, null, match.ownSnapshots(), [userId]);
  }

  // ------------------------------------------------------------------ partida

  _matchEnded(room, match, results) {
    this.matches.delete(match);
    if (this.rooms.get(room.code) !== room) return;
    room.state = 'results';
    room.lastResults = { matchId: match.id, level: match.levelKey, boxProfile: match.boxProfile, seed: match.seed, ...results };
    this._toRoom(room, 'match:end', room.lastResults);
    this._changed(room);
    Promise.resolve()
      .then(() => this.onMatchEnd(room, room.lastResults))
      .catch((err) => this.log.error?.({ err }, 'onMatchEnd failed'));
    this._later(() => {
      if (this.rooms.get(room.code) !== room) return;
      // Los que abandonaron salen; los desconectados aún en gracia se quedan (su temporizador decide).
      for (const m of [...room.members.values()]) {
        if (m.abandoned) {
          room.removeMember(m.userId);
          this.userRoom.delete(m.userId);
          this.onPresence([m.userId]);
        }
        m.watch = null;
      }
      if (room.members.size === 0) return this._destroy(room);
      room.backToLobby();
      this._changed(room);
    }, this.env.resultsMs);
  }

  _ensureTicker() {
    if (this._timer) return;
    let last = performance.now();
    this._timer = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      this.tickAll(dt);
      const ms = performance.now() - now;
      this.stats.lastTickMs = ms;
      this.stats.maxTickMs = Math.max(this.stats.maxTickMs, ms);
      this.metrics?.observeTick(ms);
      if (!this.matches.size) this._stopTicker();
    }, 1000 / this.env.tickHz);
    this._timer.unref?.();
  }

  _stopTicker() {
    clearInterval(this._timer);
    this._timer = null;
  }

  /** Avanza todas las partidas (público para tests). */
  tickAll(dt) {
    for (const [match, room] of this.matches) {
      const wasCountdown = match.state === 'countdown';
      try {
        match.advance(dt);
      } catch (err) {
        this.log.error?.({ err, matchId: match.id }, 'match crashed');
        match.abort();
      }
      if (wasCountdown && match.state === 'playing') {
        room.state = 'playing';
        this._changed(room);
      }
    }
  }

  // ------------------------------------------------------------------ envío por destinatario

  /**
   * Snapshot: la parte común se serializa UNA vez; a cada jugador se le pega el `own` de su dúo
   * (los que no juegan reciben own: null). `only` limita los destinatarios (reconexión).
   */
  _sendSnapshot(room, match, common, owns, only) {
    const commonObj = common ?? matchSnapshotOf(match);
    const base = JSON.stringify(commonObj);
    const head = `{"t":"match:snapshot","d":${base.slice(0, -1)},"own":`;
    this.metrics?.inc('htb_snapshot_bytes', base.length, { part: 'common' });
    const ownJson = new Map();
    for (const userId of only ?? room.memberIds()) {
      const conn = this.hub.get(userId);
      if (!conn) continue;
      const team = this._viewTeam(room, match, userId);
      const own = team !== null ? owns.get(team) : null;
      if (conn.binary) {
        // msgpack binario: se serializa por destinatario (el `own` es distinto).
        const buf = pack({ t: 'match:snapshot', d: { ...commonObj, own } });
        this.metrics?.inc('htb_snapshot_bytes', buf.length, { part: 'common', format: 'bin' });
        conn.sendRaw(buf, { droppable: true });
        continue;
      }
      let ownRaw = 'null';
      if (own) {
        if (!ownJson.has(team)) ownJson.set(team, JSON.stringify(own));
        ownRaw = ownJson.get(team);
      }
      conn.sendRaw(`${head}${ownRaw}}}`, { droppable: true });
    }
  }

  /**
   * Dúo cuyo mundo (`own`) y eventos privados recibe este usuario: el suyo mientras corre; si mira (espectador o
   * su dúo ya terminó / quedó sin vidas), el que eligió con match:watch o el primero.
   */
  _viewTeam(room, match, userId) {
    const duo = match.duoOf(userId);
    if (duo && duo.status === 'racing') return duo.teamId;
    const watch = room.members.get(userId)?.watch;
    if (watch !== null && watch !== undefined && match.duos.some((d) => d.teamId === watch)) return watch;
    return duo?.teamId ?? match.duos[0]?.teamId ?? null;
  }

  /** Eventos: los públicos a todos; los privados a quien está viendo ese dúo (sus jugadores o quien lo mira). */
  _sendEvents(room, match, events) {
    const pub = events.filter((e) => !e.private);
    const priv = new Map();
    for (const e of events) {
      if (!e.private) continue;
      const { private: _p, ...ev } = e;
      if (!priv.has(e.duo)) priv.set(e.duo, []);
      priv.get(e.duo).push(ev);
    }
    const pubRaw = pub.length ? JSON.stringify({ t: 'match:events', d: { events: pub } }) : null;
    for (const userId of room.memberIds()) {
      const team = this._viewTeam(room, match, userId);
      const mine = team !== null ? priv.get(team) : null;
      if (mine?.length) {
        const all = [...pub, ...mine].sort((a, b) => a.t - b.t);
        this.hub.sendTo(userId, 'match:events', { events: all });
      } else if (pubRaw) this.hub.get(userId)?.sendRaw(pubRaw);
    }
  }

  // ------------------------------------------------------------------ util

  _destroy(room) {
    if (room.match && room.match.state !== 'ended') {
      this.matches.delete(room.match);
      room.match.onEnd = () => {};
      room.match.abort();
    }
    const ids = room.memberIds();
    for (const id of ids) this.userRoom.delete(id);
    this.rooms.delete(room.code);
    this.onPresence(ids);
    this.onRoomClosed(room.code);
    this.log.info?.({ code: room.code }, 'room destroyed');
  }

  _changed(room) {
    this._toRoom(room, 'room:state', room.toJSON());
    this.onPresence(room.memberIds());
  }

  _toRoom(room, t, d, opts) {
    this.hub.broadcast(room.memberIds(), t, d, opts);
  }

  _later(fn, ms) {
    const h = setTimeout(() => {
      this._timeouts.delete(h);
      fn();
    }, ms);
    h.unref?.();
    this._timeouts.add(h);
  }

  close() {
    this._stopTicker();
    this.matchmaker.close();
    for (const h of this._grace.values()) clearTimeout(h);
    this._grace.clear();
    for (const h of this._timeouts) clearTimeout(h);
    this._timeouts.clear();
    for (const m of this.matches.keys()) {
      m.onEnd = () => {};
      m.abort();
    }
    this.matches.clear();
  }
}

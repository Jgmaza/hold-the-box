// Sala (lobby). Sin I/O: RoomManager decide a quién avisar.
//
// state: 'lobby' → 'countdown' → 'playing' → 'results' → 'lobby'
// teams: maxDuos dúos, cada uno con slots { 1: userId|null, 2: userId|null }.
// Un miembro puede ocupar 1 slot o los 2 del mismo dúo (dúo de sofá: dos jugadores en un teclado).
// Sin slot = espectador (role 'spectator'): no ocupa capacidad de jugadores; tope `maxSpectators`.
import { AppError, ERR } from '../errors.js';
import { DEFAULT_CHARS } from '../game/index.js';

export class Room {
  constructor({ code, host, level, maxDuos, isPrivate, boxProfile, maxSpectators = 8, auto = false }) {
    this.maxSpectators = maxSpectators;
    this.code = code;
    this.hostId = host?.id ?? null; // null en salas automáticas (sin host humano)
    this.auto = auto;
    this.autoStartAt = null; // timestamp en que arranca sola (salas auto)
    this.level = level;
    this.boxProfile = boxProfile;
    this.isPrivate = isPrivate;
    this.state = 'lobby';
    this.createdAt = Date.now();
    // userId → { userId, name, ready, teamId, slots, chars, joinedAt, online, offlineSince, abandoned, watch }
    this.members = new Map();
    this.teams = [];
    this._resizeTeams(maxDuos);
    this.match = null;
    this.lastResults = null;
    if (host) this.addMember(host);
  }

  get maxDuos() {
    return this.teams.length;
  }

  get capacity() {
    return this.teams.length * 2;
  }

  _resizeTeams(n) {
    while (this.teams.length < n) this.teams.push({ id: this.teams.length, slots: { 1: null, 2: null } });
    if (this.teams.length > n) this.teams.length = n;
  }

  _freeSlots() {
    let n = 0;
    for (const t of this.teams) for (const s of [1, 2]) if (!t.slots[s]) n++;
    return n;
  }

  isHost(userId) {
    return this.hostId === userId;
  }

  _requireLobby() {
    if (this.state !== 'lobby') throw new AppError(ERR.ROOM_IN_GAME, 'la sala está en partida');
  }

  _requireHost(userId) {
    if (!this.isHost(userId)) throw new AppError(ERR.NOT_HOST, 'solo el anfitrión puede hacer eso');
  }

  spectators() {
    return [...this.members.values()].filter((m) => !m.slots.length);
  }

  _requireSpectatorRoom() {
    if (this.spectators().length >= this.maxSpectators) throw new AppError(ERR.ROOM_FULL, 'no caben más espectadores');
  }

  /**
   * Entra a la sala. Jugador (por defecto): solo en lobby, y se sienta en el primer hueco (primero completa dúos a
   * medias). Espectador (`spectate`): en cualquier estado, sin sentarse.
   */
  _makeMember(user) {
    // chars: { p1, p2 } igual que el menú. p1 = tu personaje (el de tu slot); p2 = el del 2.º slot si eres dúo de sofá.
    return {
      userId: user.id,
      name: user.name,
      ready: false,
      teamId: null,
      slots: [],
      chars: { p1: null, p2: null },
      joinedAt: Date.now(),
      online: true,
      offlineSince: null,
      abandoned: false, // se fue en partida y no volvió a tiempo
      watch: null, // dúo que mira (espectadores y jugadores que ya terminaron)
    };
  }

  /** Miembro sin sentar (salas automáticas: el matchmaker decide el puesto justo después). */
  addAutoMember(user) {
    if (this.members.has(user.id)) return this.members.get(user.id);
    const m = this._makeMember(user);
    this.members.set(user.id, m);
    return m;
  }

  addMember(user, { spectate = false } = {}) {
    if (this.members.has(user.id)) return this.members.get(user.id);
    if (spectate) this._requireSpectatorRoom();
    else {
      this._requireLobby();
      if (this._freeSlots() === 0) throw new AppError(ERR.ROOM_FULL, 'la sala está llena');
    }
    const m = this._makeMember(user);
    this.members.set(user.id, m);
    if (spectate) return m;
    const half = this.teams.find((t) => (t.slots[1] ? 1 : 0) + (t.slots[2] ? 1 : 0) === 1);
    const target = half ?? this.teams.find((t) => !t.slots[1] && !t.slots[2]);
    if (target) this._seat(m, target, [target.slots[1] ? 2 : 1]);
    return m;
  }

  /** @returns {{ empty: boolean, hostChanged: boolean }} */
  removeMember(userId) {
    const m = this.members.get(userId);
    if (!m) return { empty: this.members.size === 0, hostChanged: false };
    this._unseat(m);
    this.members.delete(userId);
    let hostChanged = false;
    if (this.hostId === userId && this.members.size) {
      // El más antiguo hereda el anfitrión.
      this.hostId = [...this.members.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0].userId;
      hostChanged = true;
    }
    return { empty: this.members.size === 0, hostChanged };
  }

  _unseat(m) {
    if (m.teamId !== null) {
      const t = this.teams[m.teamId];
      for (const s of m.slots) if (t && t.slots[s] === m.userId) t.slots[s] = null;
    }
    m.teamId = null;
    m.slots = [];
  }

  _seat(m, team, slots) {
    this._unseat(m);
    for (const s of slots) team.slots[s] = m.userId;
    m.teamId = team.id;
    m.slots = [...slots].sort();
  }

  /** teamId null = levantarse y quedar como espectador. */
  setTeam(userId, teamId, slots) {
    this._requireLobby();
    const m = this.members.get(userId);
    if (!m) throw new AppError(ERR.NOT_IN_ROOM, 'no estás en la sala');
    if (teamId === null) {
      if (m.slots.length) this._requireSpectatorRoom();
      this._unseat(m);
      m.ready = false;
      return;
    }
    const team = this.teams[teamId];
    if (!team) throw new AppError(ERR.BAD_REQUEST, `el dúo ${teamId} no existe (máx ${this.maxDuos})`);
    for (const s of slots) {
      const owner = team.slots[s];
      if (owner && owner !== userId) throw new AppError(ERR.SLOT_TAKEN, `el puesto P${s} del dúo ${teamId} está ocupado`);
    }
    this._seat(m, team, slots);
    m.ready = false;
  }

  setChars(userId, { p1, p2 }) {
    this._requireLobby();
    const m = this.members.get(userId);
    if (!m) throw new AppError(ERR.NOT_IN_ROOM, 'no estás en la sala');
    if (p1 !== undefined) m.chars.p1 = p1;
    if (p2 !== undefined) m.chars.p2 = p2;
  }

  /** Personaje del slot `slot` de un dúo (sin escoger → el de siempre de ese slot). */
  charFor(m, slot) {
    const own = m.slots.length === 2 && slot === 2 ? m.chars.p2 : m.chars.p1;
    return own ?? DEFAULT_CHARS[`p${slot}`];
  }

  setReady(userId, ready) {
    this._requireLobby();
    const m = this.members.get(userId);
    if (!m) throw new AppError(ERR.NOT_IN_ROOM, 'no estás en la sala');
    m.ready = ready;
  }

  updateSettings(userId, { level, maxDuos, isPrivate, boxProfile }) {
    this._requireLobby();
    this._requireHost(userId);
    if (maxDuos !== undefined) {
      const used = this.teams.findIndex((t, i) => i >= maxDuos && (t.slots[1] || t.slots[2]));
      if (used !== -1) throw new AppError(ERR.BAD_REQUEST, `el dúo ${used} está ocupado: no se puede bajar a ${maxDuos}`);
      this._resizeTeams(maxDuos);
    }
    if (level !== undefined) this.level = level;
    if (isPrivate !== undefined) this.isPrivate = isPrivate;
    if (boxProfile !== undefined) this.boxProfile = boxProfile;
    for (const m of this.members.values()) m.ready = false;
  }

  kick(byId, userId) {
    this._requireHost(byId);
    if (byId === userId) throw new AppError(ERR.BAD_REQUEST, 'no te puedes echar a ti mismo');
    if (!this.members.has(userId)) throw new AppError(ERR.NOT_IN_ROOM, 'ese jugador no está en la sala');
    return this.removeMember(userId);
  }

  /** Dúos que van a jugar: ocupados y completos. Lanza si no se puede empezar. */
  startableTeams(byId) {
    this._requireLobby();
    this._requireHost(byId);
    const used = this.teams.filter((t) => t.slots[1] || t.slots[2]);
    if (!used.length) throw new AppError(ERR.CANNOT_START, 'no hay dúos');
    const half = used.find((t) => !t.slots[1] || !t.slots[2]);
    if (half) throw new AppError(ERR.CANNOT_START, `al dúo ${half.id} le falta un jugador`);
    const notReady = [...this.members.values()].find((m) => m.slots.length && !m.ready && m.userId !== byId);
    if (notReady) throw new AppError(ERR.CANNOT_START, `${notReady.name} no está listo`);
    return this._teamRows(used);
  }

  /** Dúos completos para arrancar una sala automática (sin host ni "listo"). `null` si no hay ninguno. */
  autoStartTeams() {
    const used = this.teams.filter((t) => t.slots[1] && t.slots[2]);
    return used.length ? this._teamRows(used) : null;
  }

  _teamRows(used) {
    return used.map((t) => {
      const m1 = this.members.get(t.slots[1]);
      const m2 = this.members.get(t.slots[2]);
      const c1 = this.charFor(m1, 1);
      const c2 = this.charFor(m2, 2);
      return {
        teamId: t.id,
        players: {
          1: { userId: m1.userId, name: m1.name, char: c1, alt: false },
          // Mismo personaje que P1 → P2 con colores alternos (como usesAlt en el juego local).
          2: { userId: m2.userId, name: m2.name, char: c2, alt: c1 === c2 },
        },
      };
    });
  }

  backToLobby() {
    this.state = 'lobby';
    this.match = null;
    for (const m of this.members.values()) m.ready = false;
  }

  memberIds() {
    return [...this.members.keys()];
  }

  /** Estado público (S → C `room:state`). */
  toJSON() {
    return {
      code: this.code,
      hostId: this.hostId,
      state: this.state,
      auto: this.auto,
      autoStartAt: this.autoStartAt,
      level: this.level,
      boxProfile: this.boxProfile,
      isPrivate: this.isPrivate,
      maxDuos: this.maxDuos,
      members: [...this.members.values()].map(({ joinedAt, offlineSince, ...m }) => ({ ...m, role: m.slots.length ? 'player' : 'spectator' })),
      teams: this.teams.map((t) => ({ id: t.id, slots: { 1: t.slots[1], 2: t.slots[2] } })),
      matchId: this.match?.id ?? null,
      lastResults: this.lastResults,
    };
  }

  /** Resumen para la lista de salas públicas. */
  summary() {
    return {
      code: this.code,
      state: this.state,
      level: this.level,
      boxProfile: this.boxProfile,
      players: this.members.size - this.spectators().length,
      spectators: this.spectators().length,
      capacity: this.capacity,
      maxDuos: this.maxDuos,
      host: this.members.get(this.hostId)?.name ?? null,
    };
  }
}

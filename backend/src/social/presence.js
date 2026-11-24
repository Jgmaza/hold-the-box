// Presencia de amigos (SDD §5.3): offline (sin clave) · online · in_lobby (lobby/results) · in_match (countdown/playing).
// El estado se DERIVA de dos fuentes: ¿conectado? (hub) y ¿en qué sala? (rooms). Quien sabe que algo cambió llama
// touch(userIds); el servicio recalcula, y solo si cambió escribe en el almacén y avisa a los amigos conectados.
// touch() nunca hace I/O en el momento: se procesa en setImmediate (fuera del tick de partida).

const IN_MATCH = new Set(['countdown', 'playing']);

/** Redis: hash `presence:{userId}` { status, roomCode, updatedAt } con TTL (el cliente ya pone el prefijo htb:). */
export class RedisPresenceStore {
  constructor(redis, ttlSec) {
    this.redis = redis;
    this.ttlSec = ttlSec;
  }

  async set(userId, { status, roomCode }) {
    const key = `presence:${userId}`;
    await this.redis
      .multi()
      .hset(key, { status, roomCode: roomCode ?? '', updatedAt: Date.now() })
      .expire(key, this.ttlSec)
      .exec();
  }

  async clear(userId) {
    await this.redis.del(`presence:${userId}`);
  }

  async refresh(userIds) {
    if (!userIds.length) return;
    const p = this.redis.pipeline();
    for (const id of userIds) p.expire(`presence:${id}`, this.ttlSec);
    await p.exec();
  }

  /** @returns {Promise<Map<string, { status, roomCode: string|null, updatedAt: number }>>} solo los que no están offline */
  async getMany(userIds) {
    const out = new Map();
    if (!userIds.length) return out;
    const p = this.redis.pipeline();
    for (const id of userIds) p.hgetall(`presence:${id}`);
    const res = await p.exec();
    res.forEach(([err, h], i) => {
      if (!err && h?.status) out.set(userIds[i], { status: h.status, roomCode: h.roomCode || null, updatedAt: Number(h.updatedAt) });
    });
    return out;
  }
}

/** Sin Redis: misma interfaz, en memoria y con el mismo TTL. */
export class MemoryPresenceStore {
  constructor(ttlSec, now = () => Date.now()) {
    this.ttlMs = ttlSec * 1000;
    this.now = now;
    this.map = new Map(); // userId → { status, roomCode, updatedAt, expiresAt }
  }

  async set(userId, { status, roomCode }) {
    const t = this.now();
    this.map.set(userId, { status, roomCode: roomCode ?? null, updatedAt: t, expiresAt: t + this.ttlMs });
  }

  async clear(userId) {
    this.map.delete(userId);
  }

  async refresh(userIds) {
    const t = this.now();
    for (const id of userIds) {
      const p = this.map.get(id);
      if (p) p.expiresAt = t + this.ttlMs;
    }
  }

  async getMany(userIds) {
    const out = new Map();
    const t = this.now();
    for (const id of userIds) {
      const p = this.map.get(id);
      if (p && p.expiresAt > t) out.set(id, { status: p.status, roomCode: p.roomCode, updatedAt: p.updatedAt });
    }
    return out;
  }
}

export class PresenceService {
  /**
   * @param {{ store: RedisPresenceStore|MemoryPresenceStore, hub: import('../ws/hub.js').Hub,
   *           rooms: import('../rooms/roomManager.js').RoomManager, friendsRepo: { listFriends(id): Promise<{user}[]> },
   *           logger?: object }} deps
   */
  constructor({ store, hub, rooms, friendsRepo, logger }) {
    this.store = store;
    this.hub = hub;
    this.rooms = rooms;
    this.friendsRepo = friendsRepo;
    this.log = logger ?? console;
    this.last = new Map(); // userId → "status|roomCode" publicado (ausente = offline)
    this.pending = new Set();
    this._scheduled = null;
    this._flushing = Promise.resolve();
  }

  /** Estado actual según hub + salas. Los invitados no tienen amigos: no se publica nada de ellos. */
  compute(userId) {
    const conn = this.hub.get(userId);
    if (!conn || conn.user?.guest) return { status: 'offline', roomCode: null };
    const room = this.rooms.roomOf(userId);
    if (!room) return { status: 'online', roomCode: null };
    return { status: IN_MATCH.has(room.state) ? 'in_match' : 'in_lobby', roomCode: room.code };
  }

  /** Marca usuarios para recalcular. Sin I/O aquí. */
  touch(userIds) {
    for (const id of userIds) this.pending.add(id);
    this._scheduled ??= setImmediate(() => {
      this._scheduled = null;
      this._flushing = this._flushing.then(() => this._flush());
    });
  }

  /** Espera a que se procese todo lo pendiente (tests y cierre). */
  async settle() {
    while (this._scheduled || this.pending.size) {
      await new Promise((r) => setImmediate(r));
      await this._flushing;
    }
    await this._flushing;
  }

  async _flush() {
    const ids = [...this.pending];
    this.pending.clear();
    await Promise.all(ids.map((id) => this._publish(id)));
  }

  async _publish(userId) {
    const p = this.compute(userId);
    const key = p.status === 'offline' ? undefined : `${p.status}|${p.roomCode ?? ''}`;
    if (key === this.last.get(userId)) return;
    if (key) this.last.set(userId, key);
    else this.last.delete(userId);
    try {
      await (key ? this.store.set(userId, p) : this.store.clear(userId));
      const friends = await this.friendsRepo.listFriends(userId);
      const d = { userId, status: p.status, ...(p.roomCode ? { roomCode: p.roomCode } : {}) };
      for (const { user } of friends) if (this.hub.isOnline(user.id)) this.hub.sendTo(user.id, 'friend:presence', d);
    } catch (err) {
      this.log.warn?.({ err, userId }, 'presence: no se pudo publicar');
    }
  }

  /** Heartbeat del gateway: renueva el TTL de los que tienen presencia publicada. */
  async heartbeat() {
    try {
      await this.store.refresh([...this.last.keys()]);
    } catch (err) {
      this.log.warn?.({ err }, 'presence: no se pudo renovar el TTL');
    }
  }

  /** Para GET /friends: `{ status, roomCode? }` por id (offline si no hay clave). */
  async getMany(userIds) {
    let found = new Map();
    try {
      found = await this.store.getMany(userIds);
    } catch (err) {
      this.log.warn?.({ err }, 'presence: no se pudo leer');
    }
    const out = new Map();
    for (const id of userIds) {
      const p = found.get(id);
      out.set(id, p ? { status: p.status, ...(p.roomCode ? { roomCode: p.roomCode } : {}) } : { status: 'offline' });
    }
    return out;
  }
}

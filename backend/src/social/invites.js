// Invitar amigos a la sala y unirse a la de un amigo (docs/PROTOCOL.md). Invitación =
//   { id, fromId, fromName, toId, roomCode, level, createdAt, expiresAt }  (ms epoch), vive inviteTtlSec (120 s).
import { randomUUID } from 'node:crypto';
import { AppError, ERR } from '../errors.js';

const expired = () => new AppError(ERR.INVITE_EXPIRED, 'la invitación ya no está vigente', 410);

/** Redis (SDD §5.3): invite:{id} hash · invites:to:{userId} zset por expiresAt · invites:room:{code} set · rl:invite:{userId}. */
export class RedisInviteStore {
  constructor(redis) {
    this.redis = redis;
  }

  async create(inv, ttlSec) {
    await this.redis
      .multi()
      .hset(`invite:${inv.id}`, inv)
      .expire(`invite:${inv.id}`, ttlSec)
      .zadd(`invites:to:${inv.toId}`, inv.expiresAt, inv.id)
      .expire(`invites:to:${inv.toId}`, ttlSec)
      .sadd(`invites:room:${inv.roomCode}`, inv.id)
      .expire(`invites:room:${inv.roomCode}`, ttlSec)
      .exec();
  }

  async _load(ids) {
    if (!ids.length) return [];
    const p = this.redis.pipeline();
    for (const id of ids) p.hgetall(`invite:${id}`);
    const now = Date.now();
    return (await p.exec())
      .map(([err, h]) => (!err && h?.id ? { ...h, createdAt: Number(h.createdAt), expiresAt: Number(h.expiresAt) } : null))
      .filter((inv) => inv && inv.expiresAt > now);
  }

  async get(id) {
    return (await this._load([id]))[0] ?? null;
  }

  async delete(inv) {
    await this.redis
      .multi()
      .del(`invite:${inv.id}`)
      .zrem(`invites:to:${inv.toId}`, inv.id)
      .srem(`invites:room:${inv.roomCode}`, inv.id)
      .exec();
  }

  async listFor(toId) {
    const key = `invites:to:${toId}`;
    await this.redis.zremrangebyscore(key, 0, Date.now());
    return this._load(await this.redis.zrange(key, 0, -1));
  }

  async byRoom(code) {
    return this._load(await this.redis.smembers(`invites:room:${code}`));
  }

  /** true si `userId` aún tiene cupo en la ventana. */
  async hit(userId, limit, windowSec) {
    const key = `rl:invite:${userId}`;
    const [[, n]] = await this.redis.multi().incr(key).expire(key, windowSec, 'NX').exec();
    return n <= limit;
  }
}

/** Sin Redis: mapas en memoria; lo vencido se ignora al leer. */
export class MemoryInviteStore {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.invites = new Map();
    this.rate = new Map(); // userId → { n, resetAt }
  }

  _alive(inv) {
    return inv && inv.expiresAt > this.now() ? { ...inv } : null;
  }

  async create(inv) {
    this.invites.set(inv.id, { ...inv });
  }

  async get(id) {
    return this._alive(this.invites.get(id));
  }

  async delete(inv) {
    this.invites.delete(inv.id);
  }

  async listFor(toId) {
    return [...this.invites.values()].filter((i) => i.toId === toId).map((i) => this._alive(i)).filter(Boolean);
  }

  async byRoom(code) {
    return [...this.invites.values()].filter((i) => i.roomCode === code).map((i) => this._alive(i)).filter(Boolean);
  }

  async hit(userId, limit, windowSec) {
    const t = this.now();
    let r = this.rate.get(userId);
    if (!r || r.resetAt <= t) this.rate.set(userId, (r = { n: 0, resetAt: t + windowSec * 1000 }));
    return ++r.n <= limit;
  }
}

export class InviteService {
  /**
   * @param {{ store: RedisInviteStore|MemoryInviteStore, hub, rooms, friendsRepo, presence, env, logger? }} deps
   */
  constructor({ store, hub, rooms, friendsRepo, presence, env, logger }) {
    this.store = store;
    this.hub = hub;
    this.rooms = rooms;
    this.friendsRepo = friendsRepo;
    this.presence = presence;
    this.env = env;
    this.log = logger ?? console;
  }

  static toPublic(inv) {
    return {
      inviteId: inv.id,
      from: { id: inv.fromId, displayName: inv.fromName },
      roomCode: inv.roomCode,
      level: inv.level,
      expiresAt: inv.expiresAt,
    };
  }

  /**
   * `from` invita a `toId` a la sala en la que está. Si ya hay una vigente igual, la devuelve.
   * @param {{ id, name }} from
   * @param {string} [roomCode]  si se pasa (REST), `from` tiene que estar en esa sala
   */
  async invite(from, toId, roomCode) {
    const room = this.rooms.roomOf(from.id);
    if (!room || (roomCode && room.code !== roomCode)) throw new AppError(ERR.NOT_IN_ROOM, 'no estás en esa sala', 409);
    if (!(await this.friendsRepo.areFriends(from.id, toId))) throw new AppError(ERR.NOT_FRIENDS, 'solo puedes invitar a tus amigos', 403);
    if (room.members.has(toId)) throw new AppError(ERR.ALREADY_IN_ROOM, 'ya está en tu sala', 409);
    if (room.state !== 'lobby') throw new AppError(ERR.ROOM_IN_GAME, 'la sala está en partida', 409);
    if (room._freeSlots() === 0) throw new AppError(ERR.ROOM_FULL, 'la sala está llena', 409);

    const existing = (await this.store.listFor(toId)).find((i) => i.fromId === from.id && i.roomCode === room.code);
    if (existing) return InviteService.toPublic(existing);
    if (!(await this.store.hit(from.id, this.env.invitesPerMinute, 60))) {
      throw new AppError(ERR.RATE_LIMITED, 'demasiadas invitaciones: espera un minuto', 429);
    }

    const now = Date.now();
    const inv = {
      id: randomUUID(),
      fromId: from.id,
      fromName: from.name,
      toId,
      roomCode: room.code,
      level: room.level,
      createdAt: now,
      expiresAt: now + this.env.inviteTtlSec * 1000,
    };
    await this.store.create(inv, this.env.inviteTtlSec);
    const pub = InviteService.toPublic(inv);
    this.hub.sendTo(toId, 'invite:received', pub);
    return pub;
  }

  async list(userId) {
    return (await this.store.listFor(userId)).sort((a, b) => a.createdAt - b.createdAt).map(InviteService.toPublic);
  }

  /** `user` acepta: entra a la sala (rooms.join valida lleno / en partida). */
  async accept(user, inviteId) {
    const inv = await this.store.get(inviteId);
    if (!inv || inv.toId !== user.id) throw expired();
    const res = this._join(user, inv.roomCode);
    await this.store.delete(inv);
    return res;
  }

  async decline(user, inviteId) {
    const inv = await this.store.get(inviteId);
    if (!inv || inv.toId !== user.id) throw expired();
    await this.store.delete(inv);
    this.hub.sendTo(inv.fromId, 'invite:declined', { inviteId: inv.id, userId: user.id });
  }

  /** Unirse a la sala de un amigo que está en un lobby. */
  async joinFriend(user, friendId) {
    if (!(await this.friendsRepo.areFriends(user.id, friendId))) throw new AppError(ERR.NOT_FRIENDS, 'no son amigos', 403);
    const p = this.presence.compute(friendId);
    if (p.status !== 'in_lobby') throw new AppError(ERR.FRIEND_NOT_IN_LOBBY, 'tu amigo no está esperando en una sala', 409);
    return this._join(user, p.roomCode);
  }

  /** La sala empezó o se destruyó: avisa a los invitados y borra sus invitaciones. Sin await en quien llama. */
  cancelRoom(code) {
    Promise.resolve()
      .then(async () => {
        for (const inv of await this.store.byRoom(code)) {
          await this.store.delete(inv);
          this.hub.sendTo(inv.toId, 'invite:cancelled', { inviteId: inv.id });
        }
      })
      .catch((err) => this.log.warn?.({ err, code }, 'invites: no se pudo cancelar'));
  }

  _join(user, code) {
    const res = this.rooms.join(user, code);
    // Sin WebSocket abierto (REST) entra como desconectado: corre la gracia de reconexión y sale si no conecta.
    if (!this.hub.isOnline(user.id)) this.rooms.onDisconnect(user.id);
    return res;
  }

  /** Handlers para attachGateway({ handlers }). */
  wsHandlers() {
    return {
      'room:invite': (conn, d) => this.invite(conn.user, d.userId).then(({ inviteId, expiresAt }) => ({ inviteId, expiresAt })),
      'invite:accept': (conn, d) => this.accept(conn.user, d.inviteId),
      'invite:decline': (conn, d) => this.decline(conn.user, d.inviteId).then(() => ({})),
    };
  }
}

// Amigos y solicitudes. Dos implementaciones con el mismo contrato:
//   searchUsers(meId, prefix, limit) → PublicUser[]           (solo cuentas, sin mí, por prefijo de username)
//   relations(meId, ids) → { friends: Set, pendingIn: Set, pendingOut: Set }   (de esos ids)
//   listFriends(meId) → [{ user: PublicUser, since }]
//   listPending(meId) → [{ id, from: PublicUser, to: PublicUser, createdAt }]
//   findRequest(id) → { id, fromId, toId, status, createdAt } | null
//   findPendingBetween(a, b) → igual | null   (en cualquier dirección)
//   areFriends(a, b) → boolean
//   createRequest(fromId, toId) → { id, createdAt } · REQUEST_PENDING si ya hay una pendiente
//   acceptRequest(id) → since | null          (null si ya no estaba pendiente)
//   closeRequest(id, 'declined'|'cancelled') → boolean
//   removeFriendship(a, b) → boolean
// PublicUser = { id, username, displayName }. Fechas en ISO.
import { randomUUID } from 'node:crypto';
import { aliasedTable, and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { friendRequests, friendships, users } from '../db/schema.js';
import { AppError, ERR } from '../errors.js';

/** Una amistad se guarda una sola vez, con user_a < user_b. */
export const pair = (a, b) => (a < b ? [a, b] : [b, a]);

const pendingTaken = () => new AppError(ERR.REQUEST_PENDING, 'ya hay una solicitud pendiente', 409);
const iso = (d) => (d instanceof Date ? d.toISOString() : d);

export class PgFriendsRepo {
  /** @param {import('drizzle-orm/node-postgres').NodePgDatabase} db */
  constructor(db) {
    this.db = db;
  }

  async searchUsers(meId, prefix, limit) {
    const escaped = prefix.replace(/[\\%_]/g, '\\$&');
    return this.db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(and(sql`${users.username} like ${`${escaped}%`}`, ne(users.id, meId), eq(users.isGuest, false)))
      .orderBy(asc(users.username))
      .limit(limit);
  }

  async relations(meId, ids) {
    const out = { friends: new Set(), pendingIn: new Set(), pendingOut: new Set() };
    if (!ids.length) return out;
    const [fr, req] = await Promise.all([
      this.db
        .select()
        .from(friendships)
        .where(
          or(
            and(eq(friendships.userA, meId), inArray(friendships.userB, ids)),
            and(eq(friendships.userB, meId), inArray(friendships.userA, ids)),
          ),
        ),
      this.db
        .select({ fromId: friendRequests.fromUserId, toId: friendRequests.toUserId })
        .from(friendRequests)
        .where(
          and(
            eq(friendRequests.status, 'pending'),
            or(
              and(eq(friendRequests.fromUserId, meId), inArray(friendRequests.toUserId, ids)),
              and(eq(friendRequests.toUserId, meId), inArray(friendRequests.fromUserId, ids)),
            ),
          ),
        ),
    ]);
    for (const f of fr) out.friends.add(f.userA === meId ? f.userB : f.userA);
    for (const r of req) (r.fromId === meId ? out.pendingOut : out.pendingIn).add(r.fromId === meId ? r.toId : r.fromId);
    return out;
  }

  async listFriends(meId) {
    const rows = await this.db
      .select({ id: users.id, username: users.username, displayName: users.displayName, since: friendships.createdAt })
      .from(friendships)
      .innerJoin(
        users,
        sql`${users.id} = case when ${friendships.userA} = ${meId} then ${friendships.userB} else ${friendships.userA} end`,
      )
      .where(or(eq(friendships.userA, meId), eq(friendships.userB, meId)))
      .orderBy(asc(users.displayName));
    return rows.map(({ since, ...user }) => ({ user, since: iso(since) }));
  }

  async listPending(meId) {
    const from = aliasedTable(users, 'from_user');
    const to = aliasedTable(users, 'to_user');
    const rows = await this.db
      .select({
        id: friendRequests.id,
        createdAt: friendRequests.createdAt,
        from: { id: from.id, username: from.username, displayName: from.displayName },
        to: { id: to.id, username: to.username, displayName: to.displayName },
      })
      .from(friendRequests)
      .innerJoin(from, eq(from.id, friendRequests.fromUserId))
      .innerJoin(to, eq(to.id, friendRequests.toUserId))
      .where(
        and(eq(friendRequests.status, 'pending'), or(eq(friendRequests.fromUserId, meId), eq(friendRequests.toUserId, meId))),
      )
      .orderBy(asc(friendRequests.createdAt));
    return rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) }));
  }

  _requestCols() {
    return {
      id: friendRequests.id,
      fromId: friendRequests.fromUserId,
      toId: friendRequests.toUserId,
      status: friendRequests.status,
      createdAt: friendRequests.createdAt,
    };
  }

  async findRequest(id) {
    const [r] = await this.db.select(this._requestCols()).from(friendRequests).where(eq(friendRequests.id, id));
    return r ? { ...r, createdAt: iso(r.createdAt) } : null;
  }

  async findPendingBetween(a, b) {
    const [r] = await this.db
      .select(this._requestCols())
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.status, 'pending'),
          or(
            and(eq(friendRequests.fromUserId, a), eq(friendRequests.toUserId, b)),
            and(eq(friendRequests.fromUserId, b), eq(friendRequests.toUserId, a)),
          ),
        ),
      );
    return r ? { ...r, createdAt: iso(r.createdAt) } : null;
  }

  async areFriends(a, b) {
    const [x, y] = pair(a, b);
    const rows = await this.db
      .select({ a: friendships.userA })
      .from(friendships)
      .where(and(eq(friendships.userA, x), eq(friendships.userB, y)));
    return rows.length > 0;
  }

  async createRequest(fromId, toId) {
    try {
      const [r] = await this.db
        .insert(friendRequests)
        .values({ fromUserId: fromId, toUserId: toId })
        .returning({ id: friendRequests.id, createdAt: friendRequests.createdAt });
      return { ...r, createdAt: iso(r.createdAt) };
    } catch (err) {
      if ((err.cause ?? err).constraint === 'friend_requests_pending_uq') throw pendingTaken();
      throw err;
    }
  }

  async acceptRequest(id) {
    return this.db.transaction(async (tx) => {
      const [r] = await tx
        .update(friendRequests)
        .set({ status: 'accepted', respondedAt: sql`now()` })
        .where(and(eq(friendRequests.id, id), eq(friendRequests.status, 'pending')))
        .returning({ fromId: friendRequests.fromUserId, toId: friendRequests.toUserId });
      if (!r) return null;
      const [userA, userB] = pair(r.fromId, r.toId);
      await tx.insert(friendships).values({ userA, userB }).onConflictDoNothing();
      const [f] = await tx
        .select({ since: friendships.createdAt })
        .from(friendships)
        .where(and(eq(friendships.userA, userA), eq(friendships.userB, userB)));
      return iso(f.since);
    });
  }

  async closeRequest(id, status) {
    const rows = await this.db
      .update(friendRequests)
      .set({ status, respondedAt: sql`now()` })
      .where(and(eq(friendRequests.id, id), eq(friendRequests.status, 'pending')))
      .returning({ id: friendRequests.id });
    return rows.length > 0;
  }

  async removeFriendship(a, b) {
    const [x, y] = pair(a, b);
    const rows = await this.db
      .delete(friendships)
      .where(and(eq(friendships.userA, x), eq(friendships.userB, y)))
      .returning({ a: friendships.userA });
    return rows.length > 0;
  }
}

/** Sin BD: lee los usuarios de un MemoryUserRepo. */
export class MemoryFriendsRepo {
  /** @param {import('../users/memoryUserRepo.js').MemoryUserRepo} userRepo */
  constructor(userRepo) {
    this.userRepo = userRepo;
    this.requests = new Map(); // id → { id, fromId, toId, status, createdAt }
    this.friendships = new Map(); // `${a}:${b}` (a < b) → since
  }

  _user(id) {
    const u = this.userRepo.users.get(id);
    return u && { id: u.id, username: u.username, displayName: u.displayName };
  }

  _key(a, b) {
    return pair(a, b).join(':');
  }

  async searchUsers(meId, prefix, limit) {
    return [...this.userRepo.users.values()]
      .filter((u) => !u.isGuest && u.id !== meId && u.username?.startsWith(prefix))
      .sort((a, b) => a.username.localeCompare(b.username))
      .slice(0, limit)
      .map((u) => this._user(u.id));
  }

  async relations(meId, ids) {
    const out = { friends: new Set(), pendingIn: new Set(), pendingOut: new Set() };
    for (const id of ids) {
      if (this.friendships.has(this._key(meId, id))) out.friends.add(id);
      const p = this._pendingBetween(meId, id);
      if (p) (p.fromId === meId ? out.pendingOut : out.pendingIn).add(id);
    }
    return out;
  }

  async listFriends(meId) {
    const out = [];
    for (const [key, since] of this.friendships) {
      const [a, b] = key.split(':');
      if (a === meId || b === meId) out.push({ user: this._user(a === meId ? b : a), since });
    }
    return out.sort((x, y) => x.user.displayName.localeCompare(y.user.displayName));
  }

  async listPending(meId) {
    return [...this.requests.values()]
      .filter((r) => r.status === 'pending' && (r.fromId === meId || r.toId === meId))
      .map((r) => ({ id: r.id, from: this._user(r.fromId), to: this._user(r.toId), createdAt: r.createdAt }));
  }

  async findRequest(id) {
    const r = this.requests.get(id);
    return r ? { ...r } : null;
  }

  _pendingBetween(a, b) {
    for (const r of this.requests.values()) {
      if (r.status === 'pending' && ((r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a))) return { ...r };
    }
    return null;
  }

  async findPendingBetween(a, b) {
    return this._pendingBetween(a, b);
  }

  async areFriends(a, b) {
    return this.friendships.has(this._key(a, b));
  }

  async createRequest(fromId, toId) {
    // Comprobar y guardar sin await de por medio: hace de índice único.
    if (this._pendingBetween(fromId, toId)) throw pendingTaken();
    const r = { id: randomUUID(), fromId, toId, status: 'pending', createdAt: new Date().toISOString() };
    this.requests.set(r.id, r);
    return { id: r.id, createdAt: r.createdAt };
  }

  async acceptRequest(id) {
    const r = this.requests.get(id);
    if (r?.status !== 'pending') return null;
    r.status = 'accepted';
    const key = this._key(r.fromId, r.toId);
    if (!this.friendships.has(key)) this.friendships.set(key, new Date().toISOString());
    return this.friendships.get(key);
  }

  async closeRequest(id, status) {
    const r = this.requests.get(id);
    if (r?.status !== 'pending') return false;
    r.status = status;
    return true;
  }

  async removeFriendship(a, b) {
    return this.friendships.delete(this._key(a, b));
  }
}

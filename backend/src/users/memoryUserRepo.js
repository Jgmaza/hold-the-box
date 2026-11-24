// Repositorio de usuarios en memoria (sin DATABASE_URL). Mismo contrato que PgUserRepo:
//   createGuest(displayName) → User
//   createAccount({ username, passwordHash, displayName }) → User · USERNAME_TAKEN
//   findById(id) → User | null
//   findByUsername(username) → (User & { passwordHash }) | null
//   upgradeGuest(id, { username, passwordHash }) → User | null (null si no existe o ya es cuenta) · USERNAME_TAKEN
//   updateDisplayName(id, displayName) → User | null
//   touchLastSeen(id)
//   saveRefresh(userId, tokenHash, expiresAt)
//   consumeRefresh(tokenHash) → userId | null (lo revoca: un refresh sirve una sola vez)
//   revokeRefresh(userId, tokenHash)
// User = { id, username: string|null, displayName, isGuest, createdAt }  (username siempre en minúsculas)
import { randomUUID } from 'node:crypto';
import { AppError, ERR } from '../errors.js';

const taken = () => new AppError(ERR.USERNAME_TAKEN, 'ese usuario ya existe', 409);

export class MemoryUserRepo {
  constructor() {
    this.users = new Map(); // id → User & { passwordHash, lastSeenAt }
    this.refresh = new Map(); // tokenHash → { userId, expiresAt, revoked }
  }

  _public(u) {
    return u && { id: u.id, username: u.username, displayName: u.displayName, isGuest: u.isGuest, createdAt: u.createdAt };
  }

  _byUsername(username) {
    for (const u of this.users.values()) if (u.username === username) return u;
    return null;
  }

  async createGuest(displayName) {
    const user = { id: randomUUID(), username: null, displayName, isGuest: true, createdAt: new Date().toISOString(), passwordHash: null };
    this.users.set(user.id, user);
    return this._public(user);
  }

  async createAccount({ username, passwordHash, displayName }) {
    if (this._byUsername(username)) throw taken();
    const user = { id: randomUUID(), username, displayName, isGuest: false, createdAt: new Date().toISOString(), passwordHash };
    this.users.set(user.id, user);
    return this._public(user);
  }

  async findById(id) {
    return this._public(this.users.get(id)) ?? null;
  }

  async findByUsername(username) {
    const u = this._byUsername(username);
    return u ? { ...this._public(u), passwordHash: u.passwordHash } : null;
  }

  async upgradeGuest(id, { username, passwordHash }) {
    const u = this.users.get(id);
    if (!u?.isGuest) return null;
    if (this._byUsername(username)) throw taken();
    Object.assign(u, { username, passwordHash, isGuest: false });
    return this._public(u);
  }

  async updateDisplayName(id, displayName) {
    const u = this.users.get(id);
    if (!u) return null;
    u.displayName = displayName;
    return this._public(u);
  }

  async touchLastSeen(id) {
    const u = this.users.get(id);
    if (u) u.lastSeenAt = new Date().toISOString();
  }

  async saveRefresh(userId, tokenHash, expiresAt) {
    this.refresh.set(tokenHash, { userId, expiresAt, revoked: false });
  }

  async consumeRefresh(tokenHash) {
    const r = this.refresh.get(tokenHash);
    if (!r || r.revoked || r.expiresAt <= new Date()) return null;
    r.revoked = true;
    return r.userId;
  }

  async revokeRefresh(userId, tokenHash) {
    const r = this.refresh.get(tokenHash);
    if (r?.userId === userId) r.revoked = true;
  }
}

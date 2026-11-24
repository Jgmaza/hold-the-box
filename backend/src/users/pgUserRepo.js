// Repositorio de usuarios en PostgreSQL. Contrato en memoryUserRepo.js.
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { refreshTokens, users } from '../db/schema.js';
import { AppError, ERR } from '../errors.js';

const PUBLIC = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  isGuest: users.isGuest,
  createdAt: users.createdAt,
};

const toPublic = (row) => row && { ...row, createdAt: row.createdAt.toISOString() };

// Drizzle envuelve el error de pg en `cause`.
const isUsernameTaken = (err) => (err.cause ?? err).constraint === 'users_username_unique';

async function mapTaken(promise) {
  try {
    return await promise;
  } catch (err) {
    if (isUsernameTaken(err)) throw new AppError(ERR.USERNAME_TAKEN, 'ese usuario ya existe', 409);
    throw err;
  }
}

export class PgUserRepo {
  /** @param {import('drizzle-orm/node-postgres').NodePgDatabase} db */
  constructor(db) {
    this.db = db;
  }

  async createGuest(displayName) {
    const [row] = await this.db.insert(users).values({ displayName, isGuest: true }).returning(PUBLIC);
    return toPublic(row);
  }

  async createAccount({ username, passwordHash, displayName }) {
    const [row] = await mapTaken(
      this.db.insert(users).values({ username, passwordHash, displayName, isGuest: false }).returning(PUBLIC),
    );
    return toPublic(row);
  }

  async findById(id) {
    const [row] = await this.db.select(PUBLIC).from(users).where(eq(users.id, id));
    return toPublic(row) ?? null;
  }

  async findByUsername(username) {
    const [row] = await this.db
      .select({ ...PUBLIC, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.username, username));
    return toPublic(row) ?? null;
  }

  async upgradeGuest(id, { username, passwordHash }) {
    const [row] = await mapTaken(
      this.db
        .update(users)
        .set({ username, passwordHash, isGuest: false })
        .where(and(eq(users.id, id), eq(users.isGuest, true)))
        .returning(PUBLIC),
    );
    return toPublic(row) ?? null;
  }

  async updateDisplayName(id, displayName) {
    const [row] = await this.db.update(users).set({ displayName }).where(eq(users.id, id)).returning(PUBLIC);
    return toPublic(row) ?? null;
  }

  async touchLastSeen(id) {
    await this.db.update(users).set({ lastSeenAt: sql`now()` }).where(eq(users.id, id));
  }

  async saveRefresh(userId, tokenHash, expiresAt) {
    await this.db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
  }

  async consumeRefresh(tokenHash) {
    // Un solo UPDATE: dos peticiones simultáneas con el mismo token no pueden ganar las dos.
    const [row] = await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(
        and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, sql`now()`)),
      )
      .returning({ userId: refreshTokens.userId });
    return row?.userId ?? null;
  }

  async revokeRefresh(userId, tokenHash) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`now()` })
      .where(and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }
}

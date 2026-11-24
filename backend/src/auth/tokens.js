// Tokens: acceso JWT (cuentas 15 min, invitados 1 d) + refresh opaco de 32 bytes, del que solo se guarda el sha256.
import { createHash, randomBytes } from 'node:crypto';
import { AppError, ERR } from '../errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Payload del JWT: { sub: userId, name, guest }. El gateway WS lo lee así. */
export function tokenPayload(user) {
  return { sub: user.id, name: user.displayName, guest: user.isGuest };
}

export const hashRefresh = (token) => createHash('sha256').update(token).digest('hex');

/** Invitados: `{ token }`. Cuentas: `{ token, refreshToken }`. */
export async function issueTokens(app, { users, env }, user) {
  const expiresIn = user.isGuest ? env.guestJwtExpiresIn : env.jwtExpiresIn;
  const token = app.jwt.sign(tokenPayload(user), { expiresIn });
  if (user.isGuest) return { token };
  const refreshToken = randomBytes(32).toString('base64url');
  await users.saveRefresh(user.id, hashRefresh(refreshToken), new Date(Date.now() + env.refreshTtlDays * DAY_MS));
  return { token, refreshToken };
}

/** Canjea un refresh (que queda revocado) por un par nuevo. */
export async function rotateRefresh(app, deps, refreshToken) {
  const userId = await deps.users.consumeRefresh(hashRefresh(refreshToken));
  const user = userId && (await deps.users.findById(userId));
  if (!user || user.isGuest) throw new AppError(ERR.UNAUTHORIZED, 'refresh token inválido o vencido', 401);
  await deps.users.touchLastSeen(user.id);
  return issueTokens(app, deps, user);
}

export async function revokeRefresh({ users }, userId, refreshToken) {
  await users.revokeRefresh(userId, hashRefresh(refreshToken));
}

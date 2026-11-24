// Auth: invitados con apodo y cuentas con usuario + contraseña (docs/PROTOCOL.md §1).
//   POST /auth/guest     { nickname }                         → 201 { token, user }
//   POST /auth/register  { username, password, displayName? } → 201 { token, refreshToken, user }
//   POST /auth/login     { username, password }               → { token, refreshToken, user }
//   POST /auth/refresh   { refreshToken }                     → { token, refreshToken }   (rota)
//   POST /auth/logout 🔒 { refreshToken }                     → 204
//   POST /auth/upgrade 🔒 { username, password }              → { token, refreshToken, user }  (solo invitados, mismo id)
//   GET  /me 🔒 · PATCH /me 🔒 { displayName }                → { user }
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';
import { AppError, ERR, parse } from '../errors.js';
import { issueTokens, revokeRefresh, rotateRefresh } from './tokens.js';

export const nicknameSchema = z
  .string()
  .trim()
  .min(3)
  .max(16)
  .regex(/^[\p{L}\p{N}_ ]+$/u, 'solo letras, números, espacio y _');

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,16}$/, '3–16 letras minúsculas, números o _');

// 72: límite de bcrypt, por si algún día hay que cambiar de algoritmo.
const passwordSchema = z.string().min(8, 'mínimo 8 caracteres').max(72, 'máximo 72 caracteres');

const credentialsSchema = z.object({ username: usernameSchema, password: passwordSchema });

const invalidCredentials = () => new AppError(ERR.INVALID_CREDENTIALS, 'usuario o contraseña incorrectos', 401);

// Si el usuario no existe se verifica igual contra este hash: misma respuesta y mismo tiempo.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await hash('no-es-una-contraseña'));

export async function authRoutes(app, deps) {
  const { users, env } = deps;
  const auth = { preHandler: app.authenticate };

  // Todo /auth/* comparte UN cupo por IP, más estricto que el global (fuerza bruta de contraseñas, invitados en
  // masa). La config por ruta del plugin lleva un contador por ruta, por eso va a mano con createRateLimit.
  const checkAuthLimit = app.createRateLimit({
    max: env.authRateLimitMax,
    timeWindow: 60_000,
    keyGenerator: (req) => `auth:${req.ip}`,
  });
  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/auth/')) return;
    const l = await checkAuthLimit(req);
    if (!l.isAllowed && l.isExceeded) {
      throw new AppError(ERR.RATE_LIMITED, `demasiados intentos: reintenta en ${l.ttlInSeconds} s`, 429);
    }
  });

  /** Usuario del token, o 401 si ya no existe (p.ej. token de otro servidor). */
  async function currentUser(req) {
    const user = await users.findById(req.user.id);
    if (!user) throw new AppError(ERR.UNAUTHORIZED, 'el usuario ya no existe', 401);
    return user;
  }

  app.post('/auth/guest', async (req, reply) => {
    const { nickname } = parse(z.object({ nickname: nicknameSchema }), req.body);
    const user = await users.createGuest(nickname);
    const { token } = await issueTokens(app, deps, user);
    return reply.code(201).send({ token, user });
  });

  app.post('/auth/register', async (req, reply) => {
    const body = parse(credentialsSchema.extend({ displayName: nicknameSchema.optional() }), req.body);
    const user = await users.createAccount({
      username: body.username,
      passwordHash: await hash(body.password),
      displayName: body.displayName ?? body.username,
    });
    return reply.code(201).send({ ...(await issueTokens(app, deps, user)), user });
  });

  app.post('/auth/login', async (req) => {
    const { username, password } = parse(credentialsSchema, req.body);
    const found = await users.findByUsername(username);
    const ok = await verify(found?.passwordHash ?? (await getDummyHash()), password);
    if (!found?.passwordHash || !ok) throw invalidCredentials();
    const { passwordHash: _, ...user } = found;
    await users.touchLastSeen(user.id);
    return { ...(await issueTokens(app, deps, user)), user };
  });

  app.post('/auth/refresh', async (req) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string().min(1) }), req.body);
    return rotateRefresh(app, deps, refreshToken);
  });

  app.post('/auth/logout', auth, async (req, reply) => {
    const { refreshToken } = parse(z.object({ refreshToken: z.string().min(1) }), req.body);
    await revokeRefresh(deps, req.user.id, refreshToken);
    return reply.code(204).send();
  });

  app.post('/auth/upgrade', auth, async (req) => {
    const { username, password } = parse(credentialsSchema, req.body);
    const current = await currentUser(req);
    if (!current.isGuest) throw new AppError(ERR.BAD_REQUEST, 'ya tienes cuenta');
    const user = await users.upgradeGuest(current.id, { username, passwordHash: await hash(password) });
    if (!user) throw new AppError(ERR.BAD_REQUEST, 'ya tienes cuenta');
    return { ...(await issueTokens(app, deps, user)), user };
  });

  app.get('/me', auth, async (req) => ({ user: await currentUser(req) }));

  app.patch('/me', auth, async (req) => {
    const { displayName } = parse(z.object({ displayName: nicknameSchema }), req.body);
    const user = await users.updateDisplayName(req.user.id, displayName);
    if (!user) throw new AppError(ERR.UNAUTHORIZED, 'el usuario ya no existe', 401);
    return { user };
  });
}

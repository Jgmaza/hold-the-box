// Construye la app (REST + WebSocket) con todas sus dependencias. index.js solo la arranca.
// Tests: buildApp({ env: { port: 0, ... } }) y app.listen().
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { sql } from 'drizzle-orm';
import { authRoutes } from './auth/routes.js';
import { loadEnv } from './config/env.js';
import { createDb } from './db/client.js';
import { AppError, ERR } from './errors.js';
import { GAME_VERSION, LEVELS, BOX_CHOICES } from './game/index.js';
import { Metrics } from './metrics.js';
import { createRedis } from './redis.js';
import { RoomManager } from './rooms/roomManager.js';
import { MemoryFriendsRepo, PgFriendsRepo } from './social/friendsRepo.js';
import { friendsRoutes } from './social/friendsRoutes.js';
import { FriendsService } from './social/friendsService.js';
import { InviteService, MemoryInviteStore, RedisInviteStore } from './social/invites.js';
import { invitesRoutes } from './social/invitesRoutes.js';
import { historyRoutes } from './social/historyRoutes.js';
import { MemoryMatchHistory, PgMatchHistory, saveMatch } from './social/matchHistory.js';
import { MemoryPresenceStore, PresenceService, RedisPresenceStore } from './social/presence.js';
import { MemoryUserRepo } from './users/memoryUserRepo.js';
import { PgUserRepo } from './users/pgUserRepo.js';
import { attachGateway } from './ws/gateway.js';
import { Hub } from './ws/hub.js';
import { isLoopback } from './ws/rateLimit.js';

/** Nunca a los logs: contraseñas, tokens (también el `?token=` del WS) ni cabeceras de sesión. */
export const LOG_REDACT = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.token',
    '*.refreshToken',
    'password',
    'token',
    'refreshToken',
  ],
  censor: '[REDACTED]',
};

const redactUrl = (url) => (url ?? '').replace(/([?&](?:token|refreshToken)=)[^&]*/gi, '$1[REDACTED]');

/**
 * @param {{ env?: object, users?: object, logger?: object|false, logStream?: { write(s: string): void } }} [opts]
 *   logStream: manda los logs (con redacción) a ese stream, a nivel `debug` (tests de logs).
 */
export async function buildApp({ env: overrides = {}, users, logger, logStream } = {}) {
  const env = loadEnv(overrides);
  const logOptions = {
    level: logStream ? 'debug' : env.logLevel,
    redact: LOG_REDACT,
    serializers: {
      req: (req) => ({ method: req.method, url: redactUrl(req.url), remoteAddress: req.ip }),
    },
    ...(logStream ? { stream: logStream } : {}),
  };
  const app = Fastify({
    logger: logger ?? (env.nodeEnv === 'test' && !logStream ? false : logOptions),
    bodyLimit: 16 * 1024,
    trustProxy: env.trustProxy,
  });

  const db = env.databaseUrl ? createDb(env.databaseUrl, { logger: app.log }) : null;
  const deps = {
    env,
    db,
    redis: env.redisUrl ? createRedis(env.redisUrl, { logger: app.log }) : null,
    users: users ?? (db ? new PgUserRepo(db.db) : new MemoryUserRepo()),
    hub: new Hub(),
    metrics: new Metrics(),
  };
  const friendsRepo = db ? new PgFriendsRepo(db.db) : new MemoryFriendsRepo(deps.users);
  deps.history = db ? new PgMatchHistory(db.db) : new MemoryMatchHistory(deps.users);
  deps.rooms = new RoomManager({
    hub: deps.hub,
    env,
    logger: app.log,
    metrics: deps.metrics,
    // Corre fuera del tick; si falla (p. ej. Postgres caído) RoomManager lo registra y la sala sigue.
    onMatchEnd: (room, results) => saveMatch(deps.history, room, results),
    onPresence: (ids) => deps.presence.touch(ids),
    onRoomClosed: (code) => deps.invites.cancelRoom(code),
  });
  deps.presence = new PresenceService({
    store: deps.redis ? new RedisPresenceStore(deps.redis, env.presenceTtlSec) : new MemoryPresenceStore(env.presenceTtlSec),
    hub: deps.hub,
    rooms: deps.rooms,
    friendsRepo,
    logger: app.log,
  });
  deps.friends = new FriendsService({ repo: friendsRepo, users: deps.users, hub: deps.hub, presence: deps.presence });
  deps.invites = new InviteService({
    store: deps.redis ? new RedisInviteStore(deps.redis) : new MemoryInviteStore(),
    hub: deps.hub,
    rooms: deps.rooms,
    friendsRepo,
    presence: deps.presence,
    env,
    logger: app.log,
  });
  deps.handlers = deps.invites.wsHandlers();
  app.decorate('deps', deps);

  await app.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } });
  await app.register(cors, { origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()) });
  await app.register(jwt, { secret: env.jwtSecret, sign: { expiresIn: env.jwtExpiresIn } });
  await app.register(rateLimit, {
    global: true,
    max: env.rateLimitMax,
    timeWindow: 60_000,
    redis: deps.redis ?? undefined,
    nameSpace: env.rateLimitNamespace,
    skipOnError: true, // si Redis se cae, mejor dejar pasar que tumbar el API
    allowList: (req) => env.rateLimitSkipLocal && isLoopback(req.ip),
    errorResponseBuilder: (req, ctx) =>
      new AppError(ERR.RATE_LIMITED, `demasiadas peticiones: reintenta en ${ctx.after}`, 429),
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) return reply.code(err.status).send({ error: { code: err.code, message: err.message } });
    if (err.validation) return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: err.message } });
    // Errores de Fastify por culpa del cliente (JSON roto, cuerpo muy grande, content-type…): mismo formato.
    if (err.statusCode >= 400 && err.statusCode < 500) {
      return reply.code(err.statusCode).send({ error: { code: 'BAD_REQUEST', message: err.message } });
    }
    req.log.error({ err }, 'unhandled');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'error interno' } });
  });

  app.setNotFoundHandler((req, reply) =>
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: `no existe ${req.method} ${redactUrl(req.url).split('?')[0]}` } }),
  );

  /** preHandler para rutas que piden `Authorization: Bearer <token>`. */
  app.decorate('authenticate', async (req, reply) => {
    try {
      const p = await req.jwtVerify();
      req.user = { id: p.sub, name: p.name, guest: !!p.guest };
      // reply.log es el que escribe "request completed".
      req.log = req.log.child({ userId: p.sub });
      if (reply) reply.log = req.log;
    } catch {
      throw new AppError('UNAUTHORIZED', 'token inválido o vencido', 401);
    }
  });

  // Siempre 200 (es para humanos); ok:false si algo configurado no responde.
  app.get('/health', async () => {
    const [db, redis] = await Promise.all([
      probe(deps.db && (() => deps.db.db.execute(sql`select 1`))),
      probe(deps.redis && (() => deps.redis.ping())),
    ]);
    return {
      ok: db !== 'down' && redis !== 'down',
      gameVersion: GAME_VERSION,
      uptime: Math.round(process.uptime()),
      connections: deps.hub.size,
      rooms: deps.rooms.rooms.size,
      matches: deps.rooms.matches.size,
      tickMs: Math.round(deps.rooms.stats.lastTickMs * 100) / 100,
      db,
      redis,
    };
  });

  app.get('/meta', async () => ({
    gameVersion: GAME_VERSION,
    levels: Object.entries(LEVELS).map(([key, l]) => ({ key, name: l.name })),
    boxes: BOX_CHOICES,
  }));

  await app.register(authRoutes, deps);
  await app.register(friendsRoutes, deps);
  await app.register(invitesRoutes, deps);
  await app.register(historyRoutes, deps);

  app.get('/metrics', async (_req, reply) => {
    reply.type('text/plain; version=0.0.4').send(
      deps.metrics.render({
        htb_connections: deps.hub.size,
        htb_rooms: deps.rooms.rooms.size,
        htb_matches: deps.rooms.matches.size,
      }),
    );
  });

  app.get('/rooms', async () => ({ rooms: deps.rooms.listPublic() }));
  app.get('/rooms/:code', async (req) => {
    const room = deps.rooms.get(String(req.params.code).toUpperCase());
    if (!room) throw new AppError('ROOM_NOT_FOUND', 'no existe la sala', 404);
    return { room: room.summary() };
  });

  attachGateway(app, deps);
  app.addHook('onClose', async () => {
    deps.rooms.close();
    await deps.presence.settle();
    // quit() espera la respuesta del servidor: si Redis está caído, se colgaría.
    const r = deps.redis;
    await Promise.allSettled([deps.db?.close(), r && (r.status === 'ready' ? r.quit() : r.disconnect())]);
  });
  return app;
}

/** 'disabled' si no hay check; 'ok' si responde en <500 ms; 'down' si falla o tarda. */
async function probe(check, timeoutMs = 500) {
  if (!check) return 'disabled';
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  try {
    await Promise.race([check(), timeout]);
    return 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

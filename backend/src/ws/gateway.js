// Gateway WebSocket: GET /ws?token=<JWT> en el mismo puerto HTTP.
// 1) Autentica en el upgrade (401 si el token no vale). 2) Registra la conexión en el Hub.
// 3) Valida cada mensaje (protocol.js) y lo despacha. 4) Heartbeat: ping cada heartbeatMs, cierra si no hay pong.
import { WebSocketServer } from 'ws';
import { GAME_VERSION } from '../game/index.js';
import { AppError } from '../errors.js';
import { Connection } from './connection.js';
import { MAX_MESSAGE_BYTES, parseClientMessage } from './protocol.js';
import { MessageLimiter, UpgradeLimiter, isLoopback, upgradeIp } from './rateLimit.js';

const reject = (socket, status, text) => {
  socket.write(`HTTP/1.1 ${status} ${text}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
};

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ hub, rooms, env, presence?, handlers?: Record<string, (conn, d) => any> }} deps
 *   `handlers`: tipos extra (amigos, invitaciones…) que registran otros módulos sin tocar este archivo.
 *   `presence`: social/presence.js (conectar / desconectar / renovar TTL en el heartbeat).
 */
export function attachGateway(app, { hub, rooms, env, presence, handlers = {}, metrics }) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const upgrades = new UpgradeLimiter(env.wsUpgradesPerSec);
  const origins = env.corsOrigin === '*' ? null : new Set(env.corsOrigin.split(',').map((s) => s.trim()));

  app.server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname !== '/ws') return socket.destroy();
    // Los navegadores siempre mandan Origin en el WS; los clientes sin navegador (bots, tests) no.
    if (origins && req.headers.origin && !origins.has(req.headers.origin)) return reject(socket, 403, 'Forbidden');
    if (wss.clients.size >= env.maxConnections) return reject(socket, 503, 'Service Unavailable');
    const ip = upgradeIp(req, env.trustProxy);
    if (!(env.rateLimitSkipLocal && isLoopback(ip)) && !upgrades.allow(ip)) return reject(socket, 429, 'Too Many Requests');
    let user;
    try {
      const token = url.searchParams.get('token') ?? '';
      const p = app.jwt.verify(token);
      user = { id: p.sub, name: p.name, guest: !!p.guest };
    } catch {
      return reject(socket, 401, 'Unauthorized');
    }
    const binary = url.searchParams.get('bin') === '1';
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, user, binary));
  });

  function onConnection(ws, user, binary = false) {
    const conn = new Connection(ws, user);
    conn.binary = binary; // snapshots en msgpack binario (negociado con ?bin=1)
    conn.limiter = new MessageLimiter({ abuseCloseMs: env.wsAbuseCloseMs });
    ws.htbConn = conn;
    hub.add(conn);
    ws.on('pong', () => {
      conn.alive = true;
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return conn.error('BAD_REQUEST', 'solo mensajes de texto JSON');
      onMessage(conn, data.toString());
    });
    ws.on('close', () => {
      // Si fue reemplazada por otra conexión del mismo usuario, no se considera desconexión.
      const replaced = hub.get(conn.userId) !== conn;
      hub.remove(conn);
      if (!replaced) {
        rooms.onDisconnect(conn.userId);
        presence?.touch([conn.userId]);
      }
    });
    ws.on('error', (err) => app.log.warn({ err, userId: conn.userId }, 'ws error'));
    conn.send('welcome', {
      user,
      serverTime: Date.now(),
      gameVersion: GAME_VERSION,
      tickHz: env.tickHz,
      snapshotHz: env.snapshotHz,
      binary,
    });
    rooms.onConnect(user);
    presence?.touch([user.id]);
  }

  function sendError(conn, code, message, rid, t) {
    app.log.debug({ userId: conn.userId, t, code }, 'ws error');
    conn.error(code, message, rid);
  }

  function onMessage(conn, raw) {
    const msg = parseClientMessage(raw);
    // Los mensajes inválidos cuentan como control: también pueden usarse para inundar.
    const verdict = conn.limiter.check(msg.ok ? msg.t : null);
    if (verdict === 'drop') return;
    if (verdict === 'close') {
      app.log.warn({ userId: conn.userId }, 'ws: cerrado por exceso de mensajes');
      return conn.close(4008, 'rate limited');
    }
    if (verdict === 'limited') return sendError(conn, 'RATE_LIMITED', 'demasiados mensajes: baja el ritmo', msg.rid, msg.t);
    if (!msg.ok) return sendError(conn, msg.code, msg.message, msg.rid);
    const { t, d, rid } = msg;
    metrics?.inc('htb_ws_messages_total', 1, { t });
    if (t === 'ping') return conn.send('pong', { t: d.t, serverTime: Date.now() });
    const fail = (err) => {
      if (err instanceof AppError) return sendError(conn, err.code, err.message, rid, t);
      app.log.error({ err, t, userId: conn.userId }, 'ws handler failed');
      conn.error('INTERNAL', 'error interno', rid);
    };
    try {
      const extra = handlers[t] ? handlers[t](conn, d) : rooms.handle(conn.user, t, d);
      // Los handlers async (social) también pueden fallar: el error llega al cliente igual que uno síncrono.
      Promise.resolve(extra).then((x) => rid !== undefined && conn.send('ack', { t, ...(x ?? {}) }, rid), fail);
    } catch (err) {
      fail(err);
    }
  }

  const beat = setInterval(() => {
    for (const ws of wss.clients) {
      const conn = ws.htbConn;
      if (!conn) continue;
      if (!conn.alive) {
        ws.terminate();
        continue;
      }
      conn.alive = false;
      ws.ping();
    }
    presence?.heartbeat();
    upgrades.prune();
  }, env.heartbeatMs);
  beat.unref();

  app.addHook('onClose', async () => {
    clearInterval(beat);
    for (const ws of wss.clients) ws.terminate();
    wss.close();
  });

  return wss;
}

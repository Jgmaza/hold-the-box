// Seguridad (#9): límites REST y WS, conexiones, Origin, errores uniformes y logs sin secretos.
import { describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { buildApp } from '../src/app.js';
import { MessageLimiter } from '../src/ws/rateLimit.js';
import { guest, startServer, TestClient } from './helpers.js';

const hasRedis = !!process.env.REDIS_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Abre un WS y resuelve con 'open' o con el status HTTP del rechazo. */
const tryWs = (url, headers) =>
  new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    ws.on('open', () => resolve({ ok: true, ws }));
    ws.on('unexpected-response', (_req, res) => resolve({ ok: false, status: res.statusCode }));
    ws.on('error', () => {});
  });

async function withServer(env, fn) {
  const server = await startServer({ databaseUrl: null, redisUrl: null, ...env });
  try {
    return await fn(server);
  } finally {
    await server.app.close();
  }
}

describe('MessageLimiter', () => {
  it('input se descarta en silencio; control responde limited y, si sigue, close', () => {
    let now = 0;
    const l = new MessageLimiter({ abuseCloseMs: 5000, now: () => now });
    const inputs = Array.from({ length: 200 }, () => l.check('input'));
    expect(inputs.filter((v) => v === 'ok')).toHaveLength(120);
    expect(inputs.filter((v) => v === 'drop')).toHaveLength(80);

    const first = Array.from({ length: 41 }, () => l.check('room:ready'));
    expect(first.slice(0, 40).every((v) => v === 'ok')).toBe(true);
    expect(first[40]).toBe('limited');
    // 200 msg/s durante 5 s: a 20/s algunos pasan, pero la racha de rechazos sigue → close.
    let v;
    for (let i = 0; i < 1000 && v !== 'close'; i++) {
      now += 5;
      v = l.check('room:ready');
    }
    expect(v).toBe('close');
    expect(now).toBeGreaterThanOrEqual(5000);
  });
});

function restLimitSuite(redisUrl) {
  it('11 POST /auth/guest en un minuto → el 11.º da 429 RATE_LIMITED; el resto del API sigue', async () => {
    const ns = `rl:test:${crypto.randomUUID()}:`;
    await withServer({ redisUrl, rateLimitSkipLocal: false, rateLimitNamespace: ns }, async (s) => {
      const res = [];
      for (let i = 0; i < 11; i++) {
        const r = await fetch(`${s.base}/auth/guest`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nickname: `bot${i}xx` }),
        });
        res.push({ status: r.status, body: await r.json() });
      }
      expect(res.slice(0, 10).every((r) => r.status === 201)).toBe(true);
      expect(res[10]).toEqual({ status: 429, body: { error: { code: 'RATE_LIMITED', message: expect.stringMatching(/reintenta/) } } });
      // /auth/login comparte el cupo de /auth/*; /meta no.
      const login = await fetch(`${s.base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      expect(login.status).toBe(429);
      expect((await fetch(`${s.base}/meta`)).status).toBe(200);
    });
  });

  it('límite global por IP (100/min por defecto; aquí 5)', async () => {
    const ns = `rl:test:${crypto.randomUUID()}:`;
    await withServer({ redisUrl, rateLimitSkipLocal: false, rateLimitMax: 5, rateLimitNamespace: ns }, async (s) => {
      const st = [];
      for (let i = 0; i < 6; i++) st.push((await fetch(`${s.base}/meta`)).status);
      expect(st).toEqual([200, 200, 200, 200, 200, 429]);
    });
  });
}

describe('REST rate limit (memoria)', () => restLimitSuite(null));
describe.skipIf(!hasRedis)('REST rate limit (redis)', () => restLimitSuite(process.env.REDIS_URL));

describe('WebSocket', () => {
  it('200 room:ready en 1 s → RATE_LIMITED y luego cierre 4008', async () => {
    await withServer({ wsAbuseCloseMs: 1000 }, async (s) => {
      const c = await TestClient.connect(s, 'spam');
      await c.request('room:create', {});
      const closed = new Promise((r) => c.ws.on('close', (code) => r(code)));
      let sent = 0;
      const iv = setInterval(() => {
        for (let i = 0; i < 5 && c.ws.readyState === 1; i++, sent++) c.send('room:ready', { ready: sent % 2 === 0 });
      }, 25); // 200/s
      const code = await Promise.race([closed, sleep(5000).then(() => 'timeout')]);
      clearInterval(iv);
      expect(code).toBe(4008);
      expect(c.inbox.some((m) => m.t === 'error' && m.d.code === 'RATE_LIMITED')).toBe(true);
      expect(sent).toBeLessThan(400); // cerró en ~1-1.5 s, no hizo falta más
    });
  });

  it('input a 200/s: se descarta en silencio y la partida sigue fluida para los demás', async () => {
    await withServer({}, async (s) => {
      const a = await TestClient.connect(s, 'rafaga');
      const b = await TestClient.connect(s, 'normal');
      const { code } = await a.request('room:create', { maxDuos: 1 });
      await b.request('room:join', { code });
      await b.request('room:ready', { ready: true });
      const started = b.next((m) => m.t === 'room:state' && m.d.state === 'playing');
      await a.request('room:start');
      await started;

      const before = b.count('match:snapshot');
      let seqA = 0;
      let seqB = 0;
      const spam = setInterval(() => {
        for (let i = 0; i < 2; i++) a.send('input', { seq: ++seqA, slot: 1, x: 0, z: -1 });
      }, 10); // 200/s
      const normal = setInterval(() => b.send('input', { seq: ++seqB, slot: 2, x: 0, z: -1 }), 33);
      await sleep(1500);
      clearInterval(spam);
      clearInterval(normal);

      expect(a.ws.readyState).toBe(1);
      expect(a.inbox.filter((m) => m.t === 'error')).toEqual([]);
      expect(b.count('match:snapshot') - before).toBeGreaterThanOrEqual(20); // 20 Hz durante 1,5 s
      expect(s.app.deps.rooms.stats.lastTickMs).toBeLessThan(4);
      a.close();
      b.close();
    });
  });

  it('upgrades por IP y tope global de conexiones', async () => {
    await withServer({ rateLimitSkipLocal: false, wsUpgradesPerSec: 3 }, async (s) => {
      const { token } = await guest(s.base, 'muchas');
      const tries = await Promise.all(Array.from({ length: 5 }, () => tryWs(`${s.ws}?token=${token}`)));
      expect(tries.filter((t) => t.ok)).toHaveLength(3);
      expect(tries.filter((t) => !t.ok).map((t) => t.status)).toEqual([429, 429]);
      for (const t of tries) t.ws?.close();
    });
    await withServer({ maxConnections: 1 }, async (s) => {
      const t1 = await guest(s.base, 'uno1');
      const t2 = await guest(s.base, 'dos2');
      const first = await tryWs(`${s.ws}?token=${t1.token}`);
      expect(first.ok).toBe(true);
      expect(await tryWs(`${s.ws}?token=${t2.token}`)).toEqual({ ok: false, status: 503 });
      first.ws.close();
    });
  });

  it('Origin: con CORS_ORIGIN, un navegador de otro origen no abre el WS', async () => {
    await withServer({ corsOrigin: 'http://ok.example' }, async (s) => {
      const { token } = await guest(s.base, 'origen');
      expect(await tryWs(`${s.ws}?token=${token}`, { origin: 'http://malo.example' })).toEqual({ ok: false, status: 403 });
      const ok = await tryWs(`${s.ws}?token=${token}`, { origin: 'http://ok.example' });
      expect(ok.ok).toBe(true);
      ok.ws.close();
    });
  });
});

describe('errores uniformes y cabeceras', () => {
  it('404, JSON roto y cabeceras de helmet', async () => {
    await withServer({}, async (s) => {
      const nf = await fetch(`${s.base}/no-existe?token=secreto`);
      expect(nf.status).toBe(404);
      const body = await nf.json();
      expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'no existe GET /no-existe' } });
      expect(nf.headers.get('x-content-type-options')).toBe('nosniff');

      const bad = await fetch(`${s.base}/auth/guest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{roto' });
      expect(bad.status).toBe(400);
      expect((await bad.json()).error.code).toBe('BAD_REQUEST');
    });
  });
});

describe('logs', () => {
  it('no muestran contraseñas ni tokens; las peticiones autenticadas llevan userId', async () => {
    const lines = [];
    const app = await buildApp({
      env: { nodeEnv: 'test', port: 0, databaseUrl: null, redisUrl: null },
      logStream: { write: (s) => lines.push(s) },
    });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const base = `http://127.0.0.1:${app.server.address().port}`;
    try {
      const password = 'ContraseñaSuperSecreta1';
      const post = (path, body, token) =>
        fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
        }).then((r) => r.json());
      const reg = await post('/auth/register', { username: 'logs_ana', password });
      const login = await post('/auth/login', { username: 'logs_ana', password: 'otraMala123' });
      expect(login.error.code).toBe('INVALID_CREDENTIALS');
      const ref = await post('/auth/refresh', { refreshToken: reg.refreshToken });
      await fetch(`${base}/me`, { headers: { authorization: `Bearer ${ref.token}` } });
      await fetch(`${base}/ws?token=${reg.token}`); // sin upgrade: 404 con el token en la URL

      const all = lines.join('\n');
      expect(all.length).toBeGreaterThan(0);
      for (const secret of [password, 'otraMala123', reg.token, reg.refreshToken, ref.token, ref.refreshToken]) {
        expect(all).not.toContain(secret);
      }
      expect(all).toContain('token=[REDACTED]');
      expect(lines.some((l) => l.includes(`"userId":"${reg.user.id}"`))).toBe(true);
    } finally {
      await app.close();
    }
  });
});

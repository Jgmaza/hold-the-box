// Cuentas (#4). La misma suite corre con MemoryUserRepo y, si hay DATABASE_URL, con PgUserRepo.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { hasDb, withTestDb } from './db.js';
import { guest, startServer, TestClient } from './helpers.js';

function authSuite(getDbUrl) {
  let server;
  let n = 0;
  const uniq = (p = 'u') => `${p}${Date.now().toString(36).slice(-5)}${n++}`;

  beforeAll(async () => {
    server = await startServer({ databaseUrl: getDbUrl(), redisUrl: null, jwtExpiresIn: '15m', guestJwtExpiresIn: '1d' });
  });
  afterAll(async () => {
    await server?.app.close();
  });

  const call = async (method, path, body, token) => {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${server.base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  const register = (username, password = 'contraseña1', extra = {}) =>
    call('POST', '/auth/register', { username, password, ...extra });

  it('registro → login → /me', async () => {
    const username = uniq('ana');
    const reg = await register(username, 'contraseña1', { displayName: 'Ana Pro' });
    expect(reg.status).toBe(201);
    expect(reg.body.user).toMatchObject({ username, displayName: 'Ana Pro', isGuest: false });
    expect(reg.body.user).not.toHaveProperty('passwordHash');
    expect(reg.body.refreshToken).toMatch(/^[\w-]{43}$/);

    const login = await call('POST', '/auth/login', { username: username.toUpperCase(), password: 'contraseña1' });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(reg.body.user.id);

    const me = await call('GET', '/me', undefined, login.body.token);
    expect(me.body.user).toEqual(reg.body.user);

    const { exp, iat, guest: g } = server.app.jwt.decode(login.body.token);
    expect(exp - iat).toBe(15 * 60);
    expect(g).toBe(false);
  });

  it('displayName por defecto = username; username inválido → 400', async () => {
    const username = uniq('beto');
    expect((await register(username)).body.user.displayName).toBe(username);
    expect((await register('a!')).body.error.code).toBe('BAD_REQUEST');
    expect((await register(uniq('c'), 'corta')).body.error).toMatchObject({ code: 'BAD_REQUEST', message: expect.stringMatching(/^password:/) });
  });

  it('username duplicado (también con otras mayúsculas) → 409 USERNAME_TAKEN', async () => {
    const username = uniq('caro');
    await register(username);
    const dup = await register(username.toUpperCase());
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('contraseña mala o usuario inexistente → 401 INVALID_CREDENTIALS con el mismo mensaje', async () => {
    const username = uniq('dani');
    await register(username);
    const bad = await call('POST', '/auth/login', { username, password: 'otraclave1' });
    const ghost = await call('POST', '/auth/login', { username: uniq('nadie'), password: 'otraclave1' });
    expect(bad.status).toBe(401);
    expect(ghost.status).toBe(401);
    expect(bad.body).toEqual(ghost.body);
    expect(bad.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh rota: el mismo refresh dos veces → la segunda 401', async () => {
    const { body } = await register(uniq('eva'));
    const r1 = await call('POST', '/auth/refresh', { refreshToken: body.refreshToken });
    expect(r1.status).toBe(200);
    expect(r1.body.refreshToken).not.toBe(body.refreshToken);
    expect((await call('GET', '/me', undefined, r1.body.token)).status).toBe(200);

    const again = await call('POST', '/auth/refresh', { refreshToken: body.refreshToken });
    expect(again.status).toBe(401);
    expect(again.body.error.code).toBe('UNAUTHORIZED');
    expect((await call('POST', '/auth/refresh', { refreshToken: r1.body.refreshToken })).status).toBe(200);
  });

  it('logout revoca el refresh', async () => {
    const { body } = await register(uniq('fede'));
    expect((await call('POST', '/auth/logout', { refreshToken: body.refreshToken })).status).toBe(401);
    expect((await call('POST', '/auth/logout', { refreshToken: body.refreshToken }, body.token)).status).toBe(204);
    expect((await call('POST', '/auth/refresh', { refreshToken: body.refreshToken })).status).toBe(401);
  });

  it('PATCH /me cambia displayName', async () => {
    const { body } = await register(uniq('gabi'));
    const ok = await call('PATCH', '/me', { displayName: 'Gabi Nueva' }, body.token);
    expect(ok.body.user.displayName).toBe('Gabi Nueva');
    expect((await call('GET', '/me', undefined, body.token)).body.user.displayName).toBe('Gabi Nueva');
    expect((await call('PATCH', '/me', { displayName: 'x' }, body.token)).status).toBe(400);
    expect((await call('GET', '/me')).status).toBe(401);
  });

  it('upgrade: el invitado conserva id y sala, y el token nuevo sirve en /ws', async () => {
    const g = await guest(server.base, 'Invitado');
    expect(g.user.isGuest).toBe(true);
    expect(g).not.toHaveProperty('refreshToken');
    const { exp, iat } = server.app.jwt.decode(g.token);
    expect(exp - iat).toBe(24 * 60 * 60);

    const c1 = new TestClient(new WebSocket(`${server.ws}?token=${g.token}`), g.user);
    await c1.next('welcome');
    const { code } = await c1.request('room:create', { maxDuos: 1 });
    const closed = new Promise((r) => c1.ws.on('close', (codeNum) => r(codeNum)));

    const username = uniq('inv');
    const up = await call('POST', '/auth/upgrade', { username, password: 'contraseña1' }, g.token);
    expect(up.status).toBe(200);
    expect(up.body.user).toMatchObject({ id: g.user.id, username, displayName: 'Invitado', isGuest: false });
    expect(up.body.refreshToken).toBeTruthy();

    const c2 = new TestClient(new WebSocket(`${server.ws}?token=${up.body.token}`), up.body.user);
    const [welcome, state] = await Promise.all([c2.next('welcome'), c2.next('room:state')]);
    expect(welcome.d.user).toMatchObject({ id: g.user.id, guest: false });
    expect(state.d.code).toBe(code);
    expect(await closed).toBe(4001);
    expect(server.app.deps.rooms.get(code)).toBeTruthy();

    const again = await call('POST', '/auth/upgrade', { username: uniq('otra'), password: 'contraseña1' }, up.body.token);
    expect(again.status).toBe(400);
    // Status y cuerpo enteros: si algún día falla, el diff dice por qué (no un TypeError).
    expect(await call('POST', '/auth/login', { username, password: 'contraseña1' })).toMatchObject({
      status: 200,
      body: { user: { id: g.user.id } },
    });
    c2.close();
  });

  it('upgrade a un username ocupado → 409', async () => {
    const username = uniq('hugo');
    await register(username);
    const g = await guest(server.base, 'Otro');
    const r = await call('POST', '/auth/upgrade', { username, password: 'contraseña1' }, g.token);
    expect(r.status).toBe(409);
    expect((await call('GET', '/me', undefined, g.token)).body.user.isGuest).toBe(true);
  });
}

describe('cuentas (memoria)', () => authSuite(() => null));

describe.skipIf(!hasDb)('cuentas (postgres)', () => {
  const t = withTestDb();
  authSuite(() => t.url);
});

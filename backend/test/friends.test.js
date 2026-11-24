// Amigos (#5). Servicio con repos en memoria + e2e REST/WS contra memoria y, si hay DATABASE_URL, Postgres.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { MemoryFriendsRepo } from '../src/social/friendsRepo.js';
import { FriendsService } from '../src/social/friendsService.js';
import { MemoryUserRepo } from '../src/users/memoryUserRepo.js';
import { hasDb, withTestDb } from './db.js';
import { guest, startServer, TestClient } from './helpers.js';

let seq = 0;
const uniq = (p) => `${p}${Date.now().toString(36).slice(-4)}${seq++}`;

describe('FriendsService', () => {
  const setup = async () => {
    const users = new MemoryUserRepo();
    const sent = [];
    const hub = { sendTo: (userId, t, d) => sent.push({ userId, t, d }) };
    const svc = new FriendsService({ repo: new MemoryFriendsRepo(users), users, hub });
    const a = await users.createAccount({ username: 'ana', passwordHash: 'x', displayName: 'Ana' });
    const b = await users.createAccount({ username: 'beto', passwordHash: 'x', displayName: 'Beto' });
    return { svc, sent, a, b };
  };

  it('solicitudes cruzadas se aceptan solas y avisan al primero', async () => {
    const { svc, sent, a, b } = await setup();
    const { request } = await svc.send(a.id, 'beto');
    expect(sent.at(-1)).toMatchObject({ userId: b.id, t: 'friend:request', d: { request: { id: request.id } } });

    const res = await svc.send(b.id, 'ana');
    expect(res.friend.user).toEqual({ id: a.id, username: 'ana', displayName: 'Ana' });
    expect(sent.at(-1)).toMatchObject({ userId: a.id, t: 'friend:accepted', d: { friend: { user: { id: b.id } } } });
    expect((await svc.requests(a.id)).outgoing).toEqual([]);
    expect((await svc.list(a.id)).map((f) => f.user.id)).toEqual([b.id]);
    await expect(svc.send(a.id, 'beto')).rejects.toMatchObject({ code: 'ALREADY_FRIENDS', status: 409 });
  });

  it('reglas: a ti mismo, inexistente, duplicada, ajena', async () => {
    const { svc, a, b } = await setup();
    await expect(svc.send(a.id, 'ana')).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(svc.send(a.id, 'nadie')).rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
    const { request } = await svc.send(a.id, 'beto');
    await expect(svc.send(a.id, 'beto')).rejects.toMatchObject({ code: 'REQUEST_PENDING', status: 409 });
    await expect(svc.accept(a.id, request.id)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
    await expect(svc.cancel(b.id, request.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await svc.cancel(a.id, request.id);
    await expect(svc.accept(b.id, request.id)).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND', status: 404 });
  });
});

function friendsSuite(getDbUrl) {
  let server;
  beforeAll(async () => {
    server = await startServer({ databaseUrl: getDbUrl(), redisUrl: null });
  });
  afterAll(async () => {
    await server?.app.close();
  });

  const call = async (method, path, token, body) => {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${server.base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  /** Cuenta nueva: { token, user, ws? } */
  const account = async (prefix, { ws = false } = {}) => {
    const { body } = await call('POST', '/auth/register', undefined, { username: uniq(prefix), password: 'contraseña1' });
    if (ws) {
      body.ws = new TestClient(new WebSocket(`${server.ws}?token=${body.token}`), body.user);
      await body.ws.next('welcome');
    }
    return body;
  };

  it('flujo A→B: solicitud, B la ve y acepta, los dos son amigos y A recibe friend:accepted', async () => {
    const a = await account('ana', { ws: true });
    const b = await account('beto', { ws: true });

    const gotRequest = b.ws.next('friend:request');
    const sent = await call('POST', '/friends/requests', a.token, { username: b.user.username.toUpperCase() });
    expect(sent.status).toBe(201);
    const { request } = sent.body;
    expect(request).toMatchObject({ from: { id: a.user.id }, to: { id: b.user.id } });
    expect(request.from).not.toHaveProperty('isGuest');
    expect((await gotRequest).d.request).toEqual(request);

    expect((await call('GET', '/friends/requests', b.token)).body).toEqual({ incoming: [request], outgoing: [] });
    expect((await call('GET', '/friends/requests', a.token)).body).toEqual({ incoming: [], outgoing: [request] });

    const gotAccepted = a.ws.next('friend:accepted');
    const acc = await call('POST', `/friends/requests/${request.id}/accept`, b.token);
    expect(acc.status).toBe(200);
    expect(acc.body.friend.user).toEqual({ id: a.user.id, username: a.user.username, displayName: a.user.displayName });
    const pushed = (await gotAccepted).d.friend;
    expect(pushed).toEqual({ user: { id: b.user.id, username: b.user.username, displayName: b.user.displayName }, since: acc.body.friend.since });

    await server.app.deps.presence.settle();
    const fa = (await call('GET', '/friends', a.token)).body.friends;
    const fb = (await call('GET', '/friends', b.token)).body.friends;
    expect(fa).toEqual([{ user: pushed.user, since: pushed.since, presence: { status: 'online' } }]);
    expect(fb.map((f) => f.user.id)).toEqual([a.user.id]);
    expect((await call('GET', '/friends/requests', b.token)).body.incoming).toEqual([]);
    a.ws.close();
    b.ws.close();
  });

  it('solicitudes cruzadas: la segunda acepta la primera (201 { friend }) sin duplicados', async () => {
    const a = await account('caro', { ws: true });
    const b = await account('dani');
    await call('POST', '/friends/requests', a.token, { username: b.user.username });
    const gotAccepted = a.ws.next('friend:accepted');
    const cross = await call('POST', '/friends/requests', b.token, { username: a.user.username });
    expect(cross.status).toBe(201);
    expect(cross.body.friend.user.id).toBe(a.user.id);
    expect((await gotAccepted).d.friend.user.id).toBe(b.user.id);
    expect((await call('GET', '/friends/requests', a.token)).body).toEqual({ incoming: [], outgoing: [] });
    expect((await call('POST', '/friends/requests', a.token, { username: b.user.username })).body.error.code).toBe('ALREADY_FRIENDS');
    a.ws.close();
  });

  it('solicitudes cruzadas simultáneas: nunca quedan dos pendientes', async () => {
    for (let i = 0; i < 5; i++) {
      const a = await account('sa');
      const b = await account('sb');
      const res = await Promise.all([
        call('POST', '/friends/requests', a.token, { username: b.user.username }),
        call('POST', '/friends/requests', b.token, { username: a.user.username }),
      ]);
      const pending = (await call('GET', '/friends/requests', a.token)).body;
      const friends = (await call('GET', '/friends', a.token)).body.friends;
      expect(pending.incoming.length + pending.outgoing.length + friends.length).toBe(1);
      for (const r of res) expect([201, 409]).toContain(r.status);
    }
  });

  it('eliminar amigo: desaparece para los dos y el otro recibe friend:removed', async () => {
    const a = await account('eva');
    const b = await account('fede', { ws: true });
    const { body } = await call('POST', '/friends/requests', a.token, { username: b.user.username });
    await call('POST', `/friends/requests/${body.request.id}/accept`, b.token);

    const gotRemoved = b.ws.next('friend:removed');
    expect((await call('DELETE', `/friends/${b.user.id}`, a.token)).status).toBe(204);
    expect((await gotRemoved).d).toEqual({ userId: a.user.id });
    expect((await call('GET', '/friends', a.token)).body.friends).toEqual([]);
    expect((await call('GET', '/friends', b.token)).body.friends).toEqual([]);
    const again = await call('DELETE', `/friends/${b.user.id}`, a.token);
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('NOT_FRIENDS');
    b.ws.close();
  });

  it('rechazar avisa con friend:declined; cancelar es solo del remitente; errores', async () => {
    const a = await account('gabi', { ws: true });
    const b = await account('hugo');
    const r1 = (await call('POST', '/friends/requests', a.token, { username: b.user.username })).body.request;

    expect((await call('POST', '/friends/requests', a.token, { username: b.user.username })).body.error.code).toBe('REQUEST_PENDING');
    expect((await call('POST', `/friends/requests/${r1.id}/accept`, a.token)).status).toBe(403);

    const gotDeclined = a.ws.next('friend:declined');
    expect((await call('POST', `/friends/requests/${r1.id}/decline`, b.token)).status).toBe(204);
    expect((await gotDeclined).d).toEqual({ requestId: r1.id });
    expect((await call('POST', `/friends/requests/${r1.id}/accept`, b.token)).body.error.code).toBe('REQUEST_NOT_FOUND');

    const r2 = (await call('POST', '/friends/requests', a.token, { username: b.user.username })).body.request;
    expect((await call('DELETE', `/friends/requests/${r2.id}`, b.token)).status).toBe(403);
    expect((await call('DELETE', `/friends/requests/${r2.id}`, a.token)).status).toBe(204);
    expect((await call('GET', '/friends/requests', b.token)).body.incoming).toEqual([]);

    expect((await call('POST', '/friends/requests', a.token, { username: a.user.username })).status).toBe(400);
    expect((await call('POST', '/friends/requests', a.token, { username: uniq('nadie') })).body.error.code).toBe('USER_NOT_FOUND');
    expect((await call('POST', '/friends/requests/no-es-uuid/accept', b.token)).status).toBe(400);
    expect((await call('POST', `/friends/requests/${crypto.randomUUID()}/accept`, b.token)).status).toBe(404);
    a.ws.close();
  });

  it('invitado → 403 ACCOUNT_REQUIRED en todas las rutas; sin token → 401', async () => {
    const g = await guest(server.base, 'Invitado');
    const id = crypto.randomUUID();
    const routes = [
      ['GET', '/users/search?q=ab'],
      ['GET', '/friends'],
      ['GET', '/friends/requests'],
      ['POST', '/friends/requests', { username: 'alguien' }],
      ['POST', `/friends/requests/${id}/accept`],
      ['POST', `/friends/requests/${id}/decline`],
      ['DELETE', `/friends/requests/${id}`],
      ['DELETE', `/friends/${id}`],
    ];
    for (const [method, path, body] of routes) {
      const r = await call(method, path, g.token, body);
      expect([path, r.status, r.body.error.code]).toEqual([path, 403, 'ACCOUNT_REQUIRED']);
      expect((await call(method, path, undefined, body)).status).toBe(401);
    }
    // Y no aparecen en la búsqueda (no tienen username).
    const a = await account('ivan');
    expect((await call('GET', '/users/search?q=in', a.token)).body.users.every((u) => u.username)).toBe(true);
  });

  it('búsqueda por prefijo: sin mí, con isFriend / requestPending, `_` literal, máx 20', async () => {
    const p = `q${Date.now().toString(36).slice(-5)}`;
    const reg = (name) => call('POST', '/auth/register', undefined, { username: `${p}${name}`, password: 'contraseña1' }).then((r) => r.body);
    const me = await reg('_me');
    const amigo = await reg('_amigo');
    const entra = await reg('_entra');
    const sale = await reg('_sale');
    const otro = await reg('xotro');

    const { body: r1 } = await call('POST', '/friends/requests', me.token, { username: amigo.user.username });
    await call('POST', `/friends/requests/${r1.request.id}/accept`, amigo.token);
    await call('POST', '/friends/requests', entra.token, { username: me.user.username });
    await call('POST', '/friends/requests', me.token, { username: sale.user.username });

    const res = await call('GET', `/users/search?q=${p.toUpperCase()}_`, me.token);
    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([
      { id: amigo.user.id, username: `${p}_amigo`, displayName: `${p}_amigo`, isFriend: true, requestPending: null },
      { id: entra.user.id, username: `${p}_entra`, displayName: `${p}_entra`, isFriend: false, requestPending: 'in' },
      { id: sale.user.id, username: `${p}_sale`, displayName: `${p}_sale`, isFriend: false, requestPending: 'out' },
    ]);
    expect((await call('GET', `/users/search?q=${p}`, me.token)).body.users.map((u) => u.id)).toContain(otro.user.id);
    expect((await call('GET', `/users/search?q=${p}&limit=1`, me.token)).body.users).toHaveLength(1);
    expect((await call('GET', '/users/search?q=a', me.token)).status).toBe(400);
    expect((await call('GET', `/users/search?q=${p}&limit=21`, me.token)).status).toBe(400);
  });
}

describe('amigos (memoria)', () => friendsSuite(() => null));

describe.skipIf(!hasDb)('amigos (postgres)', () => {
  const t = withTestDb();
  friendsSuite(() => t.url);
});

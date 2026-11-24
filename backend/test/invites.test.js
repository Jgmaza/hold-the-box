// Invitar amigos a la sala (#7). e2e por WS y REST, con almacén en memoria y, si hay REDIS_URL, en Redis.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { guest, startServer, TestClient } from './helpers.js';

const hasRedis = !!process.env.REDIS_URL;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 0;

function invitesSuite(redisUrl) {
  let server;
  beforeAll(async () => {
    server = await startServer({ databaseUrl: null, redisUrl });
  });
  afterAll(async () => {
    await server?.app.close();
  });

  const call = async (method, path, token, body, srv = server) => {
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`${srv.base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  /** Cuenta conectada por WS: { token, user, c } */
  const player = async (p, srv = server) => {
    const username = `${p}${Date.now().toString(36).slice(-4)}${seq++}`;
    const { body } = await call('POST', '/auth/register', undefined, { username, password: 'contraseña1' }, srv);
    body.c = new TestClient(new WebSocket(`${srv.ws}?token=${body.token}`), body.user);
    await body.c.next('welcome');
    return body;
  };
  const befriend = async (a, b, srv = server) => {
    const { body } = await call('POST', '/friends/requests', a.token, { username: b.user.username }, srv);
    await call('POST', `/friends/requests/${body.request.id}/accept`, b.token, undefined, srv);
  };
  const closeAll = (...ps) => ps.forEach((p) => p.c.close());

  it('A invita a B → B lo recibe, acepta y los dos ven a B en el dúo 0 / P2', async () => {
    const a = await player('ana');
    const b = await player('beto');
    await befriend(a, b);
    const { code } = await a.c.request('room:create', { level: 'muelle', maxDuos: 2 });

    const received = b.c.next('invite:received');
    const ack = await a.c.request('room:invite', { userId: b.user.id });
    expect(ack).toMatchObject({ t: 'room:invite', inviteId: expect.any(String), expiresAt: expect.any(Number) });
    const inv = (await received).d;
    expect(inv).toEqual({
      inviteId: ack.inviteId,
      from: { id: a.user.id, displayName: a.user.displayName },
      roomCode: code,
      level: 'muelle',
      expiresAt: ack.expiresAt,
    });
    // Re-invitar = la misma invitación vigente.
    expect((await a.c.request('room:invite', { userId: b.user.id })).inviteId).toBe(ack.inviteId);

    const isIn = (m) => m.t === 'room:state' && m.d.members.some((x) => x.userId === b.user.id);
    const [stA, stB, acc] = await Promise.all([a.c.next(isIn), b.c.next(isIn), b.c.request('invite:accept', { inviteId: inv.inviteId })]);
    expect(acc.code).toBe(code);
    for (const st of [stA, stB]) {
      expect(st.d.code).toBe(code);
      expect(st.d.members.find((x) => x.userId === b.user.id)).toMatchObject({ teamId: 0, slots: [2] });
    }
    await expect(b.c.request('invite:accept', { inviteId: inv.inviteId })).rejects.toMatchObject({ code: 'INVITE_EXPIRED' });
    closeAll(a, b);
  });

  it('errores: no amigo, sin sala, ya en la sala, invitación ajena', async () => {
    const a = await player('caro');
    const b = await player('dani');
    const x = await player('ext');
    await befriend(a, b);
    await expect(a.c.request('room:invite', { userId: b.user.id })).rejects.toMatchObject({ code: 'NOT_IN_ROOM' });
    await a.c.request('room:create', { maxDuos: 2 });
    await expect(a.c.request('room:invite', { userId: x.user.id })).rejects.toMatchObject({ code: 'NOT_FRIENDS' });

    const { inviteId } = await a.c.request('room:invite', { userId: b.user.id });
    await expect(x.c.request('invite:accept', { inviteId })).rejects.toMatchObject({ code: 'INVITE_EXPIRED' });
    await b.c.request('invite:accept', { inviteId });
    await expect(a.c.request('room:invite', { userId: b.user.id })).rejects.toMatchObject({ code: 'ALREADY_IN_ROOM' });
    closeAll(a, b, x);
  });

  it('sala llena o en partida → error y no se crea la invitación', async () => {
    const a = await player('eva');
    const b = await player('fede');
    await befriend(a, b);
    await a.c.request('room:create', { maxDuos: 1 });
    await a.c.request('room:setTeam', { teamId: 0, slots: [1, 2] }); // dúo de sofá: la sala queda llena
    await expect(a.c.request('room:invite', { userId: b.user.id })).rejects.toMatchObject({ code: 'ROOM_FULL' });
    await a.c.request('room:start');
    await expect(a.c.request('room:invite', { userId: b.user.id })).rejects.toMatchObject({ code: 'ROOM_IN_GAME' });
    expect((await call('GET', '/me/invites', b.token)).body.invites).toEqual([]);
    closeAll(a, b);
  });

  it('al empezar la partida, las invitaciones pendientes se cancelan (invite:cancelled)', async () => {
    const a = await player('gabi');
    const b = await player('hugo');
    await befriend(a, b);
    await a.c.request('room:create', { maxDuos: 2 });
    const { inviteId } = await a.c.request('room:invite', { userId: b.user.id });
    await a.c.request('room:setTeam', { teamId: 0, slots: [1, 2] });
    const cancelled = b.c.next('invite:cancelled');
    await a.c.request('room:start');
    expect((await cancelled).d).toEqual({ inviteId });
    expect((await call('GET', '/me/invites', b.token)).body.invites).toEqual([]);
    closeAll(a, b);
  });

  it('rechazar avisa al que invitó (invite:declined) y la invitación deja de valer', async () => {
    const a = await player('ivan');
    const b = await player('juli');
    await befriend(a, b);
    await a.c.request('room:create', {});
    const { inviteId } = await a.c.request('room:invite', { userId: b.user.id });
    const declined = a.c.next('invite:declined');
    expect(await b.c.request('invite:decline', { inviteId })).toEqual({ t: 'invite:decline' });
    expect((await declined).d).toEqual({ inviteId, userId: b.user.id });
    await expect(b.c.request('invite:accept', { inviteId })).rejects.toMatchObject({ code: 'INVITE_EXPIRED' });
    closeAll(a, b);
  });

  it('REST: invitar, ver /me/invites y unirse a la sala de un amigo en lobby', async () => {
    const a = await player('kim');
    const b = await player('leo');
    await befriend(a, b);
    expect((await call('POST', `/friends/${a.user.id}/join`, b.token)).body.error.code).toBe('FRIEND_NOT_IN_LOBBY');

    const { code } = await a.c.request('room:create', { maxDuos: 2 });
    const r = await call('POST', `/rooms/${code.toLowerCase()}/invite`, a.token, { userId: b.user.id });
    expect(r.status).toBe(201);
    expect(r.body.invite).toMatchObject({ roomCode: code, from: { id: a.user.id } });
    expect((await call('GET', '/me/invites', b.token)).body.invites).toEqual([r.body.invite]);
    expect((await call('POST', '/rooms/ZZZZZZ/invite', a.token, { userId: b.user.id })).body.error.code).toBe('NOT_IN_ROOM');

    await server.app.deps.presence.settle();
    const seen = b.c.next((m) => m.t === 'room:state' && m.d.code === code);
    const j = await call('POST', `/friends/${a.user.id}/join`, b.token);
    expect(j.body).toEqual({ code });
    expect((await seen).d.members.map((m) => m.userId)).toContain(b.user.id);

    const g = await guest(server.base, 'Invitado');
    expect((await call('GET', '/me/invites', g.token)).body.error.code).toBe('ACCOUNT_REQUIRED');
    closeAll(a, b);
  });

  it('vencimiento (TTL) y límite por minuto', async () => {
    const srv = await startServer({ databaseUrl: null, redisUrl, inviteTtlSec: 1, invitesPerMinute: 2 });
    try {
      const a = await player('mia', srv);
      const [b, c, d] = await Promise.all(['nico', 'olga', 'pepe'].map((p) => player(p, srv)));
      for (const f of [b, c, d]) await befriend(a, f, srv);
      await a.c.request('room:create', { maxDuos: 4 });

      const { inviteId } = await a.c.request('room:invite', { userId: b.user.id });
      await a.c.request('room:invite', { userId: c.user.id });
      await expect(a.c.request('room:invite', { userId: d.user.id })).rejects.toMatchObject({ code: 'RATE_LIMITED' });

      await sleep(1200);
      await expect(b.c.request('invite:accept', { inviteId })).rejects.toMatchObject({ code: 'INVITE_EXPIRED' });
      expect((await call('GET', '/me/invites', b.token, undefined, srv)).body.invites).toEqual([]);
      closeAll(a, b, c, d);
    } finally {
      await srv.app.close();
    }
  });
}

describe('invitaciones (memoria)', () => invitesSuite(null));
describe.skipIf(!hasRedis)('invitaciones (redis)', () => invitesSuite(process.env.REDIS_URL));

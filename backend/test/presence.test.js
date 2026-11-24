// Presencia (#6). Reglas y almacén en memoria siempre; el almacén Redis y el e2e con Redis si hay REDIS_URL.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { createRedis } from '../src/redis.js';
import { MemoryPresenceStore, PresenceService, RedisPresenceStore } from '../src/social/presence.js';
import { startServer, TestClient } from './helpers.js';

const hasRedis = !!process.env.REDIS_URL;
const tick = () => new Promise((r) => setImmediate(r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('MemoryPresenceStore', () => {
  it('vence con el TTL y refresh lo alarga', async () => {
    let now = 0;
    const s = new MemoryPresenceStore(60, () => now);
    await s.set('a', { status: 'online' });
    await s.set('b', { status: 'in_lobby', roomCode: 'ABC123' });
    now = 50_000;
    await s.refresh(['a']);
    now = 70_000;
    const m = await s.getMany(['a', 'b', 'c']);
    expect([...m.keys()]).toEqual(['a']);
    expect(m.get('a')).toMatchObject({ status: 'online', roomCode: null });
  });
});

describe('PresenceService (reglas)', () => {
  const setup = () => {
    const conns = new Map();
    const sent = [];
    const hub = {
      get: (id) => conns.get(id) ?? null,
      isOnline: (id) => conns.has(id),
      sendTo: (userId, t, d) => sent.push({ userId, t, d }),
    };
    const roomOf = new Map();
    const rooms = { roomOf: (id) => roomOf.get(id) ?? null };
    const friendsRepo = { listFriends: async (id) => (id === 'b' ? [{ user: { id: 'a' } }, { user: { id: 'z' } }] : []) };
    const store = new MemoryPresenceStore(60);
    const svc = new PresenceService({ store, hub, rooms, friendsRepo, logger: {} });
    return { svc, store, conns, roomOf, sent };
  };

  it('estado = conexión + sala; invitados siempre offline', () => {
    const { svc, conns, roomOf } = setup();
    expect(svc.compute('b')).toEqual({ status: 'offline', roomCode: null });
    conns.set('b', { user: { guest: false } });
    expect(svc.compute('b').status).toBe('online');
    for (const [state, status] of [['lobby', 'in_lobby'], ['countdown', 'in_match'], ['playing', 'in_match'], ['results', 'in_lobby']]) {
      roomOf.set('b', { code: 'ABC123', state });
      expect(svc.compute('b')).toEqual({ status, roomCode: 'ABC123' });
    }
    conns.set('g', { user: { guest: true } });
    roomOf.set('g', { code: 'ABC123', state: 'lobby' });
    expect(svc.compute('g').status).toBe('offline');
  });

  it('touch no hace I/O en el momento; solo avisa a amigos conectados y solo si cambió', async () => {
    const { svc, store, conns, roomOf, sent } = setup();
    conns.set('a', { user: {} });
    conns.set('b', { user: {} });
    svc.touch(['b']);
    expect(await store.getMany(['b'])).toEqual(new Map()); // aún nada: se procesa en setImmediate
    await svc.settle();
    expect((await store.getMany(['b'])).get('b').status).toBe('online');
    expect(sent).toEqual([{ userId: 'a', t: 'friend:presence', d: { userId: 'b', status: 'online' } }]); // z no está conectado

    svc.touch(['b']);
    svc.touch(['b']);
    await svc.settle();
    expect(sent).toHaveLength(1); // no cambió → no hay push

    roomOf.set('b', { code: 'ABC123', state: 'lobby' });
    svc.touch(['b']);
    await svc.settle();
    expect(sent.at(-1).d).toEqual({ userId: 'b', status: 'in_lobby', roomCode: 'ABC123' });

    conns.delete('b');
    svc.touch(['b']);
    await svc.settle();
    expect(sent.at(-1).d).toEqual({ userId: 'b', status: 'offline' });
    expect(await store.getMany(['b'])).toEqual(new Map());
    expect((await svc.getMany(['b'])).get('b')).toEqual({ status: 'offline' });
  });
});

describe.skipIf(!hasRedis)('RedisPresenceStore', () => {
  let redis;
  beforeAll(() => {
    redis = createRedis(process.env.REDIS_URL);
  });
  afterAll(async () => {
    await redis?.quit();
  });

  it('guarda el hash con TTL, lee en pipeline y vence sola', async () => {
    const id = crypto.randomUUID();
    const s = new RedisPresenceStore(redis, 1);
    await s.set(id, { status: 'in_match', roomCode: 'XYZ789' });
    expect(await redis.ttl(`presence:${id}`)).toBeGreaterThan(0);
    expect((await s.getMany([id, crypto.randomUUID()])).get(id)).toMatchObject({ status: 'in_match', roomCode: 'XYZ789' });
    await sleep(1300);
    expect(await s.getMany([id])).toEqual(new Map());
  });
});

function presenceSuite(redisUrl) {
  let server;
  let n = 0;
  beforeAll(async () => {
    server = await startServer({ databaseUrl: null, redisUrl });
  });
  afterAll(async () => {
    await server?.app.close();
  });

  const post = (path, body, token) =>
    fetch(`${server.base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  const account = (p) => post('/auth/register', { username: `${p}${Date.now().toString(36).slice(-5)}${n++}`, password: 'contraseña1' });
  const connect = async (acc) => {
    const c = new TestClient(new WebSocket(`${server.ws}?token=${acc.token}`), acc.user);
    await c.next('welcome');
    return c;
  };
  const friendsOf = async (acc) => {
    await server.app.deps.presence.settle();
    const r = await fetch(`${server.base}/friends`, { headers: { authorization: `Bearer ${acc.token}` } });
    return (await r.json()).friends;
  };
  const presenceOf = (c, userId, status) =>
    c.next((m) => m.t === 'friend:presence' && m.d.userId === userId && m.d.status === status);

  it('A ve a B: online → in_lobby (con sala) → in_match → offline, por push y en GET /friends', async () => {
    const a = await account('pa');
    const b = await account('pb');
    const { request } = await post('/friends/requests', { username: b.user.username }, a.token);
    await post(`/friends/requests/${request.id}/accept`, {}, b.token);
    expect((await friendsOf(a))[0].presence).toEqual({ status: 'offline' });

    const ca = await connect(a);
    const online = presenceOf(ca, b.user.id, 'online');
    const cb = await connect(b);
    expect((await online).d).toEqual({ userId: b.user.id, status: 'online' });
    expect((await friendsOf(a))[0].presence).toEqual({ status: 'online' });

    const lobby = presenceOf(ca, b.user.id, 'in_lobby');
    const { code } = await cb.request('room:create', { maxDuos: 1 });
    expect((await lobby).d).toEqual({ userId: b.user.id, status: 'in_lobby', roomCode: code });
    await cb.request('room:setTeam', { teamId: 0, slots: [1, 2] });
    await cb.request('room:ready', { ready: true });
    await server.app.deps.presence.settle();
    const pushes = ca.count('friend:presence');

    const match = presenceOf(ca, b.user.id, 'in_match');
    await cb.request('room:start');
    expect((await match).d).toEqual({ userId: b.user.id, status: 'in_match', roomCode: code });
    expect(ca.count('friend:presence')).toBe(pushes + 1); // setTeam / ready no cambiaron el estado: sin push
    expect((await friendsOf(a))[0].presence).toEqual({ status: 'in_match', roomCode: code });

    const off = presenceOf(ca, b.user.id, 'offline');
    cb.close();
    expect((await off).d).toEqual({ userId: b.user.id, status: 'offline' });
    expect((await friendsOf(a))[0].presence).toEqual({ status: 'offline' });
    ca.close();
  });

  it('si nadie renueva el TTL (proceso muerto), la presencia vence sola', async () => {
    const main = server;
    server = await startServer({ databaseUrl: null, redisUrl, presenceTtlSec: 1 });
    try {
      const a = await account('ta');
      const b = await account('tb');
      const { request } = await post('/friends/requests', { username: b.user.username }, a.token);
      await post(`/friends/requests/${request.id}/accept`, {}, b.token);
      const cb = await connect(b);
      expect((await friendsOf(a))[0].presence).toEqual({ status: 'online' });
      // En tests el heartbeat es de 60 s: nadie renueva el TTL de 1 s, como si el proceso hubiera muerto.
      await sleep(1300);
      expect((await friendsOf(a))[0].presence).toEqual({ status: 'offline' });
      cb.close();
    } finally {
      await server.app.close();
      server = main;
    }
  });

  it('los invitados no publican presencia', async () => {
    const g = await post('/auth/guest', { nickname: 'Invitado' });
    const cg = await connect(g);
    await server.app.deps.presence.settle();
    expect((await server.app.deps.presence.getMany([g.user.id])).get(g.user.id)).toEqual({ status: 'offline' });
    cg.close();
  });
}

describe('presencia e2e (memoria)', () => presenceSuite(null));
describe.skipIf(!hasRedis)('presencia e2e (redis)', () => presenceSuite(process.env.REDIS_URL));

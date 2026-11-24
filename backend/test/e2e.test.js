import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startServer, TestClient } from './helpers.js';

let server;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.app.close();
});

describe('REST', () => {
  it('health y guest', async () => {
    const h = await (await fetch(`${server.base}/health`)).json();
    expect(h.ok).toBe(true);
    const bad = await fetch(`${server.base}/auth/guest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"nickname":"x"}' });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe('BAD_REQUEST');
  });

  it('ws sin token → 401', async () => {
    const ws = new WebSocket(`${server.ws}?token=nope`);
    const err = await new Promise((r) => ws.on('unexpected-response', (_req, res) => r(res.statusCode)));
    expect(err).toBe(401);
  });
});

describe('partida online de punta a punta', () => {
  it('4 jugadores: sala por código, 2 dúos, start, snapshots, eventos y fin', async () => {
    const [a, b, c, d] = await Promise.all(['ana', 'beto', 'caro', 'dani'].map((n) => TestClient.connect(server, n)));

    const { code } = await a.request('room:create', { level: 'muelle', maxDuos: 2 });
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    const pub = await (await fetch(`${server.base}/rooms`)).json();
    expect(pub.rooms.map((r) => r.code)).toContain(code);

    for (const p of [b, c, d]) await p.request('room:join', { code: code.toLowerCase() });
    await expect(a.request('room:start')).rejects.toMatchObject({ code: 'CANNOT_START' });

    for (const p of [b, c, d]) await p.request('room:ready', { ready: true });
    const startP = Promise.all([a, b, c, d].map((p) => p.next('match:start')));
    await a.request('room:start');
    const [start] = await startP;
    expect(start.d.duos).toHaveLength(2);
    expect(start.d.duos[0].players.map((p) => p.userId)).toEqual([a.user.id, b.user.id]);

    await a.next((m) => m.t === 'room:state' && m.d.state === 'playing');
    // Dúo 0 avanza y salta; los demás (dúo 1) lo ven en sus snapshots y eventos.
    const first = await c.next('match:snapshot');
    const z0 = first.d.duos[0].players[0].pos[2];
    let seq = 0;
    const iv = setInterval(() => {
      seq++;
      a.send('input', { seq, slot: 1, x: 0, z: -1, jump: seq % 10 === 0, jumpHeld: false });
      b.send('input', { seq, slot: 2, x: 0, z: -1, jump: false, jumpHeld: false });
    }, 33);
    const jumpSeen = c.next((m) => m.t === 'match:events' && m.d.events.some((e) => e.e === 'player:jump' && e.duo === 0));
    await jumpSeen;
    await new Promise((r) => setTimeout(r, 800));
    clearInterval(iv);
    const last = c.inbox.filter((m) => m.t === 'match:snapshot').at(-1);
    expect(last.d.duos[0].players[0].pos[2]).toBeLessThan(z0 - 1);
    expect(c.count('match:snapshot')).toBeGreaterThanOrEqual(10);

    // Se corta la partida → match:end con ranking → la sala vuelve al lobby.
    const room = server.app.deps.rooms.get(code);
    room.match.abort();
    const end = await a.next('match:end');
    expect(end.d.reason).toBe('aborted');
    expect(end.d.ranking).toHaveLength(2);
    await a.next((m) => m.t === 'room:state' && m.d.state === 'lobby');

    for (const p of [a, b, c, d]) p.close();
  });

  it('errores con rid: sala inexistente', async () => {
    const e = await TestClient.connect(server, 'eva');
    await expect(e.request('room:join', { code: 'ZZZZZZ' })).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
    await expect(e.request('room:join', { code: '1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    e.close();
  });

  it('reconexión durante la partida reenvía match:start con resume', async () => {
    const f = await TestClient.connect(server, 'fede');
    const { code } = await f.request('room:create', { maxDuos: 1 });
    await f.request('room:setTeam', { teamId: 0, slots: [1, 2] }); // dúo de sofá
    const st = f.next('match:start');
    await f.request('room:start');
    await st;
    // Nueva conexión del MISMO usuario: firmamos un token para su id.
    const t2 = server.app.jwt.sign({ sub: f.user.id, name: f.user.displayName, guest: true });
    const ws2 = new WebSocket(`${server.ws}?token=${t2}`);
    const f2 = new TestClient(ws2, f.user);
    const resumed = await f2.next((m) => m.t === 'match:start');
    expect(resumed.d.resume).toBe(true);
    expect(server.app.deps.rooms.get(code)).toBeTruthy();
    f2.close();
  });
});

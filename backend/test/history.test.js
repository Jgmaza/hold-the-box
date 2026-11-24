// Historial y estadísticas (#8). Contra memoria siempre y Postgres si hay DATABASE_URL.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { hasDb, withTestDb } from './db.js';
import { startServer, TestClient } from './helpers.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let seq = 0;

function historySuite(getDbUrl, { pg = false, t = null } = {}) {
  let server;
  beforeAll(async () => {
    server = await startServer({ databaseUrl: getDbUrl(), redisUrl: null });
  });
  afterAll(async () => {
    await server?.app.close();
  });

  const get = async (path, token) => {
    const r = await fetch(`${server.base}${path}`, { headers: { authorization: `Bearer ${token}` } });
    return { status: r.status, body: await r.json() };
  };
  const player = async (p) => {
    const r = await fetch(`${server.base}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `${p}${Date.now().toString(36).slice(-4)}${seq++}`, password: 'contraseña1' }),
    });
    const body = await r.json();
    body.c = new TestClient(new WebSocket(`${server.ws}?token=${body.token}`), body.user);
    await body.c.next('welcome');
    return body;
  };
  /** A + B en el dúo 0, C dúo de sofá en el 1; empieza y espera a que esté en juego. */
  const playMatch = async () => {
    const [a, b, c] = [await player('ha'), await player('hb'), await player('hc')];
    const { code } = await a.c.request('room:create', { level: 'bahia', maxDuos: 2, boxProfile: 'vip' });
    await b.c.request('room:join', { code });
    await c.c.request('room:join', { code });
    await c.c.request('room:setTeam', { teamId: 1, slots: [1, 2] });
    await b.c.request('room:ready', { ready: true });
    await c.c.request('room:ready', { ready: true });
    const playing = a.c.next((m) => m.t === 'room:state' && m.d.state === 'playing');
    await a.c.request('room:start');
    await playing;
    return { a, b, c, code };
  };
  const waitMatches = async (token, n) => {
    for (let i = 0; i < 50; i++) {
      const { body } = await get('/me/matches', token);
      if (body.matches.length >= n) return body.matches;
      await sleep(20);
    }
    throw new Error('no se guardó la partida');
  };

  it('partida terminada → 1 partida y una fila por puesto; /me/matches con compañeros', async () => {
    const { a, b, c, code } = await playMatch();
    const lobby = a.c.next((m) => m.t === 'room:state' && m.d.state === 'lobby');
    server.app.deps.rooms.get(code).match.abort();
    await a.c.next('match:end');

    const [ma] = await waitMatches(a.token, 1);
    expect(ma).toMatchObject({ level: 'bahia', boxProfile: 'vip', status: 'dnf', finishTime: null });
    expect(ma.teammates).toEqual([{ id: b.user.id, displayName: b.user.displayName }]);
    expect(new Date(ma.endedAt).getTime()).toBeGreaterThan(Date.now() - 10_000);
    const [mc] = await waitMatches(c.token, 1); // dúo de sofá: una sola entrada y sin compañeros
    expect(mc.id).toBe(ma.id);
    expect(mc.teammates).toEqual([]);
    expect([ma.placement, mc.placement].sort()).toEqual([1, 2]);

    if (pg) {
      const m = await t.pool.query('select count(*)::int as n from matches where id = $1', [ma.id]);
      const r = await t.pool.query('select user_id, slot from match_results where match_id = $1 order by team_id, slot', [ma.id]);
      expect(m.rows[0].n).toBe(1);
      expect(r.rows).toEqual([
        { user_id: a.user.id, slot: 1 },
        { user_id: b.user.id, slot: 2 },
        { user_id: c.user.id, slot: 1 },
        { user_id: c.user.id, slot: 2 },
      ]);
    }
    await lobby;
    for (const p of [a, b, c]) p.c.close();
  });

  it('cortada en la cuenta atrás → no se guarda', async () => {
    const a = await player('cd');
    const { code } = await a.c.request('room:create', { maxDuos: 1 });
    await a.c.request('room:setTeam', { teamId: 0, slots: [1, 2] });
    await a.c.request('room:start');
    server.app.deps.rooms.get(code).match.abort();
    await a.c.next('match:end');
    await sleep(100);
    expect((await get('/me/matches', a.token)).body.matches).toEqual([]);
    a.c.close();
  });

  it('estadísticas y paginación con datos sembrados', async () => {
    const [me, mate] = [await player('st'), await player('sm')];
    const h = server.app.deps.history;
    const save = async (level, placement, status, finishTime, { sofa = false, withMate = false } = {}) => {
      const id = crypto.randomUUID();
      const results = [
        { userId: me.user.id, teamId: 0, slot: 1, placement, status, finishTime, rating: null, integrity: 90, wetness: 0 },
        sofa
          ? { userId: me.user.id, teamId: 0, slot: 2, placement, status, finishTime, rating: null, integrity: 90, wetness: 0 }
          : { userId: withMate ? mate.user.id : crypto.randomUUID(), teamId: 0, slot: 2, placement, status, finishTime, rating: null, integrity: 90, wetness: 0 },
      ];
      await h.save({ id, roomCode: 'ABC123', level, boxProfile: 'vip', seed: 7, reason: 'allDone', durationS: 99.5, startedAt: new Date().toISOString(), results });
      await sleep(15); // ended_at distinto para paginar
      return id;
    };
    const m1 = await save('muelle', 1, 'finished', 90.123, { sofa: true });
    const m2 = await save('muelle', 2, 'finished', 83.2, { withMate: true });
    const m3 = await save('bahia', 1, 'finished', 120.5);
    const m4 = await save('muelle', 4, 'eliminated', null);
    await save('bahia', 3, 'dnf', null);

    const stats = (await get(`/users/${me.user.id}/stats`, mate.token)).body;
    expect(stats).toEqual({
      played: 5,
      wins: 2,
      podiums: 4,
      finishes: 3,
      bestTimes: { muelle: 83.2, bahia: 120.5 },
      favoriteLevel: 'muelle',
    });
    expect((await get(`/users/${mate.user.id}/stats`, me.token)).body).toMatchObject({ played: 1, wins: 0, podiums: 1 });

    const p1 = (await get('/me/matches?limit=2', me.token)).body.matches;
    expect(p1).toHaveLength(2);
    const p2 = (await get(`/me/matches?limit=2&before=${encodeURIComponent(p1[1].endedAt)}`, me.token)).body.matches;
    const p3 = (await get(`/me/matches?limit=2&before=${encodeURIComponent(p2[1].endedAt)}`, me.token)).body.matches;
    expect([...p1, ...p2, ...p3].map((m) => m.id).slice(1)).toEqual([m4, m3, m2, m1]);
    expect(p2.find((m) => m.id === m2)).toMatchObject({ finishTime: 83.2, teammates: [{ id: mate.user.id, displayName: mate.user.displayName }] });
    expect(p3.find((m) => m.id === m1).teammates).toEqual([]); // sofá
    expect(p2.find((m) => m.id === m3).teammates).toEqual([]); // compañero que no existe en la BD: se ignora

    expect((await get(`/users/${crypto.randomUUID()}/stats`, me.token)).body.error.code).toBe('USER_NOT_FOUND');
    expect((await get('/me/matches?before=ayer', me.token)).status).toBe(400);
    for (const p of [me, mate]) p.c.close();
  });

  if (pg) {
    it('con Postgres caído, la partida termina y la sala vuelve al lobby igual', async () => {
      const { a, b, c, code } = await playMatch();
      await server.app.deps.db.pool.end();
      const lobby = a.c.next((m) => m.t === 'room:state' && m.d.state === 'lobby');
      const ended = a.c.next('match:end');
      server.app.deps.rooms.get(code).match.abort();
      await ended;
      expect((await lobby).d.code).toBe(code);
      for (const p of [a, b, c]) p.c.close();
    });
  }
}

describe('historial (memoria)', () => historySuite(() => null));

describe.skipIf(!hasDb)('historial (postgres)', () => {
  const t = withTestDb();
  historySuite(() => t.url, { pg: true, t });
});

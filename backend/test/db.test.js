import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { friendRequests, friendships, users } from '../src/db/schema.js';
import { hasDb, withTestDb } from './db.js';
import { startServer } from './helpers.js';

describe('/health sin almacenes configurados', () => {
  it('db y redis en "disabled"', async () => {
    const server = await startServer({ databaseUrl: null, redisUrl: null });
    try {
      const h = await (await fetch(`${server.base}/health`)).json();
      expect(h).toMatchObject({ ok: true, db: 'disabled', redis: 'disabled' });
    } finally {
      await server.app.close();
    }
  });

  it('un almacén configurado que no responde → "down" y ok:false', async () => {
    const server = await startServer({ databaseUrl: null, redisUrl: 'redis://127.0.0.1:1' });
    try {
      const h = await (await fetch(`${server.base}/health`)).json();
      expect(h).toMatchObject({ ok: false, db: 'disabled', redis: 'down' });
    } finally {
      await server.app.close();
    }
  });
});

describe.skipIf(!hasDb)('esquema PostgreSQL', () => {
  const t = withTestDb();

  const twoUsers = () =>
    t.db
      .insert(users)
      .values([{ displayName: 'Ana' }, { displayName: 'Beto' }])
      .returning({ id: users.id })
      .then((rows) => rows.map((r) => r.id).sort());

  it('las 6 tablas y el enum existen', async () => {
    const { rows } = await t.pool.query(`select tablename from pg_tables where schemaname = 'public' order by 1`);
    expect(rows.map((r) => r.tablename)).toEqual([
      'friend_requests',
      'friendships',
      'match_results',
      'matches',
      'refresh_tokens',
      'users',
    ]);
    const e = await t.pool.query(`select enum_range(null::friend_request_status)::text as v`);
    expect(e.rows[0].v).toBe('{pending,accepted,declined,cancelled}');
  });

  it('friendships exige user_a < user_b', async () => {
    const [lo, hi] = await twoUsers();
    await expect(t.db.insert(friendships).values({ userA: hi, userB: lo })).rejects.toMatchObject({
      cause: { constraint: 'friendships_ordered' },
    });
    await t.db.insert(friendships).values({ userA: lo, userB: hi });
  });

  it('una sola solicitud pendiente por pareja, en cualquier dirección', async () => {
    const [a, b] = await twoUsers();
    await t.db.insert(friendRequests).values({ fromUserId: a, toUserId: b });
    await expect(t.db.insert(friendRequests).values({ fromUserId: b, toUserId: a })).rejects.toMatchObject({
      cause: { constraint: 'friend_requests_pending_uq' },
    });
    await t.db.update(friendRequests).set({ status: 'declined' });
    await t.db.insert(friendRequests).values({ fromUserId: b, toUserId: a });
  });

  it('username es único sin distinguir mayúsculas (citext)', async () => {
    await t.db.insert(users).values({ username: 'ana_01', displayName: 'Ana', isGuest: false });
    await expect(
      t.db.insert(users).values({ username: 'ANA_01', displayName: 'Ana2', isGuest: false }),
    ).rejects.toMatchObject({ cause: { constraint: 'users_username_unique' } });
    const [{ n }] = await t.db.execute(sql`select count(*)::int as n from users where username = 'Ana_01'`).then((r) => r.rows);
    expect(n).toBe(1);
  });
});

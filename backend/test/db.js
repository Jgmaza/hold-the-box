// Base de datos para tests: `<db>_test_<worker>` junto a la de DATABASE_URL (o TEST_DATABASE_URL), migrada al
// empezar y con todas las tablas vaciadas antes de cada test. Una por worker de vitest: los archivos corren en
// paralelo y cada uno vacía tablas. Los tests de BD se saltan si no hay DATABASE_URL:
//   describe.skipIf(!hasDb)('...', () => { const t = withTestDb(); ... t.db ... })
import pg from 'pg';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';

export const hasDb = !!process.env.DATABASE_URL;

function testUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname.slice(1)}_test_${process.env.VITEST_POOL_ID ?? 0}`;
  return url.toString();
}

async function ensureDatabase(url) {
  const name = new URL(url).pathname.slice(1);
  const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();
  try {
    const { rowCount } = await admin.query('select 1 from pg_database where datname = $1', [name]);
    if (!rowCount) await admin.query(`create database "${name.replaceAll('"', '""')}"`);
  } finally {
    await admin.end();
  }
}

/** Registra los hooks y devuelve `{ url, db, pool }` (rellenos tras beforeAll). */
export function withTestDb() {
  const ctx = { url: null, db: null, pool: null };
  let conn;

  beforeAll(async () => {
    const url = testUrl();
    await ensureDatabase(url);
    await runMigrations(url);
    ctx.url = url;
    conn = createDb(url);
    ctx.db = conn.db;
    ctx.pool = conn.pool;
  });

  beforeEach(async () => {
    const { rows } = await conn.pool.query(`select tablename from pg_tables where schemaname = 'public'`);
    if (!rows.length) return;
    const truncate = `truncate ${rows.map((r) => `"${r.tablename}"`).join(', ')} restart identity cascade`;
    // El servidor del test anterior puede seguir consultando (p. ej. presencia al cerrarse los sockets): el
    // TRUNCATE bloquea tabla por tabla y Postgres puede abortarlo por deadlock (40P01). Se reintenta.
    for (let attempt = 1; ; attempt++) {
      try {
        await conn.pool.query(truncate);
        return;
      } catch (err) {
        if (err.code !== '40P01' || attempt >= 5) throw err;
        await new Promise((r) => setTimeout(r, 20 * attempt));
      }
    }
  });

  afterAll(async () => {
    await conn?.close();
  });

  return ctx;
}

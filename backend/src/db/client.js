// Conexión a PostgreSQL: pool de `pg` + Drizzle con el esquema.
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

/** @returns {{ db: import('drizzle-orm/node-postgres').NodePgDatabase<typeof schema>, pool: pg.Pool, close: () => Promise<void> }} */
export function createDb(url, { logger } = {}) {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  // Sin listener, un cliente inactivo que pierde la conexión tumba el proceso.
  pool.on('error', (err) => logger?.warn({ err }, 'postgres: error en cliente inactivo'));
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}

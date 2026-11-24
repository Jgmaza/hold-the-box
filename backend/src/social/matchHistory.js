// Historial de partidas y estadísticas (#8). Se guarda en RoomManager.onMatchEnd, que ya corre fuera del tick y
// registra cualquier error sin tocar la sala. Dos almacenes con el mismo contrato:
//   save(row)                             → guarda la partida y una fila por puesto (dúo de sofá: slot 1 y 2)
//   listFor(userId, { limit, before })    → historial, ended_at desc
//   statsFor(userId)                      → { played, wins, podiums, finishes, bestTimes, favoriteLevel }
import { randomUUID } from 'node:crypto';
import { and, inArray, ne, sql } from 'drizzle-orm';
import { matchResults, matches, users } from '../db/schema.js';

const r3 = (n) => (n === null || n === undefined ? null : Math.round(Number(n) * 1000) / 1000);
// db.execute devuelve timestamptz como texto de Postgres ("2026-11-05 07:07:44.824921+00"): a ISO con ms.
const iso = (d) => new Date(d).toISOString();

/**
 * Resultado de la sala (room.lastResults) → fila para guardar. null si la partida nunca empezó.
 * @param {{ code: string }} room
 * @param {{ matchId, level, boxProfile, seed, reason, time, startedAt, ranking }} results
 */
export function toMatchRow(room, results) {
  if (!results.startedAt) return null;
  return {
    id: results.matchId ?? randomUUID(),
    roomCode: room.code,
    level: results.level,
    boxProfile: results.boxProfile,
    seed: results.seed,
    reason: results.reason,
    durationS: results.time,
    startedAt: results.startedAt,
    results: results.ranking.flatMap((row) =>
      row.players.map((p) => ({
        userId: p.userId,
        teamId: row.teamId,
        slot: p.slot,
        placement: row.placement,
        status: row.status,
        finishTime: row.finishTime,
        rating: row.rating,
        integrity: row.integrity,
        wetness: row.wetness,
      })),
    ),
  };
}

export async function saveMatch(history, room, results) {
  const row = toMatchRow(room, results);
  if (row) await history.save(row);
}

export class PgMatchHistory {
  /** @param {import('drizzle-orm/node-postgres').NodePgDatabase} db */
  constructor(db) {
    this.db = db;
  }

  async save(row) {
    const ids = [...new Set(row.results.map((r) => r.userId))];
    await this.db.transaction(async (tx) => {
      // Solo usuarios que existen en la BD (un token de otro servidor no tiene fila en users).
      const known = new Set(
        (await tx.select({ id: users.id }).from(users).where(inArray(users.id, ids))).map((u) => u.id),
      );
      const { results, startedAt, ...m } = row;
      await tx.insert(matches).values({ ...m, startedAt: new Date(startedAt) });
      const rows = results.filter((r) => known.has(r.userId)).map((r) => ({ ...r, matchId: row.id }));
      if (rows.length) await tx.insert(matchResults).values(rows);
    });
  }

  async listFor(userId, { limit = 20, before = null } = {}) {
    // Dúo de sofá: una sola fila por partida (la del slot más bajo).
    const { rows } = await this.db.execute(sql`
      with mine as (
        select distinct on (r.match_id) r.match_id, r.team_id, r.placement, r.status, r.finish_time, r.rating
        from match_results r where r.user_id = ${userId}
        order by r.match_id, r.slot
      )
      select m.id, m.level, m.box_profile, m.ended_at, m.duration_s,
             mine.team_id, mine.placement, mine.status, mine.finish_time, mine.rating
      from mine join matches m on m.id = mine.match_id
      where ${before}::timestamptz is null or date_trunc('milliseconds', m.ended_at) < ${before}::timestamptz
      order by m.ended_at desc
      limit ${limit}`);
    if (!rows.length) return [];

    const mates = await this.db
      .selectDistinct({ matchId: matchResults.matchId, teamId: matchResults.teamId, id: users.id, displayName: users.displayName })
      .from(matchResults)
      .innerJoin(users, sql`${users.id} = ${matchResults.userId}`)
      .where(and(inArray(matchResults.matchId, rows.map((r) => r.id)), ne(matchResults.userId, userId)));

    return rows.map((r) => ({
      id: r.id,
      level: r.level,
      boxProfile: r.box_profile,
      endedAt: iso(r.ended_at),
      durationS: r3(r.duration_s),
      placement: r.placement,
      status: r.status,
      finishTime: r3(r.finish_time),
      rating: r.rating,
      teammates: mates.filter((t) => t.matchId === r.id && t.teamId === r.team_id).map(({ id, displayName }) => ({ id, displayName })),
    }));
  }

  async statsFor(userId) {
    const mine = sql`
      select distinct on (r.match_id) r.match_id, r.placement, r.status, r.finish_time
      from match_results r where r.user_id = ${userId}
      order by r.match_id, r.slot`;
    const [{ rows: [totals] }, { rows: best }, { rows: fav }] = await Promise.all([
      this.db.execute(sql`
        with mine as (${mine})
        select count(*)::int as played,
               count(*) filter (where placement = 1 and status = 'finished')::int as wins,
               count(*) filter (where placement <= 3)::int as podiums,
               count(*) filter (where status = 'finished')::int as finishes
        from mine`),
      this.db.execute(sql`
        with mine as (${mine})
        select m.level, min(mine.finish_time) as best
        from mine join matches m on m.id = mine.match_id
        where mine.status = 'finished' group by m.level`),
      this.db.execute(sql`
        with mine as (${mine})
        select m.level from mine join matches m on m.id = mine.match_id
        group by m.level order by count(*) desc, max(m.ended_at) desc limit 1`),
    ]);
    return {
      ...totals,
      bestTimes: Object.fromEntries(best.map((b) => [b.level, r3(b.best)])),
      favoriteLevel: fav[0]?.level ?? null,
    };
  }
}

/** Sin BD: en memoria (se pierde al reiniciar). Lee los nombres de un MemoryUserRepo. */
export class MemoryMatchHistory {
  constructor(userRepo, { maxMatches = 5000 } = {}) {
    this.userRepo = userRepo;
    this.maxMatches = maxMatches;
    this.matches = []; // { id, level, boxProfile, endedAt, durationS, results }
  }

  async save(row) {
    const known = row.results.filter((r) => this.userRepo.users.has(r.userId));
    this.matches.push({ ...row, endedAt: new Date().toISOString(), results: known });
    if (this.matches.length > this.maxMatches) this.matches.shift();
  }

  /** Una fila por partida en la que estuvo (la del slot más bajo). */
  _mine(userId) {
    const out = [];
    for (const m of this.matches) {
      const r = m.results.filter((x) => x.userId === userId).sort((a, b) => a.slot - b.slot)[0];
      if (r) out.push({ m, r });
    }
    return out;
  }

  async listFor(userId, { limit = 20, before = null } = {}) {
    return this._mine(userId)
      .filter(({ m }) => !before || m.endedAt < new Date(before).toISOString())
      .sort((a, b) => (a.m.endedAt < b.m.endedAt ? 1 : a.m.endedAt > b.m.endedAt ? -1 : 0))
      .slice(0, limit)
      .map(({ m, r }) => ({
        id: m.id,
        level: m.level,
        boxProfile: m.boxProfile,
        endedAt: m.endedAt,
        durationS: r3(m.durationS),
        placement: r.placement,
        status: r.status,
        finishTime: r3(r.finishTime),
        rating: r.rating,
        teammates: [
          ...new Map(
            m.results
              .filter((x) => x.teamId === r.teamId && x.userId !== userId)
              .map((x) => [x.userId, { id: x.userId, displayName: this.userRepo.users.get(x.userId)?.displayName }]),
          ).values(),
        ],
      }));
  }

  async statsFor(userId) {
    const mine = this._mine(userId);
    const bestTimes = {};
    const perLevel = new Map(); // level → { n, last }
    for (const { m, r } of mine) {
      if (r.status === 'finished' && r.finishTime !== null) {
        bestTimes[m.level] = Math.min(bestTimes[m.level] ?? Infinity, r3(r.finishTime));
      }
      const p = perLevel.get(m.level) ?? { n: 0, last: '' };
      perLevel.set(m.level, { n: p.n + 1, last: m.endedAt > p.last ? m.endedAt : p.last });
    }
    const fav = [...perLevel].sort((a, b) => b[1].n - a[1].n || (a[1].last < b[1].last ? 1 : -1))[0];
    return {
      played: mine.length,
      wins: mine.filter(({ r }) => r.placement === 1 && r.status === 'finished').length,
      podiums: mine.filter(({ r }) => r.placement <= 3).length,
      finishes: mine.filter(({ r }) => r.status === 'finished').length,
      bestTimes,
      favoriteLevel: fav?.[0] ?? null,
    };
  }
}

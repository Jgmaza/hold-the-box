// Esquema PostgreSQL (SDD §5.2). Tras cambiarlo: `npm run db:generate` y revisar el SQL en drizzle/.
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  customType,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// La extensión se crea en la migración 0000_extensions.sql.
const citext = customType({ dataType: () => 'citext' });

const tsz = (name) => timestamp(name, { withTimezone: true });

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: citext('username').unique(), // null en invitados; ^[a-z0-9_]{3,16}$ validado en app
    displayName: text('display_name').notNull(),
    passwordHash: text('password_hash'), // argon2id; null en invitados
    isGuest: boolean('is_guest').notNull().default(true),
    createdAt: tsz('created_at').notNull().defaultNow(),
    lastSeenAt: tsz('last_seen_at'),
  },
  (t) => [check('users_display_name_len', sql`char_length(${t.displayName}) between 3 and 16`)],
);

export const friendRequestStatus = pgEnum('friend_request_status', ['pending', 'accepted', 'declined', 'cancelled']);

export const friendRequests = pgTable(
  'friend_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendRequestStatus('status').notNull().default('pending'),
    createdAt: tsz('created_at').notNull().defaultNow(),
    respondedAt: tsz('responded_at'),
  },
  (t) => [
    check('friend_requests_not_self', sql`${t.fromUserId} <> ${t.toUserId}`),
    // Una sola solicitud pendiente por pareja, en cualquier dirección.
    uniqueIndex('friend_requests_pending_uq')
      .on(sql`least(${t.fromUserId}, ${t.toUserId})`, sql`greatest(${t.fromUserId}, ${t.toUserId})`)
      .where(sql`${t.status} = 'pending'`),
  ],
);

// Una fila por pareja con user_a < user_b.
export const friendships = pgTable(
  'friendships',
  {
    userA: uuid('user_a')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userB: uuid('user_b')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: tsz('created_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userA, t.userB] }),
    check('friendships_ordered', sql`${t.userA} < ${t.userB}`),
    index('friendships_b_idx').on(t.userB),
  ],
);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: tsz('expires_at').notNull(),
  revokedAt: tsz('revoked_at'),
});

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey(),
  roomCode: text('room_code').notNull(),
  level: text('level').notNull(),
  boxProfile: text('box_profile').notNull(),
  seed: bigint('seed', { mode: 'number' }).notNull(),
  reason: text('reason').notNull(), // allDone | timeLimit | aborted
  durationS: real('duration_s').notNull(),
  startedAt: tsz('started_at').notNull(),
  endedAt: tsz('ended_at').notNull().defaultNow(),
});

export const matchResults = pgTable(
  'match_results',
  {
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: smallint('team_id').notNull(),
    slot: smallint('slot').notNull(),
    placement: smallint('placement').notNull(),
    status: text('status').notNull(), // finished | eliminated | dnf
    finishTime: real('finish_time'),
    rating: text('rating'),
    integrity: smallint('integrity'),
    wetness: smallint('wetness'),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.userId, t.slot] }),
    check('match_results_slot', sql`${t.slot} in (1, 2)`),
    index('match_results_user_idx').on(t.userId, t.matchId),
  ],
);

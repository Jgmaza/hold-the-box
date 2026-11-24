// Protocolo WebSocket (ver docs/PROTOCOL.md). Envoltura: { t: string, d?: object, rid?: string|number }.
// Cada mensaje cliente → servidor se valida aquí con zod antes de tocar la lógica.
import { z } from 'zod';
import { BOX_CHOICES, CHARACTER_IDS, LEVELS } from '../game/index.js';
import { EMOTE_IDS } from '../social/emotes.js';

const levelKey = z.enum(Object.keys(LEVELS));
const boxProfile = z.enum(BOX_CHOICES.map((b) => b.id));
const roomCode = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{6}$/, 'código de 6 caracteres'));
const charId = z.enum(CHARACTER_IDS);
const slot = z.union([z.literal(1), z.literal(2)]);
const axis = z.number().finite().min(-1).max(1);

export const CLIENT_MESSAGES = {
  'room:create': z
    .object({
      level: levelKey.default('muelle'),
      maxDuos: z.number().int().min(1).max(8).default(4),
      isPrivate: z.boolean().default(false),
      boxProfile: boxProfile.default('vip'),
    })
    .default({}),
  'room:join': z.object({ code: roomCode }),
  'room:leave': z.object({}).default({}),
  // teamId null = levantarse y mirar (espectador).
  'room:setTeam': z.union([
    z.object({
      teamId: z.number().int().min(0).max(7),
      slots: z
        .array(slot)
        .min(1)
        .max(2)
        .refine((a) => new Set(a).size === a.length, 'slots repetidos'),
    }),
    z.object({ teamId: z.null(), slots: z.array(slot).max(0).optional() }),
  ]),
  'room:spectate': z.object({ code: roomCode }),
  'match:watch': z.object({ duo: z.number().int().min(0).max(7) }),
  'room:ready': z.object({ ready: z.boolean() }),
  'room:settings': z
    .object({
      level: levelKey.optional(),
      maxDuos: z.number().int().min(1).max(8).optional(),
      isPrivate: z.boolean().optional(),
      boxProfile: boxProfile.optional(),
    })
    .refine((o) => Object.keys(o).length > 0, 'nada que cambiar'),
  'room:setChars': z
    .object({ p1: charId.optional(), p2: charId.optional() })
    .refine((o) => o.p1 !== undefined || o.p2 !== undefined, 'manda p1 y/o p2'),
  'room:kick': z.object({ userId: z.string().min(1) }),
  'room:start': z.object({}).default({}),
  'room:invite': z.object({ userId: z.string().uuid() }),
  'invite:accept': z.object({ inviteId: z.string().uuid() }),
  'invite:decline': z.object({ inviteId: z.string().uuid() }),
  input: z.object({
    seq: z.number().int().nonnegative(),
    slot: slot.default(1),
    x: axis,
    z: axis,
    jump: z.boolean().default(false), // se pulsó salto desde el último input (flanco)
    jumpHeld: z.boolean().default(false),
  }),
  ping: z.object({ t: z.number() }),
  emote: z.object({ id: z.enum(EMOTE_IDS) }),
  'queue:join': z.object({
    mode: z.enum(['duo', 'solo']),
    level: levelKey.optional(),
  }),
  'queue:leave': z.object({}).default({}),
};

const envelope = z.object({
  t: z.string().min(1).max(32),
  d: z.unknown().optional(),
  rid: z.union([z.string().max(64), z.number()]).optional(),
});

export const MAX_MESSAGE_BYTES = 4096;

/** @returns {{ ok: true, t, d, rid } | { ok: false, code, message, rid? }} */
export function parseClientMessage(raw) {
  if (raw.length > MAX_MESSAGE_BYTES) return { ok: false, code: 'BAD_REQUEST', message: 'mensaje demasiado grande' };
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, code: 'BAD_REQUEST', message: 'JSON inválido' };
  }
  const env = envelope.safeParse(json);
  if (!env.success) return { ok: false, code: 'BAD_REQUEST', message: 'envoltura inválida: { t, d?, rid? }' };
  const { t, d, rid } = env.data;
  const schema = CLIENT_MESSAGES[t];
  if (!schema) return { ok: false, code: 'UNKNOWN_TYPE', message: `tipo desconocido: ${t}`, rid };
  const body = schema.safeParse(d ?? {});
  if (!body.success) {
    const i = body.error.issues[0];
    return { ok: false, code: 'BAD_REQUEST', message: `${t}: ${i.path.join('.') || 'd'} ${i.message}`, rid };
  }
  return { ok: true, t, d: body.data, rid };
}

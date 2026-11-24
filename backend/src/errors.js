// Error de dominio con código estable (el cliente decide qué mostrar según `code`).
export class AppError extends Error {
  /** @param {string} code  p.ej. ROOM_NOT_FOUND  @param {string} message  @param {number} status  HTTP */
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Valida con zod o lanza 400 BAD_REQUEST con el primer problema (`campo: mensaje`). */
export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    const { path, message } = r.error.issues[0];
    throw new AppError('BAD_REQUEST', path.length ? `${path.join('.')}: ${message}` : message);
  }
  return r.data;
}

export const ERR = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_IN_GAME: 'ROOM_IN_GAME',
  NOT_HOST: 'NOT_HOST',
  SLOT_TAKEN: 'SLOT_TAKEN',
  CANNOT_START: 'CANNOT_START',
  NOT_IN_MATCH: 'NOT_IN_MATCH',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_REQUIRED: 'ACCOUNT_REQUIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
  REQUEST_PENDING: 'REQUEST_PENDING',
  REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
  NOT_FRIENDS: 'NOT_FRIENDS',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  RATE_LIMITED: 'RATE_LIMITED',
  INVITE_EXPIRED: 'INVITE_EXPIRED',
  FRIEND_NOT_IN_LOBBY: 'FRIEND_NOT_IN_LOBBY',
};

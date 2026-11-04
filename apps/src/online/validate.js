// Reglas de correo, nombre de usuario y código de sala. El backend debe aplicar las mismas (docs/online.md).
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 16;
export const ROOM_CODE_LEN = 5;
// Sin O/0 ni I/1: se confunden al dictar el código.
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME = /^[A-Za-z0-9_]+$/;
const NOT_IN_ALPHABET = new RegExp(`[^${ROOM_ALPHABET}]`, 'g');

export function normalizeEmail(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

export function isValidEmail(raw) {
  return EMAIL.test(normalizeEmail(raw));
}

/** null si el nombre sirve; si no, el motivo para mostrarlo debajo del campo. */
export function usernameError(raw) {
  const name = String(raw ?? '').trim();
  if (name.length < USERNAME_MIN) return `Mínimo ${USERNAME_MIN} caracteres`;
  if (name.length > USERNAME_MAX) return `Máximo ${USERNAME_MAX} caracteres`;
  if (!USERNAME.test(name)) return 'Solo letras, números y _';
  return null;
}

/** Mayúsculas y solo caracteres que puede tener un código (lo que se escribe en el campo). */
export function normalizeRoomCode(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(NOT_IN_ALPHABET, '')
    .slice(0, ROOM_CODE_LEN);
}

export function isValidRoomCode(raw) {
  return normalizeRoomCode(raw).length === ROOM_CODE_LEN;
}

export function randomRoomCode(rand = Math.random) {
  return Array.from({ length: ROOM_CODE_LEN }, () => ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)]).join('');
}

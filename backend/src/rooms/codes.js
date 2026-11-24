// Códigos de sala: 6 caracteres sin ambiguos (sin 0/O, 1/I/L).
import { randomInt } from 'node:crypto';

export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

/** @param {(code: string) => boolean} taken */
export function uniqueCode(taken, tries = 50) {
  for (let i = 0; i < tries; i++) {
    const c = randomCode();
    if (!taken(c)) return c;
  }
  throw new Error('no se pudo generar un código de sala libre');
}

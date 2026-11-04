// Backend de mentira para usar la UI online sin Supabase: el enlace mágico "se abre" solo,
// se puede entrar como invitado y en la sala aparece un compañero simulado que marca LISTO después de ti.
// Implementa el mismo contrato que el backend real (docs/online.md).
import { Emitter } from './emitter.js';
import { isValidEmail, isValidRoomCode, normalizeEmail, normalizeRoomCode, randomRoomCode, usernameError } from './validate.js';

export const DEMO_DELAY = { link: 2500, partnerJoin: 2500, partnerReady: 1200 };
export const DEMO_LEVEL = 'muelle';
// Nombres "ocupados" para poder ver ese error en la demo.
const TAKEN = new Set(['admin', 'jose', 'holdthebox']);

class DemoAuth {
  constructor(delay) {
    this.session = null;
    this.profile = null;
    this._delay = delay;
    this._changed = new Emitter();
    this._linkTimer = null;
  }

  onChange(fn) {
    return this._changed.on(fn);
  }

  async sendMagicLink(email) {
    if (!isValidEmail(email)) return { ok: false, error: 'invalid_email' };
    const address = normalizeEmail(email);
    clearTimeout(this._linkTimer);
    this._linkTimer = setTimeout(() => {
      this.session = { userId: `demo-${address}`, email: address, guest: false };
      this._changed.emit();
    }, this._delay.link);
    return { ok: true };
  }

  async signInAsGuest() {
    clearTimeout(this._linkTimer);
    this.session = { userId: `demo-guest-${Math.random().toString(36).slice(2, 8)}`, email: null, guest: true };
    this._changed.emit();
    return { ok: true };
  }

  /** Invitado → cuenta con correo: el mismo usuario (y su nombre) cuando "abre" el enlace. */
  async linkEmail(email) {
    if (!this.session?.guest) return { ok: false, error: 'no_session' };
    if (!isValidEmail(email)) return { ok: false, error: 'invalid_email' };
    const address = normalizeEmail(email);
    clearTimeout(this._linkTimer);
    this._linkTimer = setTimeout(() => {
      if (!this.session?.guest) return;
      this.session = { ...this.session, email: address, guest: false };
      this._changed.emit();
    }, this._delay.link);
    return { ok: true };
  }

  async setUsername(name) {
    if (!this.session) return { ok: false, error: 'no_session' };
    if (usernameError(name)) return { ok: false, error: 'invalid' };
    const clean = name.trim();
    if (TAKEN.has(clean.toLowerCase())) return { ok: false, error: 'taken' };
    this.profile = { username: clean };
    this._changed.emit();
    return { ok: true };
  }

  async signOut() {
    clearTimeout(this._linkTimer);
    this.session = null;
    this.profile = null;
    this._changed.emit();
  }
}

class DemoRoom {
  constructor({ code, me, asHost, delay }) {
    this.code = code;
    this.level = DEMO_LEVEL;
    this.me = me.id;
    this.closed = false;
    this._delay = delay;
    this._changed = new Emitter();
    this._timers = new Set();
    const self = { ...me, host: asHost, ready: false };
    const partner = { id: 'demo-partner', username: asHost ? 'Invitado' : 'Anfitrion', host: !asHost, ready: false };
    if (asHost) {
      this.players = [self];
      this._later(delay.partnerJoin, () => {
        this.players.push(partner);
        if (self.ready) this._partnerReadies();
      });
    } else {
      this.players = [partner, self];
    }
  }

  onChange(fn) {
    return this._changed.on(fn);
  }

  setReady(ready) {
    if (this.closed) return;
    this.players.find((p) => p.id === this.me).ready = ready;
    this._changed.emit();
    if (ready) this._partnerReadies();
  }

  leave() {
    if (this.closed) return;
    for (const t of this._timers) clearTimeout(t);
    this._timers.clear();
    this.closed = true;
    this._changed.emit();
  }

  _partnerReadies() {
    this._later(this._delay.partnerReady, () => {
      const partner = this.players.find((p) => p.id !== this.me);
      if (partner) partner.ready = true;
    });
  }

  _later(ms, fn) {
    const t = setTimeout(() => {
      this._timers.delete(t);
      fn();
      this._changed.emit();
    }, ms);
    this._timers.add(t);
  }
}

class DemoRooms {
  constructor(auth, delay) {
    this._auth = auth;
    this._delay = delay;
  }

  _me() {
    const { session, profile } = this._auth;
    return session && profile ? { id: session.userId, username: profile.username } : null;
  }

  async create() {
    const me = this._me();
    if (!me) return { ok: false, error: 'no_session' };
    return { ok: true, room: new DemoRoom({ code: randomRoomCode(), me, asHost: true, delay: this._delay }) };
  }

  async join(code) {
    const me = this._me();
    if (!me) return { ok: false, error: 'no_session' };
    if (!isValidRoomCode(code)) return { ok: false, error: 'invalid_code' };
    return { ok: true, room: new DemoRoom({ code: normalizeRoomCode(code), me, asHost: false, delay: this._delay }) };
  }
}

export function createDemoBackend(delay = DEMO_DELAY) {
  const auth = new DemoAuth(delay);
  return { demo: true, auth, rooms: new DemoRooms(auth, delay) };
}

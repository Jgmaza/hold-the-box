// Cliente del backend online: invitado con apodo → JWT → WebSocket. Contrato: docs/PROTOCOL.md.
//   const net = new NetClient();  await net.connect('ana');
//   net.on('room:state', fn);  await net.request('room:create', { level: 'muelle' });  net.send('input', {...})
// `request` resuelve con el ack o rechaza con { code, message } del servidor.

import { unpack } from 'msgpackr';

const TOKEN_KEY = 'htb.online.token';
const NICK_KEY = 'htb.online.nick';

/** URL del backend: VITE_SERVER_URL o el mismo host en el puerto 3000 (desarrollo). */
export function serverUrl() {
  const env = import.meta.env?.VITE_SERVER_URL;
  if (env) return env.replace(/\/$/, '');
  const host = typeof location !== 'undefined' && location.hostname ? location.hostname : 'localhost';
  return `http://${host}:3000`;
}

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {}
  },
};

export const savedNickname = () => store.get(NICK_KEY) ?? '';

export class NetError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export class NetClient {
  constructor(base = serverUrl()) {
    this.base = base;
    this.ws = null;
    this.user = null;
    this.welcome = null;
    this.rtt = 0; // ms
    this._handlers = new Map();
    this._pending = new Map();
    this._rid = 0;
    this._ping = null;
  }

  get connected() {
    return this.ws?.readyState === 1;
  }

  on(t, fn) {
    if (!this._handlers.has(t)) this._handlers.set(t, new Set());
    this._handlers.get(t).add(fn);
    return () => this._handlers.get(t)?.delete(fn);
  }

  _emit(t, d) {
    for (const fn of [...(this._handlers.get(t) ?? [])]) fn(d);
  }

  /** Token de invitado (se reutiliza si el apodo no cambió: mismo usuario al reconectar). */
  async _token(nickname) {
    if (this._tok && this._tokNick === nickname) return this._tok;
    const saved = store.get(TOKEN_KEY);
    if (saved && store.get(NICK_KEY) === nickname) {
      this._tok = saved;
      this._tokNick = nickname;
      return saved;
    }
    const res = await fetch(`${this.base}/auth/guest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname }),
    }).catch(() => null);
    if (!res) throw new NetError('OFFLINE', `No hay servidor en ${this.base}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new NetError(body.error?.code ?? 'BAD_REQUEST', body.error?.message ?? 'No se pudo entrar');
    store.set(TOKEN_KEY, body.token);
    store.set(NICK_KEY, nickname);
    this._tok = body.token;
    this._tokNick = nickname;
    return body.token;
  }

  /** Conecta (o reconecta). Resuelve con `welcome`. */
  async connect(nickname, { retry = true } = {}) {
    this.close();
    const token = await this._token(nickname);
    const url = `${this.base.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}&bin=1`;
    try {
      return await this._open(url);
    } catch (err) {
      // Token vencido o de otro servidor: uno nuevo y otra vez.
      if (!retry) throw err;
      store.set(TOKEN_KEY, null);
      this._tok = null;
      return this.connect(nickname, { retry: false });
    }
  }

  _open(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.binaryType = 'arraybuffer';
      let welcomed = false;
      ws.onmessage = (ev) => {
        let msg;
        try {
          msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : unpack(new Uint8Array(ev.data));
        } catch {
          return;
        }
        if (msg.t === 'welcome') {
          welcomed = true;
          this.welcome = msg.d;
          this.user = msg.d.user;
          this._startPing();
          resolve(msg.d);
        }
        if (msg.rid !== undefined && this._pending.has(msg.rid)) {
          const p = this._pending.get(msg.rid);
          this._pending.delete(msg.rid);
          if (msg.t === 'error') p.reject(new NetError(msg.d.code, msg.d.message));
          else p.resolve(msg.d);
        }
        if (msg.t === 'pong') this.rtt = performance.now() - msg.d.t;
        this._emit(msg.t, msg.d);
      };
      ws.onclose = (ev) => {
        this._stopPing();
        for (const p of this._pending.values()) p.reject(new NetError('OFFLINE', 'Se cortó la conexión'));
        this._pending.clear();
        if (!welcomed) return reject(new NetError('UNAUTHORIZED', 'El servidor rechazó la conexión'));
        if (this.ws === ws) this._emit('close', { code: ev.code, reason: ev.reason });
      };
    });
  }

  send(t, d) {
    if (this.connected) this.ws.send(JSON.stringify({ t, d }));
  }

  request(t, d = {}) {
    if (!this.connected) return Promise.reject(new NetError('OFFLINE', 'Sin conexión'));
    const rid = ++this._rid;
    return new Promise((resolve, reject) => {
      this._pending.set(rid, { resolve, reject });
      this.ws.send(JSON.stringify({ t, d, rid }));
    });
  }

  async publicRooms() {
    const res = await fetch(`${this.base}/rooms`).catch(() => null);
    if (!res?.ok) return [];
    return (await res.json()).rooms ?? [];
  }

  _startPing() {
    this._stopPing();
    const ping = () => this.send('ping', { t: performance.now() });
    ping();
    this._ping = setInterval(ping, 2000);
  }

  _stopPing() {
    clearInterval(this._ping);
    this._ping = null;
  }

  close() {
    this._stopPing();
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState <= 1) ws.close(1000, 'bye');
  }
}

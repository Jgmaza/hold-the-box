import WebSocket from 'ws';
import { buildApp } from '../src/app.js';

/** Servidor real en puerto efímero con tiempos cortos. */
export async function startServer(env = {}) {
  const app = await buildApp({
    env: { nodeEnv: 'test', port: 0, countdownMs: 200, resultsMs: 300, heartbeatMs: 60000, reconnectGraceMs: 400, ...env },
  });
  await app.listen({ host: '127.0.0.1', port: 0 });
  const { port } = app.server.address();
  return { app, base: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/ws` };
}

export async function guest(base, nickname) {
  const res = await fetch(`${base}/auth/guest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  return res.json();
}

/** Cliente de prueba: guarda todo lo recibido y permite esperar un tipo de mensaje. */
export class TestClient {
  static async connect(server, nickname) {
    const { token, user } = await guest(server.base, nickname);
    const c = new TestClient(new WebSocket(`${server.ws}?token=${token}`), user);
    await c.next('welcome');
    return c;
  }

  constructor(ws, user) {
    this.ws = ws;
    this.user = user;
    this.inbox = [];
    this.waiters = [];
    this._rid = 0;
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      this.inbox.push(msg);
      for (const w of [...this.waiters]) {
        if (w.match(msg)) {
          this.waiters.splice(this.waiters.indexOf(w), 1);
          w.resolve(msg);
        }
      }
    });
  }

  send(t, d) {
    this.ws.send(JSON.stringify({ t, d }));
  }

  /** Petición con rid: resuelve con el ack o rechaza con el error. */
  request(t, d) {
    const rid = ++this._rid;
    this.ws.send(JSON.stringify({ t, d, rid }));
    return this.next((m) => m.rid === rid).then((m) => {
      if (m.t === 'error') throw Object.assign(new Error(m.d.message), { code: m.d.code });
      return m.d;
    });
  }

  /** Espera el próximo mensaje (desde ahora) de tipo `t` o que cumpla el predicado. */
  next(t, timeout = 5000) {
    const match = typeof t === 'function' ? t : (m) => m.t === t;
    return new Promise((resolve, reject) => {
      const w = { match, resolve };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i !== -1) {
          this.waiters.splice(i, 1);
          reject(new Error(`timeout esperando ${typeof t === 'string' ? t : 'predicado'}`));
        }
      }, timeout).unref();
    });
  }

  /** Como next(), pero si ya llegó uno (desde que se creó el cliente) lo devuelve: para lo que viene pegado al welcome. */
  seen(t, timeout = 5000) {
    const match = typeof t === 'function' ? t : (m) => m.t === t;
    const got = this.inbox.find(match);
    return got ? Promise.resolve(got) : this.next(match, timeout);
  }

  count(t) {
    return this.inbox.filter((m) => m.t === t).length;
  }

  close() {
    this.ws.close();
  }
}

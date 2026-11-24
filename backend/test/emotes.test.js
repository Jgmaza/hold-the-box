import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestClient } from './helpers.js';

let server;
let a;
let b;
let c;

beforeAll(async () => {
  server = await startServer();
  a = await TestClient.connect(server, 'ana');
  b = await TestClient.connect(server, 'beto');
  c = await TestClient.connect(server, 'carlos');
  const { code } = await a.request('room:create', {});
  await b.request('room:join', { code });
  await c.request('room:join', { code });
});

afterAll(async () => {
  a.close();
  b.close();
  c.close();
  await server.app.close();
});

describe('emotes', () => {
  it('un emote válido llega a todos los de la sala, con duo/slot', async () => {
    a.send('emote', { id: 'wave' });
    const e1 = await b.next('emote');
    const e2 = await c.next('emote');
    expect(e1.d.id).toBe('wave');
    expect(e1.d.userId).toBe(a.user.id);
    expect(e2.d.userId).toBe(a.user.id);
    expect(e1.d.duo).toBe(0); // ana = host, dúo 0
    expect(e1.d.slot).toBe(1); // P1
    expect(typeof e1.d.t).toBe('number');
  });

  it('un id fuera de la lista → BAD_REQUEST', async () => {
    await expect(a.request('emote', { id: 'nope' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('spam: solo pasa 1 emote cada 1,5 s', async () => {
    b.inbox.length = 0;
    c.send('emote', { id: 'gg' });
    c.send('emote', { id: 'gg' });
    c.send('emote', { id: 'gg' });
    await new Promise((r) => setTimeout(r, 80));
    expect(b.inbox.filter((m) => m.t === 'emote')).toHaveLength(1);
  });
});

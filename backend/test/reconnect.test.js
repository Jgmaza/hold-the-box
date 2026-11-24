// #14: reconexión con gracia y espectadores. Gracia corta en tests (helpers: reconnectGraceMs 400).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startServer, TestClient } from './helpers.js';

let server;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.app.close();
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rooms = () => server.app.deps.rooms;

/** Vuelve a conectar al MISMO usuario (como hace el cliente con su token guardado). */
async function reconnect(client) {
  const token = server.app.jwt.sign({ sub: client.user.id, name: client.user.displayName, guest: true });
  const c = new TestClient(new WebSocket(`${server.ws}?token=${token}`), client.user);
  await c.next('welcome');
  return c;
}

const member = (code, c) => rooms().get(code)?.members.get(c.user.id);

async function duoRoom(names = ['ana', 'beto']) {
  const [a, b] = await Promise.all(names.map((n) => TestClient.connect(server, n)));
  const { code } = await a.request('room:create', { maxDuos: 2 });
  await b.request('room:join', { code });
  await b.request('room:ready', { ready: true });
  return { a, b, code };
}

describe('gracia de reconexión', () => {
  it('en lobby: se corta y vuelve a tiempo → mismo dúo y puesto, sin "listo"', async () => {
    const { a, b, code } = await duoRoom();
    b.close();
    await a.next((m) => m.t === 'room:state' && m.d.members.some((x) => x.userId === b.user.id && !x.online));
    expect(member(code, b)).toMatchObject({ teamId: 0, slots: [2], online: false });
    await wait(150);
    const b2 = await reconnect(b);
    const st = await b2.seen('room:state');
    expect(st.d.code).toBe(code);
    expect(st.d.members.find((x) => x.userId === b.user.id)).toMatchObject({ teamId: 0, slots: [2], online: true, ready: false });
    await wait(400); // pasa la gracia: no lo saca porque volvió
    expect(member(code, b)).toBeTruthy();
    a.close();
    b2.close();
  });

  it('en lobby: no vuelve a tiempo → sale de la sala; si era el anfitrión, hereda el siguiente', async () => {
    const { a, b, code } = await duoRoom(['caro', 'dani']);
    a.close();
    const st = await b.next((m) => m.t === 'room:state' && m.d.members.length === 1, 3000);
    expect(st.d.hostId).toBe(b.user.id);
    expect(member(code, a)).toBeUndefined();
    b.close();
  });

  it('en partida: no vuelve → `abandoned` en el ranking y sale al terminar; si vuelve, retoma', async () => {
    const { a, b, code } = await duoRoom(['eva', 'fede']);
    const started = a.next('match:start');
    await a.request('room:start');
    await started;
    await a.next((m) => m.t === 'room:state' && m.d.state === 'playing');
    b.close();
    await wait(600);
    expect(member(code, b)).toMatchObject({ abandoned: true, online: false });
    // Vuelve tarde pero con la partida en curso: retoma y deja de estar abandonado.
    const b2 = await reconnect(b);
    const resume = await b2.seen('match:start');
    expect(resume.d.resume).toBe(true);
    expect(resume.d.spectate).toBeUndefined();
    const snap = await b2.seen('match:snapshot', 500);
    expect(snap.d.own.id).toBe(0);
    expect(member(code, b).abandoned).toBe(false);
    b2.close();
    await wait(600);
    rooms().get(code).match.abort();
    const end = await a.next('match:end');
    expect(end.d.ranking[0].players.find((p) => p.userId === b.user.id).abandoned).toBe(true);
    await a.next((m) => m.t === 'room:state' && m.d.state === 'lobby');
    expect(member(code, b)).toBeUndefined();
    a.close();
  });
});

describe('espectadores', () => {
  it('entra con la partida en curso, recibe snapshots y su input se ignora', async () => {
    const { a, b, code } = await duoRoom(['gil', 'hugo']);
    await a.request('room:start');
    await a.next((m) => m.t === 'room:state' && m.d.state === 'playing');
    const s = await TestClient.connect(server, 'ines');
    await expect(s.request('room:join', { code })).rejects.toMatchObject({ code: 'ROOM_IN_GAME' });
    const startP = s.next('match:start');
    await s.request('room:spectate', { code });
    const start = await startP;
    expect(start.d.spectate).toBe(true);
    const snap = await s.seen('match:snapshot', 500);
    expect(snap.d.own.id).toBe(0); // mira el primer dúo por defecto
    const st = await s.seen((m) => m.t === 'room:state' && m.d.members.some((x) => x.userId === s.user.id));
    expect(st.d.members.find((x) => x.userId === s.user.id)).toMatchObject({ role: 'spectator', slots: [] });
    // Su input no mueve a nadie.
    const z0 = rooms().get(code).match.duos[0].game.p1.pos.z;
    for (let i = 1; i <= 20; i++) s.send('input', { seq: i, slot: 1, x: 0, z: -1 });
    await wait(400);
    expect(rooms().get(code).match.duos[0].game.p1.pos.z).toBeCloseTo(z0, 3);
    const list = await (await fetch(`${server.base}/rooms`)).json();
    expect(list.rooms.find((r) => r.code === code)).toMatchObject({ players: 2, spectators: 1 });
    for (const c of [a, b, s]) c.close();
  });

  it('levantarse (teamId null) = espectador; no bloquea el start; tope de espectadores', async () => {
    const { a, b, code } = await duoRoom(['jose', 'kike']);
    const c = await TestClient.connect(server, 'lola');
    await c.request('room:join', { code }); // se sienta en el dúo 1
    await expect(a.request('room:start')).rejects.toMatchObject({ code: 'CANNOT_START' }); // dúo 1 a medias
    await c.request('room:setTeam', { teamId: null });
    expect(member(code, c)).toMatchObject({ teamId: null, slots: [], ready: false });
    await a.request('room:start'); // c mira y no está listo: no bloquea
    rooms().get(code).match.abort();
    // Tope
    rooms().get(code).maxSpectators = 1;
    const d = await TestClient.connect(server, 'memo');
    await expect(d.request('room:spectate', { code })).rejects.toMatchObject({ code: 'ROOM_FULL' });
    for (const x of [a, b, c, d]) x.close();
  });

  it('match:watch cambia el dúo cuyo mundo recibe el espectador', async () => {
    const [a, b, c, d] = await Promise.all(['nico', 'olga', 'pepe', 'quim'].map((n) => TestClient.connect(server, n)));
    const { code } = await a.request('room:create', { maxDuos: 2 });
    for (const p of [b, c, d]) await p.request('room:join', { code });
    for (const p of [b, c, d]) await p.request('room:ready', { ready: true });
    await a.request('room:start');
    await a.next((m) => m.t === 'room:state' && m.d.state === 'playing');
    const s = await TestClient.connect(server, 'rita');
    await s.request('room:spectate', { code });
    expect((await s.seen('match:snapshot')).d.own.id).toBe(0);
    const ack = await s.request('match:watch', { duo: 1 });
    expect(ack.duo).toBe(1);
    expect((await s.next('match:snapshot')).d.own.id).toBe(1);
    // Un jugador que sigue corriendo recibe siempre su propio dúo aunque pida otro.
    await a.request('match:watch', { duo: 1 });
    expect((await a.next('match:snapshot')).d.own.id).toBe(0);
    await expect(s.request('match:watch', { duo: 5 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    for (const x of [a, b, c, d, s]) x.close();
  });
});

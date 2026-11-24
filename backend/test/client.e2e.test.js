// El cliente online REAL del frontend (NetClient + OnlineMatch + InputSender) contra el servidor real, sin navegador.
// Si este test pasa, el juego y el backend hablan el mismo idioma de punta a punta.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NetClient } from '../../frontend/src/net/netClient.js';
import { InputSender, OnlineMatch } from '../../frontend/src/net/onlineMatch.js';
import { startServer } from './helpers.js';

let server;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.app.close();
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 5000) => {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await wait(10);
  }
};

/** Un "jugador": NetClient + OnlineMatch como en net/onlineSession.js. */
async function player(nick) {
  const net = new NetClient(server.base);
  await net.connect(nick);
  const p = { net, room: null, match: null, events: [], ended: null };
  net.on('room:state', (r) => (p.room = r));
  net.on('match:start', (s) => (p.match = new OnlineMatch(s, net.user.id)));
  net.on('match:snapshot', (s) => p.match?.onSnapshot(s));
  net.on('match:events', (d) => p.match?.onEvents(d.events));
  net.on('match:end', (e) => (p.ended = e));
  return p;
}

describe('cliente del frontend ↔ backend', () => {
  it('dos dúos juegan: cada uno se mueve con su input y ve al otro', async () => {
    const [ana, beto, caro, dani] = await Promise.all(['ana', 'beto', 'caro', 'dani'].map(player));
    const { code } = await ana.net.request('room:create', { maxDuos: 2, level: 'muelle' });
    for (const p of [beto, caro, dani]) await p.net.request('room:join', { code });
    await caro.net.request('room:setChars', { p1: 'melith' });
    for (const p of [beto, caro, dani]) await p.net.request('room:ready', { ready: true });
    await ana.net.request('room:start');
    await until(() => [ana, beto, caro, dani].every((p) => p.match));

    expect(ana.match.mine.id).toBe(0);
    expect(caro.match.mine.id).toBe(1);
    expect(caro.match.mySlots).toEqual([1]);
    expect(ana.match.start.duos[1].players[0].char).toBe('melith');

    // Dúo 0 avanza y salta con el InputSender real; dúo 1 se queda quieto.
    await until(() => ana.match.buffer.length > 0, 6000); // primer snapshot = ya en playing
    const zAna0 = ana.match.buffer.at(-1).duos[0].players[0].pos[2] / 100;
    const zCaro0 = ana.match.buffer.at(-1).duos[1].players[0].pos[2] / 100;
    const senders = [ana, beto].map((p) => new InputSender((t, d) => p.net.send(t, d)));
    const jumps = [];
    caro.match.duos[0].game.events.on('player:jump', (e) => jumps.push(e));
    for (let i = 0; i < 40; i++) {
      senders[0].update(1, { x: 0, z: -1, jumpPressed: i === 10, jumpHeld: i >= 10 && i < 14 });
      senders[1].update(2, { x: 0, z: -1, jumpPressed: false, jumpHeld: false });
      for (const p of [ana, caro]) p.match.update();
      await wait(25);
    }
    await wait(250);
    for (const p of [ana, caro]) p.match.update();

    // Ana ve a su dúo avanzar (−Z) y al dúo de Caro quieto.
    expect(ana.match.duos[0].game.p1.pos.z).toBeLessThan(zAna0 - 1);
    expect(Math.abs(ana.match.duos[1].game.p1.pos.z - zCaro0)).toBeLessThan(0.3);
    // Caro ve lo mismo del dúo de Ana (otro cliente, mismo estado).
    expect(caro.match.duos[0].game.p1.pos.z).toBeCloseTo(ana.match.duos[0].game.p1.pos.z, 0);
    // El salto de Ana le llegó a Caro como evento en el Game del dúo 0.
    expect(jumps.some((e) => e.player === 1)).toBe(true);
    // Ana tiene el mundo de su dúo (NPCs) volcado; Caro el suyo.
    expect(ana.match.buffer.at(-1).own.id).toBe(0);
    expect(caro.match.buffer.at(-1).own.id).toBe(1);

    server.app.deps.rooms.get(code).match.abort();
    await until(() => ana.ended && caro.ended);
    expect(ana.ended.ranking).toHaveLength(2);
    await until(() => ana.room?.state === 'lobby', 3000);
    for (const p of [ana, beto, caro, dani]) p.net.close();
  });

  it('dúo de sofá: un cliente maneja P1 y P2', async () => {
    const solo = await player('sofa');
    await solo.net.request('room:create', { maxDuos: 1 });
    await solo.net.request('room:setTeam', { teamId: 0, slots: [1, 2] });
    await solo.net.request('room:start');
    await until(() => solo.match);
    expect(solo.match.mySlots).toEqual([1, 2]);
    await until(() => solo.match.buffer.length > 0, 6000);
    const s = new InputSender((t, d) => solo.net.send(t, d));
    const x0 = solo.match.buffer.at(-1).duos[0].players[0].pos[0] / 100;
    for (let i = 0; i < 30; i++) {
      s.update(1, { x: -1, z: 0, jumpPressed: false });
      s.update(2, { x: -1, z: 0, jumpPressed: false });
      await wait(25);
    }
    await wait(200);
    solo.match.update();
    expect(solo.match.duos[0].game.p1.pos.x).toBeLessThan(x0 - 0.5);
    solo.net.close();
  });

  it('espectador con el cliente real: entra en partida, mira el dúo 0 y cambia al 1', async () => {
    const [a, b, c, d] = await Promise.all(['spa', 'spb', 'spc', 'spd'].map(player));
    const { code } = await a.net.request('room:create', { maxDuos: 2 });
    for (const p of [b, c, d]) await p.net.request('room:join', { code });
    for (const p of [b, c, d]) await p.net.request('room:ready', { ready: true });
    await a.net.request('room:start');
    await until(() => a.match?.buffer.length > 0, 6000);
    const s = await player('spec');
    await expect(s.net.request('room:join', { code })).rejects.toMatchObject({ code: 'ROOM_IN_GAME' });
    await s.net.request('room:spectate', { code });
    await until(() => s.match?.buffer.length > 0);
    expect(s.match.spectating).toBe(true);
    expect(s.match.mySlots).toEqual([]);
    expect(s.match.canWatch).toBe(true);
    expect(s.match.buffer.at(-1).own.id).toBe(0);
    const next = s.match.cycleFocus(1);
    await s.net.request('match:watch', { duo: next.id });
    await until(() => s.match.buffer.at(-1).own?.id === 1);
    s.match.update();
    expect(s.match.focus.id).toBe(1);
    for (const p of [a, b, c, d, s]) p.net.close();
  });

  it('se corta a media partida y vuelve con el mismo token: retoma su dúo', async () => {
    const [a, b] = await Promise.all(['rea', 'reb'].map(player));
    const { code } = await a.net.request('room:create', { maxDuos: 1 });
    await b.net.request('room:join', { code });
    await b.net.request('room:ready', { ready: true });
    await a.net.request('room:start');
    await until(() => b.match?.buffer.length > 0, 6000);
    const firstMatch = b.match;
    b.net.ws.close(); // corte
    await until(() => a.room?.members.some((m) => m.userId === b.net.user.id && !m.online));
    await b.net.connect('reb', { retry: false }); // mismo token guardado → mismo usuario
    await until(() => b.match !== firstMatch && b.match.buffer.length > 0);
    expect(b.match.start.resume).toBe(true);
    expect(b.match.mine.id).toBe(0);
    expect(b.match.mySlots).toEqual([2]);
    await until(() => a.room?.members.find((m) => m.userId === b.net.user.id)?.online);
    for (const p of [a, b]) p.net.close();
  });

  it('error legible al unirse a una sala que no existe', async () => {
    const p = await player('eva');
    await expect(p.net.request('room:join', { code: 'ZZZZZZ' })).rejects.toMatchObject({ code: 'ROOM_NOT_FOUND' });
    p.net.close();
  });
});

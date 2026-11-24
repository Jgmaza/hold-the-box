// Compatibilidad con el cliente (frontend/): snapshot por destinatario, eventos privados, personajes.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Game, LEVELS } from '../src/game/index.js';
import { applyLightDuoState, applyWorldDuoState } from '../../frontend/src/net/duoState.js';
import { Match } from '../src/match/match.js';
import { Room } from '../src/rooms/room.js';
import { startServer, TestClient } from './helpers.js';

let server;
beforeAll(async () => {
  server = await startServer();
});
afterAll(async () => {
  await server.app.close();
});

async function twoDuos(box = 'vip', chars = {}) {
  const [a, b, c, d] = await Promise.all(['ana', 'beto', 'caro', 'dani'].map((n) => TestClient.connect(server, n)));
  const { code } = await a.request('room:create', { maxDuos: 2, boxProfile: box });
  for (const p of [b, c, d]) await p.request('room:join', { code });
  for (const [who, ch] of Object.entries(chars)) await { a, b, c, d }[who].request('room:setChars', ch);
  for (const p of [b, c, d]) await p.request('room:ready', { ready: true });
  const startP = a.next('match:start');
  await a.request('room:start');
  const start = await startP;
  return { a, b, c, d, code, start, all: [a, b, c, d] };
}

describe('Room: personajes', () => {
  it('por defecto el de cada slot; mismo personaje → P2 alterno; dúo de sofá usa p2', () => {
    const r = new Room({ code: 'AAAAAA', host: { id: 'a', name: 'A' }, level: 'muelle', maxDuos: 2, isPrivate: false, boxProfile: 'vip' });
    r.addMember({ id: 'b', name: 'B' });
    r.setReady('b', true);
    let t = r.startableTeams('a')[0];
    expect(t.players[1].char).toBe('alebarto');
    expect(t.players[2].char).toBe('gustambo');
    r.setChars('b', { p1: 'alebarto' });
    t = r.startableTeams('a')[0];
    expect(t.players[2]).toMatchObject({ char: 'alebarto', alt: true });
    r.setTeam('b', 1, [1, 2]);
    r.setChars('b', { p1: 'melith', p2: 'manolo' });
    r.setReady('b', true);
    r.setTeam('a', 0, [1, 2]);
    const teams = r.startableTeams('a');
    expect(teams[1].players[1].char).toBe('melith');
    expect(teams[1].players[2].char).toBe('manolo');
  });
});

describe('Match: eventos', () => {
  it('recovery:tick y box:wet se agrupan (uno por dúo y snapshot)', () => {
    const team = (id, a, b) => ({ teamId: id, players: { 1: { userId: a, name: a }, 2: { userId: b, name: b } } });
    const events = [];
    const m = new Match({ id: 'm', level: 'muelle', boxProfile: 'vip', seed: 1, teams: [team(0, 'a', 'b')], countdownSec: 0, timeLimitSec: 60, snapshotHz: 20, ghostSec: 1, onEvents: (e) => events.push(...e) });
    for (let i = 0; i < 5; i++) m._emit(0, 'recovery:tick', { i }, true);
    m._emit(0, 'player:jump', { player: 1 });
    m.flush();
    expect(events.filter((e) => e.e === 'recovery:tick')).toEqual([expect.objectContaining({ d: { i: 4 }, private: true })]);
    expect(events).toHaveLength(2);
  });
});

describe('WebSocket: snapshot y eventos por destinatario', () => {
  it('cada uno recibe `own` de SU dúo y el cliente puede volcarlo sobre un Game local', async () => {
    const { a, c, all, start } = await twoDuos('vip', { a: { p1: 'melith' } });
    expect(start.d.duos[0].players[0]).toMatchObject({ userId: a.user.id, char: 'melith', alt: false });
    const [sa, sc] = await Promise.all([a.next('match:snapshot'), c.next('match:snapshot')]);
    expect(sa.d.own.id).toBe(0);
    expect(sc.d.own.id).toBe(1);
    expect(sa.d.duos).toHaveLength(2);
    expect(Array.isArray(sa.d.own.npcs)).toBe(true);
    // Lo que hará el cliente: Game local del mismo nivel/semilla + volcado.
    const local = new Game(LEVELS[start.d.level], { seed: start.d.seed });
    applyLightDuoState(local, sa.d.duos[0]);
    applyWorldDuoState(local, sa.d.own);
    expect(local.p1.pos.z).toBe(sa.d.duos[0].players[0].pos[2] / 100);
    expect(local.state).toBe('playing');
    all.forEach((p) => p.close());
  });

  it('los eventos privados (bomb:beep) solo llegan al dúo dueño', async () => {
    const { a, c, all } = await twoDuos('bomba');
    await a.next((m) => m.t === 'match:events' && m.d.events.some((e) => e.e === 'bomb:beep' && e.duo === 0), 8000);
    await new Promise((r) => setTimeout(r, 200));
    const leaked = c.inbox.filter((m) => m.t === 'match:events').flatMap((m) => m.d.events).filter((e) => e.e === 'bomb:beep' && e.duo === 0);
    expect(leaked).toHaveLength(0);
    const own = c.inbox.filter((m) => m.t === 'match:events').flatMap((m) => m.d.events).filter((e) => e.e === 'bomb:beep');
    expect(own.every((e) => e.duo === 1)).toBe(true);
    expect(own.every((e) => !('private' in e))).toBe(true);
    all.forEach((p) => p.close());
  });

  it('al reconectar en partida llega match:start + snapshot completo al instante', async () => {
    const { a, all } = await twoDuos();
    await a.next((m) => m.t === 'room:state' && m.d.state === 'playing');
    const token = server.app.jwt.sign({ sub: a.user.id, name: a.user.displayName, guest: true });
    const a2 = new TestClient(new WebSocket(`${server.ws}?token=${token}`), a.user);
    const resumed = await a2.next('match:start');
    expect(resumed.d.resume).toBe(true);
    const snap = await a2.next('match:snapshot', 300);
    expect(snap.d.own.id).toBe(0);
    a2.close();
    all.forEach((p) => p.close());
  });

  it('room:setChars valida ids', async () => {
    const e = await TestClient.connect(server, 'eva');
    await e.request('room:create', {});
    await expect(e.request('room:setChars', { p1: 'pikachu' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    e.close();
  });
});

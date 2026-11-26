// Cliente online sin red: OnlineMatch (snapshots → Game por dúo, interpolación, eventos a su tiempo) e InputSender.
import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels/index.js';
import { lightDuoState, worldDuoState } from '../src/net/duoState.js';
import { INTERP_DELAY, InputSender, OnlineMatch } from '../src/net/onlineMatch.js';
import { Game } from '../src/sim/game.js';

const player = (slot, userId, name) => ({ slot, userId, name, char: slot === 1 ? 'alebarto' : 'gustambo', alt: false });

function setup({ me = 'a', sofa = false } = {}) {
  // "Servidor": dos Game que sí simulan.
  const server = [new Game(LEVELS.muelle, { seed: 9 }), new Game(LEVELS.muelle, { seed: 9 })];
  const snap = (time) => ({
    tick: Math.round(time * 120),
    time,
    duos: server.map((g, id) => ({ id, status: 'racing', ghost: false, online: { 1: true, 2: true }, ...lightDuoState(g) })),
    own: { id: 0, ...worldDuoState(server[0]) },
  });
  const start = {
    matchId: 'm',
    level: 'muelle',
    boxProfile: 'vip',
    seed: 9,
    countdownSec: 3,
    duos: [
      { id: 0, players: sofa ? [player(1, 'a', 'Ana'), player(2, 'a', 'Ana')] : [player(1, 'a', 'Ana'), player(2, 'b', 'Beto')] },
      { id: 1, players: [player(1, 'c', 'Caro'), player(2, 'd', 'Dani')] },
    ],
    snapshot: snap(0),
  };
  let clock = 100;
  const m = new OnlineMatch(start, me, { now: () => clock });
  const advance = (sec, dz = -1) => {
    for (const g of server) {
      if (g.state === 'title') g.start();
      for (let i = 0; i < sec * 120; i++) {
        g.setInputs({ x: 0, z: dz, jumpPressed: false }, { x: 0, z: dz, jumpPressed: false });
        g.step(1 / 120);
      }
    }
  };
  return { m, server, snap, advance, tick: (s) => (clock += s) };
}

describe('OnlineMatch', () => {
  it('sabe qué dúo y qué slots son míos; el sofá controla los dos', () => {
    expect(setup().m.mySlots).toEqual([1]);
    expect(setup({ me: 'd' }).m.mine.id).toBe(1);
    expect(setup({ me: 'd' }).m.mySlots).toEqual([2]);
    expect(setup({ sofa: true }).m.mySlots).toEqual([1, 2]);
    const spectator = setup({ me: 'zz' }).m;
    expect(spectator.mine).toBe(null);
    expect(spectator.focus.id).toBe(0);
    expect(setup().m.duoName(0)).toBe('Ana y Beto');
  });

  it('interpola INTERP_DELAY por detrás entre dos snapshots', () => {
    const { m, snap, advance, tick } = setup();
    m.onSnapshot(snap(0));
    advance(0.5);
    const s1 = snap(0.5);
    tick(0.5);
    m.onSnapshot(s1);
    // Justo al llegar: render = 0.5 − delay → fracción (0.5−delay)/0.5 del camino.
    m.update();
    expect(m.renderTime).toBeCloseTo(0.5 - INTERP_DELAY, 5);
    const alpha = (0.5 - INTERP_DELAY) / 0.5;
    const z0 = m.buffer[0].duos[0].players[0].pos[2];
    const z1 = s1.duos[0].players[0].pos[2];
    expect(m.duos[0].game.p1.pos.z).toBeCloseTo((z0 + (z1 - z0) * alpha) / 100, 1);
    expect(m.duos[0].game.state).toBe('playing');
    // El estado discreto se vuelca del snapshot nuevo.
    expect(m.duos[1].game.box.integrity).toBe(s1.duos[1].box.integrity);
  });

  it('los eventos se disparan en el Game de su dúo cuando el render llega a su tiempo', () => {
    const { m, snap, advance, tick } = setup();
    const got = [];
    m.duos[1].game.events.on('box:drop', (d) => got.push(d));
    m.onSnapshot(snap(0));
    advance(0.5);
    tick(0.5);
    m.onSnapshot(snap(0.5));
    const eventT = 0.5 - INTERP_DELAY + 0.02; // un poco por delante del render actual
    m.onEvents([{ duo: 1, e: 'box:drop', d: { x: 1 }, t: eventT }]);
    m.update(); // render aún < eventT
    expect(got).toEqual([]);
    tick(0.04);
    m.update(); // render supera eventT
    expect(got).toEqual([{ x: 1 }]);
  });

  it('own: NPCs y clima de mi dúo quedan iguales a los del servidor', () => {
    const { m, server, snap, advance, tick } = setup();
    advance(6);
    tick(6);
    m.onSnapshot(snap(6));
    server[0].npcs.list.forEach((n, i) => expect(m.duos[0].game.npcs.list[i].state).toBe(n.state));
    expect(m.duos[0].game.weather.zones.map((z) => z.phase)).toEqual(server[0].weather.zones.map((z) => z.phase));
  });
});

describe('OnlineMatch: mirar', () => {
  it('espectador puede cambiar de dúo; jugador solo cuando su dúo terminó', () => {
    const spec = setup({ me: 'zz' }).m;
    expect(spec.canWatch).toBe(true);
    expect(spec.cycleFocus(1).id).toBe(1);
    expect(spec.cycleFocus(1).id).toBe(0);
    expect(spec.setFocus(0)).toBe(null); // ya lo miraba

    const { m, snap, tick } = setup();
    m.onSnapshot(snap(0));
    m.update();
    expect(m.canWatch).toBe(false);
    const s = snap(0.1);
    s.duos[0].status = 'eliminated';
    tick(0.3);
    m.onSnapshot(s);
    m.update();
    expect(m.canWatch).toBe(true);
  });

  it('own se vuelca sobre el dúo que dice el servidor (el que miro)', () => {
    const { m, server, snap, advance, tick } = setup({ me: 'zz' });
    advance(5);
    tick(5);
    const s = snap(5);
    s.own = { id: 1, ...worldDuoState(server[1]) };
    m.onSnapshot(s);
    server[1].npcs.list.forEach((n, i) => expect(m.duos[1].game.npcs.list[i].pos.x).toBeCloseTo(n.pos.x, 1));
  });
});

describe('InputSender', () => {
  it('manda al cambiar, a 60 Hz si no cambia, y el salto no se pierde', () => {
    const sent = [];
    let t = 0;
    const s = new InputSender((_t, d) => sent.push(d), { now: () => t });
    const idle = { x: 0, z: 0, jumpPressed: false, jumpHeld: false };
    s.update(1, idle);
    s.update(1, idle); // igual y sin pasar 1/60 s → nada
    expect(sent).toHaveLength(1);
    t += 0.01;
    s.update(1, { ...idle, jumpPressed: true, jumpHeld: true }); // salto → sale ya
    expect(sent.at(-1)).toMatchObject({ seq: 2, jump: true, jumpHeld: true });
    t += 0.01;
    s.update(1, { ...idle, jumpHeld: true });
    expect(sent).toHaveLength(2);
    t += 0.02;
    s.update(1, { ...idle, jumpHeld: true }); // pasó 1/60 s → reenvío
    expect(sent.at(-1)).toMatchObject({ seq: 3, jump: false });
    s.update(2, { x: 1, z: 0, jumpPressed: false });
    expect(sent.at(-1)).toMatchObject({ slot: 2, seq: 1, x: 1 });
  });
});

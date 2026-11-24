import { describe, expect, it } from 'vitest';
import { Match } from '../src/match/match.js';

const team = (teamId, a, b) => ({ teamId, players: { 1: { userId: a, name: a }, 2: { userId: b, name: b } } });

function mkMatch(over = {}) {
  const out = { snaps: [], events: [], end: null };
  const m = new Match({
    id: 'm1',
    level: 'muelle',
    boxProfile: 'vip',
    seed: 7,
    teams: [team(0, 'a', 'b'), team(1, 'c', 'd')],
    countdownSec: 0.5,
    timeLimitSec: 60,
    snapshotHz: 20,
    ghostSec: 2,
    onSnapshot: (s) => out.snaps.push(s),
    onEvents: (e) => out.events.push(...e),
    onEnd: (r) => (out.end = r),
    ...over,
  });
  return { m, out };
}

const run = (m, sec, perFrame) => {
  for (let t = 0; t < sec; t += 1 / 60) {
    perFrame?.();
    m.advance(1 / 60);
  }
};

describe('Match', () => {
  it('cuenta atrás → playing y snapshots a ~20 Hz', () => {
    const { m, out } = mkMatch();
    run(m, 0.4);
    expect(m.state).toBe('countdown');
    run(m, 1.2);
    expect(m.state).toBe('playing');
    expect(out.snaps.length).toBeGreaterThanOrEqual(18);
    expect(out.snaps.length).toBeLessThanOrEqual(26);
    const s = out.snaps.at(-1);
    expect(s.duos).toHaveLength(2);
    expect(s.duos[0].players[0].pos).toHaveLength(3);
    expect(s.duos[0].box.integrity).toBe(100);
  });

  it('el input del dueño del slot mueve a su jugador; el de otro no', () => {
    const { m } = mkMatch();
    run(m, 0.6);
    const z0 = m.duos[0].game.p1.pos.z;
    let seq = 0;
    run(m, 1, () => {
      m.setInput('a', { seq: ++seq, slot: 1, x: 0, z: -1, jump: false, jumpHeld: false });
      m.setInput('b', { seq, slot: 2, x: 0, z: -1, jump: false, jumpHeld: false });
      expect(m.setInput('c', { seq, slot: 1, x: 0, z: 1, jump: false, jumpHeld: false })).toBe(true); // su propio slot
      expect(m.setInput('a', { seq, slot: 2, x: 0, z: 1, jump: false, jumpHeld: false })).toBe(false); // slot ajeno
    });
    expect(m.duos[0].game.p1.pos.z).toBeLessThan(z0 - 1);
  });

  it('el salto es un flanco: se consume y genera player:jump', () => {
    const { m, out } = mkMatch();
    run(m, 0.6);
    m.setInput('a', { seq: 1, slot: 1, x: 0, z: 0, jump: true, jumpHeld: true });
    run(m, 0.5);
    const jumps = out.events.filter((e) => e.e === 'player:jump' && e.duo === 0);
    expect(jumps).toHaveLength(1);
    expect(jumps[0].d.player).toBe(1);
  });

  it('termina por tiempo con ranking completo', () => {
    const { m, out } = mkMatch({ timeLimitSec: 1 });
    run(m, 2);
    expect(m.state).toBe('ended');
    expect(out.end.reason).toBe('timeLimit');
    expect(out.end.ranking.map((r) => r.placement)).toEqual([1, 2]);
    expect(out.end.ranking[0].players).toHaveLength(2);
  });

  it('mundo compartido: el vidrio que rompe un dúo lo ve el otro', () => {
    const { m } = mkMatch({ level: 'aldea' });
    const w = m.sharedWorld;
    // Los dos dúos apuntan al MISMO World.
    expect(m.duos[0].game.world).toBe(w);
    expect(m.duos[1].game.world).toBe(w);
    const glass = w.statics.find((s) => s.def?.kind === 'glass' && !s.def.tempered);
    expect(glass).toBeTruthy();
    // El dúo 0 lo rompe; el dúo 1 ve el mismo panel roto y sin colisión.
    w.breakGlass(glass);
    const other = m.duos[1].game.world.statics.find((s) => s.def?.id === glass.def.id);
    expect(other.broken).toBe(true);
    expect(m.duos[1].game.world.colliders.includes(other)).toBe(false);
    // El snapshot `own` del dúo 1 ya reporta el vidrio roto.
    expect(m.ownSnapshots().get(1).glassBroken).toContain(glass.def.id);
  });

  it('un dúo que gana queda finished y la partida acaba cuando no queda nadie corriendo', () => {
    const { m, out } = mkMatch({ teams: [team(0, 'a', 'b')] });
    run(m, 0.6);
    m.duos[0].game.teleport('goal');
    let seq = 0;
    run(m, 4, () => {
      m.setInput('a', { seq: ++seq, slot: 1, x: 0, z: -1, jump: false, jumpHeld: false });
      m.setInput('b', { seq, slot: 2, x: 0, z: -1, jump: false, jumpHeld: false });
    });
    expect(m.duos[0].status).toBe('finished');
    expect(out.events.some((e) => e.e === 'duo:finished')).toBe(true);
    expect(out.end.reason).toBe('allDone');
    expect(out.end.ranking[0].status).toBe('finished');
  });
});

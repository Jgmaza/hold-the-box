import { describe, expect, it } from 'vitest';
import { Match } from '../src/match/match.js';

const team = (teamId, a, b) => ({ teamId, players: { 1: { userId: a, name: a }, 2: { userId: b, name: b } } });

function setup() {
  const events = [];
  const m = new Match({
    id: 'm', level: 'muelle', boxProfile: 'vip', seed: 1,
    teams: [team(0, 'a', 'b'), team(1, 'c', 'd')],
    countdownSec: 0, timeLimitSec: 60, snapshotHz: 20, ghostSec: 0.5,
    onEvents: (e) => events.push(...e),
  });
  m.advance(1 / 60); // empieza
  return { m, events };
}

/** Coloca a los jugadores lejos entre sí (z=91) y quita el fantasma, listo para choques manuales. */
function clearGhost(m) {
  m.duos[0].ghost = 0;
  m.duos[1].ghost = 0;
  m.collider.ghostPairs.clear();
}

/** Escenario de empujón: A.p1 (grounded) choca de frente con B.p1 (en el suelo o en el aire). Devuelve vel.x final de B.p1. */
function bumpVel(targetGrounded) {
  const events = [];
  const m = new Match({
    id: 'm', level: 'muelle', boxProfile: 'vip', seed: 1,
    teams: [team(0, 'a', 'b'), team(1, 'c', 'd')],
    countdownSec: 0, timeLimitSec: 60, snapshotHz: 20, ghostSec: 0.5,
    onEvents: (e) => events.push(...e),
  });
  m.advance(1 / 60);
  clearGhost(m);
  const A = m.duos[0].game;
  const B = m.duos[1].game;
  A.p1.pos.x = 0; A.p1.pos.y = 1; A.p1.pos.z = 91;
  A.p2.pos.x = -3; A.p2.pos.y = 1; A.p2.pos.z = 91;
  B.p1.pos.x = 0.5; B.p1.pos.y = 1; B.p1.pos.z = 91;
  B.p2.pos.x = 3; B.p2.pos.y = 1; B.p2.pos.z = 91;
  A.p1.actualVel.x = 2; A.p1.actualVel.z = 0; A.p1.grounded = true;
  B.p1.actualVel.x = 0; B.p1.actualVel.z = 0; B.p1.grounded = targetGrounded;
  m.collider.resolve(m.duos, 10, (duo, e, d) => events.push({ duo, e, d }));
  return B.p1.vel.x;
}

describe('colisiones entre dúos', () => {
  it('fantasma al aparecer: solapados no chocan', () => {
    const { m, events } = setup();
    for (let i = 0; i < 20; i++) m.advance(1 / 60);
    expect(m.duos[0].ghost).toBeGreaterThan(0);
    expect(events.some((e) => e.e === 'player:bump')).toBe(false);
  });

  it('un choque rápido empuja al otro, sacude su caja y emite player:bump', () => {
    const { m, events } = setup();
    for (let i = 0; i < 60; i++) m.advance(1 / 60); // pasa el ghost (los pares solapados siguen fantasma)
    const A = m.duos[0].game;
    const B = m.duos[1].game;
    // Separa al dúo B 3 m a la derecha y lanza a P2 de A contra P1 de B.
    B.teleport({ p1: { x: 2.2, y: 1, z: 91 }, p2: { x: 4.2, y: 1, z: 91 } });
    m.collider.ghostPairs.clear();
    m.duos[1].ghost = 0;
    const a2 = A.p2;
    const b1 = B.p1;
    a2.pos.x = b1.pos.x - 0.5;
    a2.pos.z = b1.pos.z;
    a2.actualVel.x = 6;
    b1.actualVel.x = 0;
    const before = B.box.rollVel;
    m.collider.resolve(m.duos, 10, (duo, e, d) => events.push({ duo, e, d }));
    const bump = events.find((e) => e.e === 'player:bump');
    expect(bump).toBeTruthy();
    expect(bump.duo).toBe(1);
    expect(bump.d.by).toEqual({ duo: 0, player: 2 });
    expect(b1.vel.x).toBeGreaterThan(2);
    expect(b1.knockTimer).toBeGreaterThan(0);
    expect(B.box.rollVel).not.toBe(before);
  });
});

describe('colisiones v2', () => {
  it('masa: golpear a alguien en el aire lo manda más lejos que a alguien en el suelo', () => {
    const ground = bumpVel(true);
    const air = bumpVel(false);
    expect(air).toBeGreaterThan(ground);
  });

  it('stomp: caer encima rebota al atacante, sacude la caja del pisado y emite player:stomp', () => {
    const { m, events } = setup();
    clearGhost(m);
    const A = m.duos[0].game;
    const B = m.duos[1].game;
    A.p1.pos.x = 0; A.p1.pos.y = 2.2; A.p1.pos.z = 91; A.p1.vel.y = -3;
    A.p2.pos.x = -3; A.p2.pos.y = 1; A.p2.pos.z = 91;
    B.p1.pos.x = 0; B.p1.pos.y = 1; B.p1.pos.z = 91;
    B.p2.pos.x = 3; B.p2.pos.y = 1; B.p2.pos.z = 91;
    const before = B.box.rollVel;
    m.collider.resolve(m.duos, 10, (duo, e, d) => events.push({ duo, e, d }));
    expect(A.p1.vel.y).toBeGreaterThan(0); // rebote
    expect(B.box.rollVel).not.toBe(before);
    const stomp = events.find((e) => e.e === 'player:stomp');
    expect(stomp).toBeTruthy();
    expect(stomp.duo).toBe(1);
    expect(stomp.d.by).toEqual({ duo: 0, player: 1 });
  });

  it('caja↔caja: ambas cajas reciben kick y se emite box:bump', () => {
    const { m } = setup();
    clearGhost(m);
    const A = m.duos[0].game;
    const B = m.duos[1].game;
    A.box.center.x = 0; A.box.center.z = 0;
    B.box.center.x = 0.5; B.box.center.z = 0;
    A.p1.actualVel.x = A.p2.actualVel.x = 3;
    B.p1.actualVel.x = B.p2.actualVel.x = 0;
    const beforeA = A.box.rollVel;
    const beforeB = B.box.rollVel;
    const ev = [];
    m.collider._resolveBoxBox(m.duos[0], m.duos[1], 10, (duo, e, d) => ev.push({ duo, e, d }));
    expect(A.box.rollVel).not.toBe(beforeA);
    expect(B.box.rollVel).not.toBe(beforeB);
    expect(ev.filter((e) => e.e === 'box:bump')).toHaveLength(2);
  });

  it('inmunidad: un objetivo recién golpeado ignora el segundo golpe (de otro atacante)', () => {
    const { m, events } = setup();
    clearGhost(m);
    const A = m.duos[0].game;
    const B = m.duos[1].game;
    A.p1.pos.x = -0.4; A.p1.pos.y = 1; A.p1.pos.z = 91; A.p1.actualVel.x = 6; A.p1.grounded = true;
    A.p2.pos.x = -0.4; A.p2.pos.y = 1; A.p2.pos.z = 91; A.p2.actualVel.x = 2; A.p2.grounded = true;
    B.p1.pos.x = 0; B.p1.pos.y = 1; B.p1.pos.z = 91; B.p1.actualVel.x = 0; B.p1.grounded = true;
    B.p2.pos.x = 3; B.p2.pos.y = 1; B.p2.pos.z = 91;
    m.collider.resolve(m.duos, 10, (duo, e, d) => events.push({ duo, e, d }));
    // El primer golpe (A.p1, closing 6 → fuerza 8) se aplica; el de A.p2 (closing 2 → 3.2) queda bloqueado por inmunidad.
    expect(B.p1.vel.x).toBeGreaterThan(4);
  });

  it('fantasma: sin golpes ni sacudidas mientras el dúo es fantasma', () => {
    const { m, events } = setup();
    const A = m.duos[0].game;
    const B = m.duos[1].game;
    A.p1.pos.x = 0; A.p1.pos.y = 1; A.p1.pos.z = 91; A.p1.actualVel.x = 6; A.p1.grounded = true;
    A.p2.pos.x = -3; A.p2.pos.y = 1; A.p2.pos.z = 91;
    B.p1.pos.x = 0.5; B.p1.pos.y = 1; B.p1.pos.z = 91;
    B.p2.pos.x = 3; B.p2.pos.y = 1; B.p2.pos.z = 91;
    const before = B.box.rollVel;
    m.collider.resolve(m.duos, 10, (duo, e, d) => events.push({ duo, e, d }));
    expect(events.some((e) => e.e === 'player:bump' || e.e === 'box:bump')).toBe(false);
    expect(B.box.rollVel).toBe(before);
  });

  it('empujón suave (velocidad < minSpeed) no sacude ni suelta la caja', () => {
    const { m, events } = setup();
    clearGhost(m);
    const A = m.duos[0].game;
    const B = m.duos[1].game;
    A.p1.pos.x = 0; A.p1.pos.y = 1; A.p1.pos.z = 91; A.p1.actualVel.x = 1; A.p1.grounded = true;
    A.p2.pos.x = -3; A.p2.pos.y = 1; A.p2.pos.z = 91;
    B.p1.pos.x = 0.5; B.p1.pos.y = 1; B.p1.pos.z = 91;
    B.p2.pos.x = 3; B.p2.pos.y = 1; B.p2.pos.z = 91;
    m.collider.resolve(m.duos, 10, (duo, e, d) => events.push({ duo, e, d }));
    expect(B.box.rollVel).toBe(0);
    expect(B.box.dropped).toBe(false);
    expect(events.some((e) => e.e === 'player:bump' || e.e === 'box:bump')).toBe(false);
  });
});

// Codec online (src/net/duoState.js): lo que serializa el servidor debe reconstruirse EXACTO en un Game
// del cliente que no simula. Si alguien agrega estado a la sim que la vista lee, este test es el lugar.
import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTER_IDS, DEFAULT_CHARS as IDS_DEFAULT } from '../src/characterIds.js';
import { selectBox } from '../src/config.js';
import { LEVELS } from '../src/levels/index.js';
import {
  applyLightDuoState,
  applyWorldDuoState,
  lightDuoState,
  PRIVATE_EVENTS,
  worldDuoState,
} from '../src/net/duoState.js';
import { Game } from '../src/sim/game.js';
import { CHARACTERS, DEFAULT_CHARS } from '../src/view/characters.js';

afterEach(() => selectBox('vip'));

/** Juega `seconds` con input pseudoaleatorio determinista (avanza, gira, salta). */
function play(game, seconds) {
  game.start();
  let k = 7;
  const rnd = () => ((k = (k * 1103515245 + 12345) >>> 0) / 2 ** 32);
  for (let i = 0; i < seconds * 120; i++) {
    const x = rnd() < 0.2 ? Math.round(rnd() * 2 - 1) : 0;
    const jump = rnd() < 0.02;
    const inp = { x, z: -1, jumpPressed: jump, jumpHeld: jump };
    if (game.state === 'failed') game.retry();
    if (game.state === 'won') break;
    game.setInputs(inp, inp);
    game.step(1 / 120);
  }
}

describe('duoState: ida y vuelta', () => {
  for (const level of Object.keys(LEVELS)) {
    for (const box of ['vip', 'gato', 'bomba']) {
      it(`${level} · caja ${box}`, () => {
        selectBox(box);
        const server = new Game(LEVELS[level], { seed: 42 });
        play(server, 12);
        const light = lightDuoState(server);
        const world = worldDuoState(server);

        const client = new Game(LEVELS[level], { seed: 42 });
        applyLightDuoState(client, light);
        applyWorldDuoState(client, world);

        expect(lightDuoState(client)).toEqual(light);
        expect(worldDuoState(client)).toEqual(world);
        // JSON-safe (viaja por WebSocket)
        expect(JSON.parse(JSON.stringify({ light, world }))).toEqual({ light, world });
      });
    }
  }

  it('los campos que lee la vista quedan iguales', () => {
    const server = new Game(LEVELS.muelle, { seed: 3 });
    play(server, 20);
    const client = new Game(LEVELS.muelle, { seed: 3 });
    applyLightDuoState(client, lightDuoState(server));
    applyWorldDuoState(client, worldDuoState(server));
    // Cuantización del wire: pos en cm, ángulos a 0,1°, % enteros. La vista no nota la diferencia.
    expect(client.p1.pos.z).toBeCloseTo(server.p1.pos.z, 1);
    expect(client.box.tilt.roll).toBeCloseTo(server.box.tilt.roll, 0);
    expect(Math.abs(client.box.integrity - server.box.integrity)).toBeLessThanOrEqual(1);
    expect(client.checkpointIndex).toBe(server.checkpointIndex);
    server.npcs.list.forEach((n, i) => {
      expect(client.npcs.list[i].state).toBe(n.state);
      expect(client.npcs.list[i].pos.x).toBeCloseTo(n.pos.x, 1);
    });
    server.weather.zones.forEach((z, i) => {
      expect(client.weather.zones[i].phase).toBe(z.phase);
      expect(client.weather.zones[i].phaseT).toBeCloseTo(z.phaseT, 1);
    });
  });

  it('vidrio roto: se marca, deja de ser suelo y se informa una sola vez', () => {
    const server = new Game(LEVELS.aldea, { seed: 1 });
    const glass = server.world.statics.find((s) => s.def?.kind === 'glass' && !s.def.tempered);
    expect(glass).toBeTruthy();
    server.world.breakGlass(glass);
    const client = new Game(LEVELS.aldea, { seed: 1 });
    const state = worldDuoState(server);
    expect(state.glassBroken).toContain(glass.def.id);
    expect(applyWorldDuoState(client, state)).toEqual([glass.def.id]);
    expect(applyWorldDuoState(client, state)).toEqual([]);
    const cg = client.world.statics.find((s) => s.def?.id === glass.def.id);
    expect(cg.broken).toBe(true);
    expect(client.world.colliders.includes(cg)).toBe(false);
  });

  it('PRIVATE_EVENTS no repite nombres', () => {
    expect(new Set(PRIVATE_EVENTS).size).toBe(PRIVATE_EVENTS.length);
  });
});

describe('characterIds (lo usa el servidor)', () => {
  it('coincide con los personajes de la vista', () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual(CHARACTER_IDS);
    expect(DEFAULT_CHARS).toBe(IDS_DEFAULT);
  });
});

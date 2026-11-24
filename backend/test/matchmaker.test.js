import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { RoomManager } from '../src/rooms/roomManager.js';
import { Hub } from '../src/ws/hub.js';

const u = (id) => ({ id, name: id.toUpperCase() });

function setup(overrides = {}) {
  const env = { ...loadEnv({ nodeEnv: 'test' }), ...overrides };
  const hub = new Hub();
  const rooms = new RoomManager({ hub, env, logger: { info: () => {}, error: () => {}, warn: () => {} } });
  return { env, hub, rooms };
}

const occupiedDuos = (room) => room.teams.filter((t) => t.slots[1] && t.slots[2]).length;

describe('matchmaking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('4 jugadores solo → 1 sala automática con 2 dúos y arranque automático', () => {
    const { rooms } = setup();
    for (const x of ['a', 'b', 'c', 'd']) rooms.matchmaker.join(u(x), { mode: 'solo' });
    expect(rooms.matchmaker.size).toBe(4);

    vi.advanceTimersByTime(20_000); // 2 dúos esperan `matchmakerFillSec` (20 s)
    expect(rooms.rooms.size).toBe(1);
    const room = [...rooms.rooms.values()][0];
    expect(room.auto).toBe(true);
    expect(occupiedDuos(room)).toBe(2);
    expect(rooms.matchmaker.size).toBe(0);

    vi.advanceTimersByTime(10_000); // cuenta atrás `matchmakerAutoStartSec`
    expect(room.match).not.toBeNull();
    rooms.close();
  });

  it('1 dúo de sofá + 2 solo → sala con 2 dúos', () => {
    const { rooms } = setup();
    rooms.matchmaker.join(u('a'), { mode: 'duo' });
    rooms.matchmaker.join(u('b'), { mode: 'solo' });
    rooms.matchmaker.join(u('c'), { mode: 'solo' });

    vi.advanceTimersByTime(20_000);
    expect(rooms.rooms.size).toBe(1);
    const room = [...rooms.rooms.values()][0];
    expect(occupiedDuos(room)).toBe(2);
    // el sofá ocupa los 2 slots de su dúo
    const sofa = room.teams.find((t) => t.slots[1] === 'a' && t.slots[2] === 'a');
    expect(sofa).toBeTruthy();
    rooms.close();
  });

  it('queue:leave antes del match no deja huérfanos', () => {
    const { rooms } = setup();
    for (const x of ['a', 'b', 'c', 'd']) rooms.matchmaker.join(u(x), { mode: 'solo' });
    rooms.matchmaker.leave('d');

    expect(rooms.matchmaker.size).toBe(3);
    expect(rooms.matchmaker.isQueued('d')).toBe(false);

    vi.advanceTimersByTime(20_000); // 3 solos → 1 par + 1 huérfano esperando; 1 unidad aún no arranca (45 s)
    expect(rooms.rooms.size).toBe(0);
    expect(rooms.matchmaker.size).toBe(3); // nadie se perdió
    rooms.close();
  });
});

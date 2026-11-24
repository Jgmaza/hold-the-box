import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, randomCode } from '../src/rooms/codes.js';
import { Room } from '../src/rooms/room.js';

const u = (id) => ({ id, name: id.toUpperCase() });
const mk = (opts = {}) => new Room({ code: 'ABC234', host: u('a'), level: 'muelle', maxDuos: 2, isPrivate: false, boxProfile: 'vip', ...opts });

describe('codes', () => {
  it('6 caracteres del alfabeto sin ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      const c = randomCode();
      expect(c).toHaveLength(6);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
  });
});

describe('Room', () => {
  it('el host entra sentado en el dúo 0 P1 y el siguiente completa su dúo', () => {
    const r = mk();
    r.addMember(u('b'));
    expect(r.teams[0].slots).toEqual({ 1: 'a', 2: 'b' });
    r.addMember(u('c'));
    expect(r.teams[1].slots[1]).toBe('c');
  });

  it('llena y rechaza con ROOM_FULL', () => {
    const r = mk({ maxDuos: 1 });
    r.addMember(u('b'));
    expect(() => r.addMember(u('c'))).toThrow(expect.objectContaining({ code: 'ROOM_FULL' }));
  });

  it('setTeam valida puestos ocupados y permite dúo de sofá (2 slots)', () => {
    const r = mk();
    r.addMember(u('b'));
    expect(() => r.setTeam('b', 0, [1])).toThrow(expect.objectContaining({ code: 'SLOT_TAKEN' }));
    r.setTeam('b', 1, [1, 2]);
    expect(r.teams[1].slots).toEqual({ 1: 'b', 2: 'b' });
    expect(r.teams[0].slots).toEqual({ 1: 'a', 2: null });
  });

  it('el host se hereda al más antiguo', () => {
    const r = mk();
    r.addMember(u('b'));
    r.addMember(u('c'));
    expect(r.removeMember('a').hostChanged).toBe(true);
    expect(r.hostId).toBe('b');
  });

  it('start exige dúos completos y todos listos (menos el host)', () => {
    const r = mk();
    expect(() => r.startableTeams('a')).toThrow(expect.objectContaining({ code: 'CANNOT_START' }));
    r.addMember(u('b'));
    expect(() => r.startableTeams('a')).toThrow(/no está listo/);
    r.setReady('b', true);
    expect(() => r.startableTeams('b')).toThrow(expect.objectContaining({ code: 'NOT_HOST' }));
    const teams = r.startableTeams('a');
    expect(teams).toHaveLength(1);
    expect(teams[0].players[2].userId).toBe('b');
  });

  it('no deja bajar maxDuos por debajo de un dúo ocupado', () => {
    const r = mk({ maxDuos: 3 });
    r.addMember(u('b'));
    r.addMember(u('c'));
    expect(() => r.updateSettings('a', { maxDuos: 1 })).toThrow(/ocupado/);
    r.updateSettings('a', { maxDuos: 2, level: 'bahia' });
    expect(r.level).toBe('bahia');
  });
});

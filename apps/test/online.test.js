import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_DELAY, createDemoBackend } from '../src/online/demoBackend.js';
import { onlineStep } from '../src/online/flow.js';
import {
  ROOM_ALPHABET,
  ROOM_CODE_LEN,
  isValidEmail,
  isValidRoomCode,
  normalizeRoomCode,
  randomRoomCode,
  usernameError,
} from '../src/online/validate.js';
import { VoiceChat } from '../src/online/voice.js';

describe('validación online', () => {
  it('correo', () => {
    expect(isValidEmail('  Luis@Correo.com ')).toBe(true);
    expect(isValidEmail('luis@correo')).toBe(false);
    expect(isValidEmail('sin arroba.com')).toBe(false);
  });

  it('username de 3 a 16: letras, números y _', () => {
    expect(usernameError('Luis_07')).toBe(null);
    expect(usernameError('ab')).toMatch(/Mínimo/);
    expect(usernameError('a'.repeat(17))).toMatch(/Máximo/);
    expect(usernameError('con espacio')).toMatch(/Solo/);
  });

  it('código de sala: mayúsculas, sin caracteres confusos', () => {
    expect(normalizeRoomCode(' ab-cd e ')).toBe('ABCDE');
    expect(normalizeRoomCode('O0I1K')).toBe('K');
    expect(isValidRoomCode('abcde')).toBe(true);
    expect(isValidRoomCode('ABC')).toBe(false);
    const code = randomRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LEN);
    expect([...code].every((c) => ROOM_ALPHABET.includes(c))).toBe(true);
  });
});

describe('pasos del multijugador', () => {
  const session = { userId: 'u1' };
  const profile = { username: 'Luis' };

  it('correo → revisa tu correo → nombre → lobby → sala', () => {
    expect(onlineStep({ session: null, profile: null })).toBe('email');
    expect(onlineStep({ session: null, profile: null, sentTo: 'a@b.co' })).toBe('sent');
    expect(onlineStep({ session, profile: null })).toBe('username');
    expect(onlineStep({ session, profile })).toBe('lobby');
    expect(onlineStep({ session, profile, room: { closed: false } })).toBe('room');
  });

  it('editar el nombre vuelve al paso de nombre; una sala cerrada vuelve al lobby', () => {
    expect(onlineStep({ session, profile, editingName: true })).toBe('username');
    expect(onlineStep({ session, profile, room: { closed: true } })).toBe('lobby');
  });
});

describe('backend demo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function loggedIn() {
    const backend = createDemoBackend();
    await backend.auth.sendMagicLink('luis@correo.com');
    vi.advanceTimersByTime(DEMO_DELAY.link);
    await backend.auth.setUsername('Luis');
    return backend;
  }

  it('el enlace mágico abre sesión; el nombre puede estar ocupado', async () => {
    const { auth } = createDemoBackend();
    const changes = vi.fn();
    auth.onChange(changes);
    expect(await auth.sendMagicLink('mal')).toEqual({ ok: false, error: 'invalid_email' });
    expect(await auth.sendMagicLink('Luis@Correo.com')).toEqual({ ok: true });
    expect(auth.session).toBe(null);
    vi.advanceTimersByTime(DEMO_DELAY.link);
    expect(auth.session.email).toBe('luis@correo.com');
    expect(await auth.setUsername('Jose')).toEqual({ ok: false, error: 'taken' });
    expect(await auth.setUsername('Luis')).toEqual({ ok: true });
    expect(auth.profile.username).toBe('Luis');
    await auth.signOut();
    expect(auth.session).toBe(null);
    expect(changes).toHaveBeenCalledTimes(3);
  });

  it('sin sesión no se crean salas', async () => {
    const { rooms } = createDemoBackend();
    expect(await rooms.create()).toEqual({ ok: false, error: 'no_session' });
  });

  it('crear sala: llega el compañero y marca LISTO después de ti', async () => {
    const { rooms } = await loggedIn();
    const { room } = await rooms.create();
    expect(isValidRoomCode(room.code)).toBe(true);
    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toMatchObject({ username: 'Luis', host: true, ready: false });
    vi.advanceTimersByTime(DEMO_DELAY.partnerJoin);
    expect(room.players).toHaveLength(2);
    room.setReady(true);
    expect(room.players[1].ready).toBe(false);
    vi.advanceTimersByTime(DEMO_DELAY.partnerReady);
    expect(room.players.every((p) => p.ready)).toBe(true);
  });

  it('unirse con código; salir cierra la sala y no deja timers vivos', async () => {
    const { rooms } = await loggedIn();
    expect(await rooms.join('AB')).toEqual({ ok: false, error: 'invalid_code' });
    const { room } = await rooms.join('abcde');
    expect(room.code).toBe('ABCDE');
    expect(room.players.map((p) => p.host)).toEqual([true, false]);
    room.setReady(true);
    room.leave();
    expect(room.closed).toBe(true);
    vi.advanceTimersByTime(DEMO_DELAY.partnerReady);
    expect(room.players[0].ready).toBe(false);
  });
});

describe('micro (voz en sala)', () => {
  const fakeMic = () => {
    const track = { enabled: true, stopped: false, stop() { this.stopped = true; } };
    const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    return { track, mediaDevices: { getUserMedia: vi.fn(async () => stream) } };
  };

  it('sin getUserMedia: no soportado', () => {
    expect(new VoiceChat({ mediaDevices: undefined }).state).toBe('unsupported');
  });

  it('pide permiso, silencia y apaga', async () => {
    const { track, mediaDevices } = fakeMic();
    const voice = new VoiceChat({ mediaDevices, AudioContextCtor: undefined });
    expect(voice.state).toBe('off');
    expect(await voice.start()).toBe('on');
    voice.toggleMute();
    expect(track.enabled).toBe(false);
    expect(voice.level()).toBe(0);
    voice.toggleMute();
    expect(track.enabled).toBe(true);
    voice.stop();
    expect(track.stopped).toBe(true);
    expect(voice.state).toBe('off');
  });

  it('permiso negado → denied, y se puede reintentar', async () => {
    const mediaDevices = { getUserMedia: vi.fn(async () => Promise.reject(new Error('NotAllowedError'))) };
    const voice = new VoiceChat({ mediaDevices });
    expect(await voice.start()).toBe('denied');
    await voice.start();
    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('salir de la sala mientras pregunta el permiso: el micro no queda prendido', async () => {
    const { track, mediaDevices } = fakeMic();
    const voice = new VoiceChat({ mediaDevices, AudioContextCtor: undefined });
    const pending = voice.start();
    voice.stop();
    await pending;
    expect(voice.state).toBe('off');
    expect(track.stopped).toBe(true);
  });
});

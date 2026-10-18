import { describe, expect, it } from 'vitest';
import { BOX_CHOICES } from '../src/config.js';
import { MAPS } from '../src/levels/index.js';
import { COUNTDOWN, MenuState } from '../src/ui/menuState.js';
import { CHARACTERS, DEFAULT_CHARS } from '../src/view/characters.js';

const menu = () => new MenuState({ maps: MAPS, boxes: BOX_CHOICES, characters: CHARACTERS, initial: { ...DEFAULT_CHARS } });

describe('menú', () => {
  it('Inicio → Mapas → Personajes, y Esc devuelve paso a paso', () => {
    const m = menu();
    expect(m.screen).toBe('home');
    m.go('map');
    m.go('chars');
    expect(m.back()).toBe(true);
    expect(m.screen).toBe('map');
    expect(m.back()).toBe(true);
    expect(m.screen).toBe('home');
    expect(m.back()).toBe(false);
  });

  it('mapas y cajas dan la vuelta', () => {
    const m = menu();
    m.stepLevel(-1);
    expect(m.level).toBe(MAPS.at(-1).key);
    m.stepLevel(1);
    expect(m.level).toBe(MAPS[0].key);
    m.stepBox(-1);
    expect(m.box).toBe(BOX_CHOICES.at(-1).id);
    m.setLevel('no-existe');
    expect(m.level).toBe(MAPS[0].key);
  });

  it('el mismo personaje para los dos: P2 sale con color alterno', () => {
    const m = menu();
    expect(m.alt('p2')).toBe(false);
    m.stepChar('p2', -1); // Gustambo → Alebarto, el mismo de P1
    expect(m.chars.p2.id).toBe(m.chars.p1.id);
    expect(m.alt('p2')).toBe(true);
    expect(m.alt('p1')).toBe(false);
  });

  it('con LISTO no se cambia de personaje', () => {
    const m = menu();
    m.go('chars');
    m.toggleReady('p1');
    expect(m.stepChar('p1', 1)).toBe(false);
    expect(m.chars.p1.id).toBe(DEFAULT_CHARS.p1);
  });

  it('los dos listos → cuenta 3-2-1 → arranca; si alguien se arrepiente se cancela', () => {
    const m = menu();
    m.go('chars');
    m.toggleReady('p1');
    expect(m.countdown).toBe(null);
    m.toggleReady('p2');
    expect(m.countdown).toBe(COUNTDOWN);
    expect(m.tick(1)).toBe(false);
    m.toggleReady('p2');
    expect(m.countdown).toBe(null);
    m.toggleReady('p2');
    expect(m.tick(COUNTDOWN - 0.5)).toBe(false);
    expect(m.tick(0.6)).toBe(true);
    expect(m.selection()).toEqual({ level: MAPS[0].key, box: BOX_CHOICES[0].id, chars: DEFAULT_CHARS });
  });

  it('volver a una pantalla quita los LISTO', () => {
    const m = menu();
    m.go('chars');
    m.toggleReady('p1');
    m.toggleReady('p2');
    m.back();
    expect(m.chars.p1.ready || m.chars.p2.ready).toBe(false);
    expect(m.countdown).toBe(null);
  });
});

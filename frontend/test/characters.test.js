// Personajes escogibles: los 6 del equipo, colores alternos, rasgos que existen y vuelta completa en el menú.
import { describe, expect, it } from 'vitest';
import { BOX_CHOICES } from '../src/config.js';
import { MAPS } from '../src/levels/index.js';
import { MenuState } from '../src/ui/menuState.js';
import { features } from '../src/view/charFeatures.js';
import { CHARACTERS, DEFAULT_CHARS, character } from '../src/view/characters.js';

const FEATURES = Object.keys(features({}, {}, {}));

/** Corre `look` con rasgos de mentira y devuelve las llamadas [rasgo, ...args]. */
function looks(def, colors) {
  const calls = [];
  const f = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]) });
  def.look(f, colors);
  return calls;
}

describe('personajes', () => {
  it('son los 6 del equipo, con ids y nombres únicos', () => {
    expect(CHARACTERS.map((c) => c.name)).toEqual(['Alebarto', 'Gustambo', 'Alcázar', 'Matías', 'Melith', 'Manolo']);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(6);
    expect(character(DEFAULT_CHARS.p1).id).toBe(DEFAULT_CHARS.p1);
    expect(character(DEFAULT_CHARS.p2).id).toBe(DEFAULT_CHARS.p2);
    expect(DEFAULT_CHARS.p1).not.toBe(DEFAULT_CHARS.p2);
  });

  it('el color alterno cambia algo que se ve (camisa, chaleco o casco)', () => {
    for (const c of CHARACTERS) {
      const changed = Object.entries(c.alt).filter(([k, v]) => c.colors[k] !== undefined && c.colors[k] !== v);
      expect(changed.length, c.id).toBeGreaterThan(0);
    }
  });

  it('cada uno usa rasgos que existen, con todos sus colores definidos', () => {
    for (const c of CHARACTERS) {
      for (const colors of [c.colors, { ...c.colors, ...c.alt }]) {
        const calls = looks(c, colors);
        expect(calls.length, c.id).toBeGreaterThan(0);
        for (const [name, ...args] of calls) {
          expect(FEATURES, `${c.id}: ${name}`).toContain(name);
          expect(args[0], `${c.id}: ${name} sin color`).toBeTruthy();
        }
      }
    }
  });

  it('todos tienen cara (ojos, cejas, nariz y boca) como en las fotos', () => {
    for (const c of CHARACTERS) expect(looks(c, c.colors).map(([name]) => name), c.id).toContain('face');
  });

  it('en el menú se recorren los 6 y se vuelve al primero', () => {
    const m = new MenuState({ maps: MAPS, boxes: BOX_CHOICES, characters: CHARACTERS, initial: { ...DEFAULT_CHARS } });
    const seen = [];
    for (let i = 0; i < CHARACTERS.length; i++) {
      seen.push(m.chars.p1.id);
      expect(m.stepChar('p1', 1)).toBe(true);
    }
    expect(new Set(seen).size).toBe(6);
    expect(m.chars.p1.id).toBe(DEFAULT_CHARS.p1);
  });
});

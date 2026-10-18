import { describe, expect, it } from 'vitest';
import { mixVolume, slotKind, speakerIcon } from '../src/view/audioPrefs.js';

describe('mezcla de audio', () => {
  it('la música y los sonidos se bajan por separado', () => {
    expect(slotKind('musica-loop')).toBe('music');
    expect(slotKind('musica-victoria')).toBe('music');
    expect(slotKind('sfx-salto')).toBe('sfx');
    expect(mixVolume(0.5, 'music', { music: 0, sfx: 1 })).toBe(0);
    expect(mixVolume(0.5, 'sfx', { music: 0, sfx: 1 })).toBe(0.5);
    expect(mixVolume(0.8, 'music', { music: 0.5, sfx: 1 })).toBeCloseTo(0.4);
    expect(speakerIcon({ music: 0.8, sfx: 1 })).toBe('🔊');
    expect(speakerIcon({ music: 0, sfx: 1 })).toBe('🔈');
    expect(speakerIcon({ music: 0, sfx: 0 })).toBe('🔇');
  });
});

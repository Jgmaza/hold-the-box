import { describe, expect, it } from 'vitest';
import { BOARD_SCOPES, CAMPAIGN_LEVELS, computeScore, isCampaignLevel, LEVEL_LABEL } from '../src/leaderboard/score.js';

describe('computeScore (fórmula A)', () => {
  it('entrega perfecta rápida puntúa alto', () => {
    expect(computeScore({ integrity: 100, wetness: 0, time: 60 })).toBe(100000 - 600);
  });

  it('mojado y tiempo bajan el score', () => {
    const dry = computeScore({ integrity: 90, wetness: 0, time: 100 });
    const wet = computeScore({ integrity: 90, wetness: 40, time: 100 });
    const slow = computeScore({ integrity: 90, wetness: 0, time: 200 });
    expect(wet).toBeLessThan(dry);
    expect(slow).toBeLessThan(dry);
  });

  it('acota integridad y mojado a 0–100', () => {
    expect(computeScore({ integrity: 200, wetness: -10, time: 0 })).toBe(100000);
  });
});

describe('campaña', () => {
  it('solo muelle/bahia/aldea/campamento cuentan', () => {
    expect(CAMPAIGN_LEVELS).toEqual(['muelle', 'bahia', 'aldea', 'campamento']);
    expect(isCampaignLevel('muelle')).toBe(true);
    expect(isCampaignLevel('npcs')).toBe(false);
  });

  it('scopes de board: general + 4 mapas', () => {
    expect(BOARD_SCOPES).toEqual(['general', 'muelle', 'bahia', 'aldea', 'campamento']);
    expect(LEVEL_LABEL.general).toBe('General');
    expect(LEVEL_LABEL.bahia).toBe('Bahía');
  });
});

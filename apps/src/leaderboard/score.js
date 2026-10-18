// Fórmula A del leaderboard arcade (más alto = mejor).
//   score = round(integrity * 1000 - timeSec * 10 - wetness * 5)
// Datos del evento game:win: { time, integrity, wetness, rating }.

export const CAMPAIGN_LEVELS = ['muelle', 'bahia', 'tormenta'];
export const ARCADE_ROLES = ['CARGADOR', 'CAPITAN', 'GRUMETE', 'PIRATA'];
export const BOARD_SCOPES = ['general', ...CAMPAIGN_LEVELS];
export const LEVEL_LABEL = {
  general: 'General',
  muelle: 'Muelle',
  bahia: 'Bahía',
  tormenta: 'Tormenta',
};

/** @param {{ time: number, integrity: number, wetness: number }} win */
export function computeScore(win) {
  const time = Number(win?.time) || 0;
  const integrity = Math.max(0, Math.min(100, Number(win?.integrity) || 0));
  const wetness = Math.max(0, Math.min(100, Number(win?.wetness) || 0));
  return Math.round(integrity * 1000 - time * 10 - wetness * 5);
}

export const isCampaignLevel = (id) => CAMPAIGN_LEVELS.includes(id);

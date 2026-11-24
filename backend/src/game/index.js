// Puerta única del backend a la simulación del juego. La sim vive en frontend/src (mismo repo):
// cliente y servidor ejecutan exactamente el mismo código, no hay copia que sincronizar.
// Nadie fuera de backend/src/game/ importa de frontend/ directamente.
import { readFileSync } from 'node:fs';

export { Game } from '../../../frontend/src/sim/game.js';
export { World } from '../../../frontend/src/sim/world.js';
export { LEVELS, DEFAULT_LEVEL } from '../../../frontend/src/levels/index.js';
export { CONFIG, BOX_CHOICES, selectBox } from '../../../frontend/src/config.js';
export { CHARACTER_IDS, DEFAULT_CHARS } from '../../../frontend/src/characterIds.js';
export { lightDuoState, worldDuoState, PRIVATE_EVENTS } from '../../../frontend/src/net/duoState.js';

/** Versión del juego (cliente y servidor deben coincidir). GIT_SHA la pone el deploy; si no, la de frontend/package.json. */
export const GAME_VERSION = (() => {
  if (process.env.GIT_SHA) return process.env.GIT_SHA.slice(0, 7);
  try {
    return JSON.parse(readFileSync(new URL('../../../frontend/package.json', import.meta.url), 'utf8')).version;
  } catch {
    return 'unknown';
  }
})();

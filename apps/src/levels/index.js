// Niveles disponibles. main.js elige con ?level=<clave>; sin parámetro (o clave desconocida), el Muelle.
import level1 from './level1.js';
import npcArena from './npcArena.js';

export const LEVELS = {
  muelle: level1,
  npcs: npcArena, // arena de prueba de NPCs
};

export const DEFAULT_LEVEL = 'muelle';

// Niveles disponibles. Se escogen en el menú; ?level=<clave> salta el menú y entra directo (desarrollo).
import level1 from './level1.js';
import npcArena from './npcArena.js';

export const LEVELS = {
  muelle: level1,
  npcs: npcArena, // arena de prueba de NPCs
};

export const DEFAULT_LEVEL = 'muelle';

// Tarjetas del selector de mapas (mismo orden en pantalla). `difficulty` = estrellas de 1 a 3.
export const MAPS = [
  { key: 'muelle', icon: '⚓', tag: 'Nivel 1', difficulty: 2, blurb: 'Islas con NPCs, lluvia y viento, rodillo, chorros y elevador hasta la META.' },
  { key: 'npcs', icon: '🦀', tag: 'Arena', difficulty: 3, blurb: 'Recta corta llena de cangrejos, pistolas de agua y un perro mojado.' },
].map((m) => ({ ...m, name: LEVELS[m.key].name }));

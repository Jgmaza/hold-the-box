// Niveles disponibles. Se escogen en el menú; ?level=<clave> salta el menú y entra directo (desarrollo).
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import npcArena from './npcArena.js';
import railsArena from './railsArena.js';

export const LEVELS = {
  muelle: level1,
  bahia: level2,
  tormenta: level3,
  npcs: npcArena, // arena de prueba de NPCs
  rieles: railsArena, // arena de prueba de rieles asimétricos
};

export const DEFAULT_LEVEL = 'muelle';

// Tarjetas del selector de mapas (mismo orden en pantalla). `difficulty` = estrellas de 1 a 3.
export const MAPS = [
  { key: 'muelle', icon: '⚓', tag: 'Nivel 1', difficulty: 1, blurb: 'Una mecánica a la vez: NPCs, lluvia, viento, ferry, rodillo, rieles, chorros y elevador.' },
  { key: 'bahia', icon: '🏴‍☠️', tag: 'Nivel 2', difficulty: 2, blurb: 'Más largo: aguacero de 5 carpas, dos tramos de rieles, ferries, viento y chorros.' },
  { key: 'tormenta', icon: '⛈️', tag: 'Nivel 3', difficulty: 3, blurb: 'Doble tormenta, rieles de 45 m, balsas, doble rodillo, chorros densos y elevador alto.' },
  { key: 'npcs', icon: '🦀', tag: 'Arena', difficulty: 3, blurb: 'Recta corta llena de cangrejos, pistolas de agua y un perro mojado.' },
  { key: 'rieles', icon: '🛤️', tag: 'Arena', difficulty: 2, blurb: 'Dos rieles con obstáculos distintos: piedras, huecos y topes para cada uno.' },
].map((m) => ({ ...m, name: LEVELS[m.key].name }));

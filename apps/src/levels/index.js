// Niveles disponibles. Se escogen en el menú; ?level=<clave> salta el menú y entra directo (desarrollo).
import level1 from './level1.js';
import level2 from './level2.js';
import aldea from './aldea.js';
import campamento from './campamento.js';

export const LEVELS = {
  muelle: level1,
  bahia: level2,
  aldea,
  campamento,
};

export const DEFAULT_LEVEL = 'muelle';

// Tarjetas del selector de mapas (mismo orden en pantalla). `difficulty` = estrellas de 1 a 3.
export const MAPS = [
  { key: 'muelle', icon: '⚓', tag: 'Nivel 1', difficulty: 1, blurb: 'Una mecánica a la vez: NPCs, lluvia, viento, ferry, rodillo, rieles, chorros y elevador.' },
  { key: 'bahia', icon: '🏴‍☠️', tag: 'Nivel 2', difficulty: 2, blurb: 'Más largo: aguacero de 5 carpas, dos tramos de rieles, ferries, viento, chorros y oleaje.' },
  { key: 'aldea', icon: '🛖', tag: 'Selva 1', difficulty: 1, blurb: 'Pueblo en tierra: niño, aldeano, aguacero y chozas. Camino de tierra hasta la plaza.' },
  { key: 'campamento', icon: '🌵', tag: 'Desierto 1', difficulty: 1, blurb: 'Laberinto de cactus: un camino pincha y se corta. En el bueno hay que escorarse juntos.' },
].map((m) => ({ ...m, name: LEVELS[m.key].name }));

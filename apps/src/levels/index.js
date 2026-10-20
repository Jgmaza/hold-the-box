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

/** Look del preview en el selector: beach (agua) · jungle (selva) · desert (desierto). */
export function mapLook(level) {
  if (level?.theme === 'desert' || level?.biome === 'camp') return 'desert';
  if (level?.theme === 'jungle' || level?.biome === 'village') return 'jungle';
  return 'beach';
}

// Tarjetas del selector de mapas (mismo orden en pantalla). `difficulty` = estrellas de 1 a 3.
export const MAPS = [
  { key: 'muelle', icon: '⚓', tag: 'Mar 1', difficulty: 1, blurb: 'Primer turno: cangrejo, perro bravo y aguacero. Arriba los espera el ron.' },
  { key: 'bahia', icon: '🏴‍☠️', tag: 'Mar 2', difficulty: 2, blurb: 'Más larga y más mojada: rieles, ferries y olas que no tienen piedad.' },
  { key: 'aldea', icon: '🛖', tag: 'Selva', difficulty: 1, blurb: 'El aldeano tira baldados y el vidrio miente: uno aguanta, el otro no.' },
  { key: 'campamento', icon: '🌵', tag: 'Desierto', difficulty: 1, blurb: 'Cactus que chuzan, un coyote con hambre y dos caminos. Uno se corta, ¿cuál?' },
].map((m) => ({ ...m, name: LEVELS[m.key].name, look: mapLook(LEVELS[m.key]) }));

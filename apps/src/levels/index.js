// Niveles disponibles. Se escogen en el menú; ?level=<clave> salta el menú y entra directo (desarrollo).
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import aldea from './aldea.js';
import templo from './templo.js';
import puente from './puente.js';
import campamento from './campamento.js';
import mina from './mina.js';
import canon from './canon.js';

export const LEVELS = {
  muelle: level1,
  bahia: level2,
  tormenta: level3,
  aldea,
  templo,
  puente,
  campamento,
  mina,
  canon,
};

export const DEFAULT_LEVEL = 'muelle';

// Tarjetas del selector de mapas (mismo orden en pantalla). `difficulty` = estrellas de 1 a 3.
export const MAPS = [
  { key: 'muelle', icon: '⚓', tag: 'Nivel 1', difficulty: 1, blurb: 'Una mecánica a la vez: NPCs, lluvia, viento, ferry, rodillo, rieles, chorros y elevador.' },
  { key: 'bahia', icon: '🏴‍☠️', tag: 'Nivel 2', difficulty: 2, blurb: 'Más largo: aguacero de 5 carpas, dos tramos de rieles, ferries, viento, chorros y oleaje.' },
  { key: 'tormenta', icon: '⛈️', tag: 'Nivel 3', difficulty: 3, blurb: 'Doble tormenta, oleaje bravo, rieles de 45 m, balsas, doble rodillo, chorros densos y elevador alto.' },
  { key: 'aldea', icon: '🛖', tag: 'Selva 1', difficulty: 1, blurb: 'Pueblo en tierra: niño, aldeano, aguacero y chozas. Camino de tierra hasta la plaza.' },
  { key: 'templo', icon: '🗿', tag: 'Selva 2', difficulty: 2, blurb: 'Losa de piedra, lianas, jaguar y la ofrenda en la pirámide.' },
  { key: 'puente', icon: '🌉', tag: 'Selva 3', difficulty: 3, blurb: 'Risco, viento, puente de cuerdas sobre la catarata y elevador.' },
  { key: 'campamento', icon: '🌵', tag: 'Desierto 1', difficulty: 1, blurb: 'Laberinto de cactus: un camino pincha y se corta. En el bueno hay que escorarse juntos.' },
  { key: 'mina', icon: '⛏️', tag: 'Desierto 2', difficulty: 2, blurb: 'Grúas, rieles de vagoneta y el coyote antes de la boca de la mina.' },
  { key: 'canon', icon: '🏜️', tag: 'Desierto 3', difficulty: 3, blurb: 'Viento en el cañón, tablón que va y viene, y elevador hasta el oro.' },
].map((m) => ({ ...m, name: LEVELS[m.key].name }));

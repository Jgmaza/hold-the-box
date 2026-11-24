// Eventos de la sim que se reenvían a TODOS los clientes de la partida (para ver lo que les pasa a los demás).
// Van en lote en `match:events` como { duo, e, d } — `duo` = teamId, `d.player` (1|2) dentro del dúo.
// Además, PRIVATE_EVENTS (frontend/src/net/duoState.js: clima, bomba, gato, estaciones, box:wet) van SOLO a los
// jugadores del dúo que los generó.
export const FORWARDED_EVENTS = [
  'game:start',
  'game:checkpoint',
  'game:splash',
  'game:life',
  'game:respawn',
  'game:fail',
  'game:win',
  'player:jump',
  'player:land',
  'hazard:hit',
  'geyser:hit',
  'box:state',
  'box:impact',
  'box:drop',
  'npc:shoot',
  'npc:hit',
  'npc:splash',
  'cat:scratch',
  'bomb:hit',
  'bomb:explode',
  'glass:break',
  'cactus:poke',
];

/** Eventos que pueden repetirse cada paso de sim: por snapshot se manda solo el último de cada dúo. */
export const COALESCED_EVENTS = new Set(['recovery:tick', 'box:wet']);

/** Eventos que genera el propio servidor (no la sim). */
export const SERVER_EVENTS = [
  'player:bump',
  'player:stomp',
  'box:bump',
  'duo:finished',
  'duo:eliminated',
  'player:disconnected',
];

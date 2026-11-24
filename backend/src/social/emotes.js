// Emotes y frases rápidas (sin chat libre). Lista cerrada: el cliente solo puede mandar uno de estos ids.
// Cada entrada: { id (wire), label (texto en español que pinta el cliente) }.
export const EMOTES = [
  { id: 'wave', label: '👋 ¡Hola!' },
  { id: 'laugh', label: '😂' },
  { id: 'cry', label: '😭' },
  { id: 'angry', label: '😠' },
  { id: 'gg', label: 'GG' },
  { id: 'oops', label: '¡Ups!' },
  { id: 'hurry', label: '¡Date prisa!' },
  { id: 'help', label: '¡Ayuda!' },
  { id: 'nice', label: '¡Bien!' },
  { id: 'sorry', label: '¡Perdón!' },
  { id: 'grab', label: '¡Agárrala!' },
  { id: 'jump', label: '¡Salta!' },
  { id: 'careful', label: '¡Cuidado!' },
];

export const EMOTE_IDS = EMOTES.map((e) => e.id);

/** Mínimo entre emotes de un mismo usuario (ms). Los que lleguen antes se descartan, sin error. */
export const EMOTE_COOLDOWN_MS = 1500;

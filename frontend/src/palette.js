// Paleta del juego. Luis la define en deliveries/luis/PALETTE.md; si un hex falta (#______),
// se usa el valor por defecto de aquí.

export const DEFAULT_PALETTE = {
  // Las 7 filas de PALETTE.md
  sky: '#8fd3f4',
  water: '#1fa2c9',
  wood: '#b07a45',
  box: '#c8955a',
  ui: '#ffcc33',
  danger: '#e8453c',
  goal: '#3ccf6e',
  // Extra (no están en PALETTE.md; se pueden agregar con estas mismas palabras)
  plank: '#8a5a32',
  p1: '#2b3a55', // traje
  p2: '#ff7a3d', // camiseta
  cap: '#2f9e5b', // gorra P2
  skin: '#f1c27d',
  dark: '#1d1d1d',
  sand: '#f2d7a0',
  leaf: '#3fa34d',
  trunk: '#8b5a2b',
  foam: '#e8f8ff',
  content: '#e0a030', // lo que gotea por el huequito
  npcEasy: '#4cc38a', // cangrejo
  npcMedium: '#f2a03d', // niño con pistola de agua
  npcHard: '#9b4dca', // perro mojado
};

// Palabra con la que empieza la fila en PALETTE.md → clave.
const LABELS = [
  ['cielo', 'sky'],
  ['agua', 'water'],
  ['madera', 'wood'],
  ['plataforma', 'wood'],
  ['caja', 'box'],
  ['ui', 'ui'],
  ['peligro', 'danger'],
  ['rodillo', 'danger'],
  ['meta', 'goal'],
  ['exito', 'goal'],
  ['tablon', 'plank'],
  ['p1', 'p1'],
  ['traje', 'p1'],
  ['p2', 'p2'],
  ['camiseta', 'p2'],
  ['gorra', 'cap'],
  ['piel', 'skin'],
  ['arena', 'sand'],
  ['hoja', 'leaf'],
  ['palmera', 'leaf'],
  ['tronco', 'trunk'],
  ['contenido', 'content'],
  ['npc easy', 'npcEasy'],
  ['npc medium', 'npcMedium'],
  ['npc hard', 'npcHard'],
];

const strip = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Lee una tabla markdown `| Uso | #hex | notas |` y devuelve { clave: '#rrggbb' } con lo que encuentre. */
export function parsePaletteMarkdown(md) {
  const found = {};
  if (!md) return found;
  for (const line of md.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const label = strip(cells[0]);
    const hex = cells.slice(1).join(' ').match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    if (!hex) continue;
    const entry = LABELS.find(([word]) => label.startsWith(word));
    if (!entry || found[entry[1]]) continue;
    let h = hex[1].toLowerCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    found[entry[1]] = `#${h}`;
  }
  return found;
}

export function buildPalette(md) {
  const custom = parsePaletteMarkdown(md);
  return { ...DEFAULT_PALETTE, ...custom, _custom: Object.keys(custom) };
}

/** '#rrggbb' → [r, g, b] en 0..1 */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

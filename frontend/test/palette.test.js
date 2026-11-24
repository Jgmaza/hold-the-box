import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE, buildPalette, parsePaletteMarkdown } from '../src/palette.js';

const TEMPLATE = `
| Uso | Hex | Notas |
|---|---|---|
| Cielo | \`#______\` | |
| Agua | \`#______\` | |
`;

describe('paleta de Luis', () => {
  it('la plantilla vacía usa los colores por defecto', () => {
    expect(parsePaletteMarkdown(TEMPLATE)).toEqual({});
    expect(buildPalette(TEMPLATE).sky).toBe(DEFAULT_PALETTE.sky);
  });

  it('lee los hex de la tabla (con o sin backticks, 3 o 6 dígitos)', () => {
    const md = `
| Uso | Hex | Notas |
|---|---|---|
| Cielo | \`#AABBCC\` | atardecer |
| Agua | #0af | |
| Madera / plataformas | \`#7a4a24\` | |
| UI primary | \`#ff00aa\` | |
| Meta / éxito | \`#00ff00\` | |
`;
    const p = buildPalette(md);
    expect(p.sky).toBe('#aabbcc');
    expect(p.water).toBe('#00aaff');
    expect(p.wood).toBe('#7a4a24');
    expect(p.ui).toBe('#ff00aa');
    expect(p.goal).toBe('#00ff00');
    expect(p.danger).toBe(DEFAULT_PALETTE.danger);
    expect(p._custom).toContain('sky');
  });
});

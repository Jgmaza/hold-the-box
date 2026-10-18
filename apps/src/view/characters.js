// Personajes jugables (Capa A: frijoles de piezas suaves + rasgos de charFeatures.js). El modelo no depende del
// jugador: P1 y P2 escogen en el menú y pueden escoger el mismo; en ese caso P2 sale con los colores alternos (`alt`).
// `colors`: hex por pieza (`shirt` = torso y mangas; el resto lo usa `look`). `look(f, c)` pone los rasgos.
// `sleeves`: 'short' (brazo de piel, por defecto) o 'long'.
import { SHOULDER, features } from './charFeatures.js';
import { Parts } from './parts.js';

export const CHARACTERS = [
  {
    id: 'alebarto',
    name: 'Alebarto',
    colors: { shirt: '#3a63a8', hair: '#1f1d1c' },
    alt: { shirt: '#8a2f4f' },
    look: (f, c) => {
      f.face({ brow: c.hair, mood: 'serio', browR: 0.013, nose: 1.15, mouth: false });
      f.hair(c.hair);
      f.beard(c.hair);
    },
  },
  {
    id: 'gustambo',
    name: 'Gustambo',
    colors: { shirt: '#f07a32', hair: '#8c8d8f', glasses: '#26282b' },
    alt: { shirt: '#5aa9e6' },
    look: (f, c) => {
      f.face({ brow: '#6f7073', mood: 'cansado', browY: 1.422, wrinkles: true });
      f.hair(c.hair, 'side');
      f.glasses(c.glasses, 'rect');
    },
  },
  {
    id: 'alcazar',
    name: 'Alcázar',
    colors: { shirt: '#46a34e', hat: '#7a4a2a', hair: '#6b4426' },
    alt: { shirt: '#d9a23a', hat: '#3f4d5c' },
    look: (f, c) => {
      f.face({ brow: c.hair, mood: 'picaro', browR: 0.011, nose: 1.15 });
      f.hair(c.hair, 'back');
      f.beanie(c.hat);
      f.mustache(c.hair, { curly: true });
    },
  },
  {
    id: 'matias',
    name: 'Matías',
    colors: { shirt: '#f2cf3a', cap: '#d23b33', hair: '#a9aaac', glasses: '#3a3c40' },
    alt: { shirt: '#6cc4e8', cap: '#2f5fc4' },
    look: (f, c) => {
      f.face({ brow: c.hair, mood: 'tranquilo', browR: 0.007, wrinkles: true });
      f.hair(c.hair, 'back');
      f.cap(c.cap);
      f.glasses(c.glasses, 'round');
    },
  },
  {
    id: 'melith',
    name: 'Melith',
    colors: { shirt: '#9b5bc8', pants: '#4b3566', hair: '#6b3f22', hat: '#a99cbc', brim: '#6d3f8f', stripe: '#4d86c2', scarf: ['#7a4fb0', '#d7d2e3', '#4d86c2'] },
    alt: { shirt: '#3fb8a5', pants: '#2c5a55' },
    look: (f, c) => {
      f.pants(c.pants);
      f.face({ brow: c.hair, mood: 'amable', browY: 1.395, browR: 0.007, nose: 0.85, lashes: true, blush: true });
      f.hair(c.hair, 'bob');
      f.beanie(c.hat, { brim: c.brim, stripes: [c.brim, c.stripe, c.brim], dots: ['#f1ecf6', c.stripe], pompom: c.brim });
      f.scarf(c.scarf);
    },
  },
  {
    id: 'manolo',
    name: 'Manolo',
    colors: { shirt: '#4a4d52', pants: '#3e5f8a', vest: '#e8e23a', helmet: '#f2d230', hair: '#5a4632', glasses: '#3a3c40' },
    alt: { vest: '#ff8a2a', helmet: '#f5f5f0' },
    sleeves: 'long',
    look: (f, c) => {
      f.pants(c.pants);
      f.vest(c.vest, c.shirt);
      f.face({ brow: c.hair, mood: 'tranquilo' });
      f.hair(c.hair, 'back');
      f.hardHat(c.helmet);
      f.glasses(c.glasses, 'round');
    },
  },
];

export const DEFAULT_CHARS = { p1: 'alebarto', p2: 'gustambo' };

export const character = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/** P2 usa los colores alternos solo si escogió el mismo personaje que P1. */
export const usesAlt = (chars, slot) => slot === 'p2' && chars.p1 === chars.p2;

export { SHOULDER };

/**
 * Arma el personaje dentro de `parent` (mira hacia -Z, pies en y = 0).
 * Devuelve los brazos para que la vista los mueva: [{ side, shoulder, joint, arm, fist }].
 */
export function buildCharacter(gfx, parent, id, { alt = false } = {}) {
  const def = character(id);
  const colors = alt ? { ...def.colors, ...def.alt } : def.colors;
  // Parts propio: al destruir el modelo (el menú lo rearma en cada cambio) PlayCanvas libera sus mallas.
  const f = features(gfx, new Parts(gfx), parent);
  const armRigs = f.body(colors, { sleeves: def.sleeves });
  def.look(f, colors);
  f.finish();
  return armRigs;
}

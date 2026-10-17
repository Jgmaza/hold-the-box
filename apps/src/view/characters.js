// Personajes jugables (Capa A: primitivas). El modelo no depende del jugador: P1 y P2 escogen en el menú
// y pueden escoger el mismo; en ese caso P2 sale con los colores alternos (`alt`, claves de la paleta).
// `sprite`: prefijo de los PNG de Juanes (p1-cargar.png / p1-frente.png) que reemplazan el modelo.

export const CHARACTERS = [
  {
    id: 'traje',
    name: 'El Ejecutivo',
    blurb: 'Traje, gafas y corbata. La caja es su reunión más importante.',
    sprite: 'p1',
    colors: { suit: 'p1', tie: 'danger' },
    alt: { suit: 'p1Alt', tie: 'ui' },
  },
  {
    id: 'gorra',
    name: 'El Repartidor',
    blurb: 'Gorra y camiseta de trabajo. Ha cargado de todo, menos esto.',
    sprite: 'p2',
    colors: { suit: 'p2', cap: 'cap' },
    alt: { suit: 'p2Alt', cap: 'capAlt' },
  },
];

export const DEFAULT_CHARS = { p1: 'traje', p2: 'gorra' };

export const character = (id) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];

/** P2 usa los colores alternos solo si escogió el mismo personaje que P1. */
export const usesAlt = (chars, slot) => slot === 'p2' && chars.p1 === chars.p2;

/** Hombros a la altura del torso: el brazo sale hacia -Z y el puño va en la punta. */
export const SHOULDER = { x: 0.34, y: 1.02, z: -0.06 };

/**
 * Arma el personaje dentro de `parent` (mira hacia -Z, pies en y = 0).
 * Devuelve los brazos para que la vista los mueva: [{ side, shoulder, joint, arm, fist }].
 */
export function buildCharacter(gfx, parent, id, { alt = false } = {}) {
  const def = character(id);
  const colors = alt ? { ...def.colors, ...def.alt } : def.colors;
  const suit = gfx.solid(colors.suit);
  const skin = gfx.solid('skin');
  gfx.prim('capsule', suit, { parent, pos: [0, 0.6, 0], scale: [0.6, 0.6, 0.6], name: 'torso' });
  gfx.prim('sphere', skin, { parent, pos: [0, 1.36, 0], scale: [0.5, 0.5, 0.5], name: 'head' });

  const armRigs = [];
  for (const side of [-1, 1]) {
    const shoulder = gfx.group(side < 0 ? 'shoulder-L' : 'shoulder-R', parent);
    shoulder.setLocalPosition(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
    const joint = gfx.prim('sphere', suit, { parent: shoulder, scale: [0.22, 0.22, 0.22], name: 'joint' });
    const arm = gfx.prim('box', suit, { parent: shoulder, pos: [0, 0, -0.25], scale: [0.12, 0.12, 0.5], name: 'arm' });
    const fist = gfx.prim('sphere', skin, { parent: shoulder, pos: [0, 0, -0.52], scale: [0.15, 0.15, 0.15], name: 'fist' });
    armRigs.push({ side, shoulder, joint, arm, fist });
  }

  if (def.id === 'traje') {
    gfx.prim('box', gfx.solid('dark', { gloss: 0.8 }), { parent, pos: [0, 1.4, -0.22], scale: [0.4, 0.09, 0.08], name: 'gafas' });
    gfx.prim('box', gfx.solid('#ffffff'), { parent, pos: [0, 1.0, -0.27], scale: [0.18, 0.2, 0.05], name: 'camisa' });
    gfx.prim('box', gfx.solid(colors.tie), { parent, pos: [0, 0.95, -0.3], scale: [0.07, 0.26, 0.04], name: 'corbata' });
  } else {
    const cap = gfx.solid(colors.cap);
    gfx.prim('cylinder', cap, { parent, pos: [0, 1.53, 0], scale: [0.52, 0.14, 0.52], name: 'gorra' });
    gfx.prim('box', cap, { parent, pos: [0, 1.47, -0.27], scale: [0.34, 0.04, 0.26], name: 'visera' });
    gfx.prim('box', gfx.solid('#ffffff'), { parent, pos: [0, 0.82, -0.29], scale: [0.2, 0.2, 0.03], name: 'logo' });
  }
  return armRigs;
}

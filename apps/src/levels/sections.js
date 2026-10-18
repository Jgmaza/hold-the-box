// Secciones de nivel listas para instanciar en una línea.
// Clima → una plataforma (docs/clima.md), salvo el oleaje (isla + rompeolas). Rieles → array de plataformas (docs/rieles.md).
//
//   platforms: [
//     ...,
//     rainIsland({ id: 'isla-lluvia', from: 40, length: 14 }),
//     windIsland({ id: 'isla-viento', from: 23, length: 14 }),
//     ...waveIsland({ id: 'isla-olas', from: 9, length: 18 }),
//     ...railsPair({ id: 'rieles', from: -44, length: 28 }),
//   ]
//
// El nivel avanza hacia -Z: `from` es el borde de ENTRADA (z más alto) y la sección llega hasta `from - length`.

import { CONFIG } from '../config.js';
import { makeRng } from '../sim/math.js';
import { collideKind, propCollider } from './kenneyColliders.js';
import { KENNEY_BOUNDS } from './kenneyBounds.js';

const SHELTER = { w: 3.6, d: 3 }; // tamaño de carpa en el que entra la pareja con la caja
const EDGE = 0.8; // distancia mínima de la carpa al borde de la isla
const PATH = 0.4; // mitad del pasillo libre en el centro (entre carpas de lados opuestos)

/**
 * Isla de lluvia con carpas ALTERNADAS izquierda / derecha, repartidas parejo a lo largo.
 * La sección puede ser tan larga como se quiera: las carpas se reparten solas.
 *
 * @param {object} o
 * @param {string} o.id                 id de la plataforma
 * @param {number} o.from               z del borde de entrada
 * @param {number} o.length             largo de la sección (m, hacia -Z)
 * @param {number} [o.shelters]         cantidad de carpas (por defecto ≈ una cada 4.5 m, mínimo 1)
 * @param {'left'|'right'} [o.firstSide='left']  lado de la primera carpa (la más cercana a la entrada)
 * @param {number} [o.width=10]         ancho de la isla (X)
 * @param {number} [o.x=0]              centro de la isla en X
 * @param {number} [o.top=1]            altura del piso
 * @param {{w:number, d:number}} [o.shelterSize]  tamaño de cada carpa (por defecto 3.6 × 3)
 * @param {number} [o.strength]         multiplicador de la lluvia en esta isla (CONFIG.weather.rain)
 * @returns {object} plataforma con `weather: { type: 'rain', shelters }`
 */
export function rainIsland({ id, from, length, shelters, firstSide = 'left', width = 10, x = 0, top = 1, shelterSize = SHELTER, strength } = {}) {
  check(id, from, length, 'rainIsland');
  const count = shelters ?? Math.max(1, Math.round(length / 4.5));
  const { w, d } = shelterSize;
  const step = length / count;
  if (count < 1 || !Number.isInteger(count)) throw new Error(`[rainIsland] "${id}": shelters debe ser un entero ≥ 1 (llegó ${count})`);
  if (d > step) throw new Error(`[rainIsland] "${id}": ${count} carpas de ${d} m no entran en ${length} m (máximo ${Math.floor(length / d)})`);
  const offset = width / 2 - w / 2 - EDGE; // centro de la carpa respecto al centro de la isla
  if (offset - w / 2 < PATH) throw new Error(`[rainIsland] "${id}": la isla de ${width} m es angosta para carpas de ${w} m (mínimo ${2 * (w + EDGE + PATH)} m)`);

  const first = firstSide === 'right' ? 1 : -1;
  const list = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? first : -first;
    list.push({ x: round(x + side * offset), z: round(from - step * (i + 0.5)), w, d });
  }
  const weather = { type: 'rain', shelters: list };
  if (strength !== undefined) weather.strength = strength;
  return { id, x, z: round(from - length / 2), w: width, d: length, top, weather };
}

/**
 * Isla de viento: ráfagas de lado (por defecto alternando izquierda / derecha).
 *
 * @param {object} o
 * @param {string} o.id
 * @param {number} o.from        z del borde de entrada
 * @param {number} o.length      largo (m, hacia -Z)
 * @param {'alternate'|'random'|number} [o.dir='alternate']  dirección de las ráfagas (grados: 0 = hacia +X)
 * @param {number} [o.width=10]
 * @param {number} [o.x=0]
 * @param {number} [o.top=1]
 * @param {number} [o.strength]  multiplicador del viento en esta isla (CONFIG.weather.wind)
 * @param {number|false} [o.holes]  cantidad de huecos, alternando izquierda / derecha cerca del centro (por defecto se reparten solos según `length`; false = sin huecos)
 */
export function windIsland({ id, from, length, dir = 'alternate', width = 10, x = 0, top = 1, strength, holes } = {}) {
  check(id, from, length, 'windIsland');
  const weather = { type: 'wind', dir };
  const list = holes === false ? [] : windHoles({ id, from, length, width, x, count: holes });
  if (list.length) weather.holes = list;
  if (strength !== undefined) weather.strength = strength;
  return { id, x, z: round(from - length / 2), w: width, d: length, top, weather };
}

const round = (v) => Math.round(v * 100) / 100;

const hashId = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

/**
 * Huecos circulares (sin piso: se cae al agua) de una isla de viento. Solo depende del largo: la isla se parte en
 * tramos cortos (uno por hueco, `CONFIG.weather.wind.holeLayout.spacing`) y en cada uno cae un círculo CERCA DEL CENTRO,
 * alternando izquierda / derecha. Cada hueco tapa la mitad por la que venían caminando: hay que esquivarlo por el otro
 * lado y el siguiente obliga a volver (slalom). El radio, qué tan corrido del eje y la posición dentro del tramo salen
 * del `id` y del largo: siempre es el mismo resultado (nada de Math.random).
 * Entre un hueco y el siguiente quedan al menos `zGap` metros en Z para girar, del lado contrario siempre queda paso
 * para la pareja con la caja, y se deja `margin` libre al entrar y al salir.
 *
 * @returns {{x:number, z:number, r:number}[]}  de adelante hacia atrás
 */
export function windHoles({ id, from, length, width = 10, x = 0, count } = {}) {
  const L = CONFIG.weather.wind.holeLayout;
  const usable = length - 2 * L.margin;
  const n = count ?? Math.max(0, Math.floor(usable / L.spacing));
  if (n < 1 || usable <= 0) return [];
  const rng = makeRng((hashId(id) ^ Math.imul(Math.round(length * 100), 2654435761)) >>> 0);
  const strip = usable / n;
  const room = strip / 2 - L.zGap / 2; // medio tramo menos la mitad del respiro entre huecos
  const rMax = Math.max(0.3, Math.min(L.radiusMax, room));
  const rMin = Math.min(L.radiusMin, rMax);
  const first = rng.chance(0.5) ? 1 : -1;
  const list = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? first : -first;
    const r = rng.range(rMin, rMax);
    const zMid = from - L.margin - strip * (i + 0.5);
    const dz = rng.range(-1, 1) * Math.max(0, room - r);
    const off = Math.min(rng.range(L.center.min, L.center.max), width / 2 - r - 0.2);
    list.push({ x: round(x + side * off), z: round(zMid + dz), r: round(r) });
  }
  return list;
}

const BREAKWATER = { w: 1, d: 3, h: 0.8, edge: 0.3 }; // rompeolas: bloque de roca en el borde de la isla

/**
 * Isla de oleaje: cada tanto una ola cruza de lado a lado (alternando izquierda / derecha).
 * Los ROMPEOLAS se reparten solos a lo largo, alternando borde: detrás de uno del lado de donde viene la ola
 * no pasa nada. Devuelve un ARRAY (isla + rompeolas, que chocan): usar spread. Ver docs/clima.md.
 *
 * @param {object} o
 * @param {string} o.id
 * @param {number} o.from        z del borde de entrada
 * @param {number} o.length      largo (m, hacia -Z)
 * @param {number} [o.breakwaters]  cuántos (por defecto uno cada ~6 m)
 * @param {'alternate'|'random'|'left'|'right'} [o.dir='alternate']  de dónde vienen las olas
 * @param {'left'|'right'} [o.firstSide='left']  borde del primer rompeolas
 * @param {number} [o.width=10]
 * @param {number} [o.x=0]
 * @param {number} [o.top=1]
 * @param {number} [o.strength]  multiplicador del oleaje en esta isla (CONFIG.weather.waves)
 */
export function waveIsland({ id, from, length, breakwaters, dir = 'alternate', firstSide = 'left', width = 10, x = 0, top = 1, strength } = {}) {
  check(id, from, length, 'waveIsland');
  const count = breakwaters ?? Math.max(1, Math.round(length / 6));
  const step = length / count;
  if (count < 1 || !Number.isInteger(count)) throw new Error(`[waveIsland] "${id}": breakwaters debe ser un entero ≥ 1 (llegó ${count})`);
  if (BREAKWATER.d > step) throw new Error(`[waveIsland] "${id}": ${count} rompeolas de ${BREAKWATER.d} m no entran en ${length} m (máximo ${Math.floor(length / BREAKWATER.d)})`);
  if (width < 7) throw new Error(`[waveIsland] "${id}": la isla de ${width} m es angosta (mínimo 7 m: la pareja tiene que caber detrás del rompeolas)`);

  const first = firstSide === 'right' ? 1 : -1;
  const offset = width / 2 - BREAKWATER.w / 2 - BREAKWATER.edge;
  const list = [];
  const blocks = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? first : -first;
    const b = { x: round(x + side * offset), z: round(from - step * (i + 0.5)), w: BREAKWATER.w, d: BREAKWATER.d };
    list.push(b);
    blocks.push({ id: `${id}-rompeolas-${i}`, kind: 'breakwater', ...b, top: top + BREAKWATER.h, h: BREAKWATER.h + 0.2 });
  }
  const weather = { type: 'waves', dir, breakwaters: list };
  if (strength !== undefined) weather.strength = strength;
  return [{ id, x, z: round(from - length / 2), w: width, d: length, top, weather }, ...blocks];
}

// Rieles: obstáculos se REPARTEN solos según `length` (como las carpas de rainIsland).
// Ver docs/rieles.md.
export const RAILS_GAP = 1.6;
export const RAILS_ROCK_H = 0.55;
export const RAILS_BUMP_H = 0.35;
export const RAILS_DEFAULT_LENGTH = 28;
export const RAILS_APPROACH = 3; // metros sólidos al entrar / salir
export const RAILS_SPACING = 4; // ≈ un obstáculo cada tantos metros del tramo jugable
// Ciclo de tipos: en cada slot un solo carril tiene el obstáculo (P1, P2, P1, P2…).
export const RAILS_TYPES = ['rock', 'gap', 'rock', 'bump', 'gap', 'rock'];

/**
 * Sheet de beats para un largo dado (offsets en metros desde la entrada hacia −Z).
 * Misma idea que repartir carpas en rainIsland: más largo → más obstáculos.
 *
 * @param {number} length
 * @param {number} [hazards]  cantidad (por defecto ≈ una cada 4 m del tramo jugable, mínimo 2)
 * @returns {{ p1: {rocks:number[], gaps:number[], bumps:number[]}, p2: typeof p1 }}
 */
export function railsBeats(length, hazards) {
  if (!(length > 0)) throw new Error(`[railsBeats] length debe ser > 0`);
  const playable = length - 2 * RAILS_APPROACH;
  if (playable < RAILS_GAP + 0.5) {
    throw new Error(`[railsBeats] length ${length} m es corto (mínimo ${Math.ceil(2 * RAILS_APPROACH + RAILS_GAP + 0.5)} m)`);
  }
  const count = hazards ?? Math.max(2, Math.round(playable / RAILS_SPACING));
  if (count < 1 || !Number.isInteger(count)) throw new Error(`[railsBeats] hazards debe ser un entero ≥ 1 (llegó ${count})`);
  const step = playable / count;
  if (RAILS_GAP > step) {
    throw new Error(`[railsBeats] ${count} obstáculos no entran en ${length} m (máximo ${Math.floor(playable / RAILS_GAP)})`);
  }

  const empty = () => ({ rocks: [], gaps: [], bumps: [] });
  const beats = { p1: empty(), p2: empty() };
  for (let i = 0; i < count; i++) {
    const t = round(RAILS_APPROACH + step * (i + 0.5));
    const type = RAILS_TYPES[i % RAILS_TYPES.length];
    const lane = i % 2 === 0 ? 'p1' : 'p2';
    const key = type === 'rock' ? 'rocks' : type === 'gap' ? 'gaps' : 'bumps';
    beats[lane][key].push(t);
  }
  return beats;
}

/** Sheet del largo por defecto (28 m → 6 obstáculos desfasados). Útil en tests. */
export const RAILS_BEATS = railsBeats(RAILS_DEFAULT_LENGTH);

/**
 * Par de rieles con obstáculos distintos por jugador (spread en `platforms`).
 * La sección puede ser tan larga (o corta) como se quiera: los obstáculos se reparten solas.
 * Ver docs/rieles.md.
 *
 * @param {object} o
 * @param {string} o.id
 * @param {number} o.from                 z del borde de entrada
 * @param {number} [o.length=28]          largo total (m, hacia −Z)
 * @param {number} [o.hazards]            cantidad de obstáculos (por defecto ≈ 1 cada 4 m)
 * @param {{p1:object, p2:object}} [o.beats]  sheet a mano (offsets desde la entrada); si se da, ignora `hazards`
 * @param {number} [o.laneX=0.8]          |x| de cada carril (P1 = −laneX, P2 = +laneX)
 * @param {number} [o.width=0.7]          ancho de cada riel
 * @param {number} [o.top=1]              altura del piso del riel
 * @returns {object[]} plataformas (plank + rock + bump)
 */
export function railsPair({ id, from, length = RAILS_DEFAULT_LENGTH, hazards, beats, laneX = 0.8, width = 0.7, top = 1 } = {}) {
  check(id, from, length, 'railsPair');
  const sheet = beats ?? railsBeats(length, hazards);
  for (const lane of ['p1', 'p2']) {
    for (const t of [...(sheet[lane].rocks ?? []), ...(sheet[lane].gaps ?? []), ...(sheet[lane].bumps ?? [])]) {
      if (t < 0 || t > length) throw new Error(`[railsPair] "${id}": beat ${t} fuera de [0, ${length}]`);
    }
  }

  const out = [];
  out.push(...laneRails(`${id}-izq`, -laneX, from, length, sheet.p1, width, top));
  out.push(...laneRails(`${id}-der`, laneX, from, length, sheet.p2, width, top));
  return out;
}

/** Segmentos de un carril + piedras/topes encima. */
function laneRails(id, x, from, length, beats, width, top) {
  const gaps = (beats.gaps ?? []).map((t) => ({ start: t - RAILS_GAP / 2, end: t + RAILS_GAP / 2 }));
  gaps.sort((a, b) => a.start - b.start);

  const plats = [];
  let cursor = 0;
  let seg = 0;
  for (const g of gaps) {
    if (g.start > length) break;
    const a = Math.max(0, g.start);
    const b = Math.min(length, g.end);
    if (a > cursor + 0.05) {
      plats.push(railSeg(`${id}-s${seg++}`, x, from, cursor, a, width, top));
    }
    cursor = Math.max(cursor, b);
  }
  if (cursor < length - 0.05) {
    plats.push(railSeg(`${id}-s${seg++}`, x, from, cursor, length, width, top));
  }

  let i = 0;
  for (const t of beats.rocks ?? []) {
    if (t < 0 || t > length) continue;
    plats.push({
      id: `${id}-rock${i++}`,
      x,
      z: round(from - t),
      w: width + 0.1,
      d: 0.7,
      top: top + RAILS_ROCK_H,
      h: RAILS_ROCK_H,
      kind: 'rock',
    });
  }
  i = 0;
  for (const t of beats.bumps ?? []) {
    if (t < 0 || t > length) continue;
    plats.push({
      id: `${id}-bump${i++}`,
      x,
      z: round(from - t),
      w: width + 0.05,
      d: 0.55,
      top: top + RAILS_BUMP_H,
      h: RAILS_BUMP_H,
      kind: 'bump',
    });
  }
  return plats;
}

function railSeg(id, x, from, t0, t1, width, top) {
  const d = t1 - t0;
  return { id, x, z: round(from - (t0 + t1) / 2), w: width, d: round(d), top, h: 0.35, kind: 'plank' };
}

// ------------------------------------------------------------------ escenografía (modelos Kenney)
// Solo decoración: no chocan. Se reparten con semilla (siempre igual) en las orillas de cada isla,
// lejos del pasillo central, de las carpas, carteles, props y peligros. Ver docs/escenografia.md.

export const SCENERY_SETS = {
  beach: ['palm-straight', 'palm-bend', 'palm-detailed-straight', 'palm-detailed-bend', 'grass-patch', 'grass-plant', 'rocks-sand-a', 'rocks-sand-b', 'rocks-sand-c', 'patch-sand-foliage', 'bottle', 'barrel', 'tool-paddle', 'crate'],
  pirate: ['barrel', 'crate', 'crate-bottles', 'chest', 'cannon', 'cannon-ball', 'flag-pirate', 'flag-pirate-high', 'bottle-large', 'tool-shovel', 'rocks-a', 'palm-bend', 'structure-fence'],
  fort: ['castle-wall', 'castle-window', 'castle-door', 'tower-base', 'tower-middle-windows', 'tower-watch', 'cannon', 'cannon-mobile', 'flag-high-pennant', 'flag-pirate-high-pennant', 'rocks-b', 'rocks-c', 'barrel'],
  // Kits CC0 de Kenney (nature-kit y fantasy-town-kit) en public/kenney/nature y public/kenney/town.
  // Escala propia: esos modelos miden ~1 m, el pirata se achica a 0.4.
  village: [
    'nature/tree_palm', 'nature/tree_palmTall', 'nature/tree_palmBend', 'nature/tree_palmDetailedTall', 'nature/tree_default', 'nature/tree_detailed', 'nature/tree_fat', 'nature/tree_tall', 'nature/tree_oak',
    'nature/plant_bush', 'nature/plant_bushLarge', 'nature/plant_bushDetailed', 'nature/plant_bushSmall',
    'nature/grass', 'nature/grass_leafs', 'nature/grass_large',
    'nature/crops_bambooStageB',
    'nature/rock_smallA', 'nature/stump_round', 'nature/log',
  ],
  temple: [
    'nature/statue_head', 'nature/statue_column', 'nature/statue_columnDamaged', 'nature/statue_obelisk', 'nature/statue_block',
    'nature/stone_tallA', 'nature/stone_tallB', 'nature/stone_largeA', 'nature/rock_tallA', 'nature/rock_largeA', 'nature/rock_largeB',
    'nature/tree_palm', 'nature/tree_palmDetailedTall', 'nature/tree_palmTall',
    'nature/plant_bushLarge', 'nature/plant_bushDetailed', 'nature/grass_leafs', 'nature/flower_purpleA',
  ],
  canyon: [
    'nature/rock_largeA', 'nature/rock_largeB', 'nature/rock_tallA', 'nature/rock_tallB', 'nature/stone_largeA', 'nature/stone_tallA', 'nature/stone_tallB',
    'nature/tree_default', 'nature/tree_tall', 'nature/tree_oak', 'nature/tree_fat', 'nature/tree_detailed',
    'nature/plant_bush', 'nature/plant_bushLarge', 'nature/log_large', 'nature/stump_round', 'nature/grass', 'nature/grass_large',
  ],
};
const SCENERY_BIG = new Set(['castle-wall', 'castle-window', 'castle-door', 'castle-gate', 'tower-base', 'tower-middle-windows', 'tower-watch', 'tower-complete-small', 'tower-complete-large', 'structure']);
const SHIPS = ['ship-large', 'ship-pirate-large', 'ship-medium', 'ship-pirate-medium', 'ship-small', 'ship-pirate-small', 'ship-ghost', 'ship-wreck'];
const SCENERY_SCALE = 0.4;

/** Azar repetible (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const blockedBy = (zones, x, z) =>
  zones.some((b) => (b.r !== undefined ? (x - b.x) ** 2 + (z - b.z) ** 2 < b.r ** 2 : Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2));

/**
 * Props en las dos orillas de UNA plataforma (rieles y plataformas angostas quedan vacías).
 *
 * @param {object} p                         plataforma ({ x, z, w, d, top, weather? })
 * @param {object} [o]
 * @param {'beach'|'pirate'|'fort'} [o.set='beach']
 * @param {number} [o.seed=1]
 * @param {number} [o.density=1]             1 ≈ un prop cada 2.4 m por orilla
 * @param {number} [o.lane=2.1]              mitad del pasillo libre en el centro
 * @param {Array<{x,z,r}|{x,z,w,d}>} [o.keepOut]  zonas sin props (círculos o rectángulos)
 * @returns {{art:string, x:number, z:number, top:number, yaw:number, s:number}[]}
 */
export function dressIsland(p, { set = 'beach', seed = 1, density = 1, lane = 2.1, keepOut = [] } = {}) {
  const arts = SCENERY_SETS[set];
  if (!arts) throw new Error(`[dressIsland] set "${set}" no existe (${Object.keys(SCENERY_SETS).join(' | ')})`);
  const margin = 0.5;
  const half = p.w / 2 - margin;
  if (p.kind || half - lane < 0.6) return [];
  const r = rng(seed);
  const covers = [...(p.weather?.shelters ?? []), ...(p.weather?.breakwaters ?? [])];
  const zones = [...keepOut, ...covers.map((s) => ({ x: s.x, z: s.z, w: s.w + 0.8, d: s.d + 0.8 }))];
  const zMax = p.z + p.d / 2 - margin;
  const zMin = p.z - p.d / 2 + margin;
  const step = 2.4 / density;
  const out = [];
  for (const side of [-1, 1]) {
    for (let z = zMax - r() * step * 0.5; z > zMin; z -= step * (0.7 + r() * 0.6)) {
      const art = arts[Math.floor(r() * arts.length)];
      const big = SCENERY_BIG.has(art);
      let x = p.x + side * (big ? half - 0.5 : lane + r() * (half - lane));
      if (big && half - lane < 1.4) continue;
      if (blockedBy(zones, x, z)) continue;
      const yaw = big ? (side < 0 ? 90 : -90) : Math.round(r() * 360);
      // Si choca (kenneyColliders.js), se corre hacia la orilla hasta dejar libre el pasillo; si no cabe, no va.
      const col = propCollider({ art, x, z, top: p.top, yaw, s: SCENERY_SCALE });
      if (col) {
        const near = side < 0 ? p.x - col.max.x : col.min.x - p.x; // borde del collider más cerca del centro
        const far = side < 0 ? p.x - col.min.x : col.max.x - p.x;
        const shift = Math.max(0, lane - near);
        if (far + shift > p.w / 2 + 0.4) continue;
        x += side * shift;
      }
      out.push({ art, x: round(x), z: round(z), top: p.top, yaw, s: SCENERY_SCALE });
    }
  }
  return out;
}

/**
 * Barcos anclados en el agua a ambos lados del recorrido, alternando orilla.
 * @param {object} o
 * @param {number} o.from  z inicial (más alto)
 * @param {number} o.to    z final
 */
export function shipsAlong({ from, to, seed = 1, x = 10.5, every = 18, keepOut = [] } = {}) {
  const r = rng(seed);
  const out = [];
  let side = r() < 0.5 ? -1 : 1;
  for (let z = from - r() * every * 0.5; z > to; z -= every * (0.75 + r() * 0.5)) {
    const sx = side * (x + r() * 2.5);
    if (!blockedBy(keepOut, sx, z)) {
      out.push({ art: SHIPS[Math.floor(r() * SHIPS.length)], x: round(sx), z: round(z), top: -0.15, yaw: side < 0 ? 0 : 180, s: 0.5, float: true });
    }
    if (r() < 0.4) {
      const bx = -side * (x - 3.5);
      if (!blockedBy(keepOut, bx, z - 4)) out.push({ art: r() < 0.5 ? 'boat-row-small' : 'boat-row-large', x: round(bx), z: round(z - 4), top: -0.04, yaw: Math.round(r() * 60 - 30), s: 0.55, float: true });
    }
    side = -side;
  }
  return out;
}

/**
 * Viste un nivel completo: props por isla según su set + barcos a lo largo.
 * Evita sola carteles, props, chorros, rodillos, meta y carpas.
 *
 * @param {object} level
 * @param {Record<'beach'|'pirate'|'fort', string[]>} sets  ids de plataforma por set
 * @param {{ seed?: number, density?: number, ships?: boolean }} [o]
 */
export function dressLevel(level, sets, { seed = 1, density = 1, ships = true } = {}) {
  const keepOut = [
    ...(level.signs ?? []).map((s) => ({ x: s.x, z: s.z, r: s.w / 2 + 0.6 })),
    ...(level.props ?? []).map((p) => ({ x: p.x, z: p.z, r: p.type === 'bar' ? 2.2 : 1.2 })),
    ...(level.geysers ?? []).map((g) => ({ x: g.x, z: g.z, r: g.radius + 0.8 })),
    ...(level.sweepers ?? []).map((s) => ({ x: s.x, z: s.z, r: s.length + 0.4 })),
  ];
  if (level.goal) keepOut.push({ x: level.goal.x, z: level.goal.z, w: level.goal.w + 1, d: level.goal.d + 1 });
  const byId = new Map(level.platforms.map((p) => [p.id, p]));
  const out = [];
  let k = 0;
  for (const [set, ids] of Object.entries(sets)) {
    for (const id of ids) {
      const p = byId.get(id);
      if (!p) throw new Error(`[dressLevel] "${level.id}": no hay plataforma "${id}"`);
      out.push(...dressIsland(p, { set, seed: seed * 101 + k++, density, keepOut }));
    }
  }
  if (ships) {
    const zs = level.platforms.flatMap((p) => [p.z + p.d / 2, p.z - p.d / 2]);
    const wide = Math.max(...level.platforms.map((p) => Math.abs(p.x) + p.w / 2));
    const water = keepOut.filter((b) => b.r !== undefined).concat((level.signs ?? []).filter((s) => s.top <= 0).map((s) => ({ x: s.x, z: s.z, r: s.w / 2 + 3 })));
    out.push(...shipsAlong({ from: Math.max(...zs), to: Math.min(...zs), seed: seed * 7 + 3, x: wide + 4, keepOut: water }));
  }
  return out;
}

/** Escala de un modelo del kit de selva/pueblo (unidades ~1 m, no las del kit pirata). */
function jungleScale(art, r) {
  if (art.startsWith('nature/tree_')) return 2.55 + r() * 1.15;
  if (art.startsWith('nature/statue_head')) return 3.15 + r() * 0.45;
  if (art.startsWith('nature/statue_')) return 2.7 + r() * 0.55;
  if (/nature\/(rock_large|rock_tall|stone_tall|stone_large)/.test(art)) return 2.3 + r() * 0.9;
  if (art.startsWith('nature/plant_bush')) return 2.35 + r() * 0.9;
  if (/nature\/(grass|flower_|mushroom_|crops_)/.test(art)) return 1.65 + r() * 0.7;
  if (/nature\/(log|stump_)/.test(art)) return 1.85 + r() * 0.45;
  return 2;
}

/**
 * Bosque y ruinas a los lados del camino, sin tapar el pasillo.
 * En piso bajo, afuera del sendero (sobre el pasto). En una terraza alta, en el borde de la losa.
 *
 * @param {object} level
 * @param {{ set?: string, seed?: number, ground?: number, keepOut?: Array<{x,z,r}|{x,z,w,d}> }} [o]
 */
export function dressBanks(level, { set = 'village', seed = 1, ground = 0.88, keepOut = [] } = {}) {
  const arts = SCENERY_SETS[set];
  if (!arts) throw new Error(`[dressBanks] set "${set}" no existe`);
  const r = rng(seed);
  const zones = [...keepOut];
  for (const s of level.signs ?? []) zones.push({ x: s.x, z: s.z, r: s.w / 2 + 0.7 });
  for (const p of level.props ?? []) zones.push({ x: p.x, z: p.z, r: p.type === 'pyramid' ? (p.size ?? 8) / 2 : 1.5 });
  for (const n of level.npcs ?? []) zones.push({ x: n.x, z: n.z, r: 1.8 });
  for (const g of level.geysers ?? []) zones.push({ x: g.x, z: g.z, r: (g.radius ?? 1) + 0.8 });
  for (const s of level.sweepers ?? []) zones.push({ x: s.x, z: s.z, r: (s.length ?? 2) + 0.6 });
  for (const p of level.platforms) for (const s of p.weather?.shelters ?? []) zones.push({ x: s.x, z: s.z, w: s.w + 1.2, d: s.d + 1.2 });
  if (level.goal) zones.push({ x: level.goal.x, z: level.goal.z, w: level.goal.w + 1.4, d: level.goal.d + 1.4 });

  const out = [];
  const crowded = (x, z, rad) => blockedBy(zones, x, z) || out.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < (rad + 0.7) ** 2);

  for (const p of level.platforms) {
    if (p.kind || p.w < 4) continue;
    const high = Math.abs(p.top - ground) >= 0.55;
    const zMax = p.z + p.d / 2 - 0.35;
    const zMin = p.z - p.d / 2 + 0.35;
    const step = high ? 3.1 : 2.2;
    for (const side of [-1, 1]) {
      for (let z = zMax - r() * step * 0.4; z > zMin; z -= step * (0.7 + r() * 0.55)) {
        const art = arts[Math.floor(r() * arts.length)];
        const s = jungleScale(art, r);
        const b = KENNEY_BOUNDS[art];
        const half = b ? (Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) * s) / 2 : 0.4;
        const solid = collideKind(art) != null;
        let x;
        let top;
        if (!high) {
          const gap = solid ? Math.max(p.w / 2 + 0.9, 2.25 + half) : p.w / 2 + 0.12;
          const spread = art.includes('tree') ? 4.8 : solid ? 2.2 : 1.15;
          x = p.x + side * (gap + r() * spread);
          top = ground;
        } else {
          const inner = 2.25 + (solid ? half : 0.25);
          const outer = p.w / 2 - 0.4;
          if (outer - inner < 0.25) continue;
          x = p.x + side * (inner + r() * (outer - inner));
          top = p.top;
        }
        const rad = solid ? Math.max(half, 0.55) : 0.4;
        if (crowded(x, z, rad)) continue;
        const motion = /grass|flower_|mushroom_/.test(art) ? 'sway' : undefined;
        out.push({ art, x: round(x), z: round(z), top, yaw: Math.round(r() * 360), s: round(s), ...(motion ? { motion } : {}) });
      }
    }
  }
  return out;
}

const HUT = 2.4;

/** Dirección de la puerta (yaw 0 mira a +X), igual que el giro de la vista. */
function doorDir(yaw) {
  const a = (yaw * Math.PI) / 180;
  return { x: Math.cos(a), z: -Math.sin(a) };
}

/**
 * Dos filas de paneles de vidrio. En cada fila exactamente uno es templado
 * (aguanta el peso) y el otro se rompe al pisarlo. `from` es el borde de entrada.
 * @returns {{ panels: object[], endZ: number }}
 */
export function glassBridge({ from, rows = 5, gap = 0.85, panelD = 2.6, panelW = 3, lane = 2.05, top = 1, seed = 1 } = {}) {
  check('vidrio', from, rows, 'glassBridge');
  const r = rng(seed);
  const step = panelD + gap;
  const panels = [];
  for (let i = 0; i < rows; i++) {
    const z = round(from - gap - panelD / 2 - i * step);
    const leftHolds = r() < 0.5;
    const base = { z, w: panelW, d: panelD, top, h: 0.16, kind: 'glass' };
    panels.push({ ...base, id: `vidrio-i${i}`, x: -lane, tempered: leftHolds });
    panels.push({ ...base, id: `vidrio-d${i}`, x: lane, tempered: !leftHolds });
  }
  return { panels, endZ: round(from - rows * step) };
}

/** Mitad del ancho del modelo en el piso, para saber si se mete dentro de una choza. */
function propReach(item) {
  const b = KENNEY_BOUNDS[item.art];
  const s = item.s ?? 1;
  if (!b) return 0.4;
  return Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) * s * 0.5;
}

/**
 * Separa la escenografía que se cruza con una choza. Los muros no se mueven;
 * el resto sale hacia afuera del camino, para que la roca no atraviese la pared.
 */
export function unclipScenery(scenery) {
  const houses = [];
  for (const s of scenery) {
    if (s.art !== 'town/wall-wood-door') continue;
    houses.push({ x: s.x, z: s.z, r: (s.s ?? 2.4) * 0.58 });
  }
  const fixed = (s) => s.art.startsWith('town/wall') || s.art === 'town/roof-point' || s.art === 'town/chimney';
  for (let n = 0; n < 5; n++) {
    for (const s of scenery) {
      if (fixed(s)) continue;
      const reach = propReach(s);
      for (const h of houses) {
        let dx = s.x - h.x;
        let dz = s.z - h.z;
        let dist = Math.hypot(dx, dz);
        const need = h.r + reach + 0.15;
        if (dist >= need) continue;
        if (dist < 0.05) {
          dx = Math.sign(h.x) || 1;
          dz = 0;
          dist = 1;
        }
        let x = h.x + (dx / dist) * need;
        let z = h.z + (dz / dist) * need;
        if (Math.abs(x) < 2.4) {
          x = h.x + (Math.sign(h.x) || 1) * need;
          z = h.z + (dz || 0.6);
        }
        s.x = round(x);
        s.z = round(z);
      }
    }
  }
}

/**
 * Choza armada con piezas del fantasy-town-kit: cuatro muros, techo, chimenea con humo y un farol.
 * La puerta mira al camino (x = 0).
 * @param {Array<{x:number, z:number, top:number}>} spots
 */
export function villageHouses(spots) {
  const out = [];
  for (const h of spots) {
    const yawDoor = h.x >= 0 ? 180 : 0;
    const s = h.s ?? HUT;
    const door = doorDir(yawDoor);
    for (const yaw of [0, 90, 180, 270]) {
      out.push({ art: yaw === yawDoor ? 'town/wall-wood-door' : 'town/wall-wood', x: h.x, z: h.z, top: h.top, yaw, s });
    }
    out.push({ art: 'town/roof-point', x: h.x, z: h.z, top: round(h.top + s * 0.98), yaw: yawDoor, s });
    const chimS = round(s * 0.55);
    out.push({
      art: 'town/chimney',
      x: round(h.x - door.x * s * 0.2 - 0.32 * chimS),
      z: round(h.z - door.z * s * 0.2),
      top: round(h.top + s * 1.12),
      yaw: 0,
      s: chimS,
      motion: 'smoke',
    });
    const side = h.x >= 0 ? -1 : 1;
    out.push({
      art: 'town/lantern',
      x: round(h.x + door.x * s * 0.64),
      z: round(h.z + door.z * s * 0.64 + side * 0.42),
      top: h.top,
      yaw: yawDoor,
      s: 1.05,
      motion: 'sway',
    });
    out.push({
      art: 'nature/pot_large',
      x: round(h.x + door.x * s * 0.64),
      z: round(h.z + door.z * s * 0.64 - side * 0.5),
      top: h.top,
      yaw: 25,
      s: 1.7,
    });
    // Patio: cerca atrás, huerta y leña. Quedan fuera del pasillo.
    const back = -1;
    out.push({ art: 'nature/fence_simple', x: round(h.x + door.x * back * s * 0.72), z: round(h.z - 0.95), top: h.top, yaw: 90, s: 2.15 });
    out.push({ art: 'nature/fence_simple', x: round(h.x + door.x * back * s * 0.72), z: round(h.z + 0.95), top: h.top, yaw: 90, s: 2.15 });
    out.push({
      art: 'nature/crops_bambooStageB',
      x: round(h.x + door.x * back * s * 0.98),
      z: round(h.z + side * 0.15),
      top: h.top,
      yaw: side * 12,
      s: 2.15,
      motion: 'sway',
    });
    out.push({
      art: 'nature/log_stack',
      x: round(h.x + door.x * back * 0.35 + side * s * 0.62),
      z: round(h.z - side * 0.15),
      top: h.top,
      yaw: 18,
      s: 2.15,
    });
    out.push({
      art: 'nature/pot_small',
      x: round(h.x + door.x * s * 0.78),
      z: round(h.z - side * 0.2),
      top: h.top,
      yaw: 8,
      s: 1.7,
    });
  }
  return out;
}

/** Flores y pasto pegados al borde del camino, sin chocar. */
export function pathTrim(level, { seed = 3, ground = 0.88 } = {}) {
  const arts = ['nature/grass', 'nature/grass_leafs', 'nature/grass_large'];
  const r = rng(seed);
  const zones = [];
  for (const s of level.signs ?? []) zones.push({ x: s.x, z: s.z, r: s.w / 2 + 0.45 });
  for (const n of level.npcs ?? []) zones.push({ x: n.x, z: n.z, r: 1.3 });
  for (const p of level.platforms) for (const s of p.weather?.shelters ?? []) zones.push({ x: s.x, z: s.z, w: s.w + 0.4, d: s.d + 0.4 });
  if (level.goal) zones.push({ x: level.goal.x, z: level.goal.z, w: level.goal.w + 0.6, d: level.goal.d + 0.6 });
  const out = [];
  for (const p of level.platforms) {
    if (p.kind || p.w < 4.5) continue;
    const zMax = p.z + p.d / 2 - 0.3;
    const zMin = p.z - p.d / 2 + 0.3;
    for (const side of [-1, 1]) {
      for (let z = zMax; z > zMin; z -= 1.05 + r() * 0.45) {
        const art = arts[Math.floor(r() * arts.length)];
        const x = p.x + side * (p.w / 2 + 0.28 + r() * 0.55);
        if (blockedBy(zones, x, z)) continue;
        out.push({
          art,
          x: round(x),
          z: round(z),
          top: Math.abs(p.top - ground) < 0.4 ? ground : p.top,
          yaw: Math.round(r() * 360),
          s: round(1.7 + r() * 0.9),
          motion: 'sway',
        });
      }
    }
  }
  return out;
}

/** Tótem: columna de piedra con una cabeza encima. */
export function totems(spots) {
  const out = [];
  for (const t of spots) {
    const s = t.s ?? 2.7;
    out.push({ art: 'nature/statue_column', x: t.x, z: t.z, top: t.top, yaw: t.yaw ?? 0, s });
    out.push({ art: 'nature/statue_head', x: t.x, z: t.z, top: round(t.top + s * 0.9), yaw: (t.yaw ?? 0) + 12, s: round(s * 0.82) });
  }
  return out;
}

function check(id, from, length, fn) {
  if (!id) throw new Error(`[${fn}] falta \`id\``);
  if (typeof from !== 'number') throw new Error(`[${fn}] "${id}": falta \`from\` (z del borde de entrada)`);
  if (!(length > 0)) throw new Error(`[${fn}] "${id}": \`length\` debe ser > 0`);
}

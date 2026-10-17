// Secciones de nivel listas para instanciar en una línea.
// Clima → una plataforma (docs/clima.md). Rieles → array de plataformas (docs/rieles.md).
//
//   platforms: [
//     ...,
//     rainIsland({ id: 'isla-lluvia', from: 40, length: 14 }),
//     windIsland({ id: 'isla-viento', from: 23, length: 14 }),
//     ...railsPair({ id: 'rieles', from: -44, length: 28 }),
//   ]
//
// El nivel avanza hacia -Z: `from` es el borde de ENTRADA (z más alto) y la sección llega hasta `from - length`.

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
 */
export function windIsland({ id, from, length, dir = 'alternate', width = 10, x = 0, top = 1, strength } = {}) {
  check(id, from, length, 'windIsland');
  const weather = { type: 'wind', dir };
  if (strength !== undefined) weather.strength = strength;
  return { id, x, z: round(from - length / 2), w: width, d: length, top, weather };
}

const round = (v) => Math.round(v * 100) / 100;

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
  const zones = [...keepOut, ...(p.weather?.shelters ?? []).map((s) => ({ x: s.x, z: s.z, w: s.w + 0.8, d: s.d + 0.8 }))];
  const zMax = p.z + p.d / 2 - margin;
  const zMin = p.z - p.d / 2 + margin;
  const step = 2.4 / density;
  const out = [];
  for (const side of [-1, 1]) {
    for (let z = zMax - r() * step * 0.5; z > zMin; z -= step * (0.7 + r() * 0.6)) {
      const art = arts[Math.floor(r() * arts.length)];
      const big = SCENERY_BIG.has(art);
      const x = p.x + side * (big ? half - 0.5 : lane + r() * (half - lane));
      if (big && half - lane < 1.4) continue;
      if (blockedBy(zones, x, z)) continue;
      out.push({ art, x: round(x), z: round(z), top: p.top, yaw: big ? (side < 0 ? 90 : -90) : Math.round(r() * 360), s: SCENERY_SCALE });
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

function check(id, from, length, fn) {
  if (!id) throw new Error(`[${fn}] falta \`id\``);
  if (typeof from !== 'number') throw new Error(`[${fn}] "${id}": falta \`from\` (z del borde de entrada)`);
  if (!(length > 0)) throw new Error(`[${fn}] "${id}": \`length\` debe ser > 0`);
}

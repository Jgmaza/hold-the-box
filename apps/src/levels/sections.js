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

function check(id, from, length, fn) {
  if (!id) throw new Error(`[${fn}] falta \`id\``);
  if (typeof from !== 'number') throw new Error(`[${fn}] "${id}": falta \`from\` (z del borde de entrada)`);
  if (!(length > 0)) throw new Error(`[${fn}] "${id}": \`length\` debe ser > 0`);
}

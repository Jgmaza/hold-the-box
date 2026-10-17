// Secciones de nivel listas para instanciar en una línea (devuelven una plataforma para `level.platforms`).
// Ver docs/clima.md.
//
//   platforms: [
//     ...,
//     rainIsland({ id: 'isla-lluvia', from: 40, length: 14 }),            // carpas automáticas (≈ 1 cada 4.5 m)
//     rainIsland({ id: 'lluvia-larga', from: 0, length: 30, shelters: 6 }), // 6 carpas alternadas
//     windIsland({ id: 'isla-viento', from: 23, length: 14 }),
//   ]
//
// El nivel avanza hacia -Z: `from` es el borde de ENTRADA (z más alto) y la isla llega hasta `from - length`.

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

function check(id, from, length, fn) {
  if (!id) throw new Error(`[${fn}] falta \`id\``);
  if (typeof from !== 'number') throw new Error(`[${fn}] "${id}": falta \`from\` (z del borde de entrada)`);
  if (!(length > 0)) throw new Error(`[${fn}] "${id}": \`length\` debe ser > 0`);
}

const round = (v) => Math.round(v * 100) / 100;

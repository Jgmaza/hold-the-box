// Knobs de las colisiones entre dúos ("lo Stumble Guys"). Centralizados para poder afinarlos
// en vivo en dev vía variables de entorno `HTB_BUMP_<CLAVE>` (p.ej. `HTB_BUMP_minSpeed=2`) y
// para pasarlos por `room:settings` / `?debug` sin tocar código.
//
// Unidades: metros, segundos, grados (los `Deg`).
import { CONFIG } from '../game/index.js';

export const BUMP = {
  // ---- jugador ↔ jugador (empujón) ----
  minSpeed: 1.5, // m/s de acercamiento mínimo para que cuente como golpe (por debajo, solo separación)
  gain: 1.6, // fuerza = velocidad de acercamiento × gain
  min: 3, // m/s mínimo del empujón
  max: 8, // m/s máximo
  up: 2.2, // m/s hacia arriba del golpeado
  recoil: 0.35, // fracción del empujón que rebota al que golpea
  cooldown: 0.4, // s entre golpes de la misma pareja (atacante → objetivo)
  immuneTime: 0.6, // s de inmunidad del golpeado a nuevos golpes, de cualquiera
  boxKickDeg: CONFIG.hazards.sweeperKickDeg * 0.6, // golpe angular a la caja del golpeado (grados/s)

  // ---- masa (el que pisa suelo pesa más; el del aire recibe más empuje) ----
  groundedWeight: CONFIG.carry.groundedWeight, // masa relativa del jugador en el suelo
  airWeight: CONFIG.carry.airWeight, // masa relativa del jugador en el aire
  massFactorMin: 0.4, // acota masaAtacante / masaObjetivo por abajo
  massFactorMax: 2.5, // ... por arriba

  // ---- salto encima (stomp) ----
  stompFallSpeed: 2, // m/s de caída para contar como "le cae encima"
  stompHeightRatio: 0.6, // fracción de la altura del jugador para estar encima del otro
  stompBounce: 0.7, // fracción de CONFIG.player.jumpSpeed que rebota el que salta encima
  stompBoxKickDeg: 180, // golpe angular a la caja del pisado (grados/s)

  // ---- caja ↔ caja / caja ↔ jugador ajeno ----
  boxRadius: Math.max(CONFIG.box.size.w, CONFIG.box.size.d) / 2, // radio aproximado de la caja (m)
  boxBoxKickGain: 20, // kick caja↔caja = velocidad relativa × gain (grados/s por m/s)
  boxBoxKickMax: 160, // techo del kick entre cajas

  // ---- rendimiento ----
  earlyOutDist: 6, // m: si los centros de caja de dos dúos están más lejos, no se comprueba nada
};

/** Aplica overrides por env (`HTB_BUMP_<CLAVE>`) sobre los defaults. Solo números. */
export function loadBumpTuning(env = process.env) {
  const out = { ...BUMP };
  for (const key of Object.keys(out)) {
    if (typeof out[key] !== 'number') continue;
    const raw = env[`HTB_BUMP_${key}`];
    if (raw !== undefined && raw !== '') out[key] = Number(raw);
  }
  return out;
}

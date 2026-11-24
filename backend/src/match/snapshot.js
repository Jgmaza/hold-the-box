// Snapshot de la partida (S → C `match:snapshot`, ~20 Hz). El estado de cada dúo sale del codec compartido
// frontend/src/net/duoState.js, que el cliente usa para volcarlo sobre un `Game` local (misma forma que lee la vista).
//
//   duos[]  estado ligero de TODOS los dúos (jugadores, caja, gato, bomba, HUD) + datos del servidor
//   own     mundo que vive TU dúo (NPCs, clima, vidrios, estaciones, cactus) — se arma por destinatario
import { lightDuoState, worldDuoState } from '../game/index.js';

const r = (v) => Math.round(v * 1000) / 1000;

export function duoSnapshot(duo) {
  return {
    id: duo.teamId,
    status: duo.status,
    ghost: duo.ghost > 0,
    online: { 1: duo.online[1], 2: duo.online[2] },
    ...lightDuoState(duo.game),
  };
}

/** Parte común a todos los destinatarios. */
export function matchSnapshot(match) {
  return { tick: match.tick, time: r(match.time), duos: match.duos.map(duoSnapshot) };
}

/** `own` de un dúo (solo lo reciben sus jugadores). */
export function ownSnapshot(duo) {
  return { id: duo.teamId, ...worldDuoState(duo.game) };
}

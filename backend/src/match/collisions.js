// Colisiones entre dúos (lo "Stumble Guys"): los jugadores de dúos distintos se empujan y, si chocan rápido,
// el golpeado sale disparado (player.knock) y su caja se sacude (box.kick). Además de los empujones, hay:
//   · masa: el que pisa suelo pesa más y empuja más; el que está en el aire recibe más empuje;
//   · stomp: caer encima del otro lo aplasta (rebote + box.kick fuerte al pisado);
//   · caja ↔ caja y caja ↔ jugador ajeno: las cajas también chocan y apartan a los portadores;
//   · inmunidad: un golpeado no recibe otro golpe durante `immuneTime`.
// Dentro de un dúo manda la sim original.
//
// Ghost: un dúo recién aparecido (ghost > 0) atraviesa a los demás; si al terminar el ghost siguen solapados,
// la pareja sigue fantasma hasta que se separen (evita explosiones en spawns compartidos).
import { CONFIG } from '../game/index.js';
import { loadBumpTuning } from './tuning.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export class CrossDuoCollider {
  constructor(cfg = {}) {
    this.cfg = { ...loadBumpTuning(), ...cfg };
    this.ghostPairs = new Set();
    this.lastBump = new Map(); // par atacante→objetivo → tiempo del último golpe
    this.lastHurt = new Map(); // objetivo → tiempo del último golpe recibido (inmunidad)
  }

  /**
   * @param {import('./duo.js').Duo[]} duos
   * @param {number} time  reloj de la partida (s)
   * @param {(teamId: number, e: string, d: object) => void} emit
   */
  resolve(duos, time, emit) {
    const active = [];
    for (const duo of duos) {
      const g = duo.game;
      if (duo.status !== 'racing' || g.state !== 'playing' || g.respawnTimer > 0) continue;
      active.push(duo);
    }
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        this._resolvePair(active[i], active[j], time, emit);
      }
    }
  }

  _resolvePair(A, B, time, emit) {
    const C = this.cfg;
    // Early-out: si los centros de caja están lejos, nada de este par puede chocar.
    const ca = A.game.box.center;
    const cb = B.game.box.center;
    const dx = cb.x - ca.x;
    const dz = cb.z - ca.z;
    if (dx * dx + dz * dz > C.earlyOutDist * C.earlyOutDist) return;

    this._resolvePlayers(A, B, time, emit);
    this._resolveBoxBox(A, B, time, emit);
    this._resolvePlayerBox(A, B, time, emit); // jugadores de B contra la caja de A
    this._resolvePlayerBox(B, A, time, emit); // jugadores de A contra la caja de B
  }

  /** Empujón entre jugadores de dúos distintos, con masa, stomp e inmunidad. */
  _resolvePlayers(A, B, time, emit) {
    const C = this.cfg;
    for (const pa of A.game.players) {
      for (const pb of B.game.players) {
        const key = `${A.teamId}.${pa.id}|${B.teamId}.${pb.id}`;
        const dx = pb.pos.x - pa.pos.x;
        const dz = pb.pos.z - pa.pos.z;
        let dist = Math.hypot(dx, dz);
        const minD = pa.radius + pb.radius;
        if (Math.abs(pa.pos.y - pb.pos.y) > pa.height) {
          this.ghostPairs.delete(key);
          continue;
        }
        if (dist >= minD) {
          this.ghostPairs.delete(key);
          continue;
        }
        if (A.ghost > 0 || B.ghost > 0 || this.ghostPairs.has(key)) {
          this.ghostPairs.add(key);
          continue;
        }
        let nx;
        let nz;
        if (dist < 1e-4) {
          nx = 1;
          nz = 0;
          dist = 1;
        } else {
          nx = dx / dist;
          nz = dz / dist;
        }
        const half = (minD - Math.min(dist, minD)) / 2;
        pa.move(-nx * half, 0, -nz * half, A.game.world.colliders);
        pb.move(nx * half, 0, nz * half, B.game.world.colliders);

        // --- Stomp: uno cae encima del otro. ---
        const aAbove = pa.pos.y > pb.pos.y + C.stompHeightRatio * pa.height && pa.vel.y < -C.stompFallSpeed;
        const bAbove = pb.pos.y > pa.pos.y + C.stompHeightRatio * pb.height && pb.vel.y < -C.stompFallSpeed;
        if (aAbove || bAbove) {
          const attacker = aAbove ? { duo: A, p: pa } : { duo: B, p: pb };
          const target = aAbove ? { duo: B, p: pb } : { duo: A, p: pa };
          attacker.p.vel.y = CONFIG.player.jumpSpeed * C.stompBounce; // rebote
          const side = target.p.id === 1 ? -1 : 1;
          target.duo.game.box.kick(side * C.stompBoxKickDeg, C.stompBoxKickDeg * 0.5);
          this._hurt(target, time);
          emit(target.duo.teamId, 'player:stomp', {
            player: target.p.id,
            by: { duo: attacker.duo.teamId, player: attacker.p.id },
          });
          continue;
        }

        // --- Golpe normal: fuerza = acercamiento × gain × (masa atacante / masa objetivo). ---
        const va = pa.actualVel.x * nx + pa.actualVel.z * nz;
        const vb = pb.actualVel.x * nx + pb.actualVel.z * nz;
        const closing = va - vb;
        if (closing < C.minSpeed) continue;
        if (time - (this.lastBump.get(key) ?? -Infinity) < C.cooldown) continue;
        const aHits = Math.max(0, va) >= Math.max(0, -vb);
        const attacker = aHits ? { duo: A, p: pa } : { duo: B, p: pb };
        const target = aHits ? { duo: B, p: pb } : { duo: A, p: pa };
        const targetKey = `${target.duo.teamId}.${target.p.id}`;
        if (time - (this.lastHurt.get(targetKey) ?? -Infinity) < C.immuneTime) continue;

        this.lastBump.set(key, time);
        const massRatio = clamp(
          this._mass(attacker.p) / this._mass(target.p),
          C.massFactorMin,
          C.massFactorMax,
        );
        const dir = aHits ? 1 : -1;
        const force = clamp(closing * C.gain * massRatio, C.min, C.max);
        target.p.knock(nx * dir * force, C.up, nz * dir * force);
        attacker.p.vel.x -= nx * dir * force * C.recoil;
        attacker.p.vel.z -= nz * dir * force * C.recoil;
        const side = target.p.id === 1 ? -1 : 1;
        const k = C.boxKickDeg * (force / C.max);
        target.duo.game.box.kick(side * k, k * 0.5);
        this._hurt(target, time);
        emit(target.duo.teamId, 'player:bump', {
          player: target.p.id,
          by: { duo: attacker.duo.teamId, player: attacker.p.id },
          force: Math.round(force * 100) / 100,
        });
      }
    }
  }

  /** Caja ↔ caja: si se tocan, apartan a los portadores y las dos reciben un kick proporcional. */
  _resolveBoxBox(A, B, time, emit) {
    const C = this.cfg;
    if (A.ghost > 0 || B.ghost > 0) return;
    const ba = A.game.box;
    const bb = B.game.box;
    const dx = bb.center.x - ba.center.x;
    const dz = bb.center.z - ba.center.z;
    let dist = Math.hypot(dx, dz);
    const minD = C.boxRadius * 2;
    if (dist >= minD) return;
    let nx;
    let nz;
    if (dist < 1e-4) {
      nx = 1;
      nz = 0;
      dist = 1;
    } else {
      nx = dx / dist;
      nz = dz / dist;
    }
    const half = (minD - dist) / 2;
    this._pushDuo(A, -nx * half, -nz * half);
    this._pushDuo(B, nx * half, nz * half);

    // Velocidad relativa de las cajas (promedio de los portadores) sobre la normal.
    const relV = this._duoVel(A).x * nx + this._duoVel(A).z * nz - (this._duoVel(B).x * nx + this._duoVel(B).z * nz);
    if (relV < C.minSpeed) return;
    const force = clamp(relV * C.boxBoxKickGain, 0, C.boxBoxKickMax);
    ba.kick(-nx * force, nz * force * 0.5);
    bb.kick(nx * force, -nz * force * 0.5);
    emit(A.teamId, 'box:bump', { other: B.teamId, force: Math.round(force * 100) / 100 });
    emit(B.teamId, 'box:bump', { other: A.teamId, force: Math.round(force * 100) / 100 });
  }

  /** Un jugador ajeno entra en la caja (sin tocar a sus portadores): se le aparta y, si va rápido, kick. */
  _resolvePlayerBox(owner, other, time, emit) {
    const C = this.cfg;
    if (owner.ghost > 0 || other.ghost > 0) return;
    const box = owner.game.box;
    for (const p of other.game.players) {
      const dx = p.pos.x - box.center.x;
      const dz = p.pos.z - box.center.z;
      let dist = Math.hypot(dx, dz);
      const minD = C.boxRadius + p.radius;
      if (dist >= minD) continue;
      // Si ya está pegado a un portador, lo resuelve el empujón jugador↔jugador (evita doble cuenta).
      if (owner.game.players.some((cp) => Math.hypot(p.pos.x - cp.pos.x, p.pos.z - cp.pos.z) < p.radius + cp.radius)) continue;
      let nx;
      let nz;
      if (dist < 1e-4) {
        nx = 1;
        nz = 0;
        dist = 1;
      } else {
        nx = dx / dist;
        nz = dz / dist;
      }
      const overlap = minD - dist;
      p.move(nx * overlap, 0, nz * overlap, other.game.world.colliders);
      const relV = p.actualVel.x * nx + p.actualVel.z * nz; // hacia el centro de la caja
      if (relV < C.minSpeed) continue;
      const force = clamp(relV * C.boxBoxKickGain, 0, C.boxBoxKickMax);
      box.kick(-nx * force, nz * force * 0.5);
      emit(owner.teamId, 'box:bump', { other: other.teamId, force: Math.round(force * 100) / 100 });
    }
  }

  /** Masa relativa de un jugador: en el suelo pesa `groundedWeight`, en el aire `airWeight`. */
  _mass(p) {
    return p.grounded ? this.cfg.groundedWeight : this.cfg.airWeight;
  }

  _hurt(target, time) {
    this.lastHurt.set(`${target.duo.teamId}.${target.p.id}`, time);
  }

  _pushDuo(duo, dx, dz) {
    for (const p of duo.game.players) p.move(dx, 0, dz, duo.game.world.colliders);
  }

  _duoVel(duo) {
    const [p1, p2] = duo.game.players;
    return {
      x: (p1.actualVel.x + p2.actualVel.x) / 2,
      z: (p1.actualVel.z + p2.actualVel.z) / 2,
    };
  }
}

// NPC base: pasea al azar por SU plataforma, mira alrededor, ve la caja y ataca.
// Cada dificultad (npcEasy / npcMedium / npcHard) solo define CÓMO ataca (startAttack / updateAttack).
//
// Estados: 'idle' → 'wander' → 'alert' → 'attack' → ('stunned') → 'wander'
//   idle     quieto un rato al azar, mirando a los lados
//   wander   camina a un punto al azar de su plataforma (a veces cambia de idea a mitad de camino)
//   alert    vio la caja: la mira y, pasado `reaction`, ataca
//   attack   lo maneja la subclase; termina con finishAttack()
//   stunned  quieto tras fallar (hard)
// Tras atacar no puede volver a alertarse durante `cooldown`.
// Con `alwaysChase` (CONFIG.npcs.<dificultad>) persigue siempre: no necesita ver la caja, no se rinde
// y en vez de pasear sigue a la pareja mientras espera el cooldown. Nunca sale de su plataforma.
//
// Ángulos: facing en radianes, dirección = (sin facing, cos facing). facing 0 → mira hacia +Z.
import { CONFIG } from '../../config.js';
import { clamp, len2 } from '../math.js';

const TAU = Math.PI * 2;

/** Diferencia a - b llevada a [-π, π). */
export const angleDiff = (a, b) => ((((a - b) % TAU) + TAU + Math.PI) % TAU) - Math.PI;

export class Npc {
  static difficulty = 'easy';

  /**
   * @param {string} id
   * @param {{x:number, z:number}} def   spawn dentro de la plataforma
   * @param {{min, max}} platform        AABB de la plataforma donde vive
   * @param {{next, range, chance}} rng  aleatorio compartido del servicio (con semilla)
   */
  constructor(id, def, platform, rng) {
    this.id = id;
    this.def = def;
    this.difficulty = this.constructor.difficulty;
    this.platform = platform;
    this.rng = rng;
    this.pos = { x: def.x, y: platform.max.y, z: def.z };
    this.vel = { x: 0, z: 0 }; // desplazamiento real / dt (la vista anima el paso con esto)
    this.reset();
  }

  /** Números de su dificultad. Se leen en vivo: el panel de debug edita CONFIG.npcs. */
  get T() {
    return CONFIG.npcs[this.difficulty];
  }

  get radius() {
    return this.T.radius;
  }

  get height() {
    return this.T.height;
  }

  /** De vuelta a su spawn, tranquilo y mirando a un lado al azar. */
  reset() {
    this.pos.x = this.def.x;
    this.pos.y = this.platform.max.y;
    this.pos.z = this.def.z;
    this._clampToPlatform();
    this.vel.x = this.vel.z = 0;
    this.facing = this.rng.range(-Math.PI, Math.PI);
    this.cooldown = 0;
    this.windup = 0; // 0..1 aviso antes de atacar (lo dibuja la vista)
    this.target = null;
    this._startIdle();
  }

  // ---------------------------------------------------------------- loop

  update(dt, game, service) {
    const px = this.pos.x;
    const pz = this.pos.z;
    this.timer -= dt;
    this.cooldown = Math.max(0, this.cooldown - dt);

    switch (this.state) {
      case 'idle':
      case 'wander':
        if (this.T.alwaysChase) this._stepFollow(dt, game);
        else if (this.state === 'idle') this._stepIdle(dt);
        else this._stepWander(dt);
        break;
      case 'alert':
        this._stepAlert(dt, game, service);
        break;
      case 'attack':
        this.updateAttack(dt, game, service);
        break;
      case 'stunned':
        if (this.timer <= 0) this._startWander();
        break;
    }

    const calm = this.state === 'idle' || this.state === 'wander';
    if (calm && this.cooldown <= 0 && !game.box.dropped && this.tracks(game.box.center)) {
      this.state = 'alert';
      this.timer = this.T.reaction;
      service.emit('npc:alert', { id: this.id, difficulty: this.difficulty });
    }
    if (this.state !== 'attack') this._keepOffPlayers(game.players);

    this.vel.x = (this.pos.x - px) / dt;
    this.vel.z = (this.pos.z - pz) / dt;
  }

  _startIdle() {
    this.state = 'idle';
    this.timer = this.rng.range(CONFIG.npcs.idleMin, CONFIG.npcs.idleMax);
    this._lookTo = this.facing;
  }

  _stepIdle(dt) {
    // Mira alrededor: de vez en cuando gira la cabeza hacia otro lado.
    if (this.rng.chance(dt * 1.5)) this._lookTo = this.facing + this.rng.range(-2, 2);
    this._turnTo(this._lookTo, dt);
    if (this.timer <= 0) this._startWander();
  }

  _startWander() {
    const b = this._bounds();
    this.state = 'wander';
    this.target = { x: this.rng.range(b.minX, b.maxX), z: this.rng.range(b.minZ, b.maxZ) };
    this._pace = this.rng.range(0.8, 1.2); // no todos caminan igual
    this.timer = 8; // por si nunca llega (un jugador le tapa el paso)
  }

  _stepWander(dt) {
    const arrived = this.moveToward(this.target.x, this.target.z, this.T.wanderSpeed * this._pace, dt);
    if (arrived || this.timer <= 0) this._startIdle();
    else if (this.rng.chance(dt * 0.25)) this._startWander(); // cambió de idea
  }

  /** alwaysChase: entre ataques camina hacia la caja (hasta el borde de su plataforma si hace falta). */
  _stepFollow(dt, game) {
    this.state = 'wander';
    const c = game.box.center;
    this.moveToward(c.x, c.z, this.T.chaseSpeed ?? this.T.wanderSpeed, dt);
  }

  _stepAlert(dt, game, service) {
    const c = game.box.center;
    this.face(c, dt);
    // Ya alertado no necesita tenerla de frente; solo que no se aleje demasiado.
    if (game.box.dropped || !this.tracks(c, CONFIG.npcs.loseSightFactor, true)) return this._startWander();
    // Recién reaparecidos (caja invulnerable): espera.
    if (this.timer <= 0 && game.box.invuln <= 0) this.startAttack(game, service);
  }

  // ---------------------------------------------------------------- lo que define cada dificultad

  startAttack() {
    this.state = 'attack';
    this.windup = 0;
  }

  updateAttack() {
    this.finishAttack();
  }

  /** Termina el ataque: cooldown y a pasear (o aturdido `stun` segundos). */
  finishAttack({ stun = 0 } = {}) {
    this.windup = 0;
    this.cooldown = this.T.cooldown;
    if (stun > 0) {
      this.state = 'stunned';
      this.timer = stun;
    } else {
      this._startWander();
    }
  }

  // ---------------------------------------------------------------- sentidos y movimiento

  /**
   * ¿Ve el punto `p` (normalmente el centro de la caja)?
   * Distancia ≤ visionRange × rangeMul, altura parecida a la de una caja cargada en su piso y,
   * salvo `anyAngle`, dentro de su cono de visión (visionFov).
   */
  canSee(p, rangeMul = 1, anyAngle = false) {
    const T = this.T;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    const d = len2(dx, dz);
    if (d > T.visionRange * rangeMul) return false;
    const dy = p.y - (this.pos.y + CONFIG.carry.handHeight);
    if (Math.abs(dy) > CONFIG.npcs.heightTolerance * rangeMul) return false;
    if (anyAngle || T.visionFov >= 360 || d < 0.3) return true;
    return Math.abs(angleDiff(Math.atan2(dx, dz), this.facing)) <= (T.visionFov * Math.PI) / 360;
  }

  /** ¿Sigue la pista de `p`? Con alwaysChase, siempre; si no, solo si lo ve (canSee). */
  tracks(p, rangeMul = 1, anyAngle = false) {
    return !!this.T.alwaysChase || this.canSee(p, rangeMul, anyAngle);
  }

  /** ¿El punto está sobre su plataforma (en XZ, con `margin` de holgura)? Fuera de ella no puede alcanzarlo. */
  onMyPlatform(p, margin = 0) {
    const a = this.platform;
    return p.x >= a.min.x - margin && p.x <= a.max.x + margin && p.z >= a.min.z - margin && p.z <= a.max.z + margin;
  }

  /** Jugador que está tocando (círculos en XZ + misma altura). Si sus pies pasan por encima, lo saltaron. */
  touching(players, extra = 0) {
    for (const p of players) {
      if (p.pos.y > this.pos.y + this.height || p.pos.y + p.height < this.pos.y) continue;
      if (len2(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius + p.radius + extra) return p;
    }
    return null;
  }

  nearestPlayer(players) {
    let best = null;
    let bestD = Infinity;
    for (const p of players) {
      const d = len2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  /** Gira (a turnRate) para mirar al punto. */
  face(p, dt) {
    this._turnTo(Math.atan2(p.x - this.pos.x, p.z - this.pos.z), dt);
  }

  /**
   * Camina hacia (x, z): gira de a poco y avanza más lento si todavía no está de frente.
   * Nunca sale de su plataforma. Devuelve true al llegar.
   */
  moveToward(x, z, speed, dt) {
    const dx = x - this.pos.x;
    const dz = z - this.pos.z;
    const d = len2(dx, dz);
    if (d < 0.15) return true;
    const want = Math.atan2(dx, dz);
    this._turnTo(want, dt);
    const align = Math.max(0, Math.cos(angleDiff(want, this.facing)));
    const step = Math.min(d, speed * dt * (0.3 + 0.7 * align));
    this.pos.x += (dx / d) * step;
    this.pos.z += (dz / d) * step;
    this._clampToPlatform();
    return false;
  }

  _turnTo(angle, dt) {
    const max = ((CONFIG.npcs.turnRate * Math.PI) / 180) * dt;
    this.facing = angleDiff(this.facing + clamp(angleDiff(angle, this.facing), -max, max), 0);
  }

  /** Zona por la que puede caminar: su plataforma menos el margen al borde. */
  _bounds() {
    const a = this.platform;
    const m = CONFIG.npcs.edgeMargin + this.radius;
    return { minX: a.min.x + m, maxX: a.max.x - m, minZ: a.min.z + m, maxZ: a.max.z - m };
  }

  _clampToPlatform() {
    const b = this._bounds();
    this.pos.x = clamp(this.pos.x, b.minX, b.maxX);
    this.pos.z = clamp(this.pos.z, b.minZ, b.maxZ);
  }

  /** Fuera de un ataque no empuja a nadie: si quedó encima de un jugador, se aparta él (no rompe la unión). */
  _keepOffPlayers(players) {
    for (const p of players) {
      if (p.pos.y > this.pos.y + this.height || p.pos.y + p.height < this.pos.y) continue;
      const dx = this.pos.x - p.pos.x;
      const dz = this.pos.z - p.pos.z;
      const d = len2(dx, dz);
      const min = this.radius + p.radius;
      if (d >= min) continue;
      const nx = d > 1e-4 ? dx / d : -Math.sin(this.facing);
      const nz = d > 1e-4 ? dz / d : -Math.cos(this.facing);
      this.pos.x += nx * (min - d);
      this.pos.z += nz * (min - d);
    }
    this._clampToPlatform();
  }
}

// Jugador: movimiento, salto y colisiones. No sabe nada de la caja; recibe modificadores.
import { CONFIG } from '../config.js';
import { approach, clamp, copy3, len2, v3 } from './math.js';
import { makeAABB, moveBody } from './collision.js';

export class Player {
  /** @param {1|2} id */
  constructor(id, spawn) {
    this.id = id;
    this.pos = v3();
    this.prevPos = v3();
    this.vel = v3();
    this.actualVel = v3(); // desplazamiento real / dt (incluye arrastre de la unión y plataformas)
    this.radius = CONFIG.player.radius;
    this.height = CONFIG.player.height;
    this.input = { x: 0, z: 0, jumpHeld: false };
    this._scratch = makeAABB(0, 0, 0, 0, 0, 0);
    this.reset(spawn);
  }

  reset(spawn) {
    this.pos.x = spawn.x;
    this.pos.y = spawn.y;
    this.pos.z = spawn.z;
    copy3(this.prevPos, this.pos);
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.actualVel.x = this.actualVel.y = this.actualVel.z = 0;
    this.grounded = true;
    this.ground = null; // collider que pisa (para que las plataformas móviles lo lleven)
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.justJumped = false;
    this.justLanded = false;
    this.landSpeed = 0;
    this.knockTimer = 0; // tras un golpe del rodillo, menos control
    this.push = { x: 0, z: 0 }; // velocidad extra que impone el mundo (viento), m/s; la fija el juego cada paso
  }

  /** Input de este frame: x/z en [-1, 1] (W = -z), jumpPressed solo el frame en que se pulsa. */
  setInput(x, z, jumpPressed, jumpHeld = false) {
    const m = len2(x, z);
    this.input.x = m > 1 ? x / m : x;
    this.input.z = m > 1 ? z / m : z;
    this.input.jumpHeld = jumpHeld;
    if (jumpPressed) this.jumpBuffer = CONFIG.player.jumpBuffer;
  }

  get inputMagnitude() {
    return len2(this.input.x, this.input.z);
  }

  /** Inicio de paso: guardar posición y dejarse llevar por la plataforma que pisa. */
  beginStep(colliders) {
    copy3(this.prevPos, this.pos);
    this.justJumped = false;
    this.justLanded = false;
    const g = this.ground;
    if (this.grounded && g && g.delta) {
      this.move(g.delta.x, 0, g.delta.z, colliders);
      // En vertical va pegado al piso de la plataforma (que ya se movió en este paso).
      if (g.delta.y !== 0) this.pos.y = g.aabb.max.y;
    }
  }

  /**
   * Velocidad, salto y gravedad.
   * @param {{speedMul:number, jumpMul:number, grip:number}} mods modificadores de la caja
   */
  integrate(dt, mods) {
    const P = CONFIG.player;
    const control = this.knockTimer > 0 ? 0.25 : 1;
    this.knockTimer = Math.max(0, this.knockTimer - dt);

    const speed = P.walkSpeed * mods.speedMul;
    // El viento suma a la velocidad objetivo: se compensa caminando en contra.
    const tx = this.input.x * speed + this.push.x;
    const tz = this.input.z * speed + this.push.z;
    const hasInput = this.inputMagnitude > 0.05;
    let accel;
    if (this.grounded) accel = (hasInput ? P.groundAccel : P.groundDecel) * mods.grip;
    else accel = P.airAccel;
    accel *= control;
    this.vel.x = approach(this.vel.x, tx, accel * dt);
    this.vel.z = approach(this.vel.z, tz, accel * dt);

    this.coyote = this.grounded ? P.coyoteTime : Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    if (this.jumpBuffer > 0 && (this.grounded || this.coyote > 0)) {
      this.vel.y = P.jumpSpeed * mods.jumpMul;
      this.grounded = false;
      this.ground = null;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.justJumped = true;
    }

    this.vel.y = clamp(this.vel.y - CONFIG.physics.gravity * dt, -P.maxFallSpeed, 100);
  }

  /** Aplica la velocidad con colisiones y actualiza el estado de suelo. */
  applyVelocity(dt, colliders) {
    const wasGrounded = this.grounded;
    const fallSpeed = -this.vel.y;
    const hit = this.move(this.vel.x * dt, this.vel.y * dt, this.vel.z * dt, colliders);
    if (hit.hitGround) {
      // Caídas mínimas (bordes, plataformas que bajan) no cuentan como aterrizaje.
      if (!wasGrounded && fallSpeed > 1.5) {
        this.justLanded = true;
        this.landSpeed = fallSpeed;
      }
      this.grounded = true;
      this.ground = hit.hitGround;
      this.vel.y = 0;
    } else {
      this.grounded = false;
      this.ground = null;
      if (hit.hitCeiling && this.vel.y > 0) this.vel.y = 0;
    }
  }

  move(dx, dy, dz, colliders) {
    return moveBody(this, dx, dy, dz, colliders, this._scratch);
  }

  /** Fin de paso: velocidad real (la usa la caja para inercia y arrastre). */
  endStep(dt) {
    this.actualVel.x = (this.pos.x - this.prevPos.x) / dt;
    this.actualVel.y = (this.pos.y - this.prevPos.y) / dt;
    this.actualVel.z = (this.pos.z - this.prevPos.z) / dt;
  }

  /** Empujón (rodillo). */
  knock(vx, vy, vz) {
    this.vel.x = vx;
    this.vel.z = vz;
    this.vel.y = Math.max(this.vel.y, vy);
    this.grounded = false;
    this.ground = null;
    this.knockTimer = 0.35;
  }
}

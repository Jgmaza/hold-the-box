// La caja compartida: el corazón del juego.
//
// Estado que expone (lo leen la vista, la UI y las mecánicas):
//   state      'upright' | 'tilting' | 'critical'
//   tilt       { roll, pitch, mag } en grados
//              roll  > 0 → baja el extremo de P2      (diferencia de altura, arrastre)
//              pitch > 0 → se va hacia adelante (F)   (torsión, tensión, inercia)
//   sync       0..1 qué tan coordinados van los inputs
//   integrity  0..100 contenido (huequito)
//   wetness    0..100 mojado
//   dropped    true cuando la soltaron
//   center/axis/forward  geometría para dibujarla
//
// Eventos (en game.events): box:state, box:impact, box:drop, box:wet
import { CONFIG } from '../config.js';
import { DEG, clamp, damp, lerp, len2, v3 } from './math.js';

export const BOX_STATES = ['upright', 'tilting', 'critical'];

export class Box {
  constructor(events) {
    this.events = events;
    this.center = v3();
    this.axis = { x: 1, z: 0 }; // P1 → P2
    this.forward = { x: 0, z: 1 }; // perpendicular: (-axis.z, axis.x)
    this.tilt = { roll: 0, pitch: 0, mag: 0 };
    this.target = { roll: 0, pitch: 0 };
    this.reset();
  }

  reset({ integrity = 100, wetness = 0 } = {}) {
    this.integrity = integrity;
    this.wetness = wetness;
    this.tilt.roll = this.tilt.pitch = this.tilt.mag = 0;
    this.rollVel = 0;
    this.pitchVel = 0;
    this.sync = 1;
    this.syncRaw = 1;
    this.state = 'upright';
    this.criticalTime = 0;
    this.leakRate = 0; // %/s actual (la vista dibuja gotas con esto)
    this.wetRate = 0; // %/s que entra este paso (chorros + lluvia)
    // Fuerzas de afuera que el mundo fija cada paso (clima: viento): inclinación extra (grados) y vaciado (%/s).
    this.external = { roll: 0, pitch: 0, drain: 0 };
    this.wettingSources = 0;
    this.dropped = false;
    this.dropVel = v3();
    this.spin = v3();
    this.invuln = 0;
    this.time = 0;
    this._groupVel = null;
    this._accel = { x: 0, z: 0 };
  }

  get wet01() {
    return this.wetness / 100;
  }

  /** Modificadores que la caja aplica a los jugadores. */
  modifiers() {
    const S = CONFIG.box.sync;
    const W = CONFIG.box.wet;
    const w = this.wet01;
    return {
      speedMul: lerp(S.speedMin, S.speedMax, this.sync) * (1 - w * W.speedPenalty),
      jumpMul: 1 - w * W.jumpPenalty,
      grip: 1 - w * W.gripPenalty,
    };
  }

  /** Sincronía instantánea a partir de los inputs (0..1). */
  static syncFromInputs(i1, i2) {
    const m1 = len2(i1.x, i1.z);
    const m2 = len2(i2.x, i2.z);
    const idle1 = m1 < 0.1;
    const idle2 = m2 < 0.1;
    if (idle1 && idle2) return 1;
    if (idle1 || idle2) return CONFIG.box.sync.soloValue;
    const dot = (i1.x * i2.x + i1.z * i2.z) / (m1 * m2);
    return (1 + dot) / 2;
  }

  /** Golpe angular (grados/s). */
  kick(rollDegPerSec, pitchDegPerSec) {
    this.rollVel += rollDegPerSec;
    this.pitchVel += pitchDegPerSec;
  }

  damage(amount, cause) {
    if (this.invuln > 0 || amount <= 0) return;
    this.integrity = clamp(this.integrity - amount, 0, 100);
    this.events.emit('box:impact', { amount, cause, integrity: this.integrity });
  }

  addWet(amount, cause) {
    if (amount <= 0) return;
    const before = this.wetness;
    this.wetness = clamp(this.wetness + amount, 0, 100);
    this.events.emit('box:wet', { amount, cause, wetness: this.wetness, before });
  }

  /** Sigue a los jugadores, calcula inclinación, fuga y secado. */
  update(dt, p1, p2) {
    if (this.dropped) return this._fall(dt);
    const T = CONFIG.box.tilt;
    const L = CONFIG.box.leak;
    const W = CONFIG.box.wet;
    this.time += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    // --- Geometría: centro entre los dos, a la altura de las manos.
    const dist = this._follow(p1, p2);
    const { x: ax, z: az } = this.axis;
    const { x: fx, z: fz } = this.forward;

    // --- Sincronía: alineación de inputs, suavizada.
    const i1 = p1.input;
    const i2 = p2.input;
    this.syncRaw = Box.syncFromInputs(i1, i2);
    this.sync = damp(this.sync, this.syncRaw, CONFIG.box.sync.smoothing, dt);
    const desync = 1 - this.sync;

    const w = this.wet01;
    const weight = 1 + w * W.stabilityPenalty;
    const disturb = 1 + w * W.disturbanceGain;

    // --- ROLL: diferencia de altura + arrastre (se va hacia el que se queda quieto).
    const dy = p1.pos.y - p2.pos.y;
    const bothAir = !p1.grounded && !p2.grounded;
    const heightDeg = Math.atan2(dy, Math.max(dist, 0.5)) * DEG * T.heightGain * (bothAir ? T.bothAirborneFactor : 1);
    const m1 = Math.min(1, len2(i1.x, i1.z));
    const m2 = Math.min(1, len2(i2.x, i2.z));
    const dragDeg = T.dragLeanDeg * (m1 - m2);

    // --- PITCH: torsión (empujes opuestos perpendiculares al eje) + tensión/compresión (a lo largo del eje).
    const rx = i1.x - i2.x;
    const rz = i1.z - i2.z;
    const relPerp = clamp((rx * fx + rz * fz) / 2, -1, 1);
    const relAlong = (rx * ax + rz * az) / 2; // < 0: se separan; > 0: se juntan
    const twistDeg = T.twistDeg * relPerp;
    const tension = clamp(-relAlong, 0, 1);
    const squeeze = clamp(relAlong, 0, 1);
    const wobble = 1 + 0.25 * Math.sin(this.time * T.wobbleFreq);
    const strainDeg = (T.tensionDeg * tension + T.squeezeDeg * squeeze) * wobble;

    // --- Inercia: arrancar/frenar de golpe mueve el contenido.
    const gvx = (p1.actualVel.x + p2.actualVel.x) / 2;
    const gvz = (p1.actualVel.z + p2.actualVel.z) / 2;
    if (this._groupVel) {
      const accX = (gvx - this._groupVel.x) / dt;
      const accZ = (gvz - this._groupVel.z) / dt;
      this._accel.x = damp(this._accel.x, accX, T.inertiaSmoothing, dt);
      this._accel.z = damp(this._accel.z, accZ, T.inertiaSmoothing, dt);
    }
    this._groupVel = { x: gvx, z: gvz };
    const inertiaRoll = -T.inertiaGain * (this._accel.x * ax + this._accel.z * az);
    const inertiaPitch = -T.inertiaGain * (this._accel.x * fx + this._accel.z * fz);

    const ext = this.external;
    this.target.roll = clamp(heightDeg + (dragDeg + inertiaRoll) * disturb + ext.roll, -T.maxDeg, T.maxDeg);
    this.target.pitch = clamp((twistDeg + strainDeg + inertiaPitch) * disturb + ext.pitch, -T.maxDeg, T.maxDeg);

    // --- Golpes al aterrizar fuerte.
    for (const p of [p1, p2]) {
      if (!p.justLanded) continue;
      if (p.landSpeed > T.landKickSpeed) {
        const side = p.id === 1 ? -1 : 1; // baja el lado de quien aterriza
        this.kick(side * (p.landSpeed - T.landKickSpeed) * T.landKickGain, 0);
      }
      if (p.landSpeed > L.impactSpeed) {
        this.damage(L.impactDamage * (1 + (p.landSpeed - L.impactSpeed) / 5), 'landing');
      }
    }

    // --- Resorte que endereza: más rígido si van sincronizados, más blando si está mojada.
    const k = lerp(T.stiffnessLow, T.stiffnessHigh, this.sync) / weight;
    const c = 2 * Math.sqrt(k) * T.dampingRatio;
    this.rollVel += (k * (this.target.roll - this.tilt.roll) - c * this.rollVel) * dt;
    this.pitchVel += (k * (this.target.pitch - this.tilt.pitch) - c * this.pitchVel) * dt;
    this.tilt.roll = clamp(this.tilt.roll + this.rollVel * dt, -T.maxDeg, T.maxDeg);
    this.tilt.pitch = clamp(this.tilt.pitch + this.pitchVel * dt, -T.maxDeg, T.maxDeg);
    this.tilt.mag = Math.hypot(this.tilt.roll, this.tilt.pitch);

    // --- Estado.
    const mag = this.tilt.mag;
    const next = mag < T.tiltingDeg ? 'upright' : mag < T.criticalDeg ? 'tilting' : 'critical';
    if (next !== this.state) {
      const from = this.state;
      this.state = next;
      this.events.emit('box:state', { from, to: next });
    }
    if (next === 'critical' && this.invuln <= 0) this.criticalTime += dt;
    else this.criticalTime = Math.max(0, this.criticalTime - dt * T.criticalRecover);

    // --- Huequito: fuga proporcional a la inclinación + lo que se lleva el viento (external.drain).
    let leak = ext.drain;
    if (mag > L.thresholdDeg) {
      const severity = clamp((mag - L.thresholdDeg) / (T.criticalDeg - L.thresholdDeg), 0, L.maxSeverity);
      leak += L.ratePerSec * severity;
    }
    this.leakRate = this.invuln > 0 ? 0 : leak;
    this.integrity = clamp(this.integrity - this.leakRate * dt, 0, 100);

    // --- Mojado: entra por chorros y lluvia (wetRate lo fija el mundo cada paso) o se seca.
    if (this.wetRate > 0) {
      this.wetness = clamp(this.wetness + this.wetRate * dt, 0, 100);
    } else if (this.wetness < 100) {
      // Al 100% ya se deshizo: no hay vuelta atrás.
      this.wetness = clamp(this.wetness - W.dryRate * dt, 0, 100);
    }

    if (this.criticalTime >= T.dropGrace) this.drop(p1, p2);
  }

  _follow(p1, p2) {
    let ax = p2.pos.x - p1.pos.x;
    let az = p2.pos.z - p1.pos.z;
    const dist = Math.max(len2(ax, az), 1e-4);
    this.axis.x = ax / dist;
    this.axis.z = az / dist;
    this.forward.x = -this.axis.z;
    this.forward.z = this.axis.x;
    this.center.x = (p1.pos.x + p2.pos.x) / 2;
    this.center.z = (p1.pos.z + p2.pos.z) / 2;
    this.center.y = (p1.pos.y + p2.pos.y) / 2 + CONFIG.carry.handHeight;
    return dist;
  }

  /** Coloca la caja entre los jugadores, derecha y quieta (spawn / respawn). */
  snapTo(p1, p2) {
    this._follow(p1, p2);
    this.tilt.roll = this.tilt.pitch = this.tilt.mag = 0;
    this.target.roll = this.target.pitch = 0;
    this.rollVel = this.pitchVel = 0;
    this.criticalTime = 0;
    this.leakRate = 0;
    this.external.roll = this.external.pitch = this.external.drain = 0;
    this.sync = this.syncRaw = 1;
    this._groupVel = null;
    this._accel.x = this._accel.z = 0;
    if (this.state !== 'upright') {
      const from = this.state;
      this.state = 'upright';
      this.events.emit('box:state', { from, to: 'upright' });
    }
  }

  /** La sueltan: cae con gravedad hacia el lado inclinado. */
  drop(p1, p2) {
    if (this.dropped) return;
    this.dropped = true;
    const gvx = (p1.actualVel.x + p2.actualVel.x) / 2;
    const gvz = (p1.actualVel.z + p2.actualVel.z) / 2;
    const r = this.tilt.roll / (this.tilt.mag || 1);
    const p = this.tilt.pitch / (this.tilt.mag || 1);
    this.dropVel.x = gvx + (this.axis.x * r + this.forward.x * p) * 2.5;
    this.dropVel.y = 2;
    this.dropVel.z = gvz + (this.axis.z * r + this.forward.z * p) * 2.5;
    this.spin.x = p * 180;
    this.spin.z = -r * 180;
    this.events.emit('box:drop', { tilt: { ...this.tilt } });
  }

  _fall(dt) {
    this.dropVel.y -= CONFIG.physics.gravity * dt;
    this.center.x += this.dropVel.x * dt;
    this.center.y += this.dropVel.y * dt;
    this.center.z += this.dropVel.z * dt;
    this.tilt.roll += this.spin.z * dt;
    this.tilt.pitch += this.spin.x * dt;
    this.leakRate = 0;
  }

  snapshot() {
    return { integrity: this.integrity, wetness: this.wetness };
  }
}

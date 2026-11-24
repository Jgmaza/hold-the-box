// Cámara de seguimiento: detrás y arriba del punto medio entre los dos jugadores.
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';

export class FollowCamera {
  constructor(app, gfx) {
    this.entity = new pc.Entity('camera');
    this.entity.addComponent('camera', {
      clearColor: gfx.color('sky'),
      fov: CONFIG.camera.fov,
      nearClip: 0.1,
      farClip: 400,
    });
    gfx.root.addChild(this.entity);
    this.target = new pc.Vec3();
    this.look = new pc.Vec3(); // objetivo suavizado (evita tirones al saltar)
    this.pos = new pc.Vec3();
    this._want = new pc.Vec3();
    this.shake = 0;
  }

  _desired(game, out) {
    const b = game.box.center;
    const p1 = game.p1.pos;
    const p2 = game.p2.pos;
    // Si la caja cayó, seguir a la caja; si no, el punto medio.
    const cx = game.box.dropped ? b.x : (p1.x + p2.x) / 2;
    const cy = game.box.dropped ? b.y : Math.min(p1.y, p2.y) + 0.6;
    const cz = game.box.dropped ? b.z : (p1.z + p2.z) / 2;
    this.target.set(cx, cy, cz - CONFIG.camera.lookAhead);
    const o = CONFIG.camera.offset;
    out.set(cx + o.x, cy + o.y, cz + o.z);
    return out;
  }

  snap(game) {
    this._desired(game, this.pos);
    this.look.copy(this.target);
    this.entity.setPosition(this.pos);
    this.entity.lookAt(this.look);
  }

  update(dt, game) {
    const want = this._desired(game, this._want);
    const k = 1 - Math.exp(-CONFIG.camera.smoothing * dt);
    const ky = 1 - Math.exp(-CONFIG.camera.smoothing * 0.5 * dt);
    this.pos.x += (want.x - this.pos.x) * k;
    this.pos.y += (want.y - this.pos.y) * ky;
    this.pos.z += (want.z - this.pos.z) * k;
    this.look.x += (this.target.x - this.look.x) * k;
    this.look.y += (this.target.y - this.look.y) * ky;
    this.look.z += (this.target.z - this.look.z) * k;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    const s = this.shake * this.shake * 0.35;
    this.entity.setPosition(this.pos.x + (Math.random() - 0.5) * s, this.pos.y + (Math.random() - 0.5) * s, this.pos.z);
    this.entity.lookAt(this.look);
    if (this.entity.camera.fov !== CONFIG.camera.fov) this.entity.camera.fov = CONFIG.camera.fov;
  }
}

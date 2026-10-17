// Dibujo de la caja compartida: orientación (inclinación), huequito, mojado, gotas.
// Si Juanes entrega caja-normal/inclinada/huequito/mojada.png, se usan como textura según el estado.
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { imageUrl } from './deliveries.js';
import { boxCanvas } from './signs.js';

const TEX_STATES = ['normal', 'inclinada', 'huequito', 'mojada'];

export class BoxView {
  constructor(gfx, box, particles) {
    this.gfx = gfx;
    this.box = box;
    this.particles = particles;
    const S = CONFIG.box.size;

    this.root = gfx.group('box');
    this.textures = { normal: gfx.textureFromCanvas(boxCanvas(gfx.palette.box)) };
    this.material = gfx.textured(this.textures.normal);
    this.mesh = gfx.prim('box', this.material, { parent: this.root, scale: [S.w, S.h, S.d], name: 'caja' });

    // Huequito: disco oscuro en la cara frontal, crece cuando se vacía.
    this.hole = gfx.prim('cylinder', gfx.solid('dark', { unlit: true }), {
      parent: this.root,
      pos: [S.w * 0.28, -S.h * 0.22, S.d / 2 + 0.005],
      rot: [90, 0, 0],
      scale: [0.1, 0.01, 0.1],
      shadows: false,
      name: 'huequito',
    });

    this._qYaw = new pc.Quat();
    this._qRoll = new pc.Quat();
    this._qPitch = new pc.Quat();
    this._q = new pc.Quat();
    this._tmp = new pc.Vec3();
    this._leakAcc = 0;
    this._dripAcc = 0;
    this._current = 'normal';
    this._loadTextures();
  }

  async _loadTextures() {
    for (const s of TEX_STATES) {
      const tex = await this.gfx.loadTexture(imageUrl(`juanes/caja-${s}.png`));
      if (tex) this.textures[s] = tex;
    }
    this._current = null; // fuerza refresco
  }

  _pickTexture() {
    const b = this.box;
    if (b.wetness > 50 && this.textures.mojada) return 'mojada';
    if (b.integrity < 60 && this.textures.huequito) return 'huequito';
    if (b.state !== 'upright' && this.textures.inclinada) return 'inclinada';
    return 'normal';
  }

  update(dt, time) {
    const b = this.box;
    const S = CONFIG.box.size;

    // Orientación: yaw según el eje P1→P2, luego roll (alrededor de F) y pitch (alrededor del eje).
    const yaw = (Math.atan2(-b.axis.z, b.axis.x) * 180) / Math.PI;
    this._qYaw.setFromAxisAngle(pc.Vec3.UP, yaw);
    this._qRoll.setFromAxisAngle(pc.Vec3.BACK, -b.tilt.roll);
    this._qPitch.setFromAxisAngle(pc.Vec3.RIGHT, b.tilt.pitch);
    this._q.mul2(this._qYaw, this._qRoll).mul(this._qPitch);
    this.root.setPosition(b.center.x, b.center.y, b.center.z);
    this.root.setRotation(this._q);

    // Textura según estado (solo si hay PNG de Juanes) + tinte.
    const want = this._pickTexture();
    if (want !== this._current) {
      this._current = want;
      this.material.diffuseMap = this.textures[want];
      this.material.update();
    }
    const wet = b.wetness / 100;
    let r = 1 - wet * 0.45;
    let g = 1 - wet * 0.4;
    let bl = 1 - wet * 0.25;
    if (b.state === 'critical' && !b.dropped) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 18);
      r = r + (1.4 - r) * pulse * 0.6;
      g *= 1 - pulse * 0.45;
      bl *= 1 - pulse * 0.45;
    }
    const c = this.material.diffuse;
    if (Math.abs(c.r - r) + Math.abs(c.g - g) + Math.abs(c.b - bl) > 0.01) {
      this.material.diffuse = new pc.Color(r, g, bl);
      this.material.update();
    }

    // Huequito más grande con menos contenido.
    const holeS = 0.08 + 0.16 * (1 - b.integrity / 100);
    this.hole.setLocalScale(holeS, 0.01, holeS);

    if (b.dropped) return;

    // Gotas de contenido por el huequito.
    if (b.leakRate > 0) {
      this._leakAcc += dt * (6 + b.leakRate * 4);
      const hp = this.hole.getPosition();
      while (this._leakAcc >= 1) {
        this._leakAcc -= 1;
        this.particles.emit(hp.x, hp.y, hp.z, (Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8, {
          color: 'content',
          life: 0.9,
          size: 0.09,
        });
      }
    }

    // Goteo de agua si está mojada.
    if (b.wetness > 8) {
      this._dripAcc += dt * b.wetness * 0.12;
      while (this._dripAcc >= 1) {
        this._dripAcc -= 1;
        const ox = (Math.random() - 0.5) * S.w;
        const oz = (Math.random() - 0.5) * S.d;
        this.particles.emit(b.center.x + ox, b.center.y - S.h / 2, b.center.z + oz, 0, -0.5, 0, {
          color: 'water',
          life: 0.7,
          size: 0.06,
        });
      }
    }
  }
}

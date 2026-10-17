// Dibujo de la caja compartida: orientación (inclinación), huequito, mojado, gotas.
// Si Juanes entrega caja-normal/inclinada/huequito/mojada.png, se usan como textura según el estado.
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { imageUrl } from './deliveries.js';
import { boxCanvas } from './signs.js';
import pawUrl from '../../../deliveries/luis/models/pata-gato.glb?url';

// Largo del GLB (garras en +Z). Un poco más que la malla para que arranque dentro.
const PAW_LEN = 0.4;

const TEX_STATES = ['normal', 'inclinada', 'huequito', 'mojada'];

export class BoxView {
  constructor(gfx, box, particles, cat, bomb) {
    this.gfx = gfx;
    this.box = box;
    this.particles = particles;
    this.cat = cat;
    this.bomb = bomb;
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
    this._pawOut = 0;
    this._buildCat();
    this._buildBomb();
    this._loadTextures();
  }

  /** Cara, orejas y cola solo de la caja del gato. La pata sale por el frente. No cambia el tamaño físico. */
  _buildCat() {
    const S = CONFIG.box.size;
    const fur = this.gfx.solid('#e07a3d');
    const inner = this.gfx.solid('#f1c27d');
    const claw = this.gfx.solid('#f7f4ee');
    const white = this.gfx.solid('#fff8ee');
    const eye = this.gfx.solid('#1d1d1d');
    const nose = this.gfx.solid('#e8453c');
    const z = S.d / 2 + 0.04;

    this.catLook = this.gfx.group('gato', this.root);
    this.gfx.prim('cone', fur, { parent: this.catLook, pos: [-0.18, S.h / 2 + 0.08, 0.02], scale: [0.18, 0.26, 0.12], name: 'oreja-izq' });
    this.gfx.prim('cone', fur, { parent: this.catLook, pos: [0.18, S.h / 2 + 0.08, 0.02], scale: [0.18, 0.26, 0.12], name: 'oreja-der' });
    this.gfx.prim('cone', inner, { parent: this.catLook, pos: [-0.18, S.h / 2 + 0.07, 0.05], scale: [0.08, 0.14, 0.05], name: 'oreja-izq-in' });
    this.gfx.prim('cone', inner, { parent: this.catLook, pos: [0.18, S.h / 2 + 0.07, 0.05], scale: [0.08, 0.14, 0.05], name: 'oreja-der-in' });
    this.gfx.prim('sphere', white, { parent: this.catLook, pos: [-0.16, 0.08, z], scale: [0.13, 0.15, 0.06], shadows: false, name: 'ojo-izq' });
    this.gfx.prim('sphere', white, { parent: this.catLook, pos: [0.16, 0.08, z], scale: [0.13, 0.15, 0.06], shadows: false, name: 'ojo-der' });
    this.gfx.prim('sphere', eye, { parent: this.catLook, pos: [-0.16, 0.05, z + 0.03], scale: [0.05, 0.08, 0.04], shadows: false, name: 'pupila-izq' });
    this.gfx.prim('sphere', eye, { parent: this.catLook, pos: [0.16, 0.05, z + 0.03], scale: [0.05, 0.08, 0.04], shadows: false, name: 'pupila-der' });
    this.gfx.prim('sphere', nose, { parent: this.catLook, pos: [0, -0.08, z + 0.02], scale: [0.08, 0.06, 0.05], shadows: false, name: 'nariz' });
    for (const side of [-1, 1]) {
      for (const y of [-0.02, 0.03, 0.08]) {
        this.gfx.prim('box', white, {
          parent: this.catLook,
          pos: [side * 0.28, y - 0.08, z],
          rot: [0, side * 18, side * -8],
          scale: [0.22, 0.012, 0.012],
          shadows: false,
          name: 'bigote',
        });
      }
    }
    this.tail = this.gfx.group('cola', this.catLook, [0, S.h * 0.1, -S.d / 2]);
    this.gfx.prim('cylinder', fur, { parent: this.tail, pos: [0, 0.16, -0.12], rot: [55, 0, 0], scale: [0.09, 0.4, 0.09], name: 'cola-cuerpo' });
    this.catLook.enabled = false;

    // La pata mide hacia +Z y arranca en el origen. Así, con el origen
    // detrás de la cara, el cartón la tapa hasta que cruza el hueco.
    this.paw = this.gfx.group('pata', this.root);
    this.pawBlock = this.gfx.group('pata-simple', this.paw);
    this.gfx.prim('box', fur, { parent: this.pawBlock, pos: [0, 0, 0.1], scale: [0.11, 0.08, 0.2], shadows: false, name: 'antebrazo' });
    this.gfx.prim('box', inner, { parent: this.pawBlock, pos: [0, -0.01, 0.24], scale: [0.18, 0.065, 0.11], shadows: false, name: 'palma' });
    for (const x of [-0.055, 0, 0.055]) {
      this.gfx.prim('box', claw, { parent: this.pawBlock, pos: [x, 0.02, 0.34], scale: [0.02, 0.024, 0.09], shadows: false, name: 'garra' });
    }
    this.paw.enabled = false;
    this._loadPawModel();
    this.pawHole = this.gfx.prim('cylinder', this.gfx.solid('#3a2418', { unlit: true }), {
      parent: this.root,
      pos: [0, -S.h * 0.16, S.d / 2 + 0.008],
      rot: [90, 0, 0],
      scale: [0.02, 0.012, 0.02],
      shadows: false,
      name: 'agujero-pata',
    });
    this.pawHole.enabled = false;
  }

  /** Cuerpo negro y mecha. La chispa se acerca cuando queda menos tiempo. */
  _buildBomb() {
    const S = CONFIG.box.size;
    const body = this.gfx.solid('#2a2a2a');
    const rope = this.gfx.solid('#d7c4a3');
    const spark = this.gfx.solid('#ffcc33', { emissive: 1 });
    this.bombLook = this.gfx.group('bomba', this.root);
    this.gfx.prim('sphere', body, { parent: this.bombLook, pos: [0, S.h / 2 + 0.05, 0], scale: [0.2, 0.14, 0.2], name: 'cuerpo' });
    this.fuse = this.gfx.prim('cylinder', rope, {
      parent: this.bombLook,
      pos: [0, S.h / 2 + 0.16, 0.04],
      scale: [0.018, 0.22, 0.018],
      shadows: false,
      name: 'mecha',
    });
    this.spark = this.gfx.prim('sphere', spark, {
      parent: this.bombLook,
      pos: [0, S.h / 2 + 0.28, 0.04],
      scale: [0.045, 0.045, 0.045],
      shadows: false,
      name: 'chispa',
    });
    this.bombLook.enabled = false;
  }

  /** El GLB reemplaza la pata de cajas. Si falla, se queda el bloque simple. */
  _loadPawModel() {
    const asset = new pc.Asset('pata-gato', 'container', { url: pawUrl });
    this.gfx.app.assets.add(asset);
    asset.once('load', () => {
      const entity = asset.resource.instantiateRenderEntity();
      entity.name = 'pata-glb';
      this.paw.addChild(entity);
      this.pawBlock.enabled = false;
    });
    asset.once('error', () => console.warn('[pata] no se pudo cargar pata-gato.glb'));
    this.gfx.app.assets.load(asset);
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
    this._updateCat(dt, time);
    this._updateBomb(time);

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
    const base = CONFIG.box.cat.enabled ? [1, 0.5, 0.2] : [1, 1, 1];
    const bombHot = CONFIG.box.bomb.enabled && this.bomb && this.bomb.timeLeft <= CONFIG.box.bomb.warnTime;
    let r = base[0] * (1 - wet * 0.45);
    let g = base[1] * (1 - wet * 0.4);
    let bl = base[2] * (1 - wet * 0.25);
    if ((b.state === 'critical' || bombHot) && !b.dropped) {
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

    // Huequito más grande con menos contenido. En la caja del gato no gotea.
    const catOn = CONFIG.box.cat.enabled;
    this.hole.enabled = !catOn;
    const holeS = 0.08 + 0.16 * (1 - b.integrity / 100);
    this.hole.setLocalScale(holeS, 0.01, holeS);

    if (b.dropped) return;

    // Gotas naranjas de contenido. La caja del gato no las muestra.
    if (!catOn && b.leakRate > 0) {
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

    this._drips(dt, b, S);
  }

  _updateCat(dt, time) {
    const cat = this.cat;
    const S = CONFIG.box.size;
    const on = CONFIG.box.cat.enabled;
    this.catLook.enabled = on;
    if (!on) {
      this._pawOut = 0;
      this.paw.enabled = false;
      this.pawHole.enabled = false;
      return;
    }
    const rage = Math.min(1, (cat.rage ?? 0) / 100);
    const wag = 2 + rage * 22;
    this.tail.setLocalEulerAngles(0, Math.sin(time * wag) * (12 + rage * 34), 0);
    const shiver = Math.sin(time * (6 + rage * 26)) * rage * 7;
    this.catLook.setLocalEulerAngles(shiver, 0, 0);

    // 0 = toda la pata detrás del cartón. 1 = garras afuera.
    const target = cat.phase === 'swipe' ? 1 : cat.phase === 'warn' ? 0.72 : cat.anim > 0.55 ? (cat.anim - 0.55) * 0.6 : 0;
    const follow = target > this._pawOut ? 2.6 : 5;
    this._pawOut += (target - this._pawOut) * Math.min(1, dt * follow);
    const out = this._pawOut;
    const visible = out > 0.04;
    this.paw.enabled = visible;
    this.pawHole.enabled = visible;
    if (!visible) return;

    const ease = out * out * (3 - 2 * out);
    const side = cat.side === 1 ? -1 : 1;
    const face = S.d / 2;
    this.paw.setLocalPosition(side * S.w * 0.22 * ease, -S.h * 0.16, face - PAW_LEN + ease * 0.34);
    const swipeT = cat.phase === 'swipe' ? 1 - cat.swipeLeft / CONFIG.box.cat.swipeHold : 0;
    const swipe = cat.phase === 'swipe' ? Math.sin(swipeT * Math.PI) * 28 * ease : Math.sin(time * 2.5) * 3 * ease;
    this.paw.setLocalEulerAngles(8 * ease + swipe, side * 18 * ease, side * -8 * ease);
    const hole = 0.04 + ease * 0.14;
    this.pawHole.setLocalScale(hole, 0.012, hole * 0.8);
    this.pawHole.setLocalPosition(side * S.w * 0.22 * ease, -S.h * 0.16, face + 0.008);
  }

  /** Acorta la mecha según el tiempo que queda. */
  _updateBomb(time) {
    const on = CONFIG.box.bomb.enabled && this.bomb;
    this.bombLook.enabled = on;
    if (!on) return;
    const total = Math.max(0.01, CONFIG.box.bomb.fuseTime);
    const left = Math.max(0, this.bomb.timeLeft / total);
    const S = CONFIG.box.size;
    const height = 0.06 + left * 0.2;
    this.fuse.setLocalScale(0.018, height, 0.018);
    this.fuse.setLocalPosition(0, S.h / 2 + 0.08 + height / 2, 0.03);
    const tip = S.h / 2 + 0.08 + height;
    const flicker = 0.04 + (left < 0.25 ? 0.02 * Math.sin(time * 28) : 0.008 * Math.sin(time * 8));
    this.spark.setLocalPosition(0, tip, 0.03);
    this.spark.setLocalScale(flicker, flicker, flicker);
  }

  _drips(dt, b, S) {
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

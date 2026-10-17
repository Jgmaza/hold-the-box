// Dibujo de la caja compartida: orientación (inclinación), huequito, mojado, gotas.
// Si Juanes entrega caja-normal/inclinada/huequito/mojada.png, se usan como textura según el estado.
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { imageUrl } from './deliveries.js';
import { bombBoxCanvas, boxCanvas } from './signs.js';
import pawUrl from '../../../deliveries/luis/models/pata-gato.glb?url';
import bombUrl from '../../../deliveries/luis/models/caja-bomba.glb?url';

// Largo del GLB (garras en +Z). Un poco más que la malla para que arranque dentro.
const PAW_LEN = 0.4;

// Medidas de caja-bomba.glb (origen en la tapa). Si se cambia make-bomb-glb.mjs hay que copiarlas aquí.
const BOMB_PANEL_Y = 0.2608;
const BOMB_DISPLAY = { x: -0.035, z: 0.02, h: 0.032, tilt: 18, w: 0.112, d: 0.054 };
const BOMB_LED = [0.05, BOMB_PANEL_Y + 0.011, 0.047];
const BOMB_FUSE = [0.345, 0.222, 0.12];

// Segmentos encendidos por dígito: a arriba, b/c derecha, d abajo, e/f izquierda, g medio.
const SEGMENTS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

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
    this.textures = {
      normal: gfx.textureFromCanvas(boxCanvas(gfx.palette.box)),
      bomba: gfx.textureFromCanvas(bombBoxCanvas(gfx.palette.box)),
    };
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

  /**
   * Atado de TNT (caja-bomba.glb) con reloj, LED y mecha. Mientras carga, o si falla,
   * queda la bomba redonda de primitivas.
   */
  _buildBomb() {
    const S = CONFIG.box.size;
    const body = this.gfx.solid('#2a2a2a');
    const rope = this.gfx.solid('#d9bf8a');
    const spark = this.gfx.solid('#ffcc33', { emissive: 1 });
    this.bombLook = this.gfx.group('bomba', this.root);
    this.bombBasic = this.gfx.prim('sphere', body, { parent: this.bombLook, pos: [0, S.h / 2 + 0.05, 0], scale: [0.2, 0.14, 0.2], name: 'cuerpo' });

    this.bombTop = this.gfx.group('atado-tnt', this.bombLook, [0, S.h / 2, 0]);
    this.bombTop.enabled = false;
    this._bombGlb = false;

    // Reloj: plano sobre la carcasa inclinada hacia la cámara.
    const D = BOMB_DISPLAY;
    const a = (D.tilt * Math.PI) / 180;
    const lift = D.h / 2 + 0.0012;
    const clock = this.gfx.group('reloj', this.bombTop, [D.x, BOMB_PANEL_Y + D.h / 2 + lift * Math.cos(a), D.z + lift * Math.sin(a)]);
    clock.setLocalEulerAngles(D.tilt, 0, 0);
    this.clockCanvas = document.createElement('canvas');
    this.clockCanvas.width = 256;
    this.clockCanvas.height = 124;
    this.clockTex = this.gfx.textureFromCanvas(this.clockCanvas);
    this.gfx.prim('plane', this.gfx.textured(this.clockTex, { unlit: true }), {
      parent: clock,
      scale: [D.w, 1, D.d],
      shadows: false,
      name: 'pantalla',
    });
    this._clockKey = '';
    this._drawClock(CONFIG.box.bomb.fuseTime, true, false);

    this.ledOn = this.gfx.solid('#ff2a1f', { emissive: 1.4 });
    this.ledOff = this.gfx.solid('#5a1712', { gloss: 0.7 });
    this.led = this.gfx.prim('sphere', this.ledOff, { parent: this.bombTop, pos: BOMB_LED, scale: [0.016, 0.014, 0.016], shadows: false, name: 'led' });

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
    this._sparkAcc = 0;
    this._loadBombModel();
  }

  _loadBombModel() {
    const asset = new pc.Asset('caja-bomba', 'container', { url: bombUrl });
    this.gfx.app.assets.add(asset);
    asset.once('load', () => {
      const entity = asset.resource.instantiateRenderEntity();
      entity.name = 'tnt-glb';
      this.bombTop.addChild(entity);
      this.bombTop.enabled = true;
      this.bombBasic.enabled = false;
      this._bombGlb = true;
    });
    asset.once('error', () => console.warn('[bomba] no se pudo cargar caja-bomba.glb'));
    this.gfx.app.assets.load(asset);
  }

  /** Reloj de 7 segmentos `M:SS`, rojo sobre negro, con los segmentos apagados apenas visibles. */
  _drawClock(timeLeft, colon, urgent) {
    const secs = Math.ceil(Math.max(0, timeLeft));
    const key = `${secs}|${colon}|${urgent}`;
    if (key === this._clockKey) return;
    this._clockKey = key;
    const c = this.clockCanvas;
    const g = c.getContext('2d');
    g.fillStyle = '#0d0b0b';
    g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#2b2b30';
    g.lineWidth = 8;
    g.strokeRect(4, 4, c.width - 8, c.height - 8);

    const lit = urgent ? '#ff3b2f' : '#ff4a36';
    const ghost = 'rgba(255, 70, 50, 0.1)';
    const digits = [Math.min(9, Math.floor(secs / 60)), Math.floor((secs % 60) / 10), secs % 10];
    const xs = [26, 118, 182];
    const W = 50;
    const H = 84;
    const th = 10;
    const y0 = 20;
    const seg = {
      a: [th / 2, 0, W - th, th],
      b: [W - th, th / 2, th, H / 2 - th / 2],
      c: [W - th, H / 2, th, H / 2 - th / 2],
      d: [th / 2, H - th, W - th, th],
      e: [0, H / 2, th, H / 2 - th / 2],
      f: [0, th / 2, th, H / 2 - th / 2],
      g: [th / 2, H / 2 - th / 2, W - th, th],
    };
    g.save();
    g.transform(1, 0, -0.1, 1, 8, 0);
    digits.forEach((d, i) => {
      for (const [name, [x, y, w, h]] of Object.entries(seg)) {
        const on = SEGMENTS[d].includes(name);
        g.fillStyle = on ? lit : ghost;
        g.shadowColor = on ? lit : 'transparent';
        g.shadowBlur = on ? 10 : 0;
        g.fillRect(xs[i] + x + 1, y0 + y + 1, w - 2, h - 2);
      }
    });
    g.fillStyle = colon ? lit : ghost;
    g.shadowColor = colon ? lit : 'transparent';
    g.shadowBlur = colon ? 10 : 0;
    g.fillRect(88, y0 + 22, 11, 11);
    g.fillRect(88, y0 + 52, 11, 11);
    g.restore();
    this.clockTex.upload();
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
    if (CONFIG.box.bomb.enabled) return 'bomba';
    if (b.wetness > 50 && this.textures.mojada) return 'mojada';
    if (b.integrity < 60 && this.textures.huequito) return 'huequito';
    if (b.state !== 'upright' && this.textures.inclinada) return 'inclinada';
    return 'normal';
  }

  update(dt, time) {
    const b = this.box;
    const S = CONFIG.box.size;
    this._updateCat(dt, time);
    this._updateBomb(dt, time);

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

    // Huequito más grande con menos contenido. La caja del gato y la bomba no tienen.
    const catOn = CONFIG.box.cat.enabled;
    this.hole.enabled = !catOn && !CONFIG.box.bomb.enabled;
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

  /** Acorta la mecha, mueve el reloj y prende el LED en cada tic. */
  _updateBomb(dt, time) {
    const on = CONFIG.box.bomb.enabled && this.bomb;
    this.bombLook.enabled = on;
    if (!on) return;
    const cfg = CONFIG.box.bomb;
    const total = Math.max(0.01, cfg.fuseTime);
    const timeLeft = Math.max(0, this.bomb.timeLeft);
    const left = timeLeft / total;
    const urgent = timeLeft <= cfg.warnTime;
    const S = CONFIG.box.size;

    // La mecha sale del casquillo del GLB; en la bomba redonda, de arriba de la esfera.
    const base = this._bombGlb ? [BOMB_FUSE[0], S.h / 2 + BOMB_FUSE[1], BOMB_FUSE[2]] : [0, S.h / 2 + 0.08, 0.03];
    const height = this._bombGlb ? 0.025 + left * 0.15 : 0.06 + left * 0.2;
    this.fuse.setLocalScale(0.018, height, 0.018);
    this.fuse.setLocalPosition(base[0], base[1] + height / 2, base[2]);
    const flicker = 0.04 + (left < 0.25 ? 0.02 * Math.sin(time * 28) : 0.008 * Math.sin(time * 8));
    this.spark.setLocalPosition(base[0], base[1] + height, base[2]);
    this.spark.setLocalScale(flicker, flicker, flicker);
    if (!this._bombGlb) return;

    const blink = urgent ? 2 : 1;
    this._drawClock(timeLeft, timeLeft <= 0 || (timeLeft * blink) % 1 > 0.5, urgent);
    const ledLit = timeLeft > 0 && this.bomb.sinceBeep < 0.12;
    if (this.led.render.material !== (ledLit ? this.ledOn : this.ledOff)) this.led.render.material = ledLit ? this.ledOn : this.ledOff;

    // Últimos 8 s: el atado tiembla un poco.
    const shake = timeLeft > 0 && timeLeft <= 8 ? 0.004 * (1 - timeLeft / 8) : 0;
    this.bombTop.setLocalPosition(Math.sin(time * 61) * shake, S.h / 2 + Math.abs(Math.sin(time * 47)) * shake, Math.cos(time * 53) * shake);

    // Chispitas que saltan de la punta de la mecha.
    if (this.box.dropped || timeLeft <= 0) return;
    this._sparkAcc += dt * (urgent ? 22 : 9);
    if (this._sparkAcc < 1) return;
    const p = this.spark.getPosition();
    while (this._sparkAcc >= 1) {
      this._sparkAcc -= 1;
      this.particles.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 1.4, 0.6 + Math.random() * 0.9, (Math.random() - 0.5) * 1.4, {
        color: 'ui',
        life: 0.25 + Math.random() * 0.2,
        size: 0.025 + Math.random() * 0.02,
        gravity: 0.35,
      });
    }
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

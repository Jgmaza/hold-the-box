// Dibujo de un jugador. Capa A: cápsula + cabeza + accesorios.
// Brazos: pivote en el hombro del torso → se estiran a la caja; el puño va siempre en la punta.
// Si Juanes entrega p1-cargar.png / p1-frente.png (o p2-...), se usa como billboard.
import { CONFIG } from '../config.js';
import { imageUrl } from './deliveries.js';
import { signCanvas } from './signs.js';

export class PlayerView {
  constructor(gfx, player, colorKey) {
    this.gfx = gfx;
    this.player = player;
    this.root = gfx.group(`player-${player.id}`);
    this.body = gfx.group('body', this.root);
    this.parts = gfx.group('parts', this.body);
    this.squash = 1;
    this.squashVel = 0;
    this.bob = 0;
    this.flailT = 0;

    const P = this.parts;
    const suit = gfx.solid(colorKey);
    const skin = gfx.solid('skin');
    gfx.prim('capsule', suit, { parent: P, pos: [0, 0.6, 0], scale: [0.6, 0.6, 0.6], name: 'torso' });
    gfx.prim('sphere', skin, { parent: P, pos: [0, 1.36, 0], scale: [0.5, 0.5, 0.5], name: 'head' });

    // Rig: hombro FIJO al torso → brazo y puño hijos (crecen en -Z local del hombro).
    this.armRigs = [];
    for (const side of [-1, 1]) {
      const shoulder = gfx.group(side < 0 ? 'shoulder-L' : 'shoulder-R', P);
      // Pegado al costado del torso (cápsula ~radio 0.3).
      shoulder.setLocalPosition(side * 0.34, 1.02, -0.06);

      // Hombro = manga/ropa (mismo material que torso), no piel.
      const joint = gfx.prim('sphere', suit, {
        parent: shoulder,
        pos: [0, 0, 0],
        scale: [0.22, 0.22, 0.22],
        name: 'joint',
      });
      const arm = gfx.prim('box', suit, {
        parent: shoulder,
        pos: [0, 0, -0.25],
        scale: [0.12, 0.12, 0.5],
        name: 'arm',
      });
      // Puño = piel (sale de la manga).
      const fist = gfx.prim('sphere', skin, {
        parent: shoulder,
        pos: [0, 0, -0.52],
        scale: [0.15, 0.15, 0.15],
        name: 'fist',
      });
      this.armRigs.push({ side, shoulder, joint, arm, fist });
    }

    if (player.id === 1) {
      gfx.prim('box', gfx.solid('dark', { gloss: 0.8 }), { parent: P, pos: [0, 1.4, -0.22], scale: [0.4, 0.09, 0.08], name: 'gafas' });
      gfx.prim('box', gfx.solid('#ffffff'), { parent: P, pos: [0, 1.0, -0.27], scale: [0.18, 0.2, 0.05], name: 'camisa' });
      gfx.prim('box', gfx.solid('danger'), { parent: P, pos: [0, 0.95, -0.3], scale: [0.07, 0.26, 0.04], name: 'corbata' });
    } else {
      const cap = gfx.solid('cap');
      gfx.prim('cylinder', cap, { parent: P, pos: [0, 1.53, 0], scale: [0.52, 0.14, 0.52], name: 'gorra' });
      gfx.prim('box', cap, { parent: P, pos: [0, 1.47, -0.27], scale: [0.34, 0.04, 0.26], name: 'visera' });
      gfx.prim('box', gfx.solid('#ffffff'), { parent: P, pos: [0, 0.82, -0.29], scale: [0.2, 0.2, 0.03], name: 'logo' });
    }

    const label = signCanvas(`P${player.id}`, { style: player.id === 1 ? 'info' : 'warn', aspect: 1.4 });
    this.label = gfx.prim('box', gfx.textured(gfx.textureFromCanvas(label), { unlit: true }), {
      parent: this.root,
      pos: [0, 2.05, 0],
      scale: [0.42, 0.3, 0.02],
      shadows: false,
      name: 'label',
    });

    this._tryBillboard(player.id);
  }

  async _tryBillboard(id) {
    const url = imageUrl(`juanes/p${id}-cargar.png`) ?? imageUrl(`juanes/p${id}-frente.png`);
    if (!url) return;
    const tex = await this.gfx.loadTexture(url);
    if (!tex) return;
    const aspect = tex.width / tex.height;
    const h = 1.75;
    this.sprite = this.gfx.prim('box', this.gfx.textured(tex, { cutout: true }), {
      parent: this.root,
      pos: [0, h / 2, 0],
      scale: [h * aspect, h, 0.02],
      name: 'sprite',
    });
    this.parts.enabled = false;
  }

  onJump() {
    this.squashVel += 6;
  }

  onLand(speed) {
    this.squashVel -= Math.min(10, 2 + speed * 0.5);
  }

  /**
   * ¿Este jugador “falló” el salto sincronizado? (el otro sí saltó / va más alto)
   * Solo afecta la mimica de brazos; la física no cambia.
   */
  _isJumpDesyncLoser(partner) {
    const p = this.player;
    const heightGap = partner.pos.y - p.pos.y;
    // Compañero en el aire y yo en piso, o me quedé claramente más abajo.
    if (!partner.grounded && p.grounded) return true;
    if (!partner.grounded && heightGap > 0.35) return true;
    return false;
  }

  /** Brazos locos de pánico: siguen anclados al hombro, no bajan a “soltar” la caja. */
  _updateFlailArms(dt) {
    this.flailT += dt * 20;
    const t = this.flailT;

    for (const { side, shoulder, arm, fist } of this.armRigs) {
      shoulder.setLocalPosition(side * 0.34, 1.02, -0.06);

      const pitch = -25 + Math.sin(t * 2.3 + side) * 50;
      const yaw = side * 35 + Math.cos(t * 2.9 + side * 0.7) * 45;
      const roll = Math.sin(t * 3.4 + side * 1.3) * 40;
      shoulder.setLocalEulerAngles(pitch, yaw, roll);

      // Largo corto-medio (agitando), no estirarse hacia abajo.
      const len = 0.5 + Math.abs(Math.sin(t * 1.8 + side)) * 0.28;
      arm.setLocalPosition(0, 0, -len * 0.5);
      arm.setLocalEulerAngles(0, 0, 0);
      arm.setLocalScale(0.12, 0.12, len);

      fist.setLocalPosition(0, 0, -len);
      fist.setLocalScale(0.15, 0.15, 0.15);
    }
  }

  /**
   * Hombro queda en el torso; brazo crece en -Z del hombro; puño = punta del brazo.
   */
  _updateCarryArms(box) {
    if (this.sprite || !this.armRigs?.length || box?.dropped) return;

    const p = this.player;
    const S = CONFIG.box.size;
    const halfW = S.w * 0.5;
    const sideSign = p.id === 1 ? -1 : 1;

    // Cara cercana de la caja, altura de costado (no debajo).
    const gripY = box.center.y + S.h * 0.1;
    const gripX = box.center.x + sideSign * box.axis.x * halfW;
    const gripZ = box.center.z + sideSign * box.axis.z * halfW;

    // Hombro en mundo ≈ pies + offset local (body yaw ya orienta al compañero).
    const shWorldY = p.pos.y + 1.02;
    const dx = gripX - p.pos.x;
    const dy = gripY - shWorldY;
    const dz = gripZ - p.pos.z;
    const horiz = Math.hypot(dx, dz);
    const len = Math.max(0.4, Math.min(2.35, Math.hypot(horiz, dy)));
    // +rotX en PlayCanvas baja el extremo -Z → invertimos para subir hacia la caja.
    const pitchDeg = -(Math.atan2(dy, Math.max(0.05, horiz)) * 180) / Math.PI;

    for (const { side, shoulder, arm, fist } of this.armRigs) {
      // Hombro siempre anclado al muñeco (no se mueve con el reach).
      shoulder.setLocalPosition(side * 0.34, 1.02, -0.06);
      // Ligera apertura L/R para no cruzar brazos; el largo va en -Z.
      const flare = side * 10;
      shoulder.setLocalEulerAngles(pitchDeg, flare, 0);

      // Brazo: pivote en hombro → centro a mitad de camino en -Z.
      arm.setLocalPosition(0, 0, -len * 0.5);
      arm.setLocalEulerAngles(0, 0, 0);
      arm.setLocalScale(0.12, 0.12, len);

      // Puño (bolita): exactamente en la punta del brazo (-Z = len).
      fist.setLocalPosition(0, 0, -len);
      fist.setLocalScale(0.15, 0.15, 0.15);
    }
  }

  update(dt, partner, camPos, box) {
    const p = this.player;
    this.root.setPosition(p.pos.x, p.pos.y, p.pos.z);

    const dx = partner.pos.x - p.pos.x;
    const dz = partner.pos.z - p.pos.z;
    const yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;

    this.squashVel += (-(this.squash - 1) * 180 - this.squashVel * 14) * dt;
    this.squash += this.squashVel * dt;
    const sq = Math.max(0.6, Math.min(1.4, this.squash));
    const side = 1 / Math.sqrt(sq);

    const speed = Math.hypot(p.actualVel.x, p.actualVel.z);
    if (p.grounded && speed > 0.5) this.bob += dt * (8 + speed * 1.6);
    const bobY = p.grounded ? Math.abs(Math.sin(this.bob)) * Math.min(1, speed / 5) * 0.07 : 0;
    const lean = Math.sin(this.bob) * Math.min(1, speed / 5) * 5;

    this.body.setLocalPosition(0, bobY, 0);
    this.body.setLocalEulerAngles(0, yaw, lean);
    this.body.setLocalScale(side, sq, side);

    if (box && !this.sprite && this.armRigs?.length) {
      if (this._isJumpDesyncLoser(partner)) this._updateFlailArms(dt);
      else this._updateCarryArms(box);
    }

    if (this.sprite || this.label) {
      const yawCam = (Math.atan2(camPos.x - p.pos.x, camPos.z - p.pos.z) * 180) / Math.PI;
      this.label.setLocalEulerAngles(0, yawCam, 0);
      if (this.sprite) {
        this.sprite.setLocalEulerAngles(0, yawCam, 0);
        this.sprite.setLocalScale(this.sprite.getLocalScale().x, 1.75 * sq, 0.02);
      }
    }
  }
}

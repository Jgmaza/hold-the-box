// Dibujo de un jugador. Capa A: cápsula + cabeza + accesorios.
// Brazos se estiran hasta la caja (carry v2 / brazos largos).
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

    const P = this.parts;
    const suit = gfx.solid(colorKey);
    gfx.prim('capsule', suit, { parent: P, pos: [0, 0.6, 0], scale: [0.6, 0.6, 0.6], name: 'torso' });
    gfx.prim('sphere', gfx.solid('skin'), { parent: P, pos: [0, 1.36, 0], scale: [0.5, 0.5, 0.5], name: 'head' });

    // Brazos dinámicos: se reescalan cada frame hasta agarrar la caja.
    this.armRigs = [];
    for (const side of [-1, 1]) {
      const arm = gfx.prim('box', suit, {
        parent: P,
        pos: [side * 0.28, 0.98, -0.35],
        scale: [0.11, 0.11, 0.5],
        name: side < 0 ? 'arm-L' : 'arm-R',
      });
      const hand = gfx.prim('sphere', gfx.solid('skin'), {
        parent: P,
        pos: [side * 0.28, 0.98, -0.62],
        scale: [0.14, 0.14, 0.14],
        name: side < 0 ? 'hand-L' : 'hand-R',
      });
      this.armRigs.push({ side, arm, hand });
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
   * Estira brazos hasta los costados de la caja (agarre lateral a media-alta altura).
   * El cuerpo ya mira al compañero (-Z local ≈ hacia la caja).
   */
  _updateCarryArms(box) {
    if (this.sprite || !this.armRigs?.length || box?.dropped) return;

    const p = this.player;
    const S = CONFIG.box.size;
    const halfW = S.w * 0.5;
    // P1 = lado -axis; P2 = +axis. Manos en la cara cercana, NO debajo.
    const sideSign = p.id === 1 ? -1 : 1;
    // Agarre a ~60% de la altura de la caja (costado superior), nunca bajo el piso de la caja.
    const gripY = box.center.y + S.h * 0.12;
    const gripX = box.center.x + sideSign * box.axis.x * halfW;
    const gripZ = box.center.z + sideSign * box.axis.z * halfW;

    const shoulderLocalY = 0.98;
    const shoulderWorldY = p.pos.y + shoulderLocalY;
    const dx = gripX - p.pos.x;
    const dy = gripY - shoulderWorldY;
    const dz = gripZ - p.pos.z;
    const horiz = Math.hypot(dx, dz);
    const reach = Math.max(0.45, Math.min(2.4, horiz));
    // PlayCanvas: +rotX baja el extremo -Z; si el agarre está arriba, pitch negativo.
    const pitchDeg = -(Math.atan2(dy, Math.max(0.05, horiz)) * 180) / Math.PI;
    const handLocalY = shoulderLocalY + dy;

    for (const { side, arm, hand } of this.armRigs) {
      // Manos abiertas en el ancho de la cara (left/right del jugador = forward del box).
      const shX = side * 0.32;
      const handX = side * (S.d * 0.28);
      const midX = (shX + handX) / 2;
      const midY = (shoulderLocalY + handLocalY) / 2;

      arm.setLocalPosition(midX, midY, -reach * 0.5);
      arm.setLocalEulerAngles(pitchDeg, 0, side * 3);
      arm.setLocalScale(0.11, 0.11, reach);

      hand.setLocalPosition(handX, handLocalY, -reach);
      hand.setLocalScale(0.16, 0.16, 0.16);
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

    if (box) this._updateCarryArms(box);

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

// Dibujo de un jugador. Capa A: cápsula + cabeza + accesorios.
// Si Juanes entrega p1-cargar.png / p1-frente.png (o p2-...), se usa como recorte de papel (billboard).
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
    // Brazos hacia adelante (-Z = hacia la caja).
    for (const side of [-1, 1]) {
      gfx.prim('box', suit, { parent: P, pos: [side * 0.24, 0.98, -0.3], scale: [0.12, 0.12, 0.42], name: 'arm' });
      gfx.prim('sphere', gfx.solid('skin'), { parent: P, pos: [side * 0.24, 0.98, -0.52], scale: [0.13, 0.13, 0.13], name: 'hand' });
    }

    if (player.id === 1) {
      // P1: traje + gafas + corbata
      gfx.prim('box', gfx.solid('dark', { gloss: 0.8 }), { parent: P, pos: [0, 1.4, -0.22], scale: [0.4, 0.09, 0.08], name: 'gafas' });
      gfx.prim('box', gfx.solid('#ffffff'), { parent: P, pos: [0, 1.0, -0.27], scale: [0.18, 0.2, 0.05], name: 'camisa' });
      gfx.prim('box', gfx.solid('danger'), { parent: P, pos: [0, 0.95, -0.3], scale: [0.07, 0.26, 0.04], name: 'corbata' });
    } else {
      // P2: gorra + camiseta
      const cap = gfx.solid('cap');
      gfx.prim('cylinder', cap, { parent: P, pos: [0, 1.53, 0], scale: [0.52, 0.14, 0.52], name: 'gorra' });
      gfx.prim('box', cap, { parent: P, pos: [0, 1.47, -0.27], scale: [0.34, 0.04, 0.26], name: 'visera' });
      gfx.prim('box', gfx.solid('#ffffff'), { parent: P, pos: [0, 0.82, -0.29], scale: [0.2, 0.2, 0.03], name: 'logo' });
    }

    // Etiqueta P1 / P2 sobre la cabeza.
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

  update(dt, partner, camPos) {
    const p = this.player;
    this.root.setPosition(p.pos.x, p.pos.y, p.pos.z);

    // Mirar hacia el compañero (la caja está entre los dos).
    const dx = partner.pos.x - p.pos.x;
    const dz = partner.pos.z - p.pos.z;
    const yaw = (Math.atan2(-dx, -dz) * 180) / Math.PI;

    // Squash & stretch (resorte).
    this.squashVel += (-(this.squash - 1) * 180 - this.squashVel * 14) * dt;
    this.squash += this.squashVel * dt;
    const sq = Math.max(0.6, Math.min(1.4, this.squash));
    const side = 1 / Math.sqrt(sq);

    // Balanceo al caminar.
    const speed = Math.hypot(p.actualVel.x, p.actualVel.z);
    if (p.grounded && speed > 0.5) this.bob += dt * (8 + speed * 1.6);
    const bobY = p.grounded ? Math.abs(Math.sin(this.bob)) * Math.min(1, speed / 5) * 0.07 : 0;
    const lean = Math.sin(this.bob) * Math.min(1, speed / 5) * 5;

    this.body.setLocalPosition(0, bobY, 0);
    this.body.setLocalEulerAngles(0, yaw, lean);
    this.body.setLocalScale(side, sq, side);

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

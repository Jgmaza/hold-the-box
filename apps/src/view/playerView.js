// Dibujo de un jugador. Capa A: el personaje escogido en el menú (view/characters.js).
// Brazos: pivote en el hombro del torso → se estiran a la caja; el puño va siempre en la punta.
// Desync de salto: el que quedó abajo agita los brazos + signo de rabia; el que saltó bien sostiene la caja por debajo.
import { CONFIG } from '../config.js';
import { buildCharacter, character } from './characters.js';
import { imageUrl } from './deliveries.js';
import { angerMarkCanvas, signCanvas } from './signs.js';

export class PlayerView {
  /** @param {{ charId?: string, alt?: boolean }} opts  personaje y si usa los colores alternos */
  constructor(gfx, player, { charId, alt = false } = {}) {
    this.gfx = gfx;
    this.player = player;
    this.root = gfx.group(`player-${player.id}`);
    this.body = gfx.group('body', this.root);
    this.parts = gfx.group('parts', this.body);
    this.squash = 1;
    this.squashVel = 0;
    this.bob = 0;
    this.flailT = 0;

    this.char = character(charId);
    this.armRigs = buildCharacter(gfx, this.parts, charId, { alt });

    const label = signCanvas(`P${player.id}`, { style: player.id === 1 ? 'info' : 'warn', aspect: 1.4 });
    this.label = gfx.prim('box', gfx.textured(gfx.textureFromCanvas(label), { unlit: true }), {
      parent: this.root,
      pos: [0, 2.05, 0],
      scale: [0.42, 0.3, 0.02],
      shadows: false,
      name: 'label',
    });

    const angerTex = gfx.textureFromCanvas(angerMarkCanvas());
    this.anger = gfx.prim('box', gfx.textured(angerTex, { unlit: true, cutout: true }), {
      parent: this.root,
      pos: [0.35, 2.15, 0],
      scale: [0.38, 0.38, 0.02],
      shadows: false,
      name: 'anger',
    });
    this.anger.enabled = false;

    this._tryBillboard(this.char.sprite);
  }

  async _tryBillboard(prefix) {
    const url = imageUrl(`juanes/${prefix}-cargar.png`) ?? imageUrl(`juanes/${prefix}-frente.png`);
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

  /** Falló el salto sync: compañero saltó / va más alto. Solo mimica. */
  _isJumpDesyncLoser(partner) {
    const p = this.player;
    const heightGap = partner.pos.y - p.pos.y;
    if (!partner.grounded && p.grounded) return true;
    if (!partner.grounded && heightGap > 0.35) return true;
    return false;
  }

  /** El que está arriba: espejo exacto de `_isJumpDesyncLoser` visto desde el compañero. */
  _isJumpDesyncWinner(partner) {
    const p = this.player;
    if (p.grounded) return false;
    return partner.grounded || p.pos.y - partner.pos.y > 0.35;
  }

  /** El que quedó abajo: agita los brazos (anclados al hombro) mientras rabia. */
  _updateFlailArms(dt) {
    this.flailT += dt * 12;
    const t = this.flailT;

    for (const { side, shoulder, arm, fist } of this.armRigs) {
      shoulder.setLocalPosition(side * 0.34, 1.02, -0.06);

      const pitch = -55 + Math.sin(t * 2.1 + side) * 30;
      const yaw = side * 30 + Math.cos(t * 2.6 + side * 0.7) * 22;
      const roll = Math.sin(t * 3.0 + side * 1.3) * 18;
      shoulder.setLocalEulerAngles(pitch, yaw, roll);

      const len = 0.55 + Math.abs(Math.sin(t * 1.6 + side)) * 0.15;
      arm.setLocalPosition(0, 0, -len * 0.5);
      arm.setLocalEulerAngles(0, 0, 0);
      arm.setLocalScale(0.12, 0.12, len);

      fist.setLocalPosition(0, 0, -len);
      fist.setLocalScale(0.15, 0.15, 0.15);
    }
  }

  /**
   * Agarre estable a la caja.
   * @param {{ gripYOffset?: number, pitchAdd?: number, flareAdd?: number }} opts
   *  - winner (saltó bien): manos bajo la caja (soportándola)
   *  - normal: costado
   */
  _poseArmsToBox(box, opts = {}) {
    if (!this.armRigs?.length || box?.dropped) return;

    const p = this.player;
    const S = CONFIG.box.size;
    const halfW = S.w * 0.5;
    const sideSign = p.id === 1 ? -1 : 1;
    const gripYOffset = opts.gripYOffset ?? S.h * 0.1;
    // inset < 1 mete las manos bajo la caja en vez de quedarse en la esquina.
    const reachW = halfW * (opts.inset ?? 1);

    const gripY = box.center.y + gripYOffset;
    const gripX = box.center.x + sideSign * box.axis.x * reachW;
    const gripZ = box.center.z + sideSign * box.axis.z * reachW;

    const shWorldY = p.pos.y + 1.02;
    const dx = gripX - p.pos.x;
    const dy = gripY - shWorldY;
    const dz = gripZ - p.pos.z;
    const horiz = Math.hypot(dx, dz);
    const len = Math.max(0.4, Math.min(2.35, Math.hypot(horiz, dy)));
    // +rotX sube la punta -Z del brazo: dy > 0 (agarre arriba) => pitch positivo.
    const pitchDeg = (Math.atan2(dy, Math.max(0.05, horiz)) * 180) / Math.PI + (opts.pitchAdd ?? 0);

    for (const { side, shoulder, arm, fist } of this.armRigs) {
      shoulder.setLocalPosition(side * 0.34, 1.02, -0.06);
      shoulder.setLocalEulerAngles(pitchDeg, side * 10 + (opts.flareAdd ?? 0) * side, 0);

      arm.setLocalPosition(0, 0, -len * 0.5);
      arm.setLocalEulerAngles(0, 0, 0);
      arm.setLocalScale(0.12, 0.12, len);

      fist.setLocalPosition(0, 0, -len);
      fist.setLocalScale(0.15, 0.15, 0.15);
    }
  }

  _setAngerVisible(show, camPos, time) {
    if (!this.anger) return;
    this.anger.enabled = !!show;
    if (!show) return;
    const bob = 0.04 * Math.sin(time * 6);
    this.anger.setLocalPosition(0.38, 2.2 + bob, 0);
    const yawCam = (Math.atan2(camPos.x - this.player.pos.x, camPos.z - this.player.pos.z) * 180) / Math.PI;
    this.anger.setLocalEulerAngles(0, yawCam, 0);
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

    const loser = this._isJumpDesyncLoser(partner);
    const winner = this._isJumpDesyncWinner(partner);

    if (box && !this.sprite && this.armRigs?.length) {
      if (loser) {
        this._updateFlailArms(dt);
      } else if (winner) {
        // Saltó bien: manos debajo / soportando la caja.
        this._poseArmsToBox(box, { gripYOffset: -CONFIG.box.size.h * 0.5 - 0.07, inset: 0.6 });
      } else {
        // Sync normal: costados.
        this._poseArmsToBox(box, { gripYOffset: CONFIG.box.size.h * 0.1 });
      }
    }

    this._setAngerVisible(loser && !this.sprite, camPos, this.flailT);

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

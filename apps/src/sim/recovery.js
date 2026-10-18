import { CONFIG } from '../config.js';

/** Aparatos sueltos: cada uno hace una sola cosa. El jugador prueba cuál le sirve. */
export const RECOVERY_KINDS = ['refill', 'cat', 'bomb', 'dry'];

/**
 * Una estación de recuperación (un aparato).
 * - refill: dispensador de cerveza → integrity (solo VIP)
 * - cat: galletas → baja rage (solo gato)
 * - bomb: mesa de taller → repara health (solo bomba)
 * - dry: abanicos → baja wetness (sin vaciar contenido; no aplica a bomba)
 */
export class RecoveryStation {
  constructor(def) {
    this.id = def.id ?? 'recovery';
    this.kind = RECOVERY_KINDS.includes(def.kind) ? def.kind : 'refill';
    this.x = def.x;
    this.z = def.z;
    this.w = def.w ?? 2.2;
    this.d = def.d ?? 2;
    this.top = def.top ?? 1;
    this.active = false;
    this._heartAcc = 0;
  }

  contains(x, z) {
    return Math.abs(x - this.x) <= this.w / 2 && Math.abs(z - this.z) <= this.d / 2;
  }

  /**
   * Aplica solo el efecto de este aparato, y solo si la caja lo puede usar.
   * @param {import('./cat.js').Cat | null} [cat]
   * @returns {{ dry: number, refill: number, bombHeal: number, catCalm: number, heart: boolean, kinds: string[] }}
   */
  apply(dt, box, cat = null) {
    const R = CONFIG.recovery;
    const out = { dry: 0, refill: 0, bombHeal: 0, catCalm: 0, heart: false, kinds: [] };
    if (!this.active || dt <= 0) return out;

    if (this.kind === 'dry') {
      if (box.wetness > 0 && !box.bombMode) {
        const before = box.wetness;
        box.wetness = Math.max(0, box.wetness - R.dryPerSec * dt);
        out.dry = before - box.wetness;
        if (out.dry > 0) out.kinds.push('dry');
      }
      return out;
    }

    if (this.kind === 'bomb') {
      if (box.bombMode) {
        out.bombHeal = box.bomb.heal(R.bombHealPerSec * dt);
        if (out.bombHeal > 0) out.kinds.push('bomb');
      }
      return out;
    }

    if (this.kind === 'cat') {
      if (box.catMode && cat) {
        out.catCalm = cat.calm(R.catCalmPerSec * dt);
        if (out.catCalm > 0) out.kinds.push('cat');
        if (out.catCalm > 0 || cat.rage > 0.5) {
          this._heartAcc += dt;
          if (this._heartAcc >= R.catHeartInterval) {
            this._heartAcc = 0;
            out.heart = true;
          }
        }
      }
      return out;
    }

    // refill: solo VIP (sin gato ni bomba)
    if (!box.bombMode && !box.catMode) {
      out.refill = box.heal(R.refillPerSec * dt);
      if (out.refill > 0) out.kinds.push('refill');
    }
    return out;
  }
}

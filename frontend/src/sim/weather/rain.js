// Lluvia: la llovizna moja de a poco y el aguacero empapa (CONFIG.weather.rain).
// El piso de la isla resbala. Bajo una carpa (`shelters` en la isla) no se moja ni resbala: ahí se espera el aguacero.
// La caja cuenta como cubierta si su centro está bajo la carpa o a menos de `shelterMargin` del borde.
//
//   weather: 'rain'
//   weather: { type: 'rain', strength: 0.6, shelters: [{ x, z, w, d }] }
import { WeatherZone } from './weatherZone.js';

export class RainZone extends WeatherZone {
  static type = 'rain';

  get calmKey() {
    return 'drizzle';
  }

  get shelters() {
    return this.opts.shelters ?? [];
  }

  reset() {
    this.boxShelter = null; // carpa que cubre la caja ahora (la vista la vuelve transparente, la UI avisa)
    super.reset();
  }

  /** Carpa que cubre el punto (con `margin` de holgura) o null. */
  shelterAt(p, margin = 0) {
    return this.shelters.find((s) => Math.abs(p.x - s.x) <= s.w / 2 + margin && Math.abs(p.z - s.z) <= s.d / 2 + margin) ?? null;
  }

  /** ¿El punto está bajo una carpa? */
  sheltered(p, margin = 0) {
    return !!this.shelterAt(p, margin);
  }

  apply(dt, game, fx) {
    const C = this._c;
    const k = this.intensity * this.strength;
    const c = game.box.center;
    const inside = this.contains(c);
    this.boxShelter = inside ? this.shelterAt(c, C.shelterMargin) : null;
    if (inside && !this.boxShelter) fx.wetRate += C.wetRate * k;
    for (const p of game.players) {
      if (this.contains(p.pos) && !this.sheltered(p.pos, 0.2)) fx.gripMul[p.id] *= C.slip;
    }
  }
}

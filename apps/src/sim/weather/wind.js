// Viento: ráfagas que empujan a la pareja, inclinan la caja y se llevan contenido (CONFIG.weather.wind).
// Caminar contra la ráfaga compensa el empuje; ir sincronizados pierde menos contenido (Better Together).
//
//   weather: 'wind'                                   ráfagas de lado, alternando izquierda / derecha
//   weather: { type: 'wind', dir: 'alternate' | 'random' | <grados>, strength: 1.2 }
//     grados: hacia dónde sopla en el plano XZ (0 = hacia +X / derecha, 90 = hacia +Z / atrás)
import { WeatherZone } from './weatherZone.js';

export class WindZone extends WeatherZone {
  static type = 'wind';

  reset() {
    this.dir = { x: 1, z: 0 }; // hacia dónde sopla (unitario)
    this._sign = 0; // para 'alternate'
    super.reset();
    this._pickDir();
  }

  get calmKey() {
    return 'breeze';
  }

  onPhase(phase) {
    // La dirección se decide al empezar el aviso: rachas y manga de viento la muestran antes de la ráfaga.
    if (phase === 'warn') this._pickDir();
  }

  _pickDir() {
    const mode = this.opts.dir ?? 'alternate';
    let deg;
    if (typeof mode === 'number') deg = mode;
    else if (mode === 'random') deg = this.rng.chance(0.5) ? 0 : 180;
    else {
      this._sign = this._sign === 0 ? (this.rng.chance(0.5) ? 1 : -1) : -this._sign;
      deg = this._sign > 0 ? 0 : 180;
    }
    const a = (deg * Math.PI) / 180;
    this.dir.x = Math.cos(a);
    this.dir.z = Math.sin(a);
  }

  apply(dt, game, fx) {
    const C = this._c;
    const k = this.intensity * this.strength;
    const { x: dx, z: dz } = this.dir;

    for (const p of game.players) {
      if (!this.contains(p.pos)) continue;
      fx.push[p.id].x += dx * C.pushSpeed * k;
      fx.push[p.id].z += dz * C.pushSpeed * k;
    }

    const box = game.box;
    if (box.dropped || !this.contains(box.center)) return;
    // De costado (perpendicular al eje P1→P2) la tumba hacia adelante/atrás; a lo largo, la inclina hacia un lado.
    const along = dx * box.axis.x + dz * box.axis.z;
    const perp = dx * box.forward.x + dz * box.forward.z;
    fx.tilt.roll += C.leanDeg * k * along;
    fx.tilt.pitch += C.leanDeg * k * perp;
    fx.drain += C.drainRate * k * (1 + C.syncRelief * (1 - box.sync));
  }
}

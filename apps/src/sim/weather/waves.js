// Oleaje: cada tanto una ola grande cruza la isla de lado a lado (CONFIG.weather.waves).
// Avisa de qué lado viene; al pasar, la cresta empuja a quien esté parado en el piso y moja / inclina la caja.
// Se esquiva así (Better Together):
//   - detrás de un ROMPEOLAS del lado de donde viene: toda esa franja de la isla queda cubierta
//   - saltando: a un jugador en el aire la ola le pasa por debajo; si saltan LOS DOS, la caja tampoco se moja
// Los rompeolas son plataformas `kind: 'breakwater'` (chocan, se pueden saltar). Ver waveIsland() en sections.js.
//
//   weather: { type: 'waves', breakwaters: [{ x, z, w, d }], dir: 'alternate' | 'random' | 'left' | 'right', strength }
import { WeatherZone } from './weatherZone.js';

export class WavesZone extends WeatherZone {
  static type = 'waves';

  get calmKey() {
    return 'swell';
  }

  get breakwaters() {
    return this.opts.breakwaters ?? [];
  }

  reset() {
    this.dir = { x: 1, z: 0 }; // hacia dónde avanza la ola (+X = viene de la izquierda)
    this._sign = 0;
    this.boxShelter = null; // rompeolas que cubre la caja ahora (la UI lo dice)
    super.reset();
    this._pickDir();
  }

  onPhase(phase) {
    // El lado se decide al empezar el aviso: la loma de agua se ve antes de que llegue la ola.
    if (phase === 'warn') this._pickDir();
  }

  _pickDir() {
    const mode = this.opts.dir ?? 'alternate';
    let sign;
    if (mode === 'left') sign = 1;
    else if (mode === 'right') sign = -1;
    else if (mode === 'random') sign = this.rng.chance(0.5) ? 1 : -1;
    else sign = this._sign = this._sign === 0 ? (this.rng.chance(0.5) ? 1 : -1) : -this._sign;
    this.dir.x = sign;
    this.dir.z = 0;
  }

  /** x de la cresta mientras la ola cruza (null si no hay ola): de un borde de la isla al otro durante 'active'. */
  get crestX() {
    if (this.phase !== 'active') return null;
    const pad = this._c?.crestWidth ?? 1.5;
    const from = this.dir.x > 0 ? this.area.min.x - pad : this.area.max.x + pad;
    const to = this.dir.x > 0 ? this.area.max.x + pad : this.area.min.x - pad;
    return from + (to - from) * this.phaseT;
  }

  /** Rompeolas que tapa el punto de la ola que viene: mismo tramo en Z y del lado de donde llega. */
  shelterAt(p, margin = 0) {
    return this.breakwaters.find((b) => Math.abs(p.z - b.z) <= b.d / 2 + margin && (this.dir.x > 0 ? b.x < p.x : b.x > p.x)) ?? null;
  }

  sheltered(p, margin = 0) {
    return !!this.shelterAt(p, margin);
  }

  apply(dt, game, fx) {
    const C = this._c;
    const k = this.strength;
    const box = game.box;
    const c = box.center;
    const boxInside = !box.dropped && this.contains(c);
    this.boxShelter = boxInside && this.phase !== 'calm' ? this.shelterAt(c, C.shelterMargin) : null;

    const crest = this.crestX;
    if (crest === null) return;
    const touches = (x) => Math.abs(x - crest) <= C.crestWidth / 2;

    for (const p of game.players) {
      if (!p.grounded || !this.contains(p.pos) || !touches(p.pos.x) || this.sheltered(p.pos, 0.2)) continue;
      fx.push[p.id].x += this.dir.x * C.pushSpeed * k;
    }

    const bothAir = game.players.every((p) => !p.grounded);
    if (!boxInside || this.boxShelter || bothAir || !touches(c.x)) return;
    fx.wetRate += C.wetRate * k;
    // Como el viento: de costado la tumba adelante/atrás; a lo largo del eje P1→P2, hacia un lado.
    fx.tilt.roll += C.leanDeg * k * (this.dir.x * box.axis.x);
    fx.tilt.pitch += C.leanDeg * k * (this.dir.x * box.forward.x);
  }
}

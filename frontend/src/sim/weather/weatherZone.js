// Zona de clima base: el área de una isla (su plataforma + CONFIG.weather.height de alto) con un ritmo legible.
// Cada tipo (rain.js / wind.js) solo define qué efectos produce (apply) y qué pasa al cambiar de fase.
//
// Fases: 'calm' → 'warn' → 'active' → 'calm'   (como los chorros de sim/hazards.js, pero con variación)
//   calm    clima suave (llovizna / brisa)
//   warn    aviso: se ve y se oye que viene (nube oscura, trueno / rachas, manga de viento)
//   active  lo fuerte (aguacero / ráfaga)
// `intensity` (0..1) sigue a la fase con rampas suaves: es lo que escalan los efectos y lo que dibuja la vista.
import { CONFIG } from '../../config.js';
import { containsPoint, makeAABB } from '../collision.js';
import { damp } from '../math.js';

export class WeatherZone {
  static type = 'rain';

  /**
   * @param {string} id
   * @param {object} platformDef  plataforma del nivel (su `id` y `weather`)
   * @param {{min, max}} aabb     AABB de la plataforma
   * @param {object} opts         ajustes de esta isla (pisan CONFIG.weather[type]), p. ej. { strength, dir, shelters }
   * @param {{next, range, chance}} rng
   */
  constructor(id, platformDef, aabb, opts, rng) {
    this.id = id;
    this.type = this.constructor.type;
    this.platformId = platformDef.id;
    this.opts = opts;
    this.rng = rng;
    const h = CONFIG.weather.height;
    this.area = makeAABB(aabb.min.x, aabb.max.y - 0.5, aabb.min.z, aabb.max.x, aabb.max.y + h, aabb.max.z);
    this.floorY = aabb.max.y;
    this.reset();
  }

  /** Números de este tipo con los ajustes de la isla encima. Se leen en vivo (panel de debug). */
  get C() {
    return { ...CONFIG.weather[this.type], ...this.opts };
  }

  /** Multiplicador de la isla (opts.strength): 0.5 = la mitad de fuerte. */
  get strength() {
    return this.opts.strength ?? 1;
  }

  reset() {
    this.phase = 'calm';
    this.changed = null; // fase a la que entró en este paso (o null)
    this.intensity = this.C[this.calmKey] ?? 0;
    this._phaseLen = this._calmTime(this.C) * this.rng.range(0.3, 1); // no todas las islas arrancan igual
    this.timer = this._phaseLen;
  }

  /** Clave de CONFIG para la intensidad en calma ('drizzle' / 'breeze'). */
  get calmKey() {
    return 'calm';
  }

  /** Avance 0..1 dentro de la fase actual (la vista anima avisos con esto). */
  get phaseT() {
    return this._phaseLen > 0 ? 1 - Math.max(0, this.timer) / this._phaseLen : 1;
  }

  _calmTime(C) {
    return Math.max(0.5, (C.period - C.warnTime - C.activeTime) * this.rng.range(0.8, 1.2));
  }

  update(dt) {
    const C = this.C;
    this.changed = null;
    this.timer -= dt;
    if (this.timer <= 0) {
      const next = this.phase === 'calm' ? 'warn' : this.phase === 'warn' ? 'active' : 'calm';
      this.phase = next;
      this.changed = next;
      this._phaseLen = next === 'warn' ? C.warnTime : next === 'active' ? C.activeTime * this.rng.range(0.8, 1.2) : this._calmTime(C);
      this.timer = this._phaseLen;
      this.onPhase(next);
    }
    const target = this.phase === 'active' ? 1 : this.phase === 'warn' ? C.warnLevel : (C[this.calmKey] ?? 0);
    this.intensity = damp(this.intensity, target, this.phase === 'active' ? 0.12 : 0.3, dt);
    this._c = C;
  }

  contains(p) {
    return containsPoint(this.area, p);
  }

  /** Hook al entrar en una fase (wind elige la dirección de la ráfaga en 'warn'). */
  onPhase() {}

  /** Suma sus efectos del paso a `fx` (ver WeatherService.update). */
  apply() {}
}

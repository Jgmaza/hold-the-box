// Servicio de clima: el ÚNICO punto de entrada de game.js al clima.
// Crea una zona por cada plataforma del nivel que tenga `weather`, las hace avanzar y junta sus efectos del paso.
//
// Agregar clima a una isla = poner el campo en su plataforma (nada más):
//   { id: 'isla-lluvia', x, z, w, d, top, weather: 'rain' }
//   { id: 'isla-viento', x, z, w, d, top, weather: { type: 'wind', dir: 'alternate', strength: 1 } }
//   ...waveIsland({ id: 'isla-olas', from, length })   oleaje + rompeolas (sections.js)
//
// update() devuelve los efectos del paso (game.js los aplica):
//   wetRate      %/s de mojado para la caja          (lluvia, ola)
//   drain        %/s de contenido que se lleva        (viento, huecos de la ventisca)
//   dry          %/s de mojado que quita              (viento; solo si nada moja a la caja)
//   tilt         { roll, pitch } grados extra caja    (viento, ola)
//   push         { 1: {x, z}, 2: {x, z} } m/s         (viento, ola)
//   gripMul      { 1, 2 } multiplicador de agarre     (lluvia: piso resbaloso)
//
// Eventos (en game.events), siempre de la zona donde está la caja:
//   weather:enter / weather:exit  { type, zone }
//   weather:warn                  { type, zone, dir }   aviso (se viene el aguacero / la ráfaga)
//   weather:start / weather:end   { type, zone, dir }   empieza / termina lo fuerte
//   weather:shelter               { type, zone, inside }  la caja entra / sale de una carpa (lluvia) o de detrás de un rompeolas (ola)
import { CONFIG } from '../../config.js';
import { makeRng } from '../math.js';
import { RainZone } from './rain.js';
import { WavesZone } from './waves.js';
import { WindZone } from './wind.js';

export const WEATHER_TYPES = { rain: RainZone, wind: WindZone, waves: WavesZone };

const PHASE_EVENT = { warn: 'weather:warn', active: 'weather:start', calm: 'weather:end' };

export class WeatherService {
  /**
   * @param {object} level  datos del nivel (usa level.platforms[].weather)
   * @param {{world, events, seed?}} deps
   */
  constructor(level, { world, events, seed = 1 }) {
    this.world = world;
    this.events = events;
    this.rng = makeRng((seed ^ 0x9e3779b9) >>> 0); // independiente del aleatorio de los NPCs
    this.zones = [];
    for (const s of world.statics) {
      const w = s.def.weather;
      if (!w) continue;
      const { type, ...opts } = typeof w === 'string' ? { type: w } : w;
      const Type = WEATHER_TYPES[type];
      if (!Type) throw new Error(`[clima] plataforma "${s.def.id}": clima "${type}" no existe (usa ${Object.keys(WEATHER_TYPES).join(' | ')})`);
      if (!s.def.id) throw new Error(`[clima] una plataforma con clima "${type}" necesita \`id\``);
      this.zones.push(new Type(`${type}-${s.def.id}`, s.def, s.aabb, opts, this.rng));
    }
    this.fx = { wetRate: 0, drain: 0, dry: 0, tilt: { roll: 0, pitch: 0 }, push: { 1: { x: 0, z: 0 }, 2: { x: 0, z: 0 } }, gripMul: { 1: 1, 2: 1 } };
    this.current = null; // zona donde está la caja
    this.sheltered = false; // la caja está bajo una carpa
  }

  /** Ciclos desde el principio (respawn, reintento, reinicio, teleport). */
  reset() {
    for (const z of this.zones) z.reset();
    this.current = null;
    this.sheltered = false;
    this._clear();
  }

  /** Zona de clima que contiene el punto (o null). */
  zoneAt(p) {
    return this.zones.find((z) => z.contains(p)) ?? null;
  }

  update(dt, game) {
    const fx = this._clear();
    if (!CONFIG.weather.enabled || !this.zones.length) {
      if (this.current) this._emit('weather:exit', this.current);
      this.current = null;
      return fx;
    }
    for (const z of this.zones) z.update(dt);

    const zone = game.box.dropped ? null : this.zoneAt(game.box.center);
    if (zone !== this.current) {
      if (this.current) this._emit('weather:exit', this.current);
      if (zone) this._emit('weather:enter', zone);
      this.current = zone;
    }
    if (zone?.changed) this._emit(PHASE_EVENT[zone.changed], zone);

    for (const z of this.zones) z.apply(dt, game, fx);

    // Carpas: avisar cuando la caja queda cubierta / descubierta.
    const covered = !!zone?.boxShelter;
    if (covered !== this.sheltered) {
      this.sheltered = covered;
      if (zone) this.events.emit('weather:shelter', { type: zone.type, zone: zone.id, inside: covered });
    }
    return fx;
  }

  _emit(name, zone) {
    this.events.emit(name, { type: zone.type, zone: zone.id, dir: zone.dir ? { ...zone.dir } : null });
  }

  _clear() {
    const fx = this.fx;
    fx.wetRate = fx.drain = fx.dry = 0;
    fx.tilt.roll = fx.tilt.pitch = 0;
    for (const id of [1, 2]) {
      fx.push[id].x = fx.push[id].z = 0;
      fx.gripMul[id] = 1;
    }
    return fx;
  }
}

// Audio de Luis (deliveries/luis/audio/). Si un archivo no existe, ese sonido simplemente no suena.
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { mixVolume, slotKind } from './audioPrefs.js';
import { AUDIO } from './deliveries.js';

/** La selva (aldea, templo y puente) comparte un tema. El muelle se queda con el suyo. */
export function musicSlotFor(levelId) {
  if (levelId === 'aldea' || levelId === 'templo' || levelId === 'puente') return 'musica-selva';
  return 'musica-loop';
}

const SLOTS = {
  'musica-loop': { volume: 1, loop: true },
  'musica-selva': { volume: 1, loop: true },
  'sfx-salto': { volume: 0.6 },
  'sfx-inclinacion': { volume: 0.7 },
  'sfx-mojado': { volume: 0.7 },
  'sfx-splash': { volume: 0.8 },
  'sfx-golpe': { volume: 0.8 },
  'sfx-maullido': { volume: 0.65 },
  'sfx-aranyo': { volume: 0.75 },
  'sfx-meta': { volume: 0.8 },
  'musica-victoria': { volume: 0.7 },
  'musica-derrota': { volume: 0.7 },
  'sfx-lluvia': { volume: 0.5, loop: true },
  'sfx-viento': { volume: 0.5, loop: true },
  'sfx-trueno': { volume: 0.8 },
  'sfx-olas': { volume: 0.5, loop: true },
  'sfx-ola': { volume: 0.85 },
  'sfx-mecha': { volume: 0.45 },
  'sfx-explosion': { volume: 0.85 },
};

const WEATHER_LOOP = { rain: 'sfx-lluvia', wind: 'sfx-viento', waves: 'sfx-olas' };

export class GameAudio {
  constructor(app) {
    this.app = app;
    this.entity = new pc.Entity('audio');
    this.entity.addComponent('sound', { positional: false });
    app.root.addChild(this.entity);
    this.available = new Set();
    this._wantMusic = false;
    this._musicName = 'musica-loop';

    for (const [name, opts] of Object.entries(SLOTS)) {
      const url = AUDIO[name];
      if (!url) continue;
      const asset = new pc.Asset(name, 'audio', { url });
      app.assets.add(asset);
      app.assets.load(asset);
      this.entity.sound.addSlot(name, { asset: asset.id, volume: this._level(name), loop: !!opts.loop, overlap: !opts.loop, autoPlay: false });
      this.available.add(name);
    }
  }

  _level(name, weather = 1) {
    return mixVolume(SLOTS[name].volume * weather, slotKind(name));
  }

  /** Aplica la mezcla actual (sliders). Si suben la música a media partida, el loop vuelve. */
  applyMix() {
    for (const name of this.available) {
      const slot = this.entity.sound.slot(name);
      if (slot) slot.volume = this._level(name);
    }
    this._resumeMusic();
  }

  /** El loop del nivel. Si falta el archivo de la selva, sigue el del muelle. */
  useLevel(level) {
    const pick = musicSlotFor(level?.id);
    this._musicName = this.available.has(pick) ? pick : 'musica-loop';
  }

  _resumeMusic() {
    if (!this._wantMusic || CONFIG.audio.music <= 0 || !this.available.has(this._musicName)) return;
    const loop = this.entity.sound.slot(this._musicName);
    if (!loop || loop.isPlaying) return;
    // Si todavía está cargando, no lo reinicies: play() cortaría la espera.
    if (!loop.isLoaded && loop.instances.length > 0) return;
    this.entity.sound.play(this._musicName);
  }

  _stopMusic() {
    for (const name of ['musica-loop', 'musica-selva']) this.stop(name);
  }

  play(name) {
    if (!this.available.has(name)) return;
    this._applyOne(name);
    if (this._level(name) <= 0) return;
    this.entity.sound.play(name);
  }

  _applyOne(name, weather = 1) {
    const slot = this.entity.sound.slot(name);
    if (slot) slot.volume = this._level(name, weather);
  }

  /** Si no hay archivo en deliveries/luis/audio/, suena un tono corto (sin copyright). */
  playOrTone(name, kind) {
    if (this.available.has(name)) this.play(name);
    else if (CONFIG.audio.sfx > 0) this._tone(kind);
  }

  _tone(kind) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!this._ctx) this._ctx = new Ctx();
    const ctx = this._ctx;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const sfx = Math.max(0, CONFIG.audio.sfx);
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    if (kind === 'beep' || kind === 'beepFast') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = kind === 'beepFast' ? 880 : 520;
      osc.connect(gain);
      gain.gain.setValueAtTime(0.05 * sfx, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.start(t);
      osc.stop(t + 0.07);
      return;
    }
    if (kind === 'boom') {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      src.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(0.22 * sfx, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      src.start(t);
      src.stop(t + 0.4);
      return;
    }
    if (kind === 'scratch') {
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.14), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1400;
      src.connect(filter);
      filter.connect(gain);
      gain.gain.setValueAtTime(0.12 * sfx, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      src.start(t);
      src.stop(t + 0.14);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.28);
    osc.connect(gain);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07 * sfx, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  stop(name) {
    if (this.available.has(name)) this.entity.sound.stop(name);
  }

  /** Al salir al menú: corta música y loops de la partida. */
  stopAll() {
    this._wantMusic = false;
    for (const name of this.available) this.entity.sound.stop(name);
  }

  /** Cada frame: la música sigue hasta ganar o perder, y el clima sube con su intensidad. */
  update(game) {
    if (game.state === 'playing' || game.state === 'paused' || game.state === 'failing') this._resumeMusic();
    const zone = game.weather.current;
    if (!zone) return;
    const name = WEATHER_LOOP[zone.type];
    if (!this.available.has(name)) return;
    const slot = this.entity.sound.slot(name);
    if (slot) slot.volume = this._level(name, 0.35 + 0.65 * zone.intensity);
  }

  /** Conecta los eventos del juego con los sonidos. `level` elige el loop (selva o muelle). */
  bind(events, level) {
    this.useLevel(level);
    events.on('game:start', () => {
      this.stop('musica-victoria');
      this.stop('musica-derrota');
      this._stopMusic();
      this._wantMusic = true;
      this.play(this._musicName);
    });
    events.on('player:jump', () => this.play('sfx-salto'));
    events.on('box:state', (e) => e.to === 'critical' && this.play('sfx-inclinacion'));
    events.on('cat:warn', () => this.playOrTone('sfx-maullido', 'meow'));
    events.on('cat:scratch', () => this.playOrTone('sfx-aranyo', 'scratch'));
    events.on('bomb:beep', (e) => this.playOrTone('sfx-mecha', e.health <= 10 ? 'beepFast' : 'beep'));
    events.on('bomb:explode', () => this.playOrTone('sfx-explosion', 'boom'));
    events.on('geyser:hit', () => this.play('sfx-mojado'));
    events.on('game:splash', () => this.play('sfx-splash'));
    events.on('hazard:hit', () => this.play('sfx-golpe'));
    events.on('npc:hit', (e) => this.play(e.difficulty === 'medium' ? 'sfx-mojado' : 'sfx-golpe'));
    // Clima: loop de la isla donde está la caja; trueno al avisar el aguacero.
    events.on('weather:enter', (e) => this.play(WEATHER_LOOP[e.type]));
    events.on('weather:exit', (e) => this.stop(WEATHER_LOOP[e.type]));
    events.on('weather:warn', (e) => e.type === 'rain' && this.play('sfx-trueno'));
    events.on('weather:start', (e) => e.type === 'waves' && this.play('sfx-ola'));
    events.on('game:respawn', () => Object.values(WEATHER_LOOP).forEach((n) => this.stop(n)));
    events.on('box:drop', () => this.play('sfx-golpe'));
    events.on('game:checkpoint', () => this.play('sfx-meta'));
    events.on('game:win', () => {
      this._wantMusic = false;
      this._stopMusic();
      this.play('sfx-meta');
      this.play('musica-victoria');
    });
    events.on('game:fail', () => {
      this._wantMusic = false;
      this._stopMusic();
      this.play('musica-derrota');
    });
    events.on('game:respawn', (e) => {
      if (e.retry) {
        this.stop('musica-derrota');
        this._wantMusic = true;
        this.play(this._musicName);
      }
    });
  }
}

// Vista completa: escena PlayCanvas que dibuja el estado de la simulación cada frame.
import * as pc from 'playcanvas';
import { BoxView } from './boxView.js';
import { FollowCamera } from './camera.js';
import { DEFAULT_CHARS, usesAlt } from './characters.js';
import { Gfx } from './gfx.js';
import { LevelView } from './levelView.js';
import { NpcViews } from './npcView.js';
import { Particles } from './particles.js';
import { PlayerView } from './playerView.js';
import { WeatherViews } from './weatherView.js';

// Qué salpica cuando un NPC le pega a la caja: contenido (se bota) y/o agua (se moja).
const NPC_HIT_COLORS = { easy: ['content'], medium: ['water'], hard: ['content', 'water'] };

export class GameView {
  /** @param {{ chars?: { p1: string, p2: string } }} opts  personajes escogidos en el menú */
  constructor(app, game, palette, { chars = DEFAULT_CHARS } = {}) {
    this.app = app;
    this.game = game;
    // Todo cuelga de esta raíz: al volver al menú se borra la partida entera.
    this.root = new pc.Entity('partida');
    app.root.addChild(this.root);
    this.gfx = new Gfx(app, palette, this.root);
    this.time = 0;

    this._setupScene();
    this.camera = new FollowCamera(app, this.gfx);
    this.level = new LevelView(this.gfx, game.world);
    this.particles = new Particles(this.gfx);
    this.particles.waterLevel = game.world.waterLevel;
    this.players = ['p1', 'p2'].map((slot) => new PlayerView(this.gfx, game[slot], { charId: chars[slot], alt: usesAlt(chars, slot) }));
    this.box = new BoxView(this.gfx, game.box, this.particles, game.cat, game.bomb);
    this.npcs = new NpcViews(this.gfx, game.npcs, this.particles, { theme: game.world.level.theme, biome: game.world.level.biome });
    this.weather = new WeatherViews(this.gfx, game.weather, { particles: this.particles, scene: app.scene, sun: this.sun, theme: game.world.level.theme });
    this._bind(game.events);
    this.camera.snap(game);
  }

  _setupScene() {
    const app = this.app;
    const g = this.gfx;
    const biome = this.game.world.level.biome;
    const fog = biome === 'mangrove' || biome === 'village' ? '#9bb89a' : biome === 'temple' ? '#c4b8a4' : biome === 'canyon' ? '#a8b8bc' : 'sky';
    app.scene.ambientLight = biome === 'mangrove' || biome === 'village' ? new pc.Color(0.42, 0.5, 0.42) : biome === 'temple' ? new pc.Color(0.52, 0.5, 0.46) : biome === 'canyon' ? new pc.Color(0.46, 0.5, 0.54) : new pc.Color(0.5, 0.55, 0.62);
    app.scene.fog.type = pc.FOG_LINEAR;
    app.scene.fog.color = g.color(fog);
    app.scene.fog.start = biome === 'village' || biome === 'temple' || biome === 'canyon' ? 62 : biome ? 32 : 45;
    app.scene.fog.end = biome === 'village' || biome === 'temple' || biome === 'canyon' ? 175 : biome ? 115 : 140;

    const sun = new pc.Entity('sol');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 0.97, 0.9),
      intensity: 1.15,
      castShadows: true,
      shadowDistance: 45,
      shadowResolution: 2048,
      shadowBias: 0.3,
      normalOffsetBias: 0.06,
      shadowIntensity: 0.75,
    });
    sun.setLocalEulerAngles(50, 25, 0);
    if (biome === 'village') {
      app.scene.ambientLight = new pc.Color(0.52, 0.48, 0.42);
      app.scene.fog.color = g.color('#d7e4d6');
      app.scene.fog.start = 62;
      app.scene.fog.end = 175;
      sun.light.color = new pc.Color(1, 0.9, 0.74);
      sun.light.intensity = 1.32;
      sun.setLocalEulerAngles(36, 52, 0);
    }
    this.root.addChild(sun);
    this.sun = sun;
  }

  _bind(events) {
    events.on('player:jump', (e) => this.players[e.player - 1].onJump());
    events.on('player:land', (e) => this.players[e.player - 1].onLand(e.speed));
    events.on('game:splash', (e) => {
      this.particles.burst(e.x, e.y, e.z, 28, { color: 'foam', speed: 3.5, up: 7 });
      this.particles.burst(e.x, e.y, e.z, 12, { color: 'water', speed: 2, up: 5 });
    });
    events.on('game:respawn', () => this.camera.snap(this.game));
    events.on('game:start', () => this.camera.snap(this.game));
    events.on('game:teleport', () => this.camera.snap(this.game));
    events.on('bomb:explode', () => {
      const c = this.game.box.center;
      this.particles.burst(c.x, c.y, c.z, 36, { color: 'danger', speed: 6, up: 8, life: 0.8, size: 0.16 });
      this.particles.burst(c.x, c.y, c.z, 18, { color: 'ui', speed: 4, up: 5, life: 0.6, size: 0.1 });
      this.camera.shake = 1.4;
    });
    events.on('cat:scratch', (e) => {
      const p = this.game.players[e.player - 1].pos;
      this.particles.burst(p.x, p.y + 1, p.z, 8, { color: 'danger', speed: 2.5, up: 2, life: 0.35, size: 0.06 });
      this.camera.shake = Math.max(this.camera.shake, 0.45);
    });
    events.on('hazard:hit', (e) => {
      const p = this.game.players[e.player - 1].pos;
      this.particles.burst(p.x, p.y + 0.6, p.z, 10, { color: 'ui', speed: 3, up: 3, life: 0.5, size: 0.1 });
      this.camera.shake = Math.max(this.camera.shake, 0.6);
    });
    events.on('box:impact', () => (this.camera.shake = Math.max(this.camera.shake, 0.4)));
    events.on('npc:hit', (e) => {
      for (const color of NPC_HIT_COLORS[e.difficulty]) this.particles.burst(e.x, e.y, e.z, 12, { color, speed: 3, up: 4, life: 0.7, size: 0.1 });
      this.camera.shake = Math.max(this.camera.shake, e.difficulty === 'hard' ? 0.8 : 0.4);
    });
    events.on('npc:splash', (e) => this.particles.burst(e.x, e.y + 0.05, e.z, 8, { color: 'foam', speed: 2, up: 3, life: 0.5, size: 0.08 }));
    events.on('box:drop', () => (this.camera.shake = 1));
    events.on('glass:break', (e) => {
      this.level.shatter(e.id);
      this.particles.burst(e.x, e.y, e.z, 14, { color: 'foam', speed: 3, up: 2.4, life: 0.65, size: 0.07 });
      this.camera.shake = Math.max(this.camera.shake, 0.35);
    });
    events.on('glass:restore', () => this.level.restoreGlass());
    events.on('game:checkpoint', () => {
      const c = this.game.box.center;
      this.particles.burst(c.x, c.y + 0.5, c.z, 24, { color: 'goal', speed: 3, up: 6, life: 1, size: 0.12 });
    });
    events.on('game:win', () => {
      const c = this.game.box.center;
      for (const color of ['goal', 'ui', 'danger', 'p2']) this.particles.burst(c.x, c.y + 1, c.z, 18, { color, speed: 5, up: 9, life: 1.6, size: 0.15 });
    });
  }

  destroy() {
    this.root.destroy();
    this.level.destroy();
    this.gfx.destroy();
  }

  update(dt) {
    this.time += dt;
    const game = this.game;
    this.camera.update(dt, game);
    const camPos = this.camera.entity.getPosition();
    this.level.update(dt, game.time, game, camPos);
    this.players[0].update(dt, game.p2, camPos, game.box);
    this.players[1].update(dt, game.p1, camPos, game.box);
    this.box.update(dt, this.time);
    this.npcs.update(dt, this.time, camPos);
    this.weather.update(dt, this.time, game, camPos);
    this.particles.update(dt);
  }
}

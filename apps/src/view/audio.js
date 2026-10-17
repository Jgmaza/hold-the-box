// Audio de Luis (deliveries/luis/audio/). Si un archivo no existe, ese sonido simplemente no suena.
import * as pc from 'playcanvas';
import { AUDIO } from './deliveries.js';

const SLOTS = {
  'musica-loop': { volume: 0.35, loop: true },
  'sfx-salto': { volume: 0.6 },
  'sfx-inclinacion': { volume: 0.7 },
  'sfx-mojado': { volume: 0.7 },
  'sfx-splash': { volume: 0.8 },
  'sfx-golpe': { volume: 0.8 },
  'sfx-meta': { volume: 0.8 },
  'musica-victoria': { volume: 0.7 },
  'musica-derrota': { volume: 0.7 },
};

export class GameAudio {
  constructor(app) {
    this.app = app;
    this.entity = new pc.Entity('audio');
    this.entity.addComponent('sound', { positional: false });
    app.root.addChild(this.entity);
    this.available = new Set();

    for (const [name, opts] of Object.entries(SLOTS)) {
      const url = AUDIO[name];
      if (!url) continue;
      const asset = new pc.Asset(name, 'audio', { url });
      app.assets.add(asset);
      app.assets.load(asset);
      this.entity.sound.addSlot(name, { asset: asset.id, volume: opts.volume, loop: !!opts.loop, overlap: !opts.loop, autoPlay: false });
      this.available.add(name);
    }
  }

  play(name) {
    if (this.available.has(name)) this.entity.sound.play(name);
  }

  stop(name) {
    if (this.available.has(name)) this.entity.sound.stop(name);
  }

  /** Conecta los eventos del juego con los sonidos. */
  bind(events) {
    events.on('game:start', () => {
      this.stop('musica-victoria');
      this.stop('musica-derrota');
      this.stop('musica-loop');
      this.play('musica-loop');
    });
    events.on('player:jump', () => this.play('sfx-salto'));
    events.on('box:state', (e) => e.to === 'critical' && this.play('sfx-inclinacion'));
    events.on('geyser:hit', () => this.play('sfx-mojado'));
    events.on('game:splash', () => this.play('sfx-splash'));
    events.on('hazard:hit', () => this.play('sfx-golpe'));
    events.on('box:drop', () => this.play('sfx-golpe'));
    events.on('game:checkpoint', () => this.play('sfx-meta'));
    events.on('game:win', () => {
      this.stop('musica-loop');
      this.play('sfx-meta');
      this.play('musica-victoria');
    });
    events.on('game:fail', () => {
      this.stop('musica-loop');
      this.play('musica-derrota');
    });
    events.on('game:respawn', (e) => {
      if (e.retry) {
        this.stop('musica-derrota');
        this.play('musica-loop');
      }
    });
  }
}

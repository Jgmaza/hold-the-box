// Demo en bucle para /gameplay: partida sin menú, dos bots caminan el nivel `demo`.
import * as pc from 'playcanvas';
import { CONFIG, selectBox } from './config.js';
import { createAutopilot } from './demo/autopilot.js';
import { LEVELS } from './levels/index.js';
import { buildPalette } from './palette.js';
import { Game } from './sim/game.js';
import { loadAudioPrefs } from './view/audioPrefs.js';
import { GameAudio } from './view/audio.js';
import { DEFAULT_CHARS } from './view/characters.js';
import { PALETTE_MD, reportDeliveries } from './view/deliveries.js';
import { GameView } from './view/gameView.js';

const canvas = document.getElementById('app');
const app = new pc.Application(canvas, {
  graphicsDeviceOptions: { antialias: true, alpha: false },
});
app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio, 2);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
window.addEventListener('resize', () => app.resizeCanvas());

const palette = buildPalette(PALETTE_MD);
reportDeliveries();
loadAudioPrefs();

CONFIG.debug.godMode = true; // la demo no debe cortarse en fallos raros
selectBox('vip');

const params = new URLSearchParams(location.search);
const seed = params.has('seed') ? Number(params.get('seed')) : 42;
const game = new Game(LEVELS.demo, { seed });
const view = new GameView(app, game, palette, { chars: { ...DEFAULT_CHARS } });
const audio = new GameAudio(app);
audio.bind(game.events, game.level);
const bots = createAutopilot();

game.start();
window.game = game;
window.audio = audio;

const badge = document.getElementById('demo-badge');
const setBadge = (t) => {
  if (badge) badge.textContent = t;
};

app.on('update', (dt) => {
  const [a, b] = bots.frame(game, dt);
  game.setInputs(a, b);
  game.update(dt);
  view.update(dt);

  if (game.state === 'won') setBadge('¡META! Reiniciando…');
  else if (game.state === 'failed') setBadge('Ups… reintentando…');
  else setBadge('Hold the Box · demo en bucle');
});

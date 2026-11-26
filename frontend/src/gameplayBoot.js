// Demo en bucle para /gameplay: rota muelle → aldea → campamento al ganar (o por tiempo).
import * as pc from 'playcanvas';
import { CONFIG, selectBox } from './config.js';
import { DEMO_ROTATION, createAutopilot, nextDemoMap } from './demo/autopilot.js';
import { LEVELS } from './levels/index.js';
import { buildPalette } from './palette.js';
import { Game } from './sim/game.js';
import { loadAudioPrefs } from './view/audioPrefs.js';
import { GameAudio } from './view/audio.js';
import { DEFAULT_CHARS } from './view/characters.js';
import { PALETTE_MD, reportDeliveries } from './view/deliveries.js';
import { GameView } from './view/gameView.js';

const MAX_LEVEL_SEC = 75; // si se atascan, igual pasan al siguiente mapa

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

CONFIG.debug.godMode = true;
selectBox('vip');

const params = new URLSearchParams(location.search);
const seedBase = params.has('seed') ? Number(params.get('seed')) : 42;
const startKey = DEMO_ROTATION.includes(params.get('level')) ? params.get('level') : DEMO_ROTATION[0];

const audio = new GameAudio(app);
const bots = createAutopilot({ endHoldSec: 2.4 });
window.audio = audio;

const badge = document.getElementById('demo-badge');
const setBadge = (t) => {
  if (badge) badge.textContent = t;
};

/** @type {{ game: import('./sim/game.js').Game, view: import('./view/gameView.js').GameView, key: string, played: number } | null} */
let run = null;

function loadLevel(key) {
  if (run) {
    run.view.destroy();
    audio.stopAll();
  }
  const level = LEVELS[key] ?? LEVELS.muelle;
  const game = new Game(level, { seed: (seedBase + DEMO_ROTATION.indexOf(key) * 17) >>> 0 });
  const view = new GameView(app, game, palette, { chars: { ...DEFAULT_CHARS } });
  audio.bind(game.events, game.level);
  game.start();
  bots.reset();
  run = { game, view, key, played: 0 };
  window.game = game;
  setBadge(`${level.name} · demo en bucle`);
}

loadLevel(startKey);

app.on('update', (dt) => {
  if (!run) return;
  const { game, view } = run;
  run.played += dt;

  const [a, b, meta] = bots.frame(game, dt);
  game.setInputs(a, b);
  game.update(dt);
  view.update(dt);
  audio.update?.(game);

  const levelName = game.level?.name ?? run.key;
  if (game.state === 'won') setBadge(`¡META! · ${levelName} → siguiente…`);
  else if (game.state === 'failed') setBadge(`Ups… · ${levelName}`);
  else setBadge(`${levelName} · demo en bucle`);

  // Al ganar (tras el hold del autopilot) o si se pasan del tiempo: cambiar de mapa.
  const timedOut = game.state === 'playing' && run.played >= MAX_LEVEL_SEC;
  if (meta?.advance || timedOut) {
    loadLevel(nextDemoMap(run.key));
  }
});

app.start();

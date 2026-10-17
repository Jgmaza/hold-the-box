// Arranque: PlayCanvas + simulación + vista + UI + audio. Orden de cada frame:
//   teclas globales → input de jugadores → simulación (paso fijo) → vista → UI
import * as pc from 'playcanvas';
import { BOX_CHOICES, selectBox } from './config.js';
import { Input } from './input.js';
import { DEFAULT_LEVEL, LEVELS } from './levels/index.js';
import { buildPalette } from './palette.js';
import { Game } from './sim/game.js';
import { UI } from './ui/ui.js';
import { GameAudio } from './view/audio.js';
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
if (palette._custom.length) console.info('[paleta] colores de Luis:', palette._custom.join(', '));
reportDeliveries();

// ?level=npcs abre la arena de NPCs · ?seed=N repite el mismo azar (NPCs).
const params = new URLSearchParams(location.search);
const level = LEVELS[params.get('level')] ?? LEVELS[DEFAULT_LEVEL];
const seed = params.has('seed') ? Number(params.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
const game = new Game(level, { seed });
const view = new GameView(app, game, palette);
const ui = new UI(document.getElementById('ui'), game, palette);
const audio = new GameAudio(app);
audio.bind(game.events);
const input = new Input(window);

let debug = null;
const openDebug = async () => {
  if (debug) return debug.toggle();
  const { DebugPanel } = await import('./debug.js');
  debug = new DebugPanel(game);
};
if (params.has('debug')) openDebug();

function globalKeys() {
  const s = game.state;
  if (input.wasPressed(['KeyP', 'Escape']) && (s === 'playing' || s === 'paused')) game.togglePause();
  else if (input.wasPressed('Escape') && (s === 'failed' || s === 'won')) game.restart();
  if (input.wasPressed('KeyR')) {
    if (s === 'failed') game.retry();
    else if (s === 'paused' || s === 'won') game.restart();
  }
  if (s === 'title') {
    if (input.wasPressed('Digit1')) selectBox(BOX_CHOICES[0].id);
    if (input.wasPressed('Digit2')) selectBox(BOX_CHOICES[1].id);
    if (BOX_CHOICES[2] && input.wasPressed('Digit3')) selectBox(BOX_CHOICES[2].id);
  }
  if (input.wasPressed(['F2', 'Backquote'])) openDebug();
}

app.on('update', (dt) => {
  globalKeys();
  game.setInputs(input.player('p1'), input.player('p2'));
  game.update(dt);
  view.update(dt);
  ui.update(dt);
  debug?.update();
  input.endFrame();
});

app.start();

// Para depurar desde la consola del navegador: window.game.box, window.game.teleport(1)...
window.game = game;
window.app = app;

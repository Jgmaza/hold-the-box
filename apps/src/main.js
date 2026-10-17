// Arranque: PlayCanvas + menú + partida (simulación + vista + UI) + audio.
//   Menú (ui/menu.js + view/menuStage.js) → startRun(selección) → partida → backToMenu() borra la partida.
// Orden de cada frame en partida: teclas globales → input de jugadores → simulación (paso fijo) → vista → UI
// ?level=<clave> salta el menú y entra directo a ese nivel (también ?level=npcs&debug).
import * as pc from 'playcanvas';
import { CONFIG, selectBox } from './config.js';
import { Input } from './input.js';
import { DEFAULT_LEVEL, LEVELS, MAPS } from './levels/index.js';
import { buildPalette } from './palette.js';
import { Game } from './sim/game.js';
import { Menu } from './ui/menu.js';
import { UI } from './ui/ui.js';
import { GameAudio } from './view/audio.js';
import { DEFAULT_CHARS } from './view/characters.js';
import { PALETTE_MD, reportDeliveries } from './view/deliveries.js';
import { GameView } from './view/gameView.js';
import { MenuStage } from './view/menuStage.js';

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

// ?seed=N repite el mismo azar (NPCs y clima).
const params = new URLSearchParams(location.search);
const newSeed = () => (params.has('seed') ? Number(params.get('seed')) : (Math.random() * 2 ** 32) >>> 0);

const audio = new GameAudio(app);
const input = new Input(window);
const uiRoot = document.getElementById('ui');
const stage = new MenuStage(app, palette);
const menu = new Menu(document.getElementById('menu'), {
  stage,
  maps: MAPS,
  palette,
  initial: { box: CONFIG.box.profile, ...DEFAULT_CHARS },
  onStart: (sel) => startRun(sel),
});

/** Partida en curso: { game, view, ui } o null mientras se está en el menú. */
let run = null;

let debug = null;
let wantDebug = params.has('debug');
const openDebug = async () => {
  if (!run) return;
  if (debug) return debug.toggle();
  wantDebug = true;
  const { DebugPanel } = await import('./debug.js');
  if (run && !debug) debug = new DebugPanel(run.game);
};

function startRun({ level, box, chars }) {
  endRun();
  selectBox(box);
  const game = new Game(LEVELS[level] ?? LEVELS[DEFAULT_LEVEL], { seed: newSeed() });
  const view = new GameView(app, game, palette, { chars });
  const ui = new UI(uiRoot, game, palette, { onMenu: backToMenu });
  audio.bind(game.events);
  run = { game, view, ui };
  menu.show(false);
  stage.show(false);
  game.start(); // el "listos" ya pasó en el menú
  if (wantDebug) openDebug();
  // Para depurar desde la consola del navegador: window.game.box, window.game.teleport(1)...
  window.game = game;
}

function endRun() {
  if (!run) return;
  debug?.destroy();
  debug = null;
  run.ui.destroy();
  run.view.destroy();
  audio.stopAll();
  run = null;
  window.game = null;
}

function backToMenu() {
  endRun();
  stage.show(true);
  menu.open('map');
}

function globalKeys(game) {
  const s = game.state;
  if (input.wasPressed(['KeyP', 'Escape']) && (s === 'playing' || s === 'paused')) game.togglePause();
  else if (input.wasPressed('Escape') && (s === 'failed' || s === 'won')) game.restart();
  if (input.wasPressed('KeyR')) {
    if (s === 'failed') game.retry();
    else if (s === 'paused' || s === 'won') game.restart();
  }
  if (input.wasPressed('KeyM') && (s === 'paused' || s === 'failed' || s === 'won')) return backToMenu();
  if (input.wasPressed(['F2', 'Backquote'])) openDebug();
}

app.on('update', (dt) => {
  if (run) {
    const { game, view, ui } = run;
    globalKeys(game);
    if (run) {
      game.setInputs(input.player('p1'), input.player('p2'));
      game.update(dt);
      view.update(dt);
      ui.update(dt);
      audio.update(game);
      debug?.update();
    }
  } else {
    menu.update(dt, input);
    stage.update(dt);
  }
  input.endFrame();
});

if (params.has('level')) {
  startRun({ level: params.get('level'), box: CONFIG.box.profile, chars: DEFAULT_CHARS });
}

app.start();

window.app = app;

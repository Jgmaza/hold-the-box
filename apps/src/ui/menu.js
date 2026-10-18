// Menú del juego en HTML encima de la escena 3D del menú (view/menuStage.js).
//   Inicio → Mapa + caja → Personajes (cada uno escoge y marca LISTO) → 3, 2, 1 → onStart(selección)
// Todo se puede con mouse o teclado. Esc = atrás.
import { BOX_CHOICES, selectBox } from '../config.js';
import { CHARACTERS, character } from '../view/characters.js';
import { ArcadeOverlay } from './arcade.js';
import { MenuState } from './menuState.js';
import './theme.css';
import './menu.css';

const BOX_ICON = { vip: '📦', gato: '🐱', bomba: '💣' };

const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  ok: ['Space', 'Enter', 'NumpadEnter'],
};
// En la pantalla de personajes cada jugador usa sus teclas.
const SLOT_KEYS = {
  p1: { left: ['KeyA'], right: ['KeyD'], ok: ['Space'] },
  p2: { left: ['ArrowLeft'], right: ['ArrowRight'], ok: ['Enter', 'NumpadEnter'] },
};

const HOME_ACTS = ['play', 'scores', 'controls'];

export class Menu {
  /**
   * @param {HTMLElement} root
   * @param {{ stage: import('../view/menuStage.js').MenuStage, maps: object[], palette: object,
   *           initial?: object, onStart: (sel: {level: string, box: string, chars: {p1: string, p2: string}}) => void }} opts
   */
  constructor(root, { stage, maps, palette, initial, onStart }) {
    this.root = root;
    this.stage = stage;
    this.onStart = onStart;
    for (const k of ['ui', 'danger', 'goal', 'water', 'box', 'p2']) root.style.setProperty(`--${k}`, palette[k]);
    this.state = new MenuState({ maps, boxes: BOX_CHOICES, characters: CHARACTERS, initial });
    this.homeFocus = 0;
    this.mapRow = 0; // 0 = mapas, 1 = cajas
    this.overlay = false;
    this._count = null;

    root.innerHTML = TEMPLATE;
    this.$ = (sel) => root.querySelector(sel);
    this.arcade = new ArcadeOverlay(root);
    this._buildMaps(maps);
    this._buildBoxes();
    this._bindClicks();
    selectBox(this.state.box);
    this._syncStage(true);
    this.show(true);
  }

  // ---------------------------------------------------------------- construcción

  _buildMaps(maps) {
    const wrap = this.$('.m-maps');
    for (const m of maps) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'm-map';
      card.dataset.level = m.key;
      const stars = '★'.repeat(m.difficulty) + '☆'.repeat(3 - m.difficulty);
      card.innerHTML = `
        <span class="m-map-icon">${m.icon}</span>
        <span class="m-map-tag">${m.tag}</span>
        <b>${m.name}</b>
        <span class="m-stars" title="Dificultad">${stars}</span>
        <span class="m-map-blurb">${m.blurb}</span>`;
      wrap.appendChild(card);
    }
  }

  _buildBoxes() {
    const wrap = this.$('.m-boxes');
    for (const b of BOX_CHOICES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'm-box';
      btn.dataset.box = b.id;
      btn.innerHTML = `<span class="m-box-icon">${BOX_ICON[b.id] ?? '📦'}</span><b>${b.name}</b><span>${b.blurb}</span>`;
      wrap.appendChild(btn);
    }
  }

  _bindClicks() {
    // Que un clic no deje el foco en el botón (si no, Espacio/Enter lo volverían a pulsar).
    this.root.addEventListener('mousedown', (e) => e.target.closest('button') && e.preventDefault());
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('button');
      if (!el || el.disabled) return;
      if (el.dataset.act) return this._act(el.dataset.act);
      if (el.dataset.level) return this._setLevel(el.dataset.level);
      if (el.dataset.box) return this._setBox(el.dataset.box);
      if (el.dataset.dir) return this._stepChar(el.dataset.slot, Number(el.dataset.dir));
      if (el.dataset.ready) return this._toggleReady(el.dataset.ready);
    });
    for (const [i, act] of HOME_ACTS.entries()) {
      this.$(`[data-act="${act}"]`).addEventListener('mouseenter', () => {
        this.homeFocus = i;
        this._render();
      });
    }
  }

  // ---------------------------------------------------------------- acciones

  _act(act) {
    const s = this.state;
    if (act === 'play') s.go('map');
    else if (act === 'scores') return this.arcade.showBoard();
    else if (act === 'controls') this.overlay = true;
    else if (act === 'close') this.overlay = false;
    else if (act === 'back') s.back();
    else if (act === 'next') s.go('chars');
    else if (act === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    }
    this._syncStage();
  }

  _setLevel(key) {
    this.state.setLevel(key);
    this.mapRow = 0;
    this._render();
  }

  _setBox(id) {
    const before = this.state.box;
    this.state.setBox(id);
    this.mapRow = 1;
    if (this.state.box !== before) {
      selectBox(this.state.box);
      this.stage.bumpBox();
    }
    this._render();
  }

  _stepChar(slot, dir) {
    if (this.state.stepChar(slot, dir)) this._syncStage();
  }

  _toggleReady(slot) {
    this.state.toggleReady(slot);
    this._syncStage();
  }

  /** Pasa el estado a la escena 3D (personajes, LISTO, encuadre) y repinta. */
  _syncStage(instant = false) {
    const s = this.state;
    this.stage.setScreen(s.screen);
    for (const slot of ['p1', 'p2']) {
      this.stage.setChar(slot, s.chars[slot].id, s.alt(slot), { instant });
      this.stage.setReady(slot, s.screen === 'chars' && s.chars[slot].ready);
    }
    this._render();
  }

  // ---------------------------------------------------------------- mostrar

  show(on) {
    this.visible = on;
    this.root.classList.toggle('on', on);
    if (on) this._syncStage(true);
  }

  /** Volver al menú tras una partida: directo al selector de mapas. */
  open(screen = 'map') {
    this.state.go(screen);
    this.overlay = false;
    this.show(true);
  }

  _render() {
    const s = this.state;
    for (const el of this.root.querySelectorAll('.m-screen')) el.classList.toggle('on', el.dataset.screen === s.screen);
    this.$('.m-overlay').classList.toggle('on', this.overlay && s.screen === 'home');
    HOME_ACTS.forEach((act, i) => this.$(`[data-act="${act}"]`).classList.toggle('focus', !this.overlay && i === this.homeFocus));

    for (const el of this.root.querySelectorAll('.m-map')) el.classList.toggle('on', el.dataset.level === s.level);
    for (const el of this.root.querySelectorAll('.m-box')) el.classList.toggle('on', el.dataset.box === s.box);
    this.$('.m-maps').classList.toggle('focus', this.mapRow === 0);
    this.$('.m-boxes').classList.toggle('focus', this.mapRow === 1);

    for (const slot of ['p1', 'p2']) {
      const c = s.chars[slot];
      const panel = this.$(`.m-slot[data-slot="${slot}"]`);
      const def = character(c.id);
      panel.classList.toggle('ready', c.ready);
      panel.classList.toggle('alt', s.alt(slot));
      panel.querySelector('.m-char-name').textContent = def.name;
      panel.querySelector('.ready-btn').textContent = c.ready ? '✔ ¡LISTO!' : 'LISTO';
      for (const b of panel.querySelectorAll('[data-dir]')) b.disabled = c.ready;
    }
    this._renderCount();
  }

  _renderCount() {
    const el = this.$('.m-count');
    const n = this.state.countdown === null ? null : Math.ceil(this.state.countdown);
    if (n === this._count) return;
    this._count = n;
    el.textContent = n ?? '';
    el.classList.remove('pop');
    if (n === null) return;
    void el.offsetWidth;
    el.classList.add('pop');
  }

  /** Paneles de cada jugador debajo de su pedestal (la cámara del menú se ajusta al tamaño de pantalla). */
  _layoutSlots() {
    if (this.state.screen !== 'chars') return;
    for (const slot of ['p1', 'p2']) {
      const p = this.stage.anchor(slot);
      const el = this.$(`.m-slot[data-slot="${slot}"]`);
      el.style.left = `${p.x.toFixed(1)}px`;
      el.style.top = `${p.y.toFixed(1)}px`;
    }
  }

  // ---------------------------------------------------------------- teclado (cada frame)

  update(dt, input) {
    if (!this.visible) return;
    const s = this.state;
    const hit = (codes) => input.wasPressed(codes);

    if (hit('Escape')) {
      if (this.overlay) this.overlay = false;
      else s.back();
      this._syncStage();
    } else if (s.screen === 'home') {
      this._homeKeys(hit);
    } else if (s.screen === 'map') {
      this._mapKeys(hit);
    } else if (s.screen === 'chars') {
      for (const slot of ['p1', 'p2']) {
        const k = SLOT_KEYS[slot];
        if (hit(k.left)) this._stepChar(slot, -1);
        if (hit(k.right)) this._stepChar(slot, 1);
        if (hit(k.ok)) this._toggleReady(slot);
      }
      if (s.tick(dt)) return this._start();
      this._renderCount();
    }
    this._layoutSlots();
  }

  _homeKeys(hit) {
    if (this.overlay) {
      if (hit(KEYS.ok)) this._act('close');
      return;
    }
    const n = HOME_ACTS.length;
    if (hit(KEYS.up)) this.homeFocus = (this.homeFocus + n - 1) % n;
    if (hit(KEYS.down)) this.homeFocus = (this.homeFocus + 1) % n;
    if (hit(KEYS.ok)) return this._act(HOME_ACTS[this.homeFocus]);
    if (hit([...KEYS.up, ...KEYS.down])) this._render();
  }

  _mapKeys(hit) {
    if (hit(KEYS.up) || hit(KEYS.down)) {
      this.mapRow = 1 - this.mapRow;
      this._render();
    }
    const dir = hit(KEYS.left) ? -1 : hit(KEYS.right) ? 1 : 0;
    if (dir && this.mapRow === 0) {
      this.state.stepLevel(dir);
      this._render();
    } else if (dir) {
      const i = BOX_CHOICES.findIndex((b) => b.id === this.state.box);
      this._setBox(BOX_CHOICES[(i + dir + BOX_CHOICES.length) % BOX_CHOICES.length].id);
    }
    if (hit(KEYS.ok)) this._act('next');
  }

  _start() {
    this.show(false);
    this.onStart(this.state.selection());
  }
}

const slotPanel = (slot, keys) => /* html */ `
  <div class="m-slot" data-slot="${slot}">
    <span class="m-badge">${slot.toUpperCase()}</span>
    <div class="m-picker">
      <button type="button" class="btn icon light" data-slot="${slot}" data-dir="-1" aria-label="Anterior">◀</button>
      <div class="m-char"><b class="m-char-name"></b><span class="m-alt">color alterno</span></div>
      <button type="button" class="btn icon light" data-slot="${slot}" data-dir="1" aria-label="Siguiente">▶</button>
    </div>
    <button type="button" class="btn ready-btn" data-ready="${slot}">LISTO</button>
    <p class="m-keys">${keys}</p>
  </div>`;

/** Tarjeta de un jugador en el panel de controles: teclas de mover en T + tecla de saltar. */
const padCard = (slot, title, move, jump) => /* html */ `
  <article class="m-pad ${slot}">
    <header><span class="m-badge">${slot.toUpperCase()}</span><b>${title}</b></header>
    <div class="m-keyrow">
      <div class="m-keys-t">${move.map((k) => (k ? `<kbd>${k}</kbd>` : '<i></i>')).join('')}</div>
      <span class="m-action">Mover</span>
    </div>
    <div class="m-keyrow">
      <kbd class="wide">${jump}</kbd>
      <span class="m-action">Saltar</span>
    </div>
  </article>`;

const TEMPLATE = /* html */ `
  <section class="m-screen m-home-screen" data-screen="home">
    <button type="button" class="btn icon light m-fullscreen" data-act="fullscreen" aria-label="Pantalla completa">⛶</button>
    <div class="m-home-col">
      <div class="m-logo-wrap">
        <div class="m-rays"></div>
        <div class="m-logo">
          <span class="l1">NO SUELTES</span>
          <span class="l2">LA CAJA</span>
        </div>
      </div>
      <nav class="m-home">
        <button type="button" class="btn big" data-act="play"><span class="ico">▶</span>Jugar</button>
        <button type="button" class="btn light" data-act="scores"><span class="ico">🏆</span>Records</button>
        <button type="button" class="btn light" data-act="controls"><span class="ico">🎮</span>Controles</button>
      </nav>
      <p class="m-hint"><kbd>↑</kbd><kbd>↓</kbd> elegir · <kbd>Espacio</kbd> / <kbd>Enter</kbd> aceptar</p>
    </div>
    <footer class="m-credit">Game Jam 2026 · Better Together</footer>

    <div class="m-overlay">
      <div class="m-panel m-controls">
        <header class="m-panel-head">
          <h2>Controles</h2>
          <p>Los dos juegan en el mismo teclado</p>
        </header>
        <div class="m-pads">
          ${padCard('p1', 'Jugador 1', ['', 'W', '', 'A', 'S', 'D'], 'Espacio')}
          ${padCard('p2', 'Jugador 2', ['', '↑', '', '←', '↓', '→'], 'Enter')}
        </div>
        <section class="m-section">
          <h3>En partida</h3>
          <div class="m-chips">
            <span class="m-chip"><kbd>P</kbd><kbd>Esc</kbd>Pausa</span>
            <span class="m-chip"><kbd>R</kbd>Reiniciar</span>
            <span class="m-chip"><kbd>M</kbd>Menú</span>
          </div>
        </section>
        <section class="m-section">
          <h3>Cómo se juega</h3>
          <div class="m-tips">
            <div class="m-tip"><span class="m-tip-icon">🤝</span><b>Al mismo ritmo</b><span>Caminen juntos: la caja va derecha y más rápido.</span></div>
            <div class="m-tip"><span class="m-tip-icon">⤴</span><b>Salten juntos</b><span>Si se inclina, gotea por el huequito.</span></div>
            <div class="m-tip"><span class="m-tip-icon">🏁</span><b>Hasta la META</b><span>Sin mojarla y sin dejarla caer.</span></div>
          </div>
        </section>
        <button type="button" class="btn go" data-act="close">¡Entendido!</button>
      </div>
    </div>
  </section>

  <section class="m-screen m-dim" data-screen="map">
    <header class="m-head">
      <button type="button" class="btn icon light" data-act="back" aria-label="Atrás">◀</button>
      <h2>Elige el mapa</h2>
    </header>
    <div class="m-maps"></div>
    <h3 class="m-sub">¿Qué caja llevan?</h3>
    <div class="m-boxes"></div>
    <footer class="m-foot">
      <p class="m-hint"><kbd>←</kbd><kbd>→</kbd> cambiar · <kbd>↑</kbd><kbd>↓</kbd> mapa / caja · <kbd>Esc</kbd> atrás</p>
      <button type="button" class="btn big go" data-act="next">Siguiente ▶</button>
    </footer>
  </section>

  <section class="m-screen" data-screen="chars">
    <header class="m-head">
      <button type="button" class="btn icon light" data-act="back" aria-label="Atrás">◀</button>
      <h2>Elige tu personaje</h2>
    </header>
    ${slotPanel('p1', '<kbd>A</kbd><kbd>D</kbd> cambiar · <kbd>Espacio</kbd> listo')}
    ${slotPanel('p2', '<kbd>←</kbd><kbd>→</kbd> cambiar · <kbd>Enter</kbd> listo')}
    <div class="m-count"></div>
    <p class="m-hint m-chars-hint">Los dos en LISTO para arrancar</p>
  </section>
`;

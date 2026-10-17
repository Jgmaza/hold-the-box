// UI de la partida en HTML encima del canvas. Solo ESCUCHA a la simulación (eventos + lectura de estado).
// El título / selección vive en ui/menu.js. Zharick: el contrato está en apps/README.md (sección UI).
import { CONFIG } from '../config.js';
import './theme.css';
import './ui.css';

const TIPS = {
  dropped: 'Tip: si la caja se pone roja, frenen un momento y muévanse al mismo ritmo.',
  empty: 'Tip: el huequito gotea cuando la caja va inclinada. Caminen juntos y salten juntos.',
  soaked: 'Tip: esperen a que los chorros se apaguen (burbujas = va a salir agua) y no se caigan al agua.',
  exploded: 'Tip: la mecha no espera. Crucen juntos antes de que llegue a cero.',
};

const fmtTime = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
};
const fmtClock = (t) => {
  const s = Math.ceil(Math.max(0, t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Causa del golpe → texto del aviso con la caja bomba.
const BOMB_HIT = {
  landing: '¡Golpe!',
  sweeper: '¡Rodillo!',
  fall: '¡Al agua!',
  'npc-easy': '¡Pellizco!',
  'npc-medium': '¡Chorro!',
  'npc-hard': '¡Embestida!',
};

const STATE_LABEL = { upright: 'ESTABLE', tilting: 'INCLINADA', critical: '¡SE CAE!' };

// Indicador de clima (mientras la caja está en una isla con clima) y avisos.
const arrow = (dir) => (dir && dir.x < 0 ? '←' : '→');
const WEATHER_CHIP = {
  rain: { calm: () => '🌧 LLUVIA', warn: () => '⛈ ¡SE VIENE EL AGUACERO!', active: () => '⛈ AGUACERO · ¡al techo!' },
  wind: { calm: () => '🍃 VIENTO', warn: (d) => `💨 RÁFAGA ${arrow(d)}`, active: (d) => `💨 ¡RÁFAGA! ${arrow(d)}` },
  waves: { calm: () => '🌊 OLEAJE', warn: (d) => `🌊 ¡SE VIENE LA OLA! ${arrow(d)}`, active: (d) => `🌊 ¡OLA! ${arrow(d)} · rompeolas o salten` },
};
// Texto del chip cuando la caja está cubierta (carpa / rompeolas).
const WEATHER_SAFE = { rain: '☂ A SALVO BAJO LA CARPA', waves: '🪨 A SALVO TRAS EL ROMPEOLAS' };
const WEATHER_SAFE_TOAST = { rain: '¡A salvo bajo la carpa! Esperen que pare', waves: '¡Detrás del rompeolas! Aguanten la ola' };
const WEATHER_WARN = {
  rain: () => ['¡Se viene el aguacero! ¡A la carpa!', 'wet'],
  wind: (d) => [`¡Ráfaga desde la ${d && d.x < 0 ? 'derecha' : 'izquierda'}! Caminen en contra`, 'bad'],
  waves: (d) => [`¡Ola desde la ${d && d.x < 0 ? 'derecha' : 'izquierda'}! Detrás del rompeolas`, 'wet'],
};

const NPC_HIT = {
  easy: ['¡Pellizco! Se botó contenido', 'bad'],
  medium: ['¡Chorro! Se moja la caja', 'wet'],
  hard: ['¡Embestida! Contenido y agua', 'bad'],
};

export class UI {
  /** @param {{ onMenu?: () => void }} opts  `onMenu`: botón "Menú" de pausa / victoria / derrota */
  constructor(root, game, palette, { onMenu = () => {} } = {}) {
    this.root = root;
    this.game = game;
    this.onMenu = onMenu;
    for (const k of ['ui', 'danger', 'goal', 'water', 'box']) root.style.setProperty(`--${k}`, palette[k]);
    root.innerHTML = TEMPLATE;
    this.$ = (sel) => root.querySelector(sel);
    this.meters = {};
    for (const el of root.querySelectorAll('.meter')) {
      this.meters[el.dataset.k] = { el, bar: el.querySelector('i'), val: el.querySelector('b') };
    }
    this._lastJump = { 1: -10, 2: -10 };
    this._timers = new Set();
    this.bombMode = CONFIG.box.bomb.enabled;
    if (this.bombMode) this._setupBombHud();
    this._bind(game.events);
    this._bindButtons();
    this.show(game.state);
  }

  _bindButtons() {
    const acts = {
      resume: () => this.game.togglePause(),
      restart: () => this.game.restart(),
      retry: () => this.game.retry(),
      menu: () => this.onMenu(),
    };
    // Sin foco en el botón tras el clic: si no, Espacio/Enter lo volverían a pulsar.
    this.root.addEventListener('mousedown', this._noFocus = (e) => e.target.closest('button') && e.preventDefault());
    this.root.addEventListener('click', this._onClick = (e) => acts[e.target.closest('[data-act]')?.dataset.act]?.());
  }

  destroy() {
    this.root.removeEventListener('mousedown', this._noFocus);
    this.root.removeEventListener('click', this._onClick);
    for (const t of this._timers) clearTimeout(t);
    this.root.innerHTML = '';
  }

  /** Caja bomba: la primera barra es la vida de la bomba y no hay mojado (ni en el HUD ni al ganar). */
  _setupBombHud() {
    this.$('.meters').classList.add('bomb');
    const life = this.meters.integrity;
    life.el.dataset.k = 'bomb';
    life.el.querySelector('span').textContent = 'Vida de bomba';
    this.meters.wetness.el.style.display = 'none';
    this.$('.win .integrity').previousSibling.textContent = 'Vida de bomba';
    this.$('.win .wetness').parentElement.style.display = 'none';
  }

  _paintBoxName() {
    const id = CONFIG.box.profile;
    const name = this.$('.box-name');
    let label = 'VIP';
    if (CONFIG.box.cat.enabled) label = `GATO ${Math.round(this.game.cat.rage)}`;
    if (this.bombMode) label = 'BOMBA';
    if (name.textContent !== label) name.textContent = label;
    name.dataset.box = id;
    name.classList.toggle('urgent', this.bombMode && this.game.bomb.timeLeft <= CONFIG.box.bomb.warnTime);
  }

  /** Barra de vida de la bomba: verde, amarilla desde la mitad y roja en los últimos `warnTime` segundos. */
  _paintBombLife() {
    const B = CONFIG.box.bomb;
    const bomb = this.game.bomb;
    const t = Math.max(0, bomb.timeLeft);
    const m = this.meters.integrity;
    const level = t <= B.warnTime ? 'low' : t <= B.fuseTime / 2 ? 'mid' : 'high';
    const text = fmtClock(t);
    if (m._text !== text) {
      m._text = text;
      m.val.textContent = text;
    }
    m.bar.style.width = `${Math.min(100, (t / Math.max(0.01, B.fuseTime)) * 100).toFixed(1)}%`;
    if (m.el.dataset.level !== level) m.el.dataset.level = level;
    m.el.classList.toggle('draining', bomb.sinceDrain < 0.15);

    const timer = this.$('.timer');
    timer.textContent = fmtTime(t);
    timer.classList.toggle('urgent', t <= B.warnTime);
  }

  show(state) {
    for (const s of this.root.querySelectorAll('.screen')) s.classList.toggle('on', s.dataset.screen === state);
    this.$('.hud').classList.toggle('hidden', state === 'title');
  }

  toast(text, kind = '') {
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = text;
    const box = this.$('.toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      t.remove();
    }, 2000);
    this._timers.add(timer);
  }

  flash(k) {
    const m = this.meters[k].el;
    m.classList.remove('flash');
    void m.offsetWidth;
    m.classList.add('flash');
  }

  _bind(ev) {
    ev.on('game:start', () => this.show('playing'));
    ev.on('game:pause', (e) => this.show(e.paused ? 'paused' : 'playing'));
    ev.on('game:checkpoint', () => this.toast('¡Checkpoint!', 'good'));
    ev.on('game:splash', () => !this.bombMode && this.toast(`¡Al agua! +${CONFIG.box.wet.fallPenalty}% mojada`, 'wet'));
    ev.on('game:respawn', (e) => e.retry && this.show('playing'));
    ev.on('hazard:hit', () => !this.bombMode && this.toast('¡Rodillo! La caja se sacude', 'bad'));
    ev.on('cat:warn', (e) => this.toast(`El gato asoma la pata hacia P${e.player}`, 'bad'));
    ev.on('cat:scratch', (e) => this.toast(`¡El gato arañó a P${e.player}!`, 'bad'));
    ev.on('cat:shred', () => this.toast('¡El gato está rompiendo la caja!', 'bad'));
    ev.on('cat:goal', () => this.toast('¡Quietos en la meta! El gato vacía la caja', 'bad'));
    ev.on('bomb:warn', () => this.toast('¡La mecha está corta!', 'bad'));
    ev.on('bomb:hit', (e) => {
      if (e.seconds < 0.5) return;
      this.toast(`${BOMB_HIT[e.cause] ?? '¡Golpe!'} −${Math.round(e.seconds)} s de bomba`, 'bad');
      this.flash('integrity');
    });
    ev.on('geyser:hit', () => this.toast(this.bombMode ? '¡El agua gasta la mecha!' : '¡Se moja la caja!', 'wet'));
    ev.on('npc:hit', (e) => !this.bombMode && this.toast(...NPC_HIT[e.difficulty]));
    ev.on('weather:warn', (e) => !this.game.weather.sheltered && this.toast(...WEATHER_WARN[e.type](e.dir)));
    ev.on('weather:shelter', (e) => {
      const phase = this.game.weather.current?.phase;
      if (e.inside && phase !== 'calm') this.toast(WEATHER_SAFE_TOAST[e.type] ?? '¡A salvo!', 'good');
    });
    ev.on('box:impact', (e) => {
      if (e.cause === 'cat' || this.bombMode) return;
      if (e.cause === 'landing') this.toast(`¡Golpe! −${Math.round(e.amount)}% contenido`, 'bad');
      this.flash('integrity');
    });
    ev.on('box:wet', () => !this.bombMode && this.flash('wetness'));
    ev.on('player:jump', (e) => {
      const now = this.game.time;
      this._lastJump[e.player] = now;
      const other = this._lastJump[e.player === 1 ? 2 : 1];
      if (now - other < 0.15) this.toast('¡Salto sincronizado!', 'good');
    });
    ev.on('game:win', (r) => {
      this.$('.win .rating').textContent = r.ratingLabel;
      this.$('.win .rating').className = `rating ${r.rating}`;
      this.$('.win .time').textContent = fmtTime(r.time);
      this.$('.win .integrity').textContent = r.bombLeft != null ? fmtClock(r.bombLeft) : `${Math.round(r.integrity)}%`;
      this.$('.win .wetness').textContent = `${Math.round(r.wetness)}%`;
      this.show('won');
    });
    ev.on('game:fail', (r) => {
      this.$('.fail h2').textContent = r.label;
      this.$('.fail .tip').textContent = TIPS[r.reason] ?? '';
      this.$('.fail .cp').textContent = this.game.checkpointIndex >= 0 ? 'desde el último checkpoint' : 'desde la salida';
      this.show('failed');
    });
  }

  update() {
    const g = this.game;
    const b = g.box;
    if (g.state === 'title') return;
    this._paintBoxName();

    if (this.bombMode) {
      this._paintBombLife();
    } else {
      this._meter('integrity', b.integrity, b.integrity < 35);
      this._meter('wetness', b.wetness, b.wetness > 65);
      this.$('.timer').textContent = fmtTime(g.runTime);
    }
    this._meter('sync', b.sync * 100, b.sync < 0.4);

    const zone = g.weather.current;
    const chip = this.$('.weather');
    const safe = !!zone?.boxShelter;
    const label = !zone ? '' : safe ? WEATHER_SAFE[zone.type] : WEATHER_CHIP[zone.type][zone.phase](zone.dir);
    if (chip.textContent !== label) chip.textContent = label;
    chip.dataset.type = zone?.type ?? '';
    chip.dataset.phase = safe ? 'safe' : (zone?.phase ?? '');

    // Nivel de burbuja: la bolita va hacia el lado que baja.
    const R = 43;
    const max = 40;
    const x = Math.max(-1, Math.min(1, b.tilt.roll / max)) * R;
    const y = Math.max(-1, Math.min(1, b.tilt.pitch / max)) * R;
    this.$('.level .dot').style.transform = `translate(${x}px, ${y}px)`;
    const lvl = this.$('.level');
    if (lvl.dataset.state !== b.state) {
      lvl.dataset.state = b.state;
      this.$('.level .state').textContent = STATE_LABEL[b.state];
    }

    const warn = g.state === 'playing' && b.state === 'critical';
    this.$('.warning').classList.toggle('on', warn);
    this.$('.warning .drop i').style.width = `${Math.min(1, b.criticalTime / CONFIG.box.tilt.dropGrace) * 100}%`;

    // Fundido a negro al caer al agua.
    const F = CONFIG.respawn.fadeTime;
    const fade = g.respawnTimer > 0 ? 1 - Math.abs(g.respawnTimer - F / 2) / (F / 2) : 0;
    this.$('.fade').style.opacity = fade.toFixed(3);
  }

  _meter(k, value, low) {
    const m = this.meters[k];
    const v = Math.round(value);
    if (m._v === v) return;
    m._v = v;
    m.bar.style.width = `${v}%`;
    m.val.textContent = `${v}%`;
    m.el.classList.toggle('low', low);
  }
}

const TEMPLATE = /* html */ `
  <div class="hud hidden">
    <div class="meters">
      <div class="meter" data-k="integrity"><span>Contenido</span><div class="bar"><i></i></div><b>100%</b></div>
      <div class="meter" data-k="wetness"><span>Mojado</span><div class="bar"><i style="width:0"></i></div><b>0%</b></div>
      <div class="meter" data-k="sync"><span>Sincronía</span><div class="bar"><i></i></div><b>100%</b></div>
    </div>
    <div class="weather" data-type=""></div>
    <div class="timer">00:00.0</div>
    <div class="box-name" data-box="vip">VIP</div>
    <div class="level" data-state="upright"><div class="dial"><div class="dot"></div></div><span class="state">ESTABLE</span></div>
    <div class="warning"><strong>¡CUIDADO!</strong><div class="drop"><i></i></div></div>
    <div class="toasts"></div>
  </div>
  <div class="fade"></div>

  <section class="screen" data-screen="paused">
    <div class="card">
      <h2>PAUSA</h2>
      <div class="actions">
        <button type="button" class="btn big go" data-act="resume">Continuar</button>
        <button type="button" class="btn" data-act="restart">Reiniciar nivel</button>
        <button type="button" class="btn light" data-act="menu">Menú</button>
      </div>
      <p class="keys"><kbd>P</kbd> / <kbd>Esc</kbd> continuar · <kbd>R</kbd> reiniciar · <kbd>M</kbd> menú</p>
    </div>
  </section>

  <section class="screen win" data-screen="won">
    <div class="card">
      <h2>¡LLEGARON A LA META!</h2>
      <span class="rating">¡Entrega perfecta!</span>
      <div class="stats">
        <div>Tiempo<b class="time">00:00.0</b></div>
        <div>Contenido<b class="integrity">100%</b></div>
        <div>Mojado<b class="wetness">0%</b></div>
      </div>
      <div class="actions">
        <button type="button" class="btn big go" data-act="restart">Otra vez</button>
        <button type="button" class="btn light" data-act="menu">Menú</button>
      </div>
      <p class="keys"><kbd>Espacio</kbd> / <kbd>Enter</kbd> otra vez · <kbd>M</kbd> menú</p>
    </div>
  </section>

  <section class="screen fail" data-screen="failed">
    <div class="card">
      <h2>¡Soltaron la caja!</h2>
      <p class="tip"></p>
      <div class="actions">
        <button type="button" class="btn big go" data-act="retry">Reintentar</button>
        <button type="button" class="btn" data-act="restart">Reiniciar nivel</button>
        <button type="button" class="btn light" data-act="menu">Menú</button>
      </div>
      <p class="keys"><kbd>Espacio</kbd> / <kbd>Enter</kbd> reintentar <span class="cp">desde el último checkpoint</span> · <kbd>Esc</kbd> reiniciar · <kbd>M</kbd> menú</p>
    </div>
  </section>
`;

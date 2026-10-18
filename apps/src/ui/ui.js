// UI de la partida en HTML encima del canvas. Solo ESCUCHA a la simulación (eventos + lectura de estado).
// El título / selección vive en ui/menu.js. Zharick: el contrato está en apps/README.md (sección UI).
import { CONFIG } from '../config.js';
import { submitWin } from '../leaderboard/api.js';
import { computeScore, isCampaignLevel } from '../leaderboard/score.js';
import { VOLUME_SLIDERS_HTML, bindVolumeSliders } from '../view/audioPrefs.js';
import './theme.css';
import './ui.css';

const TIPS = {
  dropped: 'Tip: si la caja se pone roja, frenen un momento y muévanse al mismo ritmo.',
  empty: 'Tip: el huequito gotea cuando la caja va inclinada. Caminen juntos y salten juntos.',
  soaked: 'Tip: esperen a que los chorros se apaguen (burbujas = va a salir agua) y no se caigan al agua.',
  exploded: 'Tip: cada golpe, cada chorro y cada paso descoordinado daña la bomba. Vayan juntos.',
  fell: 'Tip: cada caída al agua cuesta una vida. Caminen contra el viento y miren dónde pisan.',
};

const fmtTime = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
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
const NPC_HIT_JUNGLE = {
  easy: ['¡La iguana mordió! Se botó contenido', 'bad'],
  medium: ['¡El mono tiró agua!', 'wet'],
  hard: ['¡El jaguar! Contenido y agua', 'bad'],
};
const NPC_HIT_DESERT = {
  easy: ['¡El aprendiz picó! Se botó contenido', 'bad'],
  medium: ['¡El minero tiró agua!', 'wet'],
  hard: ['¡El coyote! Contenido y agua', 'bad'],
};
const NPC_HIT_VILLAGE = {
  easy: ['¡El niño del pueblo! Se botó contenido', 'bad'],
  medium: ['¡El aldeano tiró agua!', 'wet'],
  hard: ['¡El jaguar! Contenido y agua', 'bad'],
};

export class UI {
  /** @param {{ onMenu?: () => void, audio?: import('../view/audio.js').GameAudio }} opts */
  constructor(root, game, palette, { onMenu = () => {}, audio = null } = {}) {
    this.root = root;
    this.game = game;
    this.onMenu = onMenu;
    this.audio = audio;
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
    this.catMode = CONFIG.box.cat.enabled;
    this.jungle = game.world?.level?.theme === 'jungle';
    this.desert = game.world?.level?.theme === 'desert';
    this.village = game.world?.level?.biome === 'village';
    if (this.bombMode) this._setupBombHud();
    else if (this.catMode) this._setupCatHud();
    this._bind(game.events);
    this._bindButtons();
    bindVolumeSliders(this.root, () => this.audio?.applyMix());
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

  /** Caja bomba: la primera barra es el % de la bomba (¡BUM!); no hay mojado ni cronómetro grande. */
  _setupBombHud() {
    this.$('.hud').classList.add('bomb');
    this.$('.meters').classList.add('bomb');
    const life = this.meters.integrity;
    life.el.dataset.k = 'bomb';
    life.el.querySelector('span').textContent = '¡BUM!';
    this.meters.wetness.el.style.display = 'none';
    this.$('.timer').style.display = 'none';
    this.$('.win .integrity').previousSibling.textContent = 'Bomba';
    this.$('.win .wetness').parentElement.style.display = 'none';
    this._lastDesyncToast = -10;
  }

  /** Caja del gato: la primera barra es el % que queda (¡Miau!); sin cronómetro ni número de rabia. */
  _setupCatHud() {
    this.$('.hud').classList.add('cat');
    const life = this.meters.integrity;
    life.el.dataset.k = 'cat';
    life.el.querySelector('span').textContent = '¡Miau!';
    this.$('.timer').style.display = 'none';
    this.$('.box-name').style.display = 'none';
    this.$('.win .integrity').previousSibling.textContent = '¡Miau!';
  }

  /** Vidas que quedan (corazones, en el panel de la izquierda): una por intento; las perdidas se ven apagadas. */
  _paintLives() {
    const { lives } = this.game;
    const total = CONFIG.respawn.lives;
    const key = `${lives}/${total}`;
    if (this._livesKey === key) return;
    this._livesKey = key;
    const el = this.$('.lives');
    el.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < lives ? '' : 'lost'}">❤️</i>`).join('');
    el.classList.toggle('last', lives === 1);
  }

  _paintBoxName() {
    const id = CONFIG.box.profile;
    const name = this.$('.box-name');
    let label = 'VIP';
    if (this.bombMode) label = 'BOMBA';
    if (name.textContent !== label) name.textContent = label;
    name.dataset.box = id;
    name.classList.toggle('urgent', this.bombMode && this.game.bomb.health <= CONFIG.box.bomb.warnHealth);
  }

  /** Barra de la bomba: verde, amarilla bajo 50 % y roja palpitando bajo `warnHealth`. */
  _paintBombLife() {
    const bomb = this.game.bomb;
    const h = Math.max(0, bomb.health);
    const m = this.meters.integrity;
    const level = h <= CONFIG.box.bomb.warnHealth ? 'low' : h <= 50 ? 'mid' : 'high';
    const text = `${Math.ceil(h)}%`;
    if (m._text !== text) {
      m._text = text;
      m.val.textContent = text;
    }
    m.bar.style.width = `${h.toFixed(1)}%`;
    if (m.el.dataset.level !== level) m.el.dataset.level = level;
    m.el.classList.toggle('draining', bomb.sinceDrain < 0.15);
    m.el.classList.toggle('desync', bomb.desync > 0);
  }

  show(state) {
    for (const s of this.root.querySelectorAll('.screen')) s.classList.toggle('on', s.dataset.screen === state);
    this.$('.hud').classList.toggle('hidden', state === 'title');
    this.$('.spk')?.classList.toggle('hidden', state === 'title');
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
    ev.on('game:life', (e) => {
      this.toast(e.lives === 1 ? '💔 ¡Perdieron una vida! Queda la última' : e.lives > 1 ? `💔 ¡Perdieron una vida! Quedan ${e.lives}` : '💔 ¡Sin vidas!', 'bad');
      this._paintLives();
      const lost = this.$(`.lives i:nth-child(${e.lives + 1})`);
      lost?.classList.add('just-lost');
    });
    ev.on('hazard:hit', () => !this.bombMode && this.toast('¡Rodillo! La caja se sacude', 'bad'));
    ev.on('cat:warn', (e) => this.toast(`El gato asoma la pata hacia P${e.player}`, 'bad'));
    ev.on('cat:scratch', (e) => {
      this.toast(`¡Zarpazo a P${e.player}! −${Math.round(CONFIG.box.cat.scratchDamage)}%`, 'bad');
      this.flash('integrity');
    });
    ev.on('cat:shred', () => this.toast('¡El gato está rompiendo la caja!', 'bad'));
    ev.on('cat:goal', () => this.toast('¡Quietos en la meta! El gato vacía la caja', 'bad'));
    ev.on('bomb:warn', () => this.toast('¡La bomba está por explotar!', 'bad'));
    ev.on('bomb:desync', () => {
      if (this.game.time - this._lastDesyncToast < 4) return;
      this._lastDesyncToast = this.game.time;
      this.toast('¡Sin sincronía la bomba se daña!', 'bad');
    });
    ev.on('bomb:hit', (e) => {
      if (e.amount < 1) return;
      this.toast(`${BOMB_HIT[e.cause] ?? '¡Golpe!'} −${Math.round(e.amount)}% de bomba`, 'bad');
      this.flash('integrity');
    });
    ev.on('geyser:hit', () => this.toast(this.bombMode ? '¡El agua daña la bomba!' : this.jungle ? '¡Vapor! Se moja la caja!' : '¡Se moja la caja!', 'wet'));
    ev.on('npc:hit', (e) => !this.bombMode && this.toast(...(this.village ? NPC_HIT_VILLAGE : this.desert ? NPC_HIT_DESERT : this.jungle ? NPC_HIT_JUNGLE : NPC_HIT)[e.difficulty]));
    ev.on('weather:warn', (e) => !this.game.weather.sheltered && this.toast(...WEATHER_WARN[e.type](e.dir)));
    ev.on('weather:shelter', (e) => {
      const phase = this.game.weather.current?.phase;
      if (e.inside && phase !== 'calm') {
        const toast = this.village && e.type === 'rain' ? '¡A salvo en la choza! Esperen que pare' : this.jungle && e.type === 'rain' ? '¡A salvo bajo las raíces! Esperen que pare' : (WEATHER_SAFE_TOAST[e.type] ?? '¡A salvo!');
        this.toast(toast, 'good');
      }
    });
    ev.on('box:impact', (e) => {
      if (e.cause === 'cat' || this.bombMode) return;
      if (e.cause === 'landing') this.toast(`¡Golpe! −${Math.round(e.amount)}% contenido`, 'bad');
      this.flash('integrity');
    });
    ev.on('box:wet', () => !this.bombMode && this.flash('wetness'));
    ev.on('cactus:poke', () => {
      this.toast('¡Daño! El cactus pinchó la caja', 'bad');
      this.flash('poke');
      this.flash('integrity');
    });
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
      this.$('.win .integrity').textContent = `${Math.round(r.bombHealth ?? r.integrity)}%`;
      this.$('.win .wetness').textContent = `${Math.round(r.wetness)}%`;
      const scoreEl = this.$('.win .score');
      const campaign = isCampaignLevel(this.game.level.id);
      if (scoreEl) {
        scoreEl.hidden = !campaign;
        scoreEl.querySelector('b').textContent = campaign ? String(computeScore(r)) : '—';
      }
      this.show('won');
      if (campaign) this._submitArcade(r);
    });
    ev.on('game:fail', (r) => {
      // Solo sale sin vidas (con vidas reaparecen solos en el checkpoint).
      this.$('.fail .tip').textContent =
        this.catMode && r.reason === 'empty'
          ? 'Tip: cada zarpazo rompe la caja. Enderecen al momento; si lo ignoran, se vacía.'
          : (TIPS[r.reason] ?? '');
      this.$('.fail .lives-left').textContent = `${r.label} Era la última vida: toca empezar desde la salida.`;
      this._paintLives();
      this.show('failed');
    });
  }

  update() {
    const g = this.game;
    const b = g.box;
    if (g.state === 'title') return;
    this._paintBoxName();
    this._paintLives();

    if (this.bombMode) {
      this._paintBombLife();
    } else {
      this._meter('integrity', b.integrity, b.integrity < 35);
      this._meter('wetness', b.wetness, b.wetness > 65);
      if (!this.catMode) this.$('.timer').textContent = fmtTime(g.runTime);
    }
    this._meter('sync', b.sync * 100, b.sync < 0.4);
    if (this.meters.poke) {
      const maze = (g.level.cacti ?? []).some((c) => c.hostile);
      this.meters.poke.el.hidden = !maze;
      if (maze) this._meter('poke', g.cacti.damage, g.cacti.damage > 35);
    }

    const zone = g.weather.current;
    const chip = this.$('.weather');
    const safe = !!zone?.boxShelter;
    const safeLabel = this.village && zone?.type === 'rain' ? '☂ A SALVO EN LA CHOZA' : this.jungle && zone?.type === 'rain' ? '☂ A SALVO BAJO LAS RAÍCES' : WEATHER_SAFE[zone?.type];
    const label = !zone ? '' : safe ? safeLabel : WEATHER_CHIP[zone.type][zone.phase](zone.dir);
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
    const poked = g.state === 'playing' && g.cacti?.near && b.state !== 'critical';
    const state = poked ? 'danger' : b.state;
    if (lvl.dataset.state !== state) {
      lvl.dataset.state = state;
      this.$('.level .state').textContent = poked ? 'PELIGRO' : STATE_LABEL[b.state];
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

  /** Envía score al backend (nombre ya se eligió al inicio en el menú). */
  async _submitArcade(win) {
    const levelId = this.game.level.id;
    const status = await submitWin(levelId, win);
    if (!status) return;
    const note = this.$('.win .lb-note');
    if (note) {
      note.hidden = false;
      const best = status.bests?.[levelId] ?? '—';
      note.textContent = status.improved === false
        ? `Mejor en este mapa: ${best} · General ${status.total}`
        : `¡Nuevo mejor en este mapa! General ${status.total}`;
    }
  }
}

const TEMPLATE = /* html */ `
  <div class="hud hidden">
    <div class="meters">
      <div class="meter" data-k="integrity"><span>Contenido</span><div class="bar"><i></i></div><b>100%</b></div>
      <div class="meter" data-k="wetness"><span>Mojado</span><div class="bar"><i style="width:0"></i></div><b>0%</b></div>
      <div class="meter" data-k="sync"><span>Sincronía</span><div class="bar"><i></i></div><b>100%</b></div>
      <div class="meter" data-k="poke" hidden><span>Daño</span><div class="bar"><i style="width:0"></i></div><b>0%</b></div>
      <div class="lives-row"><span>Vidas</span><div class="lives" title="Vidas que les quedan"></div></div>
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
      ${VOLUME_SLIDERS_HTML}
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
        <div class="score" hidden>Puntos<b>—</b></div>
      </div>
      <p class="lb-note" hidden></p>
      <div class="actions">
        <button type="button" class="btn big go" data-act="restart">Otra vez</button>
        <button type="button" class="btn light" data-act="menu">Menú</button>
      </div>
      <p class="keys"><kbd>Espacio</kbd> / <kbd>Enter</kbd> otra vez · <kbd>M</kbd> menú</p>
    </div>
  </section>

  <section class="screen fail" data-screen="failed">
    <div class="card">
      <h2>¡Se acabaron las vidas!</h2>
      <p class="lives-left"></p>
      <p class="tip"></p>
      <div class="actions">
        <button type="button" class="btn big go" data-act="retry">Empezar de nuevo</button>
        <button type="button" class="btn light" data-act="menu">Menú</button>
      </div>
      <p class="keys"><kbd>Espacio</kbd> / <kbd>Enter</kbd> empezar de nuevo <span class="cp">desde la salida</span> · <kbd>M</kbd> menú</p>
    </div>
  </section>
`;

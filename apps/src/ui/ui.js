// UI provisional en HTML encima del canvas. Solo ESCUCHA a la simulación (eventos + lectura de estado).
// Zharick: puedes reemplazar este archivo/estilos; el contrato está en apps/README.md (sección UI).
import { CONFIG } from '../config.js';
import './ui.css';

const TIPS = {
  dropped: 'Tip: si la caja se pone roja, frenen un momento y muévanse al mismo ritmo.',
  empty: 'Tip: el huequito gotea cuando la caja va inclinada. Caminen juntos y salten juntos.',
  soaked: 'Tip: esperen a que los chorros se apaguen (burbujas = va a salir agua) y no se caigan al agua.',
};

const fmtTime = (t) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
};

const STATE_LABEL = { upright: 'ESTABLE', tilting: 'INCLINADA', critical: '¡SE CAE!' };

export class UI {
  constructor(root, game, palette) {
    this.root = root;
    this.game = game;
    for (const k of ['ui', 'danger', 'goal', 'water', 'box']) root.style.setProperty(`--${k}`, palette[k]);
    root.innerHTML = TEMPLATE;
    this.$ = (sel) => root.querySelector(sel);
    this.meters = {};
    for (const el of root.querySelectorAll('.meter')) {
      this.meters[el.dataset.k] = { el, bar: el.querySelector('i'), val: el.querySelector('b') };
    }
    this._lastJump = { 1: -10, 2: -10 };
    this._bind(game.events);
    this.show(game.state);
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
    setTimeout(() => t.remove(), 2000);
  }

  flash(k) {
    const m = this.meters[k].el;
    m.classList.remove('flash');
    void m.offsetWidth;
    m.classList.add('flash');
  }

  _bind(ev) {
    ev.on('game:ready', (r) => {
      this.$('.p1').classList.toggle('ready', r.p1);
      this.$('.p2').classList.toggle('ready', r.p2);
    });
    ev.on('game:start', () => this.show('playing'));
    ev.on('game:pause', (e) => this.show(e.paused ? 'paused' : 'playing'));
    ev.on('game:checkpoint', () => this.toast('¡Checkpoint!', 'good'));
    ev.on('game:splash', () => this.toast(`¡Al agua! +${CONFIG.box.wet.fallPenalty}% mojada`, 'wet'));
    ev.on('game:respawn', (e) => e.retry && this.show('playing'));
    ev.on('hazard:hit', () => this.toast('¡Rodillo! La caja se sacude', 'bad'));
    ev.on('geyser:hit', () => this.toast('¡Se moja la caja!', 'wet'));
    ev.on('box:impact', (e) => {
      if (e.cause === 'landing') this.toast(`¡Golpe! −${Math.round(e.amount)}% contenido`, 'bad');
      this.flash('integrity');
    });
    ev.on('box:wet', () => this.flash('wetness'));
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
      this.$('.win .integrity').textContent = `${Math.round(r.integrity)}%`;
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

    this._meter('integrity', b.integrity, b.integrity < 35);
    this._meter('wetness', b.wetness, b.wetness > 65);
    this._meter('sync', b.sync * 100, b.sync < 0.4);
    this.$('.timer').textContent = fmtTime(g.runTime);

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
    <div class="timer">00:00.0</div>
    <div class="level" data-state="upright"><div class="dial"><div class="dot"></div></div><span class="state">ESTABLE</span></div>
    <div class="warning"><strong>¡CUIDADO!</strong><div class="drop"><i></i></div></div>
    <div class="toasts"></div>
  </div>
  <div class="fade"></div>

  <section class="screen" data-screen="title">
    <div class="card">
      <h1>NO SUELTES<br /><span class="accent">LA CAJA</span></h1>
      <p class="tag">Cooperativo local para 2 · la caja es el problema</p>
      <div class="controls">
        <div class="p1"><div class="who">P1 · traje</div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover · <kbd>Espacio</kbd> saltar</div>
        <div class="p2"><div class="who">P2 · gorra</div><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> mover · <kbd>Enter</kbd> saltar</div>
      </div>
      <div class="rules">
        <span>Muévanse al mismo ritmo: la caja va derecha y más rápido.</span>
        <span>Salten juntos. Si se inclina, gotea por el huequito.</span>
        <span>No la mojen, no la dejen caer... y lleguen a la META.</span>
      </div>
      <p class="cta">Los dos pulsen SALTAR para empezar</p>
    </div>
  </section>

  <section class="screen" data-screen="paused">
    <div class="card">
      <h2>PAUSA</h2>
      <p><kbd>P</kbd> / <kbd>Esc</kbd> continuar · <kbd>R</kbd> reiniciar nivel</p>
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
      <p class="cta"><kbd>Espacio</kbd> / <kbd>Enter</kbd> jugar otra vez</p>
    </div>
  </section>

  <section class="screen fail" data-screen="failed">
    <div class="card">
      <h2>¡Soltaron la caja!</h2>
      <p class="tip"></p>
      <p class="cta"><kbd>Espacio</kbd> / <kbd>Enter</kbd> reintentar <span class="cp">desde el último checkpoint</span></p>
      <p><kbd>Esc</kbd> reiniciar el nivel</p>
    </div>
  </section>
`;

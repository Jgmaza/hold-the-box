// HUD online encima de la UI normal: lista de dúos (vidas, checkpoint, estado) y avisos de lo que les pasa
// a los OTROS dúos ("¡A Ana y Beto se les cayó la caja!"). Los avisos de mi dúo ya los da ui/ui.js.
import { duoColor } from './lobby.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Qué evento de otro dúo merece aviso. `n` = nombres del dúo. */
const FEED = {
  'box:drop': (n) => `📦 ¡A ${n} se les cayó la caja!`,
  'game:splash': (n) => `💦 ¡${n} se fueron al agua!`,
  'game:checkpoint': (n) => `🚩 ${n} pasaron un checkpoint`,
  'duo:finished': (n) => `🏁 ¡${n} llegaron a la meta!`,
  'duo:eliminated': (n) => `💀 ${n} se quedaron sin vidas`,
  'bomb:explode': (n) => `💥 ¡Explotó la bomba de ${n}!`,
  'player:disconnected': (n) => `📴 Se desconectó alguien de ${n}`,
};

export class OnlineHud {
  /**
   * @param {import('../net/onlineMatch.js').OnlineMatch} match
   * @param {{ onLeave: () => void, onWatch?: (dir: number) => void }} opts  onWatch: ◀ ▶ para cambiar de dúo al mirar
   */
  constructor(match, { onLeave, onWatch = () => {} }) {
    this.match = match;
    this.root = document.createElement('div');
    this.root.className = 'oh';
    this.feed = document.createElement('div');
    this.feed.className = 'oh-feed';
    document.body.append(this.root, this.feed);
    this.rows = new Map();
    for (const d of match.duos) {
      const row = document.createElement('div');
      row.className = `oh-duo${d === match.mine ? ' me' : ''}`;
      row.style.setProperty('--duo', duoColor(d.id));
      row.innerHTML = `<b>${d.id + 1}</b><span>${esc(match.duoName(d.id))}</span><em></em>`;
      this.root.appendChild(row);
      this.rows.set(d.id, row);
    }
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'btn light oh-leave';
    leave.textContent = 'Salir';
    leave.addEventListener('click', () => onLeave());
    this.root.appendChild(leave);
    // Mirando a otro dúo (espectador o mi dúo ya terminó): ◀ nombre ▶
    this.watchBar = document.createElement('div');
    this.watchBar.className = 'oh-watch hidden';
    this.watchBar.innerHTML = `<button type="button" class="btn icon light" data-dir="-1" aria-label="Dúo anterior">◀</button>
      <span><small>Mirando a</small><b></b><small>Q / E para cambiar</small></span>
      <button type="button" class="btn icon light" data-dir="1" aria-label="Dúo siguiente">▶</button>`;
    this.watchBar.addEventListener('mousedown', (e) => e.preventDefault());
    this.watchBar.addEventListener('click', (e) => {
      const dir = Number(e.target.closest('[data-dir]')?.dataset.dir);
      if (dir) onWatch(dir);
    });
    this.banner = document.createElement('div');
    this.banner.className = 'oh-banner hidden';
    document.body.append(this.watchBar, this.banner);
    this._offs = [];
    for (const d of match.duos) {
      if (d === match.mine) {
        this._offs.push(
          d.game.events.on('player:bump', (e) => {
            const by = match.duoName(e.by.duo);
            this.message(`💥 ¡Te empujaron ${by}!`, e.by.duo);
          }),
        );
        continue;
      }
      for (const [e, text] of Object.entries(FEED)) {
        this._offs.push(d.game.events.on(e, () => this.message(text(match.duoName(d.id)), d.id)));
      }
    }
    this._last = '';
  }

  message(text, duoId) {
    const el = document.createElement('div');
    el.className = 'oh-msg';
    el.style.setProperty('--duo', duoColor(duoId));
    el.textContent = text;
    this.feed.appendChild(el);
    while (this.feed.children.length > 4) this.feed.firstChild.remove();
    setTimeout(() => el.remove(), 3500);
  }

  /** Aviso fijo arriba (p. ej. "Reconectando…"); null lo quita. */
  setBanner(text) {
    this.banner.textContent = text ?? '';
    this.banner.classList.toggle('hidden', !text);
  }

  update() {
    const m = this.match;
    const watching = m.canWatch && m.duos.length > 0;
    this.watchBar.classList.toggle('hidden', !watching);
    if (watching) {
      const name = m.duoName(m.focus.id);
      const b = this.watchBar.querySelector('b');
      if (b.textContent !== name) b.textContent = name;
      this.watchBar.style.setProperty('--duo', duoColor(m.focus.id));
      for (const btn of this.watchBar.querySelectorAll('button')) btn.disabled = m.duos.length < 2;
    }
    for (const [id, row] of this.rows) row.classList.toggle('focus', id === m.focus.id);
    for (const d of this.match.duos) {
      const g = d.game;
      const status =
        d.status === 'finished'
          ? '🏁'
          : d.status === 'eliminated'
            ? '💀'
            : `${'❤'.repeat(Math.max(0, g.lives))} · ${g.checkpointIndex >= 0 ? `CP ${g.checkpointIndex + 1}` : 'salida'}`;
      const row = this.rows.get(d.id);
      const em = row.lastChild;
      if (em.textContent !== status) em.textContent = status;
      row.classList.toggle('out', d.status === 'eliminated');
    }
  }

  destroy() {
    this._offs.forEach((off) => off());
    this.root.remove();
    this.feed.remove();
    this.watchBar.remove();
    this.banner.remove();
  }
}

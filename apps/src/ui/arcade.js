// Overlays del leaderboard: Records (general + por mapa) y registro de nombre al inicio.
import { ARCADE_ROLES, BOARD_SCOPES, LEVEL_LABEL } from '../leaderboard/score.js';
import { fetchBoard, fetchMe, saveArcade } from '../leaderboard/api.js';
import './arcade.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NAME_LEN = 5;
const ME_TIMEOUT_MS = 2500;

/**
 * Monta overlays del leaderboard dentro de `root` (menú o UI de partida).
 * Uso:
 *   const arcade = new ArcadeOverlay(root);
 *   arcade.showBoard();
 *   await arcade.ensureRegistered(); // antes de Jugar
 */
export class ArcadeOverlay {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.className = 'arcade';
    this.scope = 'general';
    this.el.innerHTML = `
      <div class="arcade-panel arcade-board" hidden>
        <header>
          <h2>Records</h2>
          <p>Mejores entregas de la tripulación</p>
        </header>
        <div class="arcade-tabs" role="tablist"></div>
        <div class="arcade-table" role="table">Cargando…</div>
        <p class="arcade-hint">El nombre se elige una sola vez al empezar a jugar</p>
        <button type="button" class="btn go arcade-close">Cerrar</button>
      </div>
      <div class="arcade-panel arcade-save" hidden>
        <header>
          <h2>Tu nombre</h2>
          <p class="arcade-total">Elige cómo aparecen en el ranking</p>
        </header>
        <div class="arcade-name-row">
          <button type="button" class="btn icon light" data-move="-1" aria-label="Letra anterior">◀</button>
          <div class="arcade-name" role="group" aria-label="Nombre"></div>
          <button type="button" class="btn icon light" data-move="1" aria-label="Letra siguiente">▶</button>
        </div>
        <div class="arcade-cycle-row">
          <button type="button" class="btn icon light" data-cycle="-1" aria-label="Carácter anterior">▲</button>
          <button type="button" class="btn icon light" data-cycle="1" aria-label="Carácter siguiente">▼</button>
        </div>
        <p class="arcade-slot-hint">◀ ▶ cambian de letra · ▲ ▼ eligen el carácter · o escribe en el teclado</p>
        <div class="arcade-roles"></div>
        <div class="arcade-actions">
          <button type="button" class="btn big go" data-save>Listo</button>
          <button type="button" class="btn light arcade-skip">Cancelar</button>
        </div>
      </div>`;
    // Fuera de #menu: el menú tiene pointer-events:none y tragaba el overlay.
    document.body.appendChild(this.el);

    this.name = Array.from({ length: NAME_LEN }, () => 'A');
    this.cursor = 0;
    this.role = ARCADE_ROLES[0];
    this._saveResolve = null;
    this._me = undefined;
    this._onKey = (e) => this._key(e);

    const tabs = this.el.querySelector('.arcade-tabs');
    for (const scope of BOARD_SCOPES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'arcade-tab';
      btn.dataset.scope = scope;
      btn.textContent = LEVEL_LABEL[scope] ?? scope;
      btn.onclick = () => this._setScope(scope);
      tabs.appendChild(btn);
    }

    this.el.querySelector('.arcade-close').onclick = () => this.hide();
    this.el.querySelector('.arcade-skip').onclick = () => this._finishSave(null);
    this.el.querySelector('[data-save]').onclick = () => this._doSave();
    for (const b of this.el.querySelectorAll('[data-move]')) {
      b.onclick = () => this._moveCursor(+b.dataset.move);
    }
    for (const b of this.el.querySelectorAll('[data-cycle]')) {
      b.onclick = () => this._nudgeName(+b.dataset.cycle);
    }

    const roles = this.el.querySelector('.arcade-roles');
    for (const r of ARCADE_ROLES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn light arcade-role';
      btn.dataset.role = r;
      btn.textContent = r;
      btn.onclick = () => {
        this.role = r;
        this._paintRoles();
      };
      roles.appendChild(btn);
    }
    this._paintRoles();
    this._paintName();
    this._paintTabs();
  }

  destroy() {
    window.removeEventListener('keydown', this._onKey, true);
    this.el.remove();
  }

  hide() {
    this.el.classList.remove('on');
    window.removeEventListener('keydown', this._onKey, true);
    for (const p of this.el.querySelectorAll('.arcade-panel')) p.hidden = true;
  }

  /** Si aún no hay nombre en el servidor, abre el registro. `true` = puede jugar. */
  async ensureRegistered() {
    try {
      this._me = undefined;
      const me = await this._statusTimed(ME_TIMEOUT_MS);
      // null/undefined = sin backend o timeout: no bloquear el menú
      if (!me) return true;
      if (me.saved) return true;
      const saved = await this.promptRegister();
      return !!saved?.saved;
    } catch (e) {
      console.warn('[arcade] ensureRegistered', e);
      return true;
    }
  }

  async showBoard(scope = 'general') {
    this.scope = BOARD_SCOPES.includes(scope) ? scope : 'general';
    this.el.classList.add('on');
    this.el.querySelector('.arcade-save').hidden = true;
    this.el.querySelector('.arcade-board').hidden = false;
    window.removeEventListener('keydown', this._onKey, true);
    this._paintTabs();
    await this._loadBoard();
  }

  /** Modal de nombre + rol (al inicio). Resuelve con status o null si cancela. */
  promptRegister() {
    this.el.classList.add('on');
    this.el.querySelector('.arcade-board').hidden = true;
    this.el.querySelector('.arcade-save').hidden = false;
    this.el.querySelector('.arcade-total').textContent = 'Elige cómo aparecen en el ranking';
    this.name = Array.from({ length: NAME_LEN }, () => 'A');
    this.cursor = 0;
    this._paintRoles();
    this._paintName();
    window.addEventListener('keydown', this._onKey, true);
    return new Promise((resolve) => {
      this._saveResolve = resolve;
    });
  }

  /** @deprecated alias de promptRegister */
  promptSave() {
    return this.promptRegister();
  }

  async _status() {
    if (this._me !== undefined) return this._me;
    this._me = await fetchMe();
    return this._me;
  }

  /** Igual que `_status`, pero no se cuelga si la red no responde. */
  _statusTimed(ms) {
    return Promise.race([
      this._status(),
      new Promise((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  }

  _setScope(scope) {
    if (this.scope === scope) return;
    this.scope = scope;
    this._paintTabs();
    this._loadBoard();
  }

  _paintTabs() {
    for (const b of this.el.querySelectorAll('.arcade-tab')) {
      b.classList.toggle('on', b.dataset.scope === this.scope);
    }
  }

  async _loadBoard() {
    const table = this.el.querySelector('.arcade-table');
    table.classList.remove('empty');
    table.textContent = 'Cargando…';
    const data = await fetchBoard(10, this.scope);
    if (!data) {
      table.classList.add('empty');
      table.textContent = 'Sin conexión\n(reactiva Supabase / deploy de la function)';
      return;
    }
    const board = data.board;
    if (!board.length) {
      table.classList.add('empty');
      table.textContent = '— Vacío —\nJuega un mapa y suma tu mejor marca';
      return;
    }
    const scoreLabel = this.scope === 'general' ? 'Total' : (LEVEL_LABEL[this.scope] ?? 'Score');
    table.replaceChildren();
    table.appendChild(this._boardRow(['#', 'Nombre', 'Rol', scoreLabel], true));
    for (const row of board) {
      const score = this.scope === 'general' ? row.total : row.score;
      table.appendChild(this._boardRow([this._rankLabel(row.rank), row.name, row.role ?? '—', String(score)], false, row.rank));
    }
  }

  _rankLabel(rank) {
    if (rank === 1) return '🥇1';
    if (rank === 2) return '🥈2';
    if (rank === 3) return '🥉3';
    return String(rank);
  }

  _boardRow(cells, head = false, rank = 0) {
    const row = document.createElement('div');
    row.className = head ? 'arcade-row head' : 'arcade-row';
    if (!head && rank >= 1 && rank <= 3) row.classList.add(`podium-${rank}`);
    for (const text of cells) {
      const cell = document.createElement('span');
      cell.textContent = text;
      row.appendChild(cell);
    }
    return row;
  }

  _paintRoles() {
    for (const b of this.el.querySelectorAll('.arcade-role')) b.classList.toggle('on', b.dataset.role === this.role);
  }

  _paintName() {
    const el = this.el.querySelector('.arcade-name');
    el.replaceChildren();
    for (let i = 0; i < this.name.length; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `arcade-slot${i === this.cursor ? ' on' : ''}`;
      btn.textContent = this.name[i];
      btn.setAttribute('aria-label', `Letra ${i + 1}`);
      btn.onclick = () => {
        this.cursor = i;
        this._nudgeName(1);
      };
      el.appendChild(btn);
    }
  }

  _moveCursor(dir) {
    this.cursor = (this.cursor + dir + this.name.length) % this.name.length;
    this._paintName();
  }

  _nudgeName(dir) {
    const i = LETTERS.indexOf(this.name[this.cursor]);
    this.name[this.cursor] = LETTERS[(i + dir + LETTERS.length) % LETTERS.length];
    this._paintName();
  }

  _key(e) {
    if (!this.el.classList.contains('on') || this.el.querySelector('.arcade-save')?.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      return this._finishSave(null);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      return this._doSave();
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      return this._moveCursor(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      return this._moveCursor(1);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      return this._nudgeName(-1);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      return this._nudgeName(1);
    }
    const ch = e.key.toUpperCase();
    if (LETTERS.includes(ch) && ch.length === 1) {
      e.preventDefault();
      e.stopPropagation();
      this.name[this.cursor] = ch;
      if (this.cursor < this.name.length - 1) this.cursor += 1;
      this._paintName();
    }
  }

  async _doSave() {
    const name = this.name.join('');
    const res = await saveArcade(name, this.role);
    if (!res?.saved) {
      this.el.querySelector('.arcade-total').textContent = 'No se pudo guardar · intenta de nuevo';
      return;
    }
    this._me = res;
    this._finishSave(res);
  }

  _finishSave(value) {
    this.hide();
    this._saveResolve?.(value);
    this._saveResolve = null;
  }
}

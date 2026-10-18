// Pantallas arcade del leaderboard: HIGH SCORES y “guardar nombre + rol”.
import { ARCADE_ROLES } from '../leaderboard/score.js';
import { fetchBoard, saveArcade } from '../leaderboard/api.js';
import './arcade.css';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Monta overlays arcade dentro de `root` (menú o UI de partida).
 * Uso:
 *   const arcade = new ArcadeOverlay(root);
 *   arcade.showBoard();
 *   arcade.promptSave(status).then((saved) => ...);
 */
export class ArcadeOverlay {
  constructor(root) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.className = 'arcade';
    this.el.innerHTML = `
      <div class="arcade-panel arcade-board" hidden>
        <header><h2>HIGH SCORES</h2><p>MEJOR TOTAL · 3 MAPAS</p></header>
        <pre class="arcade-table">CARGANDO...</pre>
        <p class="arcade-hint">Ganá los 3 mapas para registrar tu nombre</p>
        <button type="button" class="btn go arcade-close">Cerrar</button>
      </div>
      <div class="arcade-panel arcade-save" hidden>
        <header><h2>¿GUARDAR RECORD?</h2><p class="arcade-total"></p></header>
        <div class="arcade-name-row">
          <button type="button" class="btn icon light" data-name="-1">◀</button>
          <b class="arcade-name">AAA</b>
          <button type="button" class="btn icon light" data-name="1">▶</button>
        </div>
        <p class="arcade-slot-hint">Click en una letra · ◀ ▶ cambian el carácter</p>
        <div class="arcade-roles"></div>
        <div class="arcade-actions">
          <button type="button" class="btn big go" data-save>GUARDAR</button>
          <button type="button" class="btn light arcade-skip">Luego</button>
        </div>
      </div>`;
    root.appendChild(this.el);

    this.name = ['A', 'A', 'A'];
    this.cursor = 0;
    this.role = ARCADE_ROLES[0];
    this._saveResolve = null;

    this.el.querySelector('.arcade-close').onclick = () => this.hide();
    this.el.querySelector('.arcade-skip').onclick = () => this._finishSave(null);
    this.el.querySelector('[data-save]').onclick = () => this._doSave();
    for (const b of this.el.querySelectorAll('[data-name]')) {
      b.onclick = () => this._nudgeName(+b.dataset.name);
    }
    this.el.querySelector('.arcade-name').onclick = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const i = Math.min(this.name.length - 1, Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * this.name.length)));
      this.cursor = i;
      this._nudgeName(1);
    };

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
  }

  destroy() {
    this.el.remove();
  }

  hide() {
    this.el.classList.remove('on');
    for (const p of this.el.querySelectorAll('.arcade-panel')) p.hidden = true;
  }

  async showBoard() {
    this.el.classList.add('on');
    this.el.querySelector('.arcade-save').hidden = true;
    const panel = this.el.querySelector('.arcade-board');
    panel.hidden = false;
    const table = this.el.querySelector('.arcade-table');
    table.textContent = 'CARGANDO...';
    const board = await fetchBoard(10);
    if (!board) {
      table.textContent = 'SIN CONEXIÓN\n(reactivá Supabase / deploy de la function)';
      return;
    }
    if (!board.length) {
      table.textContent = '— VACÍO —\nCompletá los 3 mapas y registrá tu nombre';
      return;
    }
    const lines = ['RK  NAME     ROL       TOTAL', '------------------------------'];
    for (const row of board) {
      lines.push(
        `${String(row.rank).padStart(2, '0')}  ${String(row.name).padEnd(8)} ${String(row.role).padEnd(9)} ${String(row.total).padStart(6)}`,
      );
    }
    table.textContent = lines.join('\n');
  }

  /** Abre el modal de guardado. Resuelve con el status guardado o null si skip. */
  promptSave(status) {
    this.el.classList.add('on');
    this.el.querySelector('.arcade-board').hidden = true;
    this.el.querySelector('.arcade-save').hidden = false;
    this.el.querySelector('.arcade-total').textContent = `TOTAL ${status?.total ?? 0}`;
    this._paintRoles();
    this._paintName();
    return new Promise((resolve) => {
      this._saveResolve = resolve;
    });
  }

  _paintRoles() {
    for (const b of this.el.querySelectorAll('.arcade-role')) b.classList.toggle('on', b.dataset.role === this.role);
  }

  _paintName() {
    const el = this.el.querySelector('.arcade-name');
    el.innerHTML = this.name
      .map((ch, i) => `<span class="${i === this.cursor ? 'on' : ''}">${ch}</span>`)
      .join('');
  }

  _nudgeName(dir) {
    const i = LETTERS.indexOf(this.name[this.cursor]);
    this.name[this.cursor] = LETTERS[(i + dir + LETTERS.length) % LETTERS.length];
    this._paintName();
  }

  async _doSave() {
    const name = this.name.join('');
    const res = await saveArcade(name, this.role);
    if (!res?.saved) {
      this.el.querySelector('.arcade-total').textContent = res?.error === 'incomplete'
        ? 'Faltan mapas'
        : 'No se pudo guardar';
      return;
    }
    this._finishSave(res);
  }

  _finishSave(value) {
    this.hide();
    this._saveResolve?.(value);
    this._saveResolve = null;
  }
}

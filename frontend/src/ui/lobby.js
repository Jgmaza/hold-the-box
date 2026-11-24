// Lobby online (HTML encima de la escena del menú). No habla con la red: avisa por callbacks y
// net/onlineSession.js decide. Pantallas: 'connect' (apodo + crear / unirse) · 'room' (dúos, personajes,
// listo, ajustes del anfitrión) · 'results' (ranking al terminar). Además: cuenta atrás encima de la partida.
import { BOX_CHOICES } from '../config.js';
import { CHARACTERS, character } from '../view/characters.js';
import './theme.css';
import './lobby.css';

const BOX_ICON = { vip: '📦', gato: '🐱', bomba: '💣' };
const DUO_COLORS = ['#ffcc33', '#1fa2c9', '#e8453c', '#3ccf6e', '#b46cf0', '#ff8a3d', '#5ad1c4', '#f06292'];
export const duoColor = (id) => DUO_COLORS[id % DUO_COLORS.length];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtTime = (s) => (s === null || s === undefined ? '—' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`);

const STATUS = { finished: '🏁 Llegó', eliminated: '💀 Sin vidas', dnf: '⏱ No llegó' };
const RATING = { perfect: '⭐ Perfecta', ok: 'Aceptable', damaged: 'Dañada' };

export class Lobby {
  /**
   * @param {HTMLElement} root
   * @param {{ maps: object[], nickname?: string, on: Record<string, Function> }} opts
   *   on: connect(nick) · create(opts) · join(code) · spectate(code) · stand() · leave() · seat(teamId, slots) · ready(bool)
   *       chars({p1,p2}) · settings(obj) · start() · kick(userId) · back() · refresh()
   */
  constructor(root, { maps, nickname = '', on }) {
    this.root = root;
    this.maps = maps;
    this.on = on;
    this.room = null;
    this.myId = null;
    root.innerHTML = TEMPLATE(maps);
    this.$ = (sel) => root.querySelector(sel);
    this.$('[name=nick]').value = nickname;
    root.addEventListener('mousedown', (e) => e.target.closest('button') && e.preventDefault());
    root.addEventListener('click', (e) => this._click(e));
    root.addEventListener('change', (e) => this._change(e));
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submit(e.target);
    });
    this.show(false);
  }

  show(on) {
    this.visible = on;
    this.root.classList.toggle('on', on);
  }

  screen(name) {
    this.current = name;
    for (const el of this.root.querySelectorAll('.o-screen')) el.classList.toggle('on', el.dataset.screen === name);
    this.error('');
  }

  error(msg) {
    for (const el of this.root.querySelectorAll('.o-error')) el.textContent = msg ?? '';
  }

  busy(on) {
    this.root.classList.toggle('busy', on);
  }

  // ---------------------------------------------------------------- pantalla de entrada

  setConnected(user) {
    this.myId = user?.id ?? null;
    this.$('.o-who').textContent = user ? `Conectado como ${user.name}` : '';
    this.root.classList.toggle('connected', !!user);
  }

  setPublicRooms(rooms) {
    const list = this.$('.o-rooms');
    // Se puede entrar a jugar si está en lobby con hueco; si no (jugando o llena), a mirar.
    list.innerHTML = rooms.length
      ? rooms
          .map((r) => {
            const canPlay = r.state === 'lobby' && r.players < r.capacity;
            const state = r.state === 'lobby' ? (canPlay ? '' : ' · llena') : ' · 🎮 jugando';
            const specs = r.spectators ? ` · 👀 ${r.spectators}` : '';
            return `<button type="button" class="o-room" ${canPlay ? `data-join="${esc(r.code)}"` : `data-spectate="${esc(r.code)}"`}>
              <b>${esc(r.code)}</b><span>${esc(this._mapName(r.level))} · ${BOX_ICON[r.boxProfile] ?? '📦'}${state}</span>
              <span>${r.players}/${r.capacity}${specs} · ${canPlay ? `anfitrión ${esc(r.host)}` : '<u>👀 Mirar</u>'}</span></button>`;
          })
          .join('')
      : '<p class="o-empty">No hay salas públicas. ¡Crea una!</p>';
  }

  _mapName(key) {
    return this.maps.find((m) => m.key === key)?.name ?? key;
  }

  // ---------------------------------------------------------------- sala

  setRoom(room) {
    this.room = room;
    if (!room) return;
    const me = room.members.find((m) => m.userId === this.myId);
    const host = room.hostId === this.myId;
    const byId = new Map(room.members.map((m) => [m.userId, m]));
    this.$('.o-code').textContent = room.code;
    this.$('.o-room-sub').textContent = `${this._mapName(room.level)} · ${BOX_CHOICES.find((b) => b.id === room.boxProfile)?.name ?? ''}${room.isPrivate ? ' · privada' : ''}`;

    // Dúos
    this.$('.o-teams').innerHTML = room.teams
      .map((t) => {
        const seat = (slot) => {
          const uid = t.slots[slot];
          const m = uid ? byId.get(uid) : null;
          if (!m) return `<button type="button" class="o-seat free" data-seat="${t.id}" data-slots="${slot}">P${slot} · Libre<br><small>sentarme</small></button>`;
          const sofa = m.slots.length === 2;
          const charId = sofa && slot === 2 ? m.chars.p2 : m.chars.p1;
          const ch = character(charId ?? (slot === 1 ? 'alebarto' : 'gustambo'));
          return `<div class="o-seat${m.userId === this.myId ? ' me' : ''}${m.ready || m.userId === room.hostId ? ' ready' : ''}">
              <span class="o-p">P${slot}</span><b>${esc(m.name)}</b><small>${esc(ch.name)}${m.userId === room.hostId ? ' · 👑' : m.ready ? ' · ✔ listo' : ''}${m.online ? '' : ' · 📴'}</small>
              ${host && m.userId !== this.myId ? `<button type="button" class="o-kick" data-kick="${esc(m.userId)}" aria-label="Echar">✕</button>` : ''}
            </div>`;
        };
        const empty = !t.slots[1] && !t.slots[2];
        return `<div class="o-team" style="--duo:${duoColor(t.id)}">
            <header>Dúo ${t.id + 1}${empty ? `<button type="button" class="o-sofa" data-seat="${t.id}" data-slots="1,2" title="Dos jugadores en este teclado">🛋 los dos aquí</button>` : ''}</header>
            ${seat(1)}${seat(2)}
          </div>`;
      })
      .join('');

    // Espectadores
    const specs = room.members.filter((m) => m.role === 'spectator');
    this.$('.o-specs').innerHTML = specs.length
      ? `👀 Mirando: ${specs.map((m) => `<span class="o-spec${m.userId === this.myId ? ' me' : ''}">${esc(m.name)}${m.online ? '' : ' 📴'}</span>`).join('')}`
      : '';
    this.$('[data-act=stand]').classList.toggle('hidden', !me?.slots.length || room.state !== 'lobby');

    // Personajes
    const sofa = me?.slots.length === 2;
    this.$('.o-chars').innerHTML = me?.slots.length
      ? ['p1', ...(sofa ? ['p2'] : [])]
          .map((k) => {
            const cur = me.chars[k] ?? (k === 'p1' && me.slots[0] === 2 ? 'gustambo' : k === 'p1' ? 'alebarto' : 'gustambo');
            return `<label>${sofa ? (k === 'p1' ? 'P1 (WASD)' : 'P2 (flechas)') : 'Tu personaje'}
              <select data-char="${k}">${CHARACTERS.map((c) => `<option value="${c.id}"${c.id === cur ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`;
          })
          .join('')
      : '<p class="o-empty">Estás mirando. Toca un puesto libre para jugar.</p>';

    // Ajustes del anfitrión
    const settings = this.$('.o-settings');
    settings.classList.toggle('hidden', !host);
    if (host) {
      this.$('[data-set=level]').value = room.level;
      this.$('[data-set=boxProfile]').value = room.boxProfile;
      this.$('[data-set=maxDuos]').value = String(room.maxDuos);
      this.$('[data-set=isPrivate]').checked = room.isPrivate;
    }

    // Listo / empezar
    const ready = this.$('[data-act=ready]');
    ready.classList.toggle('hidden', host || !me?.slots.length);
    ready.textContent = me?.ready ? '✔ ¡Listo!' : 'Estoy listo';
    ready.classList.toggle('go', !!me?.ready);
    const start = this.$('[data-act=start]');
    start.classList.toggle('hidden', !host);
    const why = host ? this._whyNot(room) : '';
    start.disabled = !!why;
    this.$('.o-hint').textContent = host ? why || '¡Todo listo!' : room.state === 'lobby' ? 'El anfitrión arranca la partida.' : 'Partida en curso…';
  }

  /** Por qué el anfitrión aún no puede empezar ('' = puede). Mismas reglas que el servidor (Room.startableTeams). */
  _whyNot(room) {
    if (room.state !== 'lobby') return 'Partida en curso…';
    const used = room.teams.filter((t) => t.slots[1] || t.slots[2]);
    if (!used.length) return 'Siéntense en un dúo.';
    const half = used.find((t) => !t.slots[1] || !t.slots[2]);
    if (half) return `Al dúo ${half.id + 1} le falta un jugador.`;
    const waiting = room.members.find((m) => m.slots.length && !m.ready && m.userId !== room.hostId);
    if (waiting) return `Esperando a que ${waiting.name} esté listo.`;
    return '';
  }

  // ---------------------------------------------------------------- partida

  showCountdown(n) {
    const el = this.$('.o-count');
    el.classList.toggle('on', n !== null);
    if (n === null || el.textContent === String(n)) return;
    el.textContent = n === 0 ? '¡YA!' : String(n);
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  /** Ranking al terminar. */
  showResults(end, { myDuo = null } = {}) {
    const rows = end.ranking
      .map((r) => {
        const names = [...new Set(r.players.map((p) => p.name))].map(esc).join(' y ');
        const medal = r.status === 'finished' ? ['🥇', '🥈', '🥉'][r.placement - 1] ?? `${r.placement}.` : `${r.placement}.`;
        return `<tr class="${r.teamId === myDuo ? 'me' : ''}" style="--duo:${duoColor(r.teamId)}">
          <td>${medal}</td><td><i class="o-dot"></i>${names}</td><td>${STATUS[r.status] ?? r.status}</td>
          <td>${fmtTime(r.finishTime)}</td><td>${r.rating ? RATING[r.rating] : r.checkpoint >= 0 ? `Checkpoint ${r.checkpoint + 1}` : 'En la salida'}</td></tr>`;
      })
      .join('');
    this.$('.o-results tbody').innerHTML = rows;
    const reason = { allDone: 'Terminaron todos', timeLimit: 'Se acabó el tiempo', aborted: 'Partida cortada' }[end.reason] ?? '';
    this.$('.o-results-sub').textContent = `${this._mapName(end.level)} · ${reason} · ${fmtTime(end.time)}`;
    this.show(true);
    this.screen('results');
  }

  // ---------------------------------------------------------------- eventos DOM

  _click(e) {
    const el = e.target.closest('button');
    if (!el || el.disabled) return;
    const d = el.dataset;
    if (d.join) return this.on.join(d.join);
    if (d.spectate) return this.on.spectate(d.spectate);
    if (d.seat !== undefined) return this.on.seat(Number(d.seat), d.slots.split(',').map(Number));
    if (d.kick) return this.on.kick(d.kick);
    const me = this.room?.members.find((m) => m.userId === this.myId);
    switch (d.act) {
      case 'back':
        return this.on.back();
      case 'refresh':
        return this.on.refresh();
      case 'leave':
        return this.on.leave();
      case 'stand':
        return this.on.stand();
      case 'ready':
        return this.on.ready(!me?.ready);
      case 'start':
        return this.on.start();
      case 'copy':
        navigator.clipboard?.writeText(this.room?.code ?? '').catch(() => {});
        el.textContent = '¡Copiado!';
        setTimeout(() => (el.textContent = 'Copiar'), 1200);
        return;
      case 'create':
        return this.on.create({
          level: this.$('[name=new-level]').value,
          boxProfile: this.$('[name=new-box]').value,
          maxDuos: Number(this.$('[name=new-duos]').value),
          isPrivate: this.$('[name=new-private]').checked,
        });
    }
  }

  _change(e) {
    const el = e.target;
    if (el.dataset.char) return this.on.chars({ [el.dataset.char]: el.value });
    if (el.dataset.set) {
      const k = el.dataset.set;
      const v = k === 'maxDuos' ? Number(el.value) : k === 'isPrivate' ? el.checked : el.value;
      return this.on.settings({ [k]: v });
    }
  }

  _submit(form) {
    if (form.name === 'connect') return this.on.connect(form.nick.value.trim());
    if (form.name === 'join') return this.on.join(form.code.value.trim().toUpperCase());
  }
}

const options = (list, sel) => list.map((o) => `<option value="${o.value}"${o.value === sel ? ' selected' : ''}>${o.label}</option>`).join('');

const TEMPLATE = (maps) => {
  const mapOpts = options(maps.map((m) => ({ value: m.key, label: `${m.icon} ${m.name}` })), maps[0]?.key);
  const boxOpts = options(BOX_CHOICES.map((b) => ({ value: b.id, label: `${BOX_ICON[b.id] ?? '📦'} ${b.name}` })), 'vip');
  const duoOpts = options([1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: String(n), label: `${n} dúo${n > 1 ? 's' : ''} (${n * 2} jug.)` })), '4');
  return /* html */ `
  <section class="o-screen" data-screen="connect">
    <div class="o-panel">
      <header class="o-head">
        <button type="button" class="btn icon light" data-act="back" aria-label="Volver">◀</button>
        <h2>Jugar online</h2>
      </header>
      <form name="connect" class="o-row o-nick">
        <label>Tu apodo <input name="nick" maxlength="16" minlength="3" required autocomplete="nickname" placeholder="3 a 16 letras" /></label>
        <button type="submit" class="btn">Conectar</button>
        <span class="o-who"></span>
      </form>
      <div class="o-online">
        <div class="o-cols">
          <section>
            <h3>Crear sala</h3>
            <label>Mapa <select name="new-level">${mapOpts}</select></label>
            <label>Caja <select name="new-box">${boxOpts}</select></label>
            <label>Tamaño <select name="new-duos">${duoOpts}</select></label>
            <label class="o-check"><input type="checkbox" name="new-private" /> Privada (solo con código)</label>
            <button type="button" class="btn big go" data-act="create">Crear sala</button>
          </section>
          <section>
            <h3>Unirse con código</h3>
            <form name="join" class="o-row">
              <input name="code" maxlength="6" minlength="6" required placeholder="ABC234" autocomplete="off" class="o-code-in" />
              <button type="submit" class="btn">Entrar</button>
            </form>
            <h3>Salas públicas <button type="button" class="btn icon light o-refresh" data-act="refresh" aria-label="Actualizar">↻</button></h3>
            <div class="o-rooms"></div>
          </section>
        </div>
      </div>
      <p class="o-error"></p>
    </div>
  </section>

  <section class="o-screen" data-screen="room">
    <div class="o-panel wide">
      <header class="o-head">
        <button type="button" class="btn icon light" data-act="leave" aria-label="Salir de la sala">◀</button>
        <div><h2>Sala <span class="o-code"></span> <button type="button" class="btn light o-copy" data-act="copy">Copiar</button></h2>
        <p class="o-room-sub"></p></div>
      </header>
      <div class="o-teams"></div>
      <div class="o-specs"></div>
      <div class="o-cols">
        <section><h3>Personaje <button type="button" class="btn light o-copy" data-act="stand">👀 Mirar sin jugar</button></h3><div class="o-chars"></div></section>
        <section class="o-settings hidden">
          <h3>Ajustes (anfitrión)</h3>
          <label>Mapa <select data-set="level">${mapOpts}</select></label>
          <label>Caja <select data-set="boxProfile">${boxOpts}</select></label>
          <label>Tamaño <select data-set="maxDuos">${duoOpts}</select></label>
          <label class="o-check"><input type="checkbox" data-set="isPrivate" /> Privada</label>
        </section>
      </div>
      <footer class="o-foot">
        <p class="o-hint"></p>
        <button type="button" class="btn big" data-act="ready">Estoy listo</button>
        <button type="button" class="btn big go" data-act="start">¡Empezar!</button>
      </footer>
      <p class="o-error"></p>
    </div>
  </section>

  <section class="o-screen" data-screen="results">
    <div class="o-panel wide">
      <header class="o-head"><div><h2>Resultados</h2><p class="o-results-sub"></p></div></header>
      <table class="o-results"><thead><tr><th></th><th>Dúo</th><th>Estado</th><th>Tiempo</th><th>Entrega</th></tr></thead><tbody></tbody></table>
      <p class="o-hint">Volviendo a la sala…</p>
    </div>
  </section>

  <div class="o-count"></div>`;
};

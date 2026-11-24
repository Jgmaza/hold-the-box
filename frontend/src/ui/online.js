// Multijugador encima del menú: login (#63), salas (#66) y micro (#68).
//   correo → "revisa tu correo" → nombre → lobby (crear / unirse con código) → sala (LISTO + micro)
// Solo habla con `service` (online/index.js). Esc = atrás.
import { onlineStep } from '../online/flow.js';
import {
  ROOM_CODE_LEN,
  USERNAME_MAX,
  isValidEmail,
  isValidRoomCode,
  normalizeEmail,
  normalizeRoomCode,
  usernameError,
} from '../online/validate.js';
import { VoiceChat } from '../online/voice.js';
import './online.css';

const RESEND_COOLDOWN_S = 60;

const ERRORS = {
  invalid_email: 'Ese correo no parece válido',
  rate_limited: 'Espera un momento antes de pedir otro enlace',
  invalid: 'Ese nombre no sirve',
  taken: 'Ese nombre ya lo tiene otro jugador',
  invalid_code: `El código tiene ${ROOM_CODE_LEN} letras o números`,
  not_found: 'No hay ninguna sala con ese código',
  full: 'Esa sala ya tiene dos jugadores',
  closed: 'La sala se cerró',
  no_session: 'Tu sesión se cerró · vuelve a entrar',
  network: 'Sin conexión · intenta de nuevo',
};
const errorText = (code) => ERRORS[code] ?? ERRORS.network;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export class OnlineOverlay {
  /**
   * @param {{ service: { demo?: boolean, auth: object, rooms: object },
   *           maps?: {key: string, name: string}[], onClose?: () => void }} opts
   */
  constructor({ service, maps = [], onClose = () => {} }) {
    this.service = service;
    this.maps = maps;
    this.onClose = onClose;
    this.visible = false;
    this.sentTo = null;
    this.editingName = false;
    this.linking = false; // invitado agregando su correo
    this.room = null;
    this.voice = new VoiceChat();
    this._step = null;
    this._offRoom = null;
    this._resendAt = 0;
    this._timer = null;
    this._raf = 0;

    this.el = document.createElement('div');
    this.el.className = 'online';
    this.el.innerHTML = '<div class="ol-panel"></div>';
    this.panel = this.el.querySelector('.ol-panel');
    // Fuera de #menu: el menú tiene pointer-events:none.
    document.body.appendChild(this.el);

    this._offAuth = service.auth.onChange(() => {
      const { session } = service.auth;
      if (this.linking && session && !session.guest) {
        this.linking = false;
        this.sentTo = null;
      }
      if (this.visible) this._refresh();
    });
    this._offVoice = this.voice.onChange(() => this._paintMic());
    this._onKey = (e) => {
      if (!this.visible || e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      this._back();
    };
    window.addEventListener('keydown', this._onKey, true);
    this.panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (btn && !btn.disabled) this._act(btn.dataset.act);
    });
    this.panel.addEventListener('submit', (e) => {
      e.preventDefault();
      this._submit(e.target.dataset.form);
    });
    this.panel.addEventListener('input', (e) => this._onInput(e.target));
  }

  destroy() {
    this._leaveRoom();
    this._offAuth();
    this._offVoice();
    clearInterval(this._timer);
    window.removeEventListener('keydown', this._onKey, true);
    this.el.remove();
  }

  show() {
    this.visible = true;
    this.el.classList.add('on');
    this._step = null;
    this._refresh();
  }

  hide() {
    this._leaveRoom();
    this.visible = false;
    this.el.classList.remove('on');
    clearInterval(this._timer);
    this.onClose();
  }

  // ---------------------------------------------------------------- pasos

  _currentStep() {
    const { session, profile } = this.service.auth;
    return onlineStep({
      session,
      profile,
      sentTo: this.sentTo,
      editingName: this.editingName,
      linking: this.linking,
      room: this.room,
    });
  }

  /** Cambia de panel si cambió el paso y repinta lo que se mueve. */
  _refresh() {
    const step = this._currentStep();
    if (step !== this._step) {
      this._step = step;
      clearInterval(this._timer);
      this.panel.dataset.step = step;
      this.panel.innerHTML = this._template(step);
      if (this.service.demo) this.panel.insertAdjacentHTML('afterbegin', '<span class="ol-demo-tag">DEMO</span>');
      this._enter(step);
    }
    if (step === 'room') this._paintRoom();
  }

  _template(step) {
    if (step === 'email') return emailHtml(this.linking);
    if (step === 'sent') return sentHtml(this.service.demo, this.linking);
    if (step === 'username') return usernameHtml(this.editingName);
    if (step === 'lobby') return LOBBY_HTML;
    return ROOM_HTML;
  }

  /** Lo que hay que preparar al entrar a cada panel. */
  _enter(step) {
    const $ = (sel) => this.panel.querySelector(sel);
    if (step === 'sent') {
      $('.ol-email').textContent = this.sentTo;
      this._paintResend();
      this._timer = setInterval(() => this._paintResend(), 1000);
    } else if (step === 'username') {
      const input = $('input[name="username"]');
      input.value = this.editingName ? (this.service.auth.profile?.username ?? '') : '';
      this._paintCount(input);
    } else if (step === 'lobby') {
      const name = this.service.auth.profile?.username ?? '';
      $('.ol-name').textContent = name;
      $('.ol-user .ol-avatar').textContent = name.slice(0, 1).toUpperCase();
      $('.ol-guest').hidden = !this.service.auth.session?.guest;
      if (this._lobbyError) this._error(errorText(this._lobbyError));
      this._lobbyError = null;
    } else if (step === 'room') {
      const level = this.maps.find((m) => m.key === this.room.level);
      $('.ol-code').textContent = this.room.code;
      $('.ol-map').textContent = `Mapa: ${level?.name ?? this.room.level}`;
      this._paintMic();
    }
    $('input')?.focus();
  }

  _back() {
    if (this._step === 'room') return this._leaveRoom();
    if (this._step === 'username' && this.editingName) {
      this.editingName = false;
      return this._refresh();
    }
    if (this._step === 'sent') {
      this.sentTo = null;
      return this._refresh();
    }
    if (this._step === 'email' && this.linking) {
      this.linking = false;
      return this._refresh();
    }
    this.hide();
  }

  // ---------------------------------------------------------------- acciones

  async _act(act) {
    const { auth, rooms } = this.service;
    if (act === 'close') return this.hide();
    if (act === 'back') return this._back();
    if (act === 'resend') return this._sendLink(this.sentTo);
    if (act === 'edit-name') {
      this.editingName = true;
      return this._refresh();
    }
    if (act === 'sign-out') {
      this.sentTo = null;
      this.editingName = false;
      this.linking = false;
      return auth.signOut();
    }
    if (act === 'guest') {
      const res = await this._busy(() => auth.signInAsGuest());
      return res?.ok ? this._refresh() : this._error(errorText(res?.error));
    }
    if (act === 'link') {
      this.linking = true;
      this.sentTo = null;
      return this._refresh();
    }
    if (act === 'create') return this._enterRoom(await this._busy(() => rooms.create()));
    if (act === 'copy') return this._copyCode();
    if (act === 'mic') {
      if (this.voice.state === 'on') return this.voice.toggleMute();
      return this.voice.start();
    }
    if (act === 'ready') {
      const me = this.room?.players.find((p) => p.id === this.room.me);
      return me && this.room.setReady(!me.ready);
    }
    if (act === 'leave') return this._leaveRoom();
  }

  async _submit(form) {
    const value = this.panel.querySelector(`[data-form="${form}"] input`)?.value ?? '';
    if (form === 'email') {
      if (!isValidEmail(value)) return this._error(errorText('invalid_email'));
      return this._sendLink(normalizeEmail(value));
    }
    if (form === 'username') {
      const problem = usernameError(value);
      if (problem) return this._error(problem);
      const res = await this._busy(() => this.service.auth.setUsername(value.trim()));
      if (!res?.ok) return this._error(errorText(res?.error));
      this.editingName = false;
      return this._refresh();
    }
    if (form === 'join') {
      if (!isValidRoomCode(value)) return this._error(errorText('invalid_code'));
      return this._enterRoom(await this._busy(() => this.service.rooms.join(normalizeRoomCode(value))));
    }
  }

  async _sendLink(email) {
    if (this.sentTo && Date.now() < this._resendAt) return;
    const { auth } = this.service;
    const res = await this._busy(() => (this.linking ? auth.linkEmail(email) : auth.sendMagicLink(email)));
    if (!res?.ok) return this._error(errorText(res?.error));
    this.sentTo = email;
    this._resendAt = Date.now() + RESEND_COOLDOWN_S * 1000;
    this._refresh();
    this._paintResend();
  }

  _enterRoom(res) {
    if (!res?.ok) return this._error(errorText(res?.error));
    this._leaveRoom();
    this.room = res.room;
    this._offRoom = this.room.onChange(() => {
      if (this.room?.closed) this._leaveRoom('closed');
      else this._refresh();
    });
    this._refresh();
    this._startMeter();
  }

  /** Sale de la sala (si hay una) y apaga el micro. `reason`: error para mostrar en el lobby. */
  _leaveRoom(reason = null) {
    if (!this.room) return;
    const room = this.room;
    this._offRoom?.();
    this._offRoom = null;
    this.room = null;
    if (!room.closed) room.leave();
    this.voice.stop();
    cancelAnimationFrame(this._raf);
    this._lobbyError = reason;
    if (this.visible) this._refresh();
  }

  async _copyCode() {
    const btn = this.panel.querySelector('[data-act="copy"]');
    try {
      await navigator.clipboard.writeText(this.room.code);
      btn.textContent = '¡Copiado!';
    } catch {
      btn.textContent = 'Cópialo a mano';
    }
    setTimeout(() => btn.isConnected && (btn.textContent = 'Copiar'), 1500);
  }

  /** Bloquea los botones mientras responde el servicio. */
  async _busy(fn) {
    const buttons = [...this.panel.querySelectorAll('button')];
    for (const b of buttons) b.disabled = true;
    this.panel.classList.add('busy');
    try {
      return await fn();
    } catch (e) {
      console.warn('[online]', e);
      return { ok: false, error: 'network' };
    } finally {
      for (const b of buttons) b.disabled = false;
      this.panel.classList.remove('busy');
      this._paintResend();
    }
  }

  // ---------------------------------------------------------------- pintar

  _error(text) {
    const el = this.panel.querySelector('.ol-error');
    if (el) el.textContent = text;
  }

  _onInput(input) {
    this._error('');
    if (input.name === 'code') input.value = normalizeRoomCode(input.value);
    if (input.name === 'username') this._paintCount(input);
  }

  _paintCount(input) {
    this.panel.querySelector('.ol-count').textContent = `${input.value.trim().length}/${USERNAME_MAX}`;
  }

  _paintResend() {
    const btn = this.panel.querySelector('[data-act="resend"]');
    if (!btn) return;
    const left = Math.ceil((this._resendAt - Date.now()) / 1000);
    btn.disabled = left > 0;
    btn.textContent = left > 0 ? `Reenviar (${left})` : 'Reenviar';
  }

  _paintRoom() {
    const room = this.room;
    const me = room.players.find((p) => p.id === room.me);
    const full = room.players.length >= 2;
    const allReady = full && room.players.every((p) => p.ready);
    this.panel.querySelector('.ol-slots').innerHTML = [0, 1].map((i) => slotHtml(room.players[i], i, room.me)).join('');
    const ready = this.panel.querySelector('[data-act="ready"]');
    ready.textContent = me?.ready ? '✔ ¡Listo!' : 'Listo';
    ready.classList.toggle('go', !!me?.ready);
    const banner = this.panel.querySelector('.ol-banner');
    banner.classList.toggle('all-ready', allReady);
    banner.textContent = allReady
      ? '¡Todos listos! La partida online llega con la sincronización (#67)'
      : full
        ? 'Cuando los dos marquen LISTO, arrancan juntos'
        : 'Esperando a tu compañero…';
  }

  _paintMic() {
    const btn = this.panel.querySelector('[data-act="mic"]');
    if (!btn) return;
    const { state, muted } = this.voice;
    const [label, hint] = {
      unsupported: ['🎤 Sin micro', 'Este navegador no deja usar el micrófono'],
      off: ['🎤 Activar micro', 'Para hablar con tu compañero'],
      asking: ['🎤 Pidiendo permiso…', 'Acepta el permiso del navegador'],
      denied: ['🎤 Micro bloqueado', 'Permite el micrófono en el candado de la barra de direcciones y vuelve a intentar'],
      on: muted ? ['🔇 Silenciado', 'Clic para volver a hablar'] : ['🎙️ Micro activo', 'Clic para silenciarte'],
    }[state];
    btn.textContent = label;
    btn.disabled = state === 'unsupported' || state === 'asking';
    btn.classList.toggle('bad', state === 'on' && muted);
    btn.classList.toggle('go', state === 'on' && !muted);
    this.panel.querySelector('.ol-mic-hint').textContent = hint;
  }

  /** Anillo alrededor de tu avatar que late con tu voz. */
  _startMeter() {
    cancelAnimationFrame(this._raf);
    const loop = () => {
      if (!this.room) return;
      const avatar = this.panel.querySelector('.ol-slot.me .ol-avatar');
      avatar?.style.setProperty('--lvl', this.voice.level().toFixed(2));
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }
}

function slotHtml(player, i, meId) {
  const slot = `p${i + 1}`;
  if (!player) {
    return `<div class="ol-slot empty" data-slot="${slot}">
      <span class="m-badge">${slot.toUpperCase()}</span>
      <span class="ol-avatar">?</span>
      <b>Esperando…</b>
      <span class="ol-state">Pásale el código</span>
    </div>`;
  }
  const me = player.id === meId;
  const tags = [player.host && 'Anfitrión', me && 'Tú'].filter(Boolean).join(' · ');
  return `<div class="ol-slot${player.ready ? ' ready' : ''}${me ? ' me' : ''}" data-slot="${slot}">
    <span class="m-badge">${slot.toUpperCase()}</span>
    <span class="ol-avatar">${esc(player.username.slice(0, 1).toUpperCase())}</span>
    <b>${esc(player.username)}</b>
    <span class="ol-tags">${tags}</span>
    <span class="ol-state">${player.ready ? '✔ Listo' : 'Preparándose…'}</span>
  </div>`;
}

const emailHtml = (linking) => /* html */ `
  <header class="ol-head">
    <h2>${linking ? 'Guardar cuenta' : 'Multijugador'}</h2>
    <p>${
      linking
        ? 'Agrega tu correo y conservas tu nombre y tus récords. Sin contraseña.'
        : 'Entra con tu correo: te mandamos un enlace mágico, sin contraseña.'
    }</p>
  </header>
  <form class="ol-form" data-form="email" novalidate>
    <input class="ol-input" name="email" type="email" autocomplete="email" placeholder="tu@correo.com" />
    <p class="ol-error" aria-live="polite"></p>
    <button type="submit" class="btn big go">Enviar enlace</button>
  </form>
  ${
    linking
      ? '<button type="button" class="btn light" data-act="back">Cancelar</button>'
      : `<div class="ol-or"><span>o</span></div>
  <button type="button" class="btn" data-act="guest">👤 Jugar como invitado</button>
  <p class="ol-help">Solo eliges un nombre. Puedes guardar tu cuenta con correo después.</p>
  <button type="button" class="btn light" data-act="close">Volver al menú</button>`
  }`;

const sentHtml = (demo, linking) => /* html */ `
  <header class="ol-head">
    <h2>Revisa tu correo</h2>
    <p>Te mandamos un enlace a <b class="ol-email"></b>. Ábrelo en este mismo navegador y ${
      linking ? 'tu cuenta queda guardada' : 'entras solo'
    }.</p>
  </header>
  <div class="ol-wait"><span class="ol-spinner"></span>Esperando el enlace…</div>
  ${demo ? '<p class="ol-help">Modo demo: el enlace se abre solo en unos segundos.</p>' : ''}
  <p class="ol-error" aria-live="polite"></p>
  <div class="ol-actions">
    <button type="button" class="btn light" data-act="resend">Reenviar</button>
    <button type="button" class="btn light" data-act="back">Cambiar correo</button>
  </div>`;

const usernameHtml = (editing) => /* html */ `
  <header class="ol-head">
    <h2>${editing ? 'Cambiar nombre' : 'Tu nombre'}</h2>
    <p>Así te ven en la sala y en el ranking.</p>
  </header>
  <form class="ol-form" data-form="username" novalidate>
    <div class="ol-field">
      <input class="ol-input" name="username" maxlength="${USERNAME_MAX}" autocomplete="nickname" spellcheck="false" placeholder="TuNombre" />
      <span class="ol-count"></span>
    </div>
    <p class="ol-help">3 a ${USERNAME_MAX} · letras, números y _</p>
    <p class="ol-error" aria-live="polite"></p>
    <button type="submit" class="btn big go">Guardar</button>
  </form>
  ${
    editing
      ? '<button type="button" class="btn light" data-act="back">Cancelar</button>'
      : '<div class="ol-actions"><button type="button" class="btn light" data-act="close">Volver al menú</button><button type="button" class="btn light" data-act="sign-out">Entrar de otra forma</button></div>'
  }`;

const LOBBY_HTML = /* html */ `
  <header class="ol-head">
    <h2>Multijugador</h2>
    <div class="ol-user">
      <span class="ol-avatar"></span>
      <b class="ol-name"></b>
      <button type="button" class="btn light small" data-act="edit-name">Editar</button>
      <button type="button" class="btn light small" data-act="sign-out">Salir</button>
    </div>
    <p class="ol-guest" hidden>
      Juegas como invitado: si sales, pierdes este nombre.
      <button type="button" class="ol-link" data-act="link">Guardar con correo</button>
    </p>
  </header>
  <div class="ol-cards">
    <section class="ol-card">
      <h3>Crear sala</h3>
      <p>Te damos un código para tu compañero.</p>
      <button type="button" class="btn go" data-act="create">Crear sala</button>
    </section>
    <form class="ol-card" data-form="join" novalidate>
      <h3>Unirse</h3>
      <p>Escribe el código de tu compañero.</p>
      <input class="ol-input ol-code-input" name="code" maxlength="${ROOM_CODE_LEN}" autocomplete="off" spellcheck="false" placeholder="${'·'.repeat(ROOM_CODE_LEN)}" />
      <button type="submit" class="btn">Unirse</button>
    </form>
  </div>
  <p class="ol-error" aria-live="polite"></p>
  <button type="button" class="btn light" data-act="close">Volver al menú</button>`;

const ROOM_HTML = /* html */ `
  <header class="ol-head">
    <h2>Sala</h2>
    <p class="ol-map"></p>
  </header>
  <div class="ol-code-row">
    <span class="ol-code" aria-label="Código de la sala"></span>
    <button type="button" class="btn light small" data-act="copy">Copiar</button>
  </div>
  <div class="ol-slots"></div>
  <div class="ol-mic">
    <button type="button" class="btn light" data-act="mic"></button>
    <p class="ol-help ol-mic-hint"></p>
  </div>
  <p class="ol-banner" aria-live="polite"></p>
  <div class="ol-actions">
    <button type="button" class="btn big" data-act="ready">Listo</button>
    <button type="button" class="btn bad" data-act="leave">Salir de la sala</button>
  </div>`;

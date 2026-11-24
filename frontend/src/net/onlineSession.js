// Modo online completo: lobby (ui/lobby.js) ↔ partida (net/onlineMatch.js + GameView + UI + audio).
// main.js solo llama open() / update(dt, input) y recibe onExit() al volver al menú.
//
//   conectar → crear / unirse / mirar → sala (dúos, personajes, listo) → match:start → cuenta atrás → partida
//   → match:end (resultados) → room:state 'lobby' → otra vez la sala
//
// Reconexión: si se corta, reintenta solo con el MISMO token (mismo usuario). El servidor guarda el puesto durante
// la gracia (RECONNECT_GRACE_MS) y, si había partida, reenvía match:start {resume} + snapshot.
// Mirar: espectador, o cuando mi dúo ya llegó / se quedó sin vidas → Q / E (o ◀ ▶) cambian de dúo.
import { DEFAULT_CHARS } from '../characterIds.js';
import { Emitter } from '../sim/events.js';
import { Lobby } from '../ui/lobby.js';
import { OnlineHud } from '../ui/onlineHud.js';
import { UI } from '../ui/ui.js';
import { GameView } from '../view/gameView.js';
import { NetClient, savedNickname } from './netClient.js';
import { InputSender, OnlineMatch } from './onlineMatch.js';

const ERRORS = {
  OFFLINE: 'No se pudo conectar con el servidor online.',
  ROOM_NOT_FOUND: 'Esa sala no existe.',
  ROOM_FULL: 'La sala está llena.',
  ROOM_IN_GAME: 'Esa sala ya está jugando.',
  SLOT_TAKEN: 'Ese puesto ya está ocupado.',
};
const msgOf = (err) => ERRORS[err?.code] ?? err?.message ?? 'Algo salió mal';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** chars/alt de un dúo de match:start para PlayerView. */
function duoLook(duo) {
  const [p1, p2] = duo.players;
  return { chars: { p1: p1.char ?? DEFAULT_CHARS.p1, p2: p2.char ?? DEFAULT_CHARS.p2 }, alt: { p1: !!p1.alt, p2: !!p2.alt } };
}

export class OnlineSession {
  /**
   * @param {{ app, palette, audio, stage, uiRoot: HTMLElement, maps: object[], onExit: () => void }} deps
   */
  constructor({ app, palette, audio, stage, uiRoot, maps, onExit }) {
    Object.assign(this, { app, palette, audio, stage, uiRoot, onExit });
    this.net = new NetClient();
    this.active = false;
    this.run = null; // { match, start, view, ui, hud, sender, countdownEnd, shown, ended }
    this.room = null;
    this._roomStamp = 0; // cuenta los room:state (para saber si la sala sigue tras reconectar)
    this._leaving = false;
    this._reconnecting = false;
    const root = document.createElement('div');
    root.id = 'online';
    document.body.appendChild(root);
    this.lobby = new Lobby(root, {
      maps,
      nickname: savedNickname(),
      on: {
        connect: (nick) => this.connect(nick),
        create: (o) => this._req('room:create', o),
        join: (code) => this.join(code),
        spectate: (code) => this._req('room:spectate', { code }),
        stand: () => this._req('room:setTeam', { teamId: null }),
        leave: () => this.leaveRoom(),
        seat: (teamId, slots) => this._req('room:setTeam', { teamId, slots }),
        ready: (ready) => this._req('room:ready', { ready }),
        chars: (c) => this._req('room:setChars', c),
        settings: (s) => this._req('room:settings', s),
        start: () => this._req('room:start'),
        kick: (userId) => this._req('room:kick', { userId }),
        refresh: () => this.refreshRooms(),
        back: () => this.exit(),
      },
    });
    this._bindNet();
  }

  get inMatch() {
    return !!this.run;
  }

  // ------------------------------------------------------------------ abrir / cerrar

  open() {
    this.active = true;
    this._leaving = false;
    this.lobby.show(true);
    if (this.room) return this.lobby.screen('room');
    this.lobby.screen('connect');
    if (this.net.connected) return this.refreshRooms();
    const nick = savedNickname();
    if (nick) this.connect(nick);
  }

  exit() {
    this._leaving = true;
    this.endRun();
    this.net.close();
    this.room = null;
    this.lobby.setConnected(null);
    this.lobby.show(false);
    this.active = false;
    this.onExit();
  }

  async connect(nick) {
    this.lobby.busy(true);
    try {
      await this.net.connect(nick);
      this.lobby.setConnected(this.net.user);
      this.lobby.error('');
      await this.refreshRooms();
    } catch (err) {
      this.lobby.setConnected(null);
      this.lobby.error(msgOf(err));
    } finally {
      this.lobby.busy(false);
    }
  }

  async refreshRooms() {
    this.lobby.setPublicRooms(await this.net.publicRooms());
  }

  /** Unirse; si la sala ya está jugando, se entra a mirar. */
  async join(code) {
    try {
      await this.net.request('room:join', { code });
    } catch (err) {
      if (err.code !== 'ROOM_IN_GAME') return this.lobby.error(msgOf(err));
      await this._req('room:spectate', { code });
    }
  }

  async leaveRoom() {
    await this._req('room:leave');
    this.room = null;
    this.endRun();
    this.lobby.show(true);
    this.lobby.screen('connect');
    this.refreshRooms();
  }

  async _req(t, d) {
    try {
      return await this.net.request(t, d);
    } catch (err) {
      this.lobby.error(msgOf(err));
      return null;
    }
  }

  // ------------------------------------------------------------------ red

  _bindNet() {
    const net = this.net;
    net.on('room:state', (room) => {
      this.room = room;
      this._roomStamp++;
      this.lobby.setRoom(room);
      if (this.run?.ended && room.state === 'lobby') this.endRun();
      if (!this.run && this.active && this.lobby.current !== 'results') {
        this.lobby.show(true);
        this.lobby.screen('room');
      }
      if (!this.run && this.lobby.current === 'results' && room.state === 'lobby') this.lobby.screen('room');
    });
    net.on('room:kicked', () => {
      this.room = null;
      this.endRun();
      this.lobby.show(true);
      this.lobby.screen('connect');
      this.lobby.error('El anfitrión te sacó de la sala.');
    });
    net.on('match:start', (start) => this.startRun(start));
    net.on('match:snapshot', (snap) => this.run?.match.onSnapshot(snap));
    net.on('match:events', (d) => this.run?.match.onEvents(d.events));
    net.on('match:end', (end) => {
      if (!this.run) return;
      this.run.ended = true;
      this.lobby.showResults(end, { myDuo: this.run.match.mine?.id ?? null });
    });
    net.on('close', () => {
      if (this._leaving || !this.active) return;
      if (this.run) this.run.hud.setBanner('Reconectando…');
      else this.lobby.error('Se cortó la conexión. Reconectando…');
      this._reconnect();
    });
  }

  /** Reintenta con el mismo token hasta volver (o hasta salir del modo online). */
  async _reconnect() {
    if (this._reconnecting) return;
    this._reconnecting = true;
    const hadRoom = !!this.room;
    const stamp = this._roomStamp; // si vuelvo a tiempo, el servidor me manda room:state al conectar
    let delay = 500;
    while (this.active && !this._leaving && !this.net.connected) {
      await sleep(delay);
      if (!this.active || this._leaving) break;
      try {
        await this.net.connect(savedNickname(), { retry: false });
      } catch {
        delay = Math.min(delay * 2, 5000);
      }
    }
    this._reconnecting = false;
    if (!this.net.connected) return;
    this.lobby.setConnected(this.net.user);
    this.lobby.error('');
    this.run?.hud.setBanner(null);
    // Si no llegó ningún room:state desde que empezó la reconexión, la gracia venció y ya no estoy en la sala.
    await sleep(1200);
    if (hadRoom && this._roomStamp === stamp && this.active) {
      this.room = null;
      this.endRun();
      this.lobby.show(true);
      this.lobby.screen('connect');
      this.lobby.error('Tardaste mucho en volver: saliste de la sala.');
      this.refreshRooms();
    }
  }

  // ------------------------------------------------------------------ partida

  startRun(start) {
    // Reanudar la MISMA partida (reconexión): se conserva el dúo que estaba mirando.
    const prevFocus = this.run?.start.matchId === start.matchId ? this.run.match.focus.id : null;
    this.endRun();
    const match = new OnlineMatch(start, this.net.user?.id ?? null, {
      onGlassBroken: (ids) => ids.forEach((id) => this.run?.view.level.shatter(id)),
    });
    if (prevFocus !== null && match.canWatch) match.setFocus(prevFocus);
    // El servidor manda el mundo del dúo que cree que miro: que coincida con el del cliente.
    if (match.canWatch && (start.resume || start.spectate)) this.net.request('match:watch', { duo: match.focus.id }).catch(() => {});
    const now = performance.now() / 1000;
    this.run = {
      match,
      start,
      sender: new InputSender((t, d) => this.net.send(t, d)),
      countdownEnd: start.resume || start.spectate ? now : now + start.countdownSec,
      shown: false,
      ended: false,
    };
    this._buildView(this.run);
    this.stage.show(false);
    this.lobby.show(false);
    // Para depurar desde la consola: window.online.run.match.duos[0].game …
    window.online = this;
  }

  /**
   * Vista, UI, audio y HUD sobre el dúo enfocado. Se rehace al cambiar de dúo mirado. Antes de rehacerla se cambia
   * el `events` de cada Game por uno nuevo: así no quedan escuchando la UI / el audio / la vista anteriores
   * (esos Game no simulan; solo OnlineMatch emite en ellos).
   */
  _buildView(r) {
    this._destroyView(r);
    for (const d of r.match.duos) d.game.events = new Emitter();
    const focus = r.match.focus;
    const lookOf = (id) => duoLook(r.start.duos.find((d) => d.id === id));
    r.view = new GameView(this.app, focus.game, this.palette, { chars: lookOf(focus.id).chars });
    for (const d of r.match.duos) if (d !== focus) r.view.addDuo(d.game, lookOf(d.id));
    // Vidrios que ese dúo ya rompió antes de empezar a mirarlo.
    for (const st of focus.game.world.statics) if (st.def?.kind === 'glass' && st.broken) r.view.level.shatter(st.def.id);
    r.ui = new UI(this.uiRoot, focus.game, this.palette, { online: true, audio: this.audio, onMenu: () => this.leaveRoom() });
    if (focus.game.state !== 'title') r.ui.show('playing');
    this.audio.stopAll();
    this.audio.bind(focus.game.events, focus.game.level);
    r.hud = new OnlineHud(r.match, { onLeave: () => this.leaveRoom(), onWatch: (dir) => this.watch(dir) });
  }

  _destroyView(r) {
    r.hud?.destroy();
    r.ui?.destroy();
    r.view?.destroy();
    r.hud = r.ui = r.view = null;
  }

  /** Cambia el dúo que miro (solo si puedo mirar). */
  watch(dir) {
    const r = this.run;
    if (!r || !r.match.canWatch) return;
    const duo = r.match.cycleFocus(dir);
    if (!duo) return;
    this.net.request('match:watch', { duo: duo.id }).catch(() => {});
    this._buildView(r);
  }

  endRun() {
    const r = this.run;
    if (!r) return;
    this.run = null;
    this._destroyView(r);
    this.audio.stopAll();
    this.lobby.showCountdown(null);
    this.stage.show(true);
  }

  /** Cada frame mientras el modo online está abierto. */
  update(dt, input) {
    const r = this.run;
    if (!r) {
      if (input.wasPressed('Escape') && this.lobby.current === 'connect') this.exit();
      return;
    }
    if (r.match.canWatch) {
      if (input.wasPressed('KeyQ')) this.watch(-1);
      else if (input.wasPressed('KeyE')) this.watch(1);
    }
    this._sendInputs(r, input);
    r.match.update();
    const game = r.match.focus.game;
    if (!r.shown && game.state !== 'title') {
      r.shown = true;
      r.ui.show('playing');
    }
    r.view.update(dt);
    r.ui.update(dt);
    this.audio.update(game);
    r.hud.update();
    const left = r.countdownEnd - performance.now() / 1000;
    this.lobby.showCountdown(left > 0 ? Math.ceil(left) : left > -0.8 && !r.start.resume && !r.start.spectate ? 0 : null);
  }

  /** 1 slot: vale cualquiera de los dos juegos de teclas. 2 slots (sofá): WASD = P1, flechas = P2. */
  _sendInputs(r, input) {
    const slots = r.match.mySlots;
    if (!slots.length || r.match.mine.status !== 'racing') return;
    const a = input.player('p1');
    const b = input.player('p2');
    if (slots.length === 2) {
      r.sender.update(1, a);
      r.sender.update(2, b);
      return;
    }
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    r.sender.update(slots[0], {
      x: clamp(a.x + b.x),
      z: clamp(a.z + b.z),
      jumpPressed: a.jumpPressed || b.jumpPressed,
      jumpHeld: a.jumpHeld || b.jumpHeld,
    });
  }
}

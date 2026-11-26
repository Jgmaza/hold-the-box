// Partida online en el cliente. Sin PlayCanvas (se testea con vitest).
//
// Un `Game` por dúo, del mismo nivel y semilla que el servidor, que NUNCA se simula: solo guarda el estado que
// llega en los snapshots (codec net/duoState.js). Las vistas, la UI y el audio leen esos `Game` como en local.
//
//   · Render ~INTERP_DELAY por detrás del último snapshot: se interpolan posiciones de jugadores y caja entre los
//     dos snapshots que rodean ese instante; el resto del estado se vuelca tal cual.
//   · Los eventos (`match:events`) se disparan en el `game.events` del dúo cuando el render llega a su tiempo `t`,
//     así el sonido y las partículas coinciden con lo que se ve.
//   · `own` (mundo del dúo que estoy viendo: NPCs, clima, vidrios…) se vuelca sobre el Game de ese dúo. Es el mío
//     mientras corro; si miro (espectador, o mi dúo ya terminó) es el que elegí con match:watch.
import { selectBox } from '../config.js';
import { LEVELS } from '../levels/index.js';
import { Game } from '../sim/game.js';
import { applyLightDuoState, applyWorldDuoState } from './duoState.js';

/** Atraso del render respecto al reloj servidor. Bajo = más responsive; alto = más suave si hay jitter. */
export const INTERP_DELAY = 0.05; // s (antes 0.1; con snapshots a 30 Hz ~1.5 intervalos)
const MAX_BUFFER = 30;
const SNAP_DIST = 3; // m: si un jugador/caja salta más que esto entre snapshots (respawn), no se interpola

const lerp = (a, b, t) => a + (b - a) * t;
// El wire va cuantizado (net/duoState.js): pos/center en cm, tilt en 0,1°, unitarios ×1000, tiempos ×100.
// Al interpolar se divide por estos factores para volver a metros/segundos.
const CM = 100;
const DEG = 10;
const UNIT = 1000;
const T100 = 100;
const far = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > SNAP_DIST * CM;

export class OnlineMatch {
  /**
   * @param {object} start  `match:start` del servidor
   * @param {string|null} myUserId
   * @param {{ now?: () => number, onGlassBroken?: (ids: string[]) => void }} opts
   */
  constructor(start, myUserId, { now = () => performance.now() / 1000, onGlassBroken = () => {} } = {}) {
    this.start = start;
    this.level = LEVELS[start.level];
    this.now = now;
    this.onGlassBroken = onGlassBroken;
    selectBox(start.boxProfile);
    this.duos = start.duos.map((d) => ({
      id: d.id,
      players: d.players, // [{ slot, userId, name, char, alt }]
      game: new Game(this.level, { seed: start.seed }),
      status: 'waiting',
      online: { 1: true, 2: true },
      ghost: false,
    }));
    this.byId = new Map(this.duos.map((d) => [d.id, d]));
    this.mine = this.duos.find((d) => d.players.some((p) => p.userId === myUserId)) ?? null;
    /** Slots que controlo yo (1, 2 o los dos en dúo de sofá). */
    this.mySlots = this.mine ? this.mine.players.filter((p) => p.userId === myUserId).map((p) => p.slot) : [];
    /** Dúo que sigue la cámara: el mío o, si solo miro, el primero. */
    this.focus = this.mine ?? this.duos[0];
    this.spectating = !this.mine;
    this.buffer = [];
    this.events = [];
    this.renderTime = 0;
    this._lastServerTime = 0;
    this._lastAt = 0;
    if (start.snapshot) this._applyCommon(start.snapshot.duos, start.snapshot.duos, 0);
  }

  get myDuo() {
    return this.mine;
  }

  /** ¿Puedo elegir a quién mirar? Espectador, o mi dúo ya llegó / se quedó sin vidas. */
  get canWatch() {
    return !this.mine || this.mine.status === 'finished' || this.mine.status === 'eliminated';
  }

  /** Siguiente / anterior dúo a mirar (dir ±1). Devuelve el dúo nuevo o null si no cambia. */
  cycleFocus(dir) {
    if (this.duos.length < 2) return null;
    const i = this.duos.indexOf(this.focus);
    return this.setFocus(this.duos[(i + dir + this.duos.length) % this.duos.length].id);
  }

  setFocus(id) {
    const d = this.byId.get(id);
    if (!d || d === this.focus) return null;
    this.focus = d;
    return d;
  }

  /** Nombres de un dúo para mostrar ("Ana y Beto"). */
  duoName(id) {
    const d = this.byId.get(id);
    if (!d) return `Dúo ${id + 1}`;
    const names = [...new Set(d.players.map((p) => p.name))];
    return names.join(' y ');
  }

  // ------------------------------------------------------------------ entrada de red

  onSnapshot(snap) {
    const at = this.now();
    this.buffer.push({ ...snap, at });
    if (this.buffer.length > MAX_BUFFER) this.buffer.shift();
    this._lastServerTime = snap.time;
    this._lastAt = at;
    const ownDuo = snap.own ? this.byId.get(snap.own.id) : null;
    if (ownDuo) {
      const broken = applyWorldDuoState(ownDuo.game, snap.own);
      if (broken.length && ownDuo === this.focus) this.onGlassBroken(broken);
    }
  }

  onEvents(list) {
    for (const e of list) this.events.push(e);
    this.events.sort((a, b) => a.t - b.t);
  }

  // ------------------------------------------------------------------ cada frame

  /** Reloj de partida estimado del servidor ahora mismo. */
  serverTime() {
    if (!this.buffer.length) return 0;
    return this._lastServerTime + (this.now() - this._lastAt);
  }

  update() {
    if (!this.buffer.length) return;
    const rt = Math.max(0, this.serverTime() - INTERP_DELAY);
    this.renderTime = rt;
    const buf = this.buffer;
    let a = buf[0];
    let b = buf[buf.length - 1];
    for (let i = buf.length - 1; i > 0; i--) {
      if (buf[i - 1].time <= rt) {
        a = buf[i - 1];
        b = buf[i];
        break;
      }
    }
    if (rt >= b.time) a = b; // sin snapshot nuevo: nos quedamos en el último
    const span = b.time - a.time;
    const t = span > 1e-6 ? Math.min(1, Math.max(0, (rt - a.time) / span)) : 1;
    this._applyCommon(a.duos, b.duos, t);
    // Descartar lo que ya quedó atrás (dejando uno anterior para interpolar).
    while (buf.length > 2 && buf[1].time <= rt) buf.shift();
    this._fireEvents(rt);
  }

  _applyCommon(prevDuos, nextDuos, t) {
    const prev = new Map(prevDuos.map((d) => [d.id, d]));
    for (const s of nextDuos) {
      const duo = this.byId.get(s.id);
      if (!duo) continue;
      duo.status = s.status;
      duo.online = s.online;
      duo.ghost = s.ghost;
      const g = duo.game;
      applyLightDuoState(g, s);
      const p = prev.get(s.id);
      if (!p || t >= 1) continue;
      s.players.forEach((ps, i) => {
        const pa = p.players[i].pos;
        if (far(pa, ps.pos)) return;
        const pos = g.players[i].pos;
        pos.x = lerp(pa[0], ps.pos[0], t) / CM;
        pos.y = lerp(pa[1], ps.pos[1], t) / CM;
        pos.z = lerp(pa[2], ps.pos[2], t) / CM;
      });
      if (!far(p.box.center, s.box.center)) {
        const c = g.box.center;
        c.x = lerp(p.box.center[0], s.box.center[0], t) / CM;
        c.y = lerp(p.box.center[1], s.box.center[1], t) / CM;
        c.z = lerp(p.box.center[2], s.box.center[2], t) / CM;
        g.box.tilt.roll = lerp(p.box.tilt[0], s.box.tilt[0], t) / DEG;
        g.box.tilt.pitch = lerp(p.box.tilt[1], s.box.tilt[1], t) / DEG;
        g.box.axis.x = lerp(p.box.axis[0], s.box.axis[0], t) / UNIT;
        g.box.axis.z = lerp(p.box.axis[1], s.box.axis[1], t) / UNIT;
        const m = Math.hypot(g.box.axis.x, g.box.axis.z) || 1;
        g.box.axis.x /= m;
        g.box.axis.z /= m;
        g.box.forward.x = -g.box.axis.z;
        g.box.forward.z = g.box.axis.x;
      }
      g.time = lerp(p.time, s.time, t) / T100;
    }
    // Plataformas, rodillos y chorros dependen solo del reloj del mundo.
    const fg = this.focus?.game;
    if (fg) fg.world.update(fg.time);
  }

  _fireEvents(rt) {
    let n = 0;
    while (n < this.events.length && this.events[n].t <= rt) n++;
    if (!n) return;
    const due = this.events.splice(0, n);
    for (const e of due) this.byId.get(e.duo)?.game.events.emit(e.e, e.d);
  }
}

/**
 * Manda `input` al servidor: ~60 Hz y en cuanto cambia algo. El salto se guarda hasta enviarse (no se pierde
 * aunque se pulse entre dos envíos).
 */
export class InputSender {
  /** @param {(t: string, d: object) => void} send */
  constructor(send, { hz = 60, now = () => performance.now() / 1000 } = {}) {
    this.send = send;
    this.every = 1 / hz;
    this.now = now;
    this.slots = new Map(); // slot → { seq, last, at, jump }
  }

  /** @param {1|2} slot  @param {{x, z, jumpPressed, jumpHeld}} inp */
  update(slot, inp) {
    let s = this.slots.get(slot);
    if (!s) this.slots.set(slot, (s = { seq: 0, last: null, at: -Infinity, jump: false }));
    if (inp.jumpPressed) s.jump = true;
    const key = `${inp.x},${inp.z},${inp.jumpHeld}`;
    const t = this.now();
    if (key === s.last && !s.jump && t - s.at < this.every) return;
    s.seq++;
    s.last = key;
    s.at = t;
    this.send('input', { seq: s.seq, slot, x: inp.x, z: inp.z, jump: s.jump, jumpHeld: !!inp.jumpHeld });
    s.jump = false;
  }
}

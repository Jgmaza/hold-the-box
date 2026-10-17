// Escena 3D del menú: un muelle con los dos personajes en pedestales que giran y la caja escogida en el medio.
// El escenario (cielo, mar, islas, muelle, utilería) está en menuScenery.js.
// Solo se ve mientras no hay partida (main.js la apaga al empezar y la prende al volver al menú).
//   giro idle: el pedestal da vueltas lento
//   cambio de personaje: latigazo de 360° + se encoge, cambia el modelo y rebota
//   LISTO: salta, mira a la cámara, brazos arriba y confeti
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { Bomb } from '../sim/bomb.js';
import { Box } from '../sim/box.js';
import { Cat } from '../sim/cat.js';
import { Emitter } from '../sim/events.js';
import { BoxView } from './boxView.js';
import { buildCharacter } from './characters.js';
import { Gfx } from './gfx.js';
import { DECK_TOP, MenuScenery } from './menuScenery.js';
import { Particles } from './particles.js';

const SLOT_X = { p1: -1.9, p2: 1.9 };
const RING = { p1: 'water', p2: 'p2' };
const PEDESTAL_TOP = 0.35;
const IDLE_SPIN = 40; // °/s
const WHIP_TIME = 0.75; // s del latigazo de 360°
const SWAP_AT = 0.16; // s: el modelo se cambia cuando está encogido y girando rápido
const GRAVITY = 22;
const FOV = 40;
const WIDE = 1.25; // desde este ancho/alto el Inicio pone el logo a la izquierda y la escena a la derecha

const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeOutElastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1);
const approach = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

export class MenuStage {
  constructor(app, palette) {
    this.app = app;
    this.root = new pc.Entity('menu');
    app.root.addChild(this.root);
    this.gfx = new Gfx(app, palette, this.root);
    this.time = 0;
    this.screen = 'home';
    this._v = new pc.Vec3();
    this._out = new pc.Vec3();

    this._buildSet();
    this.particles = new Particles(this.gfx, 90);
    this.particles.waterLevel = -2;
    this.slots = { p1: this._buildSlot('p1'), p2: this._buildSlot('p2') };
    this._buildBox();
    this._applyScene();
  }

  // ---------------------------------------------------------------- escena

  _buildSet() {
    const g = this.gfx;
    this.camera = new pc.Entity('menu-camera');
    this.camera.addComponent('camera', { clearColor: g.color('sky'), fov: FOV, nearClip: 0.1, farClip: 500 });
    this.root.addChild(this.camera);

    const sun = new pc.Entity('menu-sol');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 0.97, 0.9),
      intensity: 1.15,
      castShadows: true,
      shadowDistance: 24,
      shadowResolution: 2048,
      shadowBias: 0.3,
      normalOffsetBias: 0.05,
      shadowIntensity: 0.6,
    });
    sun.setLocalEulerAngles(55, 30, 0);
    this.root.addChild(sun);

    this.scenery = new MenuScenery(g);
  }

  _buildSlot(slot) {
    const g = this.gfx;
    const x = SLOT_X[slot];
    g.prim('cylinder', g.solid('wood', { mul: 0.85 }), { pos: [x, (DECK_TOP + PEDESTAL_TOP) / 2, 0], scale: [1.5, PEDESTAL_TOP - DECK_TOP, 1.5], name: 'pedestal' });
    const ringMat = g.dynamic(RING[slot]);
    g.prim('cylinder', ringMat, { pos: [x, PEDESTAL_TOP, 0], scale: [1.62, 0.07, 1.62], name: 'aro' });
    g.prim('cylinder', g.solid('box', { mul: 1.1 }), { pos: [x, PEDESTAL_TOP + 0.01, 0], scale: [1.3, 0.07, 1.3], name: 'tapa' });

    const pivot = g.group(`menu-${slot}`, null, [x, PEDESTAL_TOP + 0.045, 0]);
    const hop = g.group('hop', pivot);
    const s = {
      slot,
      pivot,
      hop,
      ringMat,
      model: null,
      rigs: [],
      id: null,
      alt: false,
      yaw: slot === 'p1' ? 200 : 160,
      whip: -1,
      pending: null,
      hopY: 0,
      hopV: 0,
      ready: false,
      arm: -35,
      phase: slot === 'p1' ? 0 : 1.7,
    };
    return s;
  }

  _rebuild(s, id, alt) {
    s.model?.destroy();
    s.model = this.gfx.group('modelo', s.hop);
    s.rigs = buildCharacter(this.gfx, s.model, id, { alt });
    s.id = id;
    s.alt = alt;
  }

  /** La caja de verdad (BoxView) sobre un banquito, con sim falsa: gira y el gato se asoma de vez en cuando. */
  _buildBox() {
    const g = this.gfx;
    const standTop = 0.45;
    g.prim('cylinder', g.solid('plank'), { pos: [0, (DECK_TOP + standTop) / 2, 0.2], scale: [0.95, standTop - DECK_TOP, 0.95], name: 'banco' });
    this.box = new Box(new Emitter());
    this.cat = new Cat();
    this.bomb = new Bomb();
    this.boxView = new BoxView(g, this.box, this.particles, this.cat, this.bomb);
    this.boxBase = standTop + CONFIG.box.size.h / 2;
    this.boxHopY = 0;
    this.boxHopV = 0;
  }

  /** Sin niebla: el domo del cielo ya hace el degradado al horizonte. La partida pone la suya al crearse. */
  _applyScene() {
    const scene = this.app.scene;
    scene.ambientLight = new pc.Color(0.56, 0.6, 0.68);
    scene.fog.type = pc.FOG_NONE;
  }

  // ---------------------------------------------------------------- API para el menú

  show(on) {
    this.root.enabled = on;
    if (on) this._applyScene();
  }

  setScreen(screen) {
    this.screen = screen;
  }

  /** Cambia el personaje de un pedestal. `instant`: sin animación (al abrir el menú). */
  setChar(slot, id, alt, { instant = false } = {}) {
    const s = this.slots[slot];
    if (s.id === id && s.alt === alt && !s.pending) return;
    if (instant || !s.model) {
      this._rebuild(s, id, alt);
      return;
    }
    s.pending = { id, alt };
    s.whip = 0;
    s.hopV = Math.max(s.hopV, 3.5);
  }

  setReady(slot, ready) {
    const s = this.slots[slot];
    if (s.ready === ready) return;
    s.ready = ready;
    s.ringMat.diffuse = this.gfx.color(ready ? 'goal' : RING[slot]);
    s.ringMat.update();
    if (!ready) return;
    s.hopV = 7;
    const p = s.pivot.getPosition();
    for (const color of ['goal', 'ui', 'p2', 'water']) this.particles.burst(p.x, p.y + 1.7, p.z, 9, { color, speed: 3, up: 6, life: 1.1, size: 0.09 });
  }

  /** Saltito de la caja al escogerla. */
  bumpBox() {
    this.boxHopV = 4.5;
  }

  /** Dónde queda en pantalla (px CSS) el frente del pedestal: ahí se pone el panel de cada jugador. */
  anchor(slot) {
    this._v.set(SLOT_X[slot], DECK_TOP, 0.85);
    return this.camera.camera.worldToScreen(this._v, this._out);
  }

  // ---------------------------------------------------------------- frame

  update(dt) {
    if (!this.root.enabled) return;
    this.time += dt;
    this._updateCamera(dt);
    this.scenery.update(dt, this.time);
    for (const s of Object.values(this.slots)) this._updateSlot(s, dt);
    this._updateBox(dt);
    this.particles.update(dt);
  }

  /**
   * Encuadre por pantalla. En Inicio y Mapas (pantalla ancha) la escena se corre a la derecha y se ve en 3/4,
   * así el logo y los botones de la izquierda no tapan a nadie. En Personajes queda centrada y más cerca.
   */
  _shot(aspect) {
    const wide = aspect >= WIDE;
    if (this.screen === 'chars') return { lookX: 0, side: 0, dist: 6.4, lookY: 0.3 };
    return wide ? { lookX: -2.4, side: -1.6, dist: 8.4, lookY: 0.75 } : { lookX: 0, side: 0, dist: 7.4, lookY: 0.85 };
  }

  _updateCamera(dt) {
    const { width, height } = this.app.graphicsDevice.clientRect;
    const aspect = width / Math.max(1, height);
    const shot = this._shot(aspect);
    // Que quepan los dos pedestales a lo ancho, también en pantallas angostas.
    shot.dist = Math.max(shot.dist, 3.3 / (Math.tan(((FOV / 2) * Math.PI) / 180) * aspect));
    const c = (this._cam ??= { ...shot });
    for (const k of Object.keys(shot)) c[k] = approach(c[k], shot[k], 3.5, dt);
    const sway = Math.sin(this.time * 0.25) * 0.3;
    this.camera.setPosition(c.lookX + c.side + sway, 1.55 + c.dist * 0.12, c.dist);
    this.camera.lookAt(c.lookX, c.lookY, 0);
  }

  _updateSlot(s, dt) {
    if (!s.model) return;
    const t = this.time;
    if (s.ready) {
      // Listo: deja de girar y mira a la cámara.
      const face = 360 * Math.round((s.yaw - 180) / 360) + 180;
      s.yaw = approach(s.yaw, face, 7, dt);
    } else {
      s.yaw += IDLE_SPIN * dt;
    }

    let extra = 0;
    let scale = 1;
    if (s.whip >= 0) {
      s.whip += dt;
      extra = 360 * easeOutCubic(Math.min(1, s.whip / WHIP_TIME));
      if (s.pending && s.whip >= SWAP_AT) {
        this._rebuild(s, s.pending.id, s.pending.alt);
        s.pending = null;
      }
      scale = s.whip < SWAP_AT ? 1 - 0.75 * (s.whip / SWAP_AT) : 0.25 + 0.75 * easeOutElastic((s.whip - SWAP_AT) / (WHIP_TIME - SWAP_AT));
      if (s.whip >= WHIP_TIME) s.whip = -1;
    }
    s.pivot.setLocalEulerAngles(0, s.yaw + extra, 0);

    s.hopV -= GRAVITY * dt;
    s.hopY += s.hopV * dt;
    if (s.hopY <= 0) {
      s.hopY = 0;
      // Listo: sigue saltando de la emoción.
      s.hopV = s.ready ? 4.2 : 0;
    }
    s.hop.setLocalPosition(0, s.hopY, 0);
    const breathe = 1 + 0.025 * Math.sin(t * 3 + s.phase);
    const sq = breathe * (s.hopY > 0 ? 1.06 : 1);
    s.model.setLocalScale(scale / Math.sqrt(sq), scale * sq, scale / Math.sqrt(sq));

    // Brazos: listos = arriba saludando; si no, hacia adelante como cargando la caja.
    s.arm = approach(s.arm, s.ready ? 78 : -32, 10, dt);
    for (const { side, shoulder } of s.rigs) {
      const wave = s.ready ? Math.sin(t * 11 + side * 1.5) * 16 : Math.sin(t * 2 + s.phase + side) * 4;
      shoulder.setLocalEulerAngles(s.arm + wave, side * (s.ready ? 28 : 10), 0);
    }
  }

  _updateBox(dt) {
    const b = this.box;
    const t = this.time;
    const a = t * 0.6;
    b.axis.x = Math.cos(a);
    b.axis.z = -Math.sin(a);
    this.boxHopV -= GRAVITY * dt;
    this.boxHopY = Math.max(0, this.boxHopY + this.boxHopV * dt);
    if (this.boxHopY === 0) this.boxHopV = 0;
    b.center.x = 0;
    b.center.y = this.boxBase + this.boxHopY + Math.sin(t * 2.2) * 0.03;
    b.center.z = 0.2;
    b.tilt.roll = Math.sin(t * 1.7) * 4;
    b.tilt.pitch = Math.cos(t * 1.3) * 3;

    // El gato se asoma cada 4 s, cada vez por un lado.
    const cycle = Math.floor(t / 4);
    this.cat.rage = 30 + 25 * Math.sin(t * 0.8);
    this.cat.phase = t % 4 > 3 ? 'warn' : 'calm';
    this.cat.side = cycle % 2 ? 1 : 2;
    this.boxView.update(dt, t);
  }
}

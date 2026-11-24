// Controles táctiles para un jugador: joystick en la mitad izquierda, saltar a la derecha y pausa.
// Da el mismo { x, z, jumpPressed, jumpHeld } que input.player(); arriba en la pantalla = avanzar (-z).
// ?touch los muestra también con mouse (para probar en el PC).
import './ui/touch.css';

export const STICK_RADIUS = 56; // px que recorre la perilla
const DEADZONE = 0.12;

/** Arrastre (dx, dy en px desde donde se apoyó el dedo) → { x, z } en [-1, 1]. */
export function stickVector(dx, dy, radius = STICK_RADIUS, deadzone = DEADZONE) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 0, z: 0 };
  const mag = Math.min(1, len / radius);
  if (mag < deadzone) return { x: 0, z: 0 };
  const k = (mag - deadzone) / (1 - deadzone) / len;
  return { x: dx * k, z: dy * k };
}

/** El dedo sigue mandando eventos aunque salga del elemento; si el puntero ya no existe, no pasa nada. */
function capture(el, pointerId) {
  try {
    el.setPointerCapture(pointerId);
  } catch {}
}

export function isTouchDevice(win = window) {
  return new URLSearchParams(win.location.search).has('touch') || win.matchMedia('(pointer: coarse)').matches;
}

/** Junta el teclado con el táctil (los dos pueden controlar al mismo jugador). */
export function mergeInputs(a, b) {
  if (!b) return a;
  const pick = (u, v) => (Math.abs(v) > Math.abs(u) ? v : u);
  return {
    x: pick(a.x, b.x),
    z: pick(a.z, b.z),
    jumpPressed: a.jumpPressed || b.jumpPressed,
    jumpHeld: a.jumpHeld || b.jumpHeld,
  };
}

export class TouchControls {
  /** @param {{ onPause?: () => void }} opts */
  constructor({ onPause = () => {} } = {}) {
    this.onPause = onPause;
    this._stick = { x: 0, z: 0 };
    this._stickId = null;
    this._origin = { x: 0, y: 0 };
    this._jumpId = null;
    this._jumpPressed = false;

    this.el = document.createElement('div');
    this.el.className = 'touch';
    this.el.innerHTML = `
      <div class="touch-stick-zone">
        <div class="touch-stick"><div class="touch-knob"></div></div>
      </div>
      <button type="button" class="touch-jump" aria-label="Saltar">⤒</button>
      <button type="button" class="touch-pause" aria-label="Pausa">❚❚</button>`;
    document.body.appendChild(this.el);
    this.$zone = this.el.querySelector('.touch-stick-zone');
    this.$stick = this.el.querySelector('.touch-stick');
    this.$knob = this.el.querySelector('.touch-knob');
    this.$jump = this.el.querySelector('.touch-jump');

    this.$zone.addEventListener('pointerdown', (e) => this._stickDown(e));
    this.$zone.addEventListener('pointermove', (e) => this._stickMove(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.$zone.addEventListener(type, (e) => this._stickUp(e));
      this.$jump.addEventListener(type, (e) => this._jumpUp(e));
    }
    this.$jump.addEventListener('pointerdown', (e) => this._jumpDown(e));
    this.el.querySelector('.touch-pause').addEventListener('click', () => this.onPause());
    // Sin menú contextual ni lupa al dejar el dedo quieto.
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  show(on) {
    this.el.classList.toggle('on', on);
    if (!on) this._release();
  }

  /** { x, z, jumpPressed, jumpHeld } de este frame. */
  state() {
    return { x: this._stick.x, z: this._stick.z, jumpPressed: this._jumpPressed, jumpHeld: this._jumpId !== null };
  }

  /** Llamar al final de cada frame (como input.endFrame). */
  endFrame() {
    this._jumpPressed = false;
  }

  destroy() {
    this.el.remove();
  }

  _stickDown(e) {
    if (this._stickId !== null) return;
    e.preventDefault();
    this._stickId = e.pointerId;
    capture(this.$zone, e.pointerId);
    const r = this.$zone.getBoundingClientRect();
    this._origin = { x: e.clientX, y: e.clientY };
    this.$stick.style.left = `${e.clientX - r.left}px`;
    this.$stick.style.top = `${e.clientY - r.top}px`;
    this.$stick.classList.add('on');
    this._stickMove(e);
  }

  _stickMove(e) {
    if (e.pointerId !== this._stickId) return;
    const dx = e.clientX - this._origin.x;
    const dy = e.clientY - this._origin.y;
    this._stick = stickVector(dx, dy);
    const len = Math.hypot(dx, dy);
    const k = len > STICK_RADIUS ? STICK_RADIUS / len : 1;
    this.$knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }

  _stickUp(e) {
    if (e.pointerId !== this._stickId) return;
    this._stickId = null;
    this._stick = { x: 0, z: 0 };
    this.$knob.style.transform = '';
    this.$stick.style.left = this.$stick.style.top = '';
    this.$stick.classList.remove('on');
  }

  _jumpDown(e) {
    e.preventDefault();
    if (this._jumpId !== null) return;
    this._jumpId = e.pointerId;
    capture(this.$jump, e.pointerId);
    this._jumpPressed = true;
    this.$jump.classList.add('down');
  }

  _jumpUp(e) {
    if (e.pointerId !== this._jumpId) return;
    this._jumpId = null;
    this.$jump.classList.remove('down');
  }

  _release() {
    this._stickUp({ pointerId: this._stickId });
    this._jumpUp({ pointerId: this._jumpId });
    this._jumpPressed = false;
  }
}

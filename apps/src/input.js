// Teclado → input por jugador. Usa event.code (posición física): funciona con teclado español.
//   P1: WASD + Espacio      P2: Flechas + Enter
//   W / ↑ = avanzar (hacia -Z, lejos de la cámara)

export const KEYMAP = {
  p1: { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], jump: ['Space'] },
  p2: { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['Enter', 'NumpadEnter'] },
};

// Teclas que el navegador no debe usar (scroll con flechas/espacio).
const BLOCK = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'NumpadEnter']);

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this._onDown = (e) => {
      if (isTyping(e)) return;
      if (BLOCK.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    };
    this._onUp = (e) => this.down.delete(e.code);
    this._onBlur = () => this.down.clear();
    target.addEventListener('keydown', this._onDown);
    target.addEventListener('keyup', this._onUp);
    window.addEventListener('blur', this._onBlur);
  }

  isDown(codes) {
    return codes.some((c) => this.down.has(c));
  }

  wasPressed(codes) {
    if (typeof codes === 'string') codes = [codes];
    return codes.some((c) => this.pressed.has(c));
  }

  /** { x, z, jumpPressed, jumpHeld } para 'p1' o 'p2'. */
  player(id) {
    const m = KEYMAP[id];
    const x = (this.isDown(m.right) ? 1 : 0) - (this.isDown(m.left) ? 1 : 0);
    const z = (this.isDown(m.down) ? 1 : 0) - (this.isDown(m.up) ? 1 : 0);
    return { x, z, jumpPressed: this.wasPressed(m.jump), jumpHeld: this.isDown(m.jump) };
  }

  /** Llamar al final de cada frame. */
  endFrame() {
    this.pressed.clear();
  }
}

function isTyping(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

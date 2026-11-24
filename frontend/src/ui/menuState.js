// Estado del menú sin DOM ni PlayCanvas (se prueba en test/menuState.test.js).
//   home → map (mapa + caja) → chars (cada jugador escoge y marca LISTO) → cuenta 3-2-1 → partida
import { usesAlt } from '../view/characters.js';

export const COUNTDOWN = 3; // segundos de "3, 2, 1" cuando los dos están listos

const wrap = (i, n) => ((i % n) + n) % n;

export class MenuState {
  /**
   * @param {{ maps: {key: string}[], boxes: {id: string}[], characters: {id: string}[],
   *           initial?: { level?: string, box?: string, p1?: string, p2?: string } }} opts
   */
  constructor({ maps, boxes, characters, initial = {} }) {
    this.maps = maps;
    this.boxes = boxes;
    this.characters = characters;
    this.screen = 'home';
    this.level = initial.level ?? maps[0].key;
    this.box = initial.box ?? boxes[0].id;
    this.chars = {
      p1: { id: initial.p1 ?? characters[0].id, ready: false },
      p2: { id: initial.p2 ?? characters[1 % characters.length].id, ready: false },
    };
    this.countdown = null; // segundos que faltan, o null
  }

  go(screen) {
    this.screen = screen;
    this.chars.p1.ready = this.chars.p2.ready = false;
    this.countdown = null;
  }

  /** Esc: chars → map → home. Devuelve false si ya estaba en home. */
  back() {
    if (this.screen === 'chars') this.go('map');
    else if (this.screen === 'map') this.go('home');
    else return false;
    return true;
  }

  setLevel(key) {
    if (this.maps.some((m) => m.key === key)) this.level = key;
  }

  stepLevel(dir) {
    const i = this.maps.findIndex((m) => m.key === this.level);
    this.level = this.maps[wrap(i + dir, this.maps.length)].key;
  }

  setBox(id) {
    if (this.boxes.some((b) => b.id === id)) this.box = id;
  }

  stepBox(dir) {
    const i = this.boxes.findIndex((b) => b.id === this.box);
    this.box = this.boxes[wrap(i + dir, this.boxes.length)].id;
  }

  /** Cambia el personaje de un jugador. Con LISTO marcado no se puede. Devuelve si cambió. */
  stepChar(slot, dir) {
    const c = this.chars[slot];
    if (c.ready || this.characters.length < 2) return false;
    const i = this.characters.findIndex((ch) => ch.id === c.id);
    c.id = this.characters[wrap(i + dir, this.characters.length)].id;
    return true;
  }

  /** Marca / desmarca LISTO. Si los dos quedan listos arranca la cuenta; si alguien se arrepiente, se cancela. */
  toggleReady(slot) {
    const c = this.chars[slot];
    c.ready = !c.ready;
    this.countdown = this.allReady ? COUNTDOWN : null;
    return c.ready;
  }

  get allReady() {
    return this.chars.p1.ready && this.chars.p2.ready;
  }

  alt(slot) {
    return usesAlt({ p1: this.chars.p1.id, p2: this.chars.p2.id }, slot);
  }

  /** Avanza la cuenta. Devuelve true el frame en que llega a cero (hay que arrancar la partida). */
  tick(dt) {
    if (this.countdown === null) return false;
    this.countdown -= dt;
    if (this.countdown > 0) return false;
    this.countdown = null;
    return true;
  }

  /** Lo que necesita main.js para armar la partida. */
  selection() {
    return { level: this.level, box: this.box, chars: { p1: this.chars.p1.id, p2: this.chars.p2.id } };
  }
}

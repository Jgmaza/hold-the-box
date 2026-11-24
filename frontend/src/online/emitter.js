/** Avisos sin datos: quien escucha vuelve a leer el estado. `on` devuelve la función para dejar de escuchar. */
export class Emitter {
  constructor() {
    this._fns = new Set();
  }

  on(fn) {
    this._fns.add(fn);
    return () => this._fns.delete(fn);
  }

  emit() {
    for (const fn of [...this._fns]) fn();
  }
}

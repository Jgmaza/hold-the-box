// Emisor de eventos mínimo. La UI, el audio y la vista escuchan; la simulación emite.
export class Emitter {
  constructor() {
    this._handlers = new Map();
  }

  on(name, fn) {
    if (!this._handlers.has(name)) this._handlers.set(name, new Set());
    this._handlers.get(name).add(fn);
    return () => this.off(name, fn);
  }

  off(name, fn) {
    this._handlers.get(name)?.delete(fn);
  }

  emit(name, data) {
    const set = this._handlers.get(name);
    if (!set) return;
    for (const fn of [...set]) fn(data);
  }
}

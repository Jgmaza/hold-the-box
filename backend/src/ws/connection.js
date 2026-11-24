// Envoltura de un socket autenticado. Mensajes: JSON { t: tipo, d: datos, rid?: id de petición }.
const MAX_BUFFERED = 1 << 20; // 1 MB: por encima, los snapshots se descartan (el siguiente los reemplaza)

export class Connection {
  constructor(ws, user) {
    this.ws = ws;
    this.user = user; // { id, name, guest }
    this.userId = user.id;
    this.alive = true;
    this.connectedAt = Date.now();
  }

  send(t, d, rid) {
    this.sendRaw(JSON.stringify(rid === undefined ? { t, d } : { t, d, rid }));
  }

  sendRaw(raw, { droppable = false } = {}) {
    if (this.ws.readyState !== 1) return;
    if (droppable && this.ws.bufferedAmount > MAX_BUFFERED) return;
    this.ws.send(raw);
  }

  error(code, message, rid) {
    this.send('error', { code, message }, rid);
  }

  close(code = 1000, reason = '') {
    try {
      this.ws.close(code, reason);
    } catch {}
  }
}

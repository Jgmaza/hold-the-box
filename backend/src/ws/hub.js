// Registro de conexiones vivas: userId → Connection. Una conexión por usuario (la nueva reemplaza a la vieja).
// Cualquier módulo (salas, amigos, invitaciones) usa hub.sendTo(userId, t, d) para empujar eventos.
export class Hub {
  constructor() {
    this.byUser = new Map();
  }

  add(conn) {
    const old = this.byUser.get(conn.userId);
    this.byUser.set(conn.userId, conn);
    if (old && old !== conn) old.close(4001, 'replaced');
  }

  remove(conn) {
    if (this.byUser.get(conn.userId) === conn) this.byUser.delete(conn.userId);
  }

  get(userId) {
    return this.byUser.get(userId) ?? null;
  }

  isOnline(userId) {
    return this.byUser.has(userId);
  }

  sendTo(userId, t, d) {
    this.byUser.get(userId)?.send(t, d);
  }

  /** Envía a varios usuarios serializando una sola vez. `opts.droppable`: se salta si el socket va atrasado. */
  broadcast(userIds, t, d, opts) {
    const raw = JSON.stringify({ t, d });
    for (const id of userIds) this.byUser.get(id)?.sendRaw(raw, opts);
  }

  get size() {
    return this.byUser.size;
  }
}

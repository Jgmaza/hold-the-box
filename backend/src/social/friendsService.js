// Reglas de amistad + push por WebSocket (docs/PROTOCOL.md). Sin Fastify: lo usan las rutas y los tests.
// `me` siempre es el id de una cuenta (las rutas ya rechazan invitados).
import { AppError, ERR } from '../errors.js';

const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName });

const requestNotFound = () => new AppError(ERR.REQUEST_NOT_FOUND, 'no existe esa solicitud pendiente', 404);

export class FriendsService {
  /**
   * @param {{ repo, users, hub, presence? }} deps  repo: friendsRepo.js · users: UserRepo · hub: ws/hub.js
   *   presence: social/presence.js (sin ella, `presence: null` en /friends)
   */
  constructor({ repo, users, hub, presence = null }) {
    this.repo = repo;
    this.users = users;
    this.hub = hub;
    this.presence = presence;
  }

  async search(me, prefix, limit) {
    const found = await this.repo.searchUsers(me, prefix, limit);
    const rel = await this.repo.relations(
      me,
      found.map((u) => u.id),
    );
    return found.map((u) => ({
      ...u,
      isFriend: rel.friends.has(u.id),
      requestPending: rel.pendingIn.has(u.id) ? 'in' : rel.pendingOut.has(u.id) ? 'out' : null,
    }));
  }

  async list(me) {
    const friends = await this.repo.listFriends(me);
    const presence = this.presence ? await this.presence.getMany(friends.map((f) => f.user.id)) : null;
    return friends.map((f) => ({ ...f, presence: presence?.get(f.user.id) ?? null }));
  }

  async requests(me) {
    const all = await this.repo.listPending(me);
    return { incoming: all.filter((r) => r.to.id === me), outgoing: all.filter((r) => r.from.id === me) };
  }

  /**
   * Envía solicitud a `username`. Si el otro ya me había mandado una, se acepta sola.
   * @returns {Promise<{ request } | { friend }>}
   */
  async send(me, username) {
    const target = await this.users.findByUsername(username);
    if (!target || target.isGuest) throw new AppError(ERR.USER_NOT_FOUND, 'no existe ese usuario', 404);
    if (target.id === me) throw new AppError(ERR.BAD_REQUEST, 'no puedes enviarte una solicitud a ti mismo');
    if (await this.repo.areFriends(me, target.id)) throw new AppError(ERR.ALREADY_FRIENDS, 'ya son amigos', 409);

    const pending = await this.repo.findPendingBetween(me, target.id);
    if (pending?.fromId === me) throw new AppError(ERR.REQUEST_PENDING, 'ya le enviaste una solicitud', 409);
    if (pending) return { friend: await this._accept(me, pending) };

    const sender = await this.users.findById(me);
    const r = await this.repo.createRequest(me, target.id);
    const request = { id: r.id, from: publicUser(sender), to: publicUser(target), createdAt: r.createdAt };
    this.hub.sendTo(target.id, 'friend:request', { request });
    return { request };
  }

  async accept(me, requestId) {
    const r = await this._ownRequest(me, requestId, 'toId');
    return { friend: await this._accept(me, r) };
  }

  async decline(me, requestId) {
    const r = await this._ownRequest(me, requestId, 'toId');
    if (!(await this.repo.closeRequest(r.id, 'declined'))) throw requestNotFound();
    this.hub.sendTo(r.fromId, 'friend:declined', { requestId: r.id });
  }

  async cancel(me, requestId) {
    const r = await this._ownRequest(me, requestId, 'fromId');
    if (!(await this.repo.closeRequest(r.id, 'cancelled'))) throw requestNotFound();
  }

  async remove(me, userId) {
    if (!(await this.repo.removeFriendship(me, userId))) throw new AppError(ERR.NOT_FRIENDS, 'no son amigos', 404);
    this.hub.sendTo(userId, 'friend:removed', { userId: me });
  }

  /** Solicitud pendiente donde `me` es `role` (toId = destinatario, fromId = remitente). */
  async _ownRequest(me, requestId, role) {
    const r = await this.repo.findRequest(requestId);
    if (!r || r.status !== 'pending') throw requestNotFound();
    if (r[role] !== me) throw new AppError(ERR.FORBIDDEN, 'esa solicitud no es tuya', 403);
    return r;
  }

  /** `me` acepta la solicitud `r` (que le mandó el otro): avisa al remitente y devuelve el amigo para `me`. */
  async _accept(me, r) {
    const since = await this.repo.acceptRequest(r.id);
    if (!since) throw requestNotFound();
    const [meUser, other] = await Promise.all([this.users.findById(me), this.users.findById(r.fromId)]);
    this.hub.sendTo(r.fromId, 'friend:accepted', { friend: { user: publicUser(meUser), since } });
    return { user: publicUser(other), since };
  }
}

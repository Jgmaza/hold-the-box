// Amigos (docs/PROTOCOL.md §1). Todas piden token de cuenta: invitados → 403 ACCOUNT_REQUIRED.
//   GET    /users/search?q=&limit=      → { users: [{ id, username, displayName, isFriend, requestPending }] }
//   GET    /friends                     → { friends: [{ user, since, presence }] }
//   GET    /friends/requests            → { incoming, outgoing }
//   POST   /friends/requests { username } → 201 { request } | 201 { friend } (si el otro ya me la había mandado)
//   POST   /friends/requests/:id/accept → { friend }
//   POST   /friends/requests/:id/decline → 204
//   DELETE /friends/requests/:id        → 204 (cancelar la enviada)
//   DELETE /friends/:userId             → 204
import { z } from 'zod';
import { AppError, ERR, parse } from '../errors.js';

const searchSchema = z.object({
  q: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{2,16}$/, 'mínimo 2 caracteres: letras, números o _'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});
const idParam = z.object({ id: z.string().uuid('id inválido') });
const userIdParam = z.object({ userId: z.string().uuid('id inválido') });

export async function friendsRoutes(app, { friends }) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', async (req) => {
    if (req.user.guest) throw new AppError(ERR.ACCOUNT_REQUIRED, 'los invitados no pueden tener amigos: crea una cuenta', 403);
  });

  app.get('/users/search', async (req) => {
    const { q, limit } = parse(searchSchema, req.query);
    return { users: await friends.search(req.user.id, q, limit) };
  });

  app.get('/friends', async (req) => ({ friends: await friends.list(req.user.id) }));

  app.get('/friends/requests', async (req) => friends.requests(req.user.id));

  app.post('/friends/requests', async (req, reply) => {
    const { username } = parse(z.object({ username: z.string().trim().toLowerCase().min(1) }), req.body);
    return reply.code(201).send(await friends.send(req.user.id, username));
  });

  app.post('/friends/requests/:id/accept', async (req) => {
    const { id } = parse(idParam, req.params);
    return friends.accept(req.user.id, id);
  });

  app.post('/friends/requests/:id/decline', async (req, reply) => {
    const { id } = parse(idParam, req.params);
    await friends.decline(req.user.id, id);
    return reply.code(204).send();
  });

  app.delete('/friends/requests/:id', async (req, reply) => {
    const { id } = parse(idParam, req.params);
    await friends.cancel(req.user.id, id);
    return reply.code(204).send();
  });

  app.delete('/friends/:userId', async (req, reply) => {
    const { userId } = parse(userIdParam, req.params);
    await friends.remove(req.user.id, userId);
    return reply.code(204).send();
  });
}

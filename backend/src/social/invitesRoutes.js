// Invitaciones por REST (las mismas reglas que por WS). Solo cuentas: invitados → 403 ACCOUNT_REQUIRED.
//   POST /rooms/:code/invite { userId } → 201 { invite }
//   GET  /me/invites                    → { invites }
//   POST /friends/:userId/join          → { code }   (sala del amigo si está en un lobby)
import { z } from 'zod';
import { AppError, ERR, parse } from '../errors.js';

const codeParam = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/, 'código de 6 caracteres') });
const userIdParam = z.object({ userId: z.string().uuid('id inválido') });

export async function invitesRoutes(app, { invites }) {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', async (req) => {
    if (req.user.guest) throw new AppError(ERR.ACCOUNT_REQUIRED, 'los invitados no pueden invitar ni unirse a amigos: crea una cuenta', 403);
  });

  app.post('/rooms/:code/invite', async (req, reply) => {
    const { code } = parse(codeParam, req.params);
    const { userId } = parse(userIdParam, req.body);
    return reply.code(201).send({ invite: await invites.invite(req.user, userId, code) });
  });

  app.get('/me/invites', async (req) => ({ invites: await invites.list(req.user.id) }));

  app.post('/friends/:userId/join', async (req) => {
    const { userId } = parse(userIdParam, req.params);
    return invites.joinFriend(req.user, userId);
  });
}

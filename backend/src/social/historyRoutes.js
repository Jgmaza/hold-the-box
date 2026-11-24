// Historial y estadísticas (#8).
//   GET /me/matches?limit=20&before=<iso> → { matches: MatchHistory[] }   (ended_at desc; `before` = endedAt del último)
//   GET /users/:id/stats                  → { played, wins, podiums, finishes, bestTimes, favoriteLevel }
import { z } from 'zod';
import { AppError, ERR, parse } from '../errors.js';

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime({ offset: true }).optional(),
});
const idParam = z.object({ id: z.string().uuid('id inválido') });

export async function historyRoutes(app, { history, users }) {
  app.addHook('preHandler', app.authenticate);

  app.get('/me/matches', async (req) => {
    const { limit, before } = parse(listQuery, req.query);
    return { matches: await history.listFor(req.user.id, { limit, before: before ?? null }) };
  });

  app.get('/users/:id/stats', async (req) => {
    const { id } = parse(idParam, req.params);
    if (!(await users.findById(id))) throw new AppError(ERR.USER_NOT_FOUND, 'no existe ese usuario', 404);
    return history.statsFor(id);
  });
}

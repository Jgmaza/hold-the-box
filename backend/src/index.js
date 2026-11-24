// Arranque del servidor: `npm run dev` / `npm start` desde backend/ (o `npm run dev:backend` desde la raíz).
import { buildApp } from './app.js';

const app = await buildApp();
const { env } = app.deps;

try {
  await app.listen({ host: env.host, port: env.port });
  app.log.info(`Hold the Box backend → http://${env.host}:${env.port}  ·  ws://${env.host}:${env.port}/ws?token=…`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    app.log.info({ sig }, 'shutting down');
    await app.close();
    process.exit(0);
  });
}

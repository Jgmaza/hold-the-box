// Cliente Redis para lo efímero (presencia, invitaciones, rate limit). Claves en SDD §5.3, siempre con prefijo `htb:`.
import { Redis } from 'ioredis';

export function createRedis(url, { logger } = {}) {
  const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 2, keyPrefix: 'htb:' });
  // ioredis reintenta solo; avisamos una vez por caída en vez de una por reintento.
  let down = false;
  redis.on('error', (err) => {
    if (down) return;
    down = true;
    logger?.warn({ err: err.message || err.code }, 'redis: sin conexión, reintentando');
  });
  redis.on('ready', () => {
    if (down) logger?.info('redis: reconectado');
    down = false;
  });
  return redis;
}

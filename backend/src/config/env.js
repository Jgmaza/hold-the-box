// Configuración del servidor. Todo sale de variables de entorno con defaults de desarrollo.

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

export function loadEnv(overrides = {}) {
  const e = process.env;
  const env = {
    nodeEnv: e.NODE_ENV ?? 'development',
    host: e.HOST ?? '0.0.0.0',
    port: num(e.PORT, 3000),
    logLevel: e.LOG_LEVEL ?? 'info',
    jwtSecret: e.JWT_SECRET ?? 'dev-secret-change-me',
    jwtExpiresIn: e.JWT_EXPIRES_IN ?? '15m', // cuentas: se renueva con el refresh token
    // Los invitados no tienen refresh: si su token vence, el cliente crea otro invitado y pierde su sala.
    guestJwtExpiresIn: e.GUEST_JWT_EXPIRES_IN ?? '1d',
    refreshTtlDays: num(e.REFRESH_TTL_DAYS, 30),
    corsOrigin: e.CORS_ORIGIN ?? '*',
    // Seguridad (#9). Límites por IP: en desarrollo/tests no se aplican a 127.0.0.1 (bots, tests, varias pestañas).
    trustProxy: e.TRUST_PROXY === 'true', // detrás de Fly/Railway: la IP real viene en X-Forwarded-For
    rateLimitMax: num(e.RATE_LIMIT_MAX, 100), // REST, por IP y minuto
    authRateLimitMax: num(e.AUTH_RATE_LIMIT_MAX, 10), // /auth/*, por IP y minuto
    rateLimitNamespace: e.RATE_LIMIT_NAMESPACE ?? 'rl:rest:', // claves en Redis (con el prefijo htb:)
    rateLimitSkipLocal: e.RATE_LIMIT_SKIP_LOCAL ? e.RATE_LIMIT_SKIP_LOCAL === 'true' : (e.NODE_ENV ?? 'development') !== 'production',
    maxConnections: num(e.MAX_CONNECTIONS, 2000),
    wsUpgradesPerSec: num(e.WS_UPGRADES_PER_SEC, 3), // por IP
    wsAbuseCloseMs: num(e.WS_ABUSE_CLOSE_MS, 5000), // rechazando mensajes de control durante este tiempo → cierre 4008
    // Datos: sin URL, ese almacén queda desactivado y el server corre en memoria
    databaseUrl: e.DATABASE_URL || null,
    redisUrl: e.REDIS_URL || null,
    // Tiempo real
    tickHz: num(e.TICK_HZ, 60), // vueltas del loop por segundo (la sim corre a CONFIG.physics.fixedStep dentro)
    snapshotHz: num(e.SNAPSHOT_HZ, 30), // antes 20: más estado por segundo → menos espera + interp más corta
    heartbeatMs: num(e.HEARTBEAT_MS, 15000),
    presenceTtlSec: num(e.PRESENCE_TTL_SEC, 60), // se renueva en cada heartbeat; si el proceso muere, vence sola
    inviteTtlSec: num(e.INVITE_TTL_SEC, 120),
    invitesPerMinute: num(e.INVITES_PER_MINUTE, 10),
    // Salas / partida
    maxDuosDefault: num(e.MAX_DUOS_DEFAULT, 4),
    maxDuosLimit: 8,
    countdownMs: num(e.COUNTDOWN_MS, 3000),
    resultsMs: num(e.RESULTS_MS, 10000),
    matchTimeLimitSec: num(e.MATCH_TIME_LIMIT_SEC, 300),
    spawnGhostSec: num(e.SPAWN_GHOST_SEC, 2), // sin colisión entre dúos tras aparecer
    reconnectGraceMs: num(e.RECONNECT_GRACE_MS, 30000), // tiempo para volver tras cortarse sin perder el puesto
    maxSpectators: num(e.MAX_SPECTATORS, 8),
    // Matchmaking rápido
    matchmakerTickMs: num(e.MATCHMAKER_TICK_MS, 1000), // cada cuánto agrupa la cola
    matchmakerMaxDuos: num(e.MATCHMAKER_MAX_DUOS, 4), // dúos por sala automática
    matchmakerFillSec: num(e.MATCHMAKER_FILL_SEC, 20), // con 2-3 dúos, espera este tiempo antes de arrancar
    matchmakerSoloSec: num(e.MATCHMAKER_SOLO_SEC, 45), // con 1 solo dúo, espera esto antes de arrancar igual
    matchmakerAutoStartSec: num(e.MATCHMAKER_AUTOSTART_SEC, 10), // cuenta atrás visible en la sala auto
    ...overrides,
  };
  if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-secret-change-me') {
    throw new Error('JWT_SECRET es obligatorio en producción');
  }
  return env;
}

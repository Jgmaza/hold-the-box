import { defineConfig } from 'vitest/config';

// Tests del servidor. Los del juego corren aparte: `npm run game:test` (o `npm run test:all`).
export default defineConfig({
  test: { environment: 'node', include: ['test/**/*.test.js'], testTimeout: 20000, env: { NODE_ENV: 'test' } },
});

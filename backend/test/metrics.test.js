import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, TestClient } from './helpers.js';

let server;
beforeAll(async () => {
  server = await startServer();
  const c = await TestClient.connect(server, 'metrics');
  c.send('ping', { t: Date.now() });
  await c.next('pong');
  c.close();
});
afterAll(async () => {
  await server.app.close();
});

describe('/metrics', () => {
  it('devuelve texto Prometheus con gauges, histograma del tick y contador de mensajes', async () => {
    const res = await fetch(`${server.base}/metrics`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('# TYPE htb_connections gauge');
    expect(text).toContain('# TYPE htb_rooms gauge');
    expect(text).toContain('# TYPE htb_matches gauge');
    expect(text).toContain('# TYPE htb_tick_ms histogram');
    expect(text).toContain('htb_tick_ms_count');
    expect(text).toContain('# TYPE htb_ws_messages_total counter');
    expect(text).toContain('htb_ws_messages_total{t="ping"}');
  });
});

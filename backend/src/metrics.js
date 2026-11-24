// Métricas en texto Prometheus (`/metrics`). Sin dependencias: counters con etiquetas + un histograma del tick.
//   counters:  htb_snapshot_bytes, htb_ws_messages_total{t=…}
//   histograma: htb_tick_ms
//   gauges (se calculan al render): htb_connections, htb_rooms, htb_matches
const TICK_BUCKETS = [1, 2, 4, 8, 16, 32];

const labelsKey = (labels) => Object.entries(labels).sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}="${v}"`).join(',');

export class Metrics {
  constructor() {
    this.counters = new Map(); // name → Map(labelsKey → number)
    this.tick = {
      buckets: TICK_BUCKETS,
      counts: TICK_BUCKETS.map(() => 0),
      inf: 0,
      sum: 0,
      count: 0,
    };
  }

  inc(name, value = 1, labels = {}) {
    const key = labelsKey(labels);
    const byLabel = this.counters.get(name) ?? new Map();
    byLabel.set(key, (byLabel.get(key) ?? 0) + value);
    this.counters.set(name, byLabel);
  }

  observeTick(ms) {
    const t = this.tick;
    t.sum += ms;
    t.count++;
    let i = t.buckets.findIndex((b) => ms <= b);
    if (i === -1) t.inf++;
    else t.counts[i]++;
  }

  /** @param {Record<string, number>} gauges nombre → valor actual (conexiones, salas, partidas…) */
  render(gauges = {}) {
    const out = [];
    for (const [name, value] of Object.entries(gauges)) {
      out.push(`# TYPE ${name} gauge`, `${name} ${value}`);
    }
    for (const [name, byLabel] of this.counters) {
      out.push(`# TYPE ${name} counter`);
      for (const [key, count] of byLabel) {
        out.push(key ? `${name}{${key}} ${count}` : `${name} ${count}`);
      }
    }
    const t = this.tick;
    out.push('# TYPE htb_tick_ms histogram');
    let cum = 0;
    t.buckets.forEach((b, i) => {
      cum += t.counts[i];
      out.push(`htb_tick_ms_bucket{le="${b}"} ${cum}`);
    });
    out.push(`htb_tick_ms_bucket{le="+Inf"} ${t.count + t.inf}`, `htb_tick_ms_sum ${t.sum}`, `htb_tick_ms_count ${t.count}`);
    return out.join('\n') + '\n';
  }
}

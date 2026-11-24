#!/usr/bin/env node
// Bots de carga / smoke: crean salas, arman dúos, arrancan y mandan input aleatorio a 30 Hz.
//   node tools/bots.mjs --url http://localhost:3000 --rooms 2 --bots 8 --seconds 20
// Imprime snapshots/s por bot, eventos vistos y el tick del servidor (/health).
import WebSocket from 'ws';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const URL_BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '');
const ROOMS = Number(arg('rooms', 1));
const BOTS = Number(arg('bots', 8)); // por sala (par)
const SECONDS = Number(arg('seconds', 20));
const LEVEL = arg('level', 'muelle');

async function guest(name) {
  const r = await fetch(`${URL_BASE}/auth/guest`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nickname: name }) });
  if (!r.ok) throw new Error(`guest ${r.status}`);
  return r.json();
}

function bot(token, name) {
  const ws = new WebSocket(`${URL_BASE.replace(/^http/, 'ws')}/ws?token=${token}`);
  const b = { ws, name, snaps: 0, events: {}, pending: new Map(), rid: 0, slots: [], seq: 0 };
  b.request = (t, d) =>
    new Promise((res, rej) => {
      const rid = ++b.rid;
      b.pending.set(rid, { res, rej });
      ws.send(JSON.stringify({ t, d, rid }));
    });
  ws.on('message', (raw) => {
    const m = JSON.parse(raw);
    if (m.rid && b.pending.has(m.rid)) {
      const p = b.pending.get(m.rid);
      b.pending.delete(m.rid);
      m.t === 'error' ? p.rej(new Error(`${m.d.code}: ${m.d.message}`)) : p.res(m.d);
    }
    if (m.t === 'match:snapshot') b.snaps++;
    if (m.t === 'match:events') for (const e of m.d.events) b.events[e.e] = (b.events[e.e] ?? 0) + 1;
    if (m.t === 'room:state') {
      const me = m.d.members.find((x) => x.userId === b.userId);
      b.slots = me?.slots ?? [];
    }
    if (m.t === 'welcome') b.userId = m.d.user.id;
  });
  b.open = new Promise((r) => ws.once('open', r));
  return b;
}

async function room(ri) {
  const bots = [];
  for (let i = 0; i < BOTS; i++) {
    const name = `bot${ri}_${i}`;
    const { token } = await guest(name);
    bots.push(bot(token, name));
  }
  await Promise.all(bots.map((b) => b.open));
  const { code } = await bots[0].request('room:create', { level: LEVEL, maxDuos: Math.ceil(BOTS / 2) });
  for (const b of bots.slice(1)) await b.request('room:join', { code });
  for (const b of bots.slice(1)) await b.request('room:ready', { ready: true });
  await bots[0].request('room:start');
  console.log(`[sala ${code}] ${BOTS} bots, partida iniciada`);
  const timers = bots.map((b) =>
    setInterval(() => {
      for (const slot of b.slots) {
        b.seq++;
        const x = Math.random() < 0.3 ? Math.round(Math.random() * 2 - 1) : 0;
        b.ws.send(JSON.stringify({ t: 'input', d: { seq: b.seq, slot, x, z: Math.random() < 0.8 ? -1 : 0, jump: Math.random() < 0.05, jumpHeld: false } }));
      }
    }, 33),
  );
  return { code, bots, timers };
}

const t0 = Date.now();
const rooms = await Promise.all(Array.from({ length: ROOMS }, (_, i) => room(i)));
const health = [];
const hv = setInterval(async () => health.push(await (await fetch(`${URL_BASE}/health`)).json()), 1000);
await new Promise((r) => setTimeout(r, SECONDS * 1000));
clearInterval(hv);
for (const r of rooms) {
  r.timers.forEach(clearInterval);
  const rates = r.bots.map((b) => b.snaps / SECONDS);
  const ev = {};
  for (const b of r.bots) for (const [k, v] of Object.entries(b.events)) ev[k] = Math.max(ev[k] ?? 0, v);
  console.log(`[sala ${r.code}] snapshots/s por bot: min ${Math.min(...rates).toFixed(1)} max ${Math.max(...rates).toFixed(1)}`);
  console.log(`[sala ${r.code}] eventos vistos:`, ev);
  r.bots.forEach((b) => b.ws.close());
}
const ticks = health.map((h) => h.tickMs);
console.log(`tick servidor (ms): avg ${(ticks.reduce((a, b) => a + b, 0) / ticks.length).toFixed(2)} max ${Math.max(...ticks).toFixed(2)} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(0);

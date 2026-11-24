// Codec del estado de un dúo para el modo online. JS puro (sin PlayCanvas ni DOM): lo usan
//   · el backend (backend/src/match/snapshot.js) para serializar cada `Game` que simula, y
//   · el cliente para VOLCAR ese estado sobre un `Game` local del mismo nivel y semilla que NO simula.
// Así GameView, la UI y el audio leen los mismos objetos que en local (game.p1.pos, game.box.tilt, game.npcs…).
//
// CUANTIZACIÓN (issue de red): el wire lleva ENTEROS, mucho más compactos en JSON y sobre todo en binario.
//   pos/vel → cm (*100) · ángulos → 0,1° (*10) · unitarios (axis/forward/dir) → 1e-3 (*1000)
//   % (integrity/wetness/health/rage) → entero · 0..1 (sync/desync) → 0..100 (*100) · tiempos → 0,01 s (*100)
// El cliente divide al volcar. La pérdida es solo visual (cm / 0,1° / %), nunca rompe el determinismo del servidor.
//
// Dos partes:
//   lightDuoState(game)  → lo que cualquiera necesita para DIBUJAR a ese dúo (jugadores, caja, gato, bomba, HUD).
//                          Va para todos los dúos en cada snapshot.
//   worldDuoState(game)  → el mundo que ese dúo está viviendo (NPCs, disparos, clima, vidrios, estaciones, cactus).
//                          Va solo a los jugadores de ese dúo (`own` en el snapshot).
// applyLightDuoState / applyWorldDuoState hacen lo inverso. Invariante (test): serializar → aplicar a un Game nuevo
// → volver a serializar da exactamente lo mismo.

const cm = (v) => Math.round(v * 100) || 0; // cm
const dg = (v) => Math.round(v * 10) || 0; // 0,1°
const un = (v) => Math.round(v * 1000) || 0; // unitario 1e-3
const h = (v) => Math.round(v * 100) || 0; // 0,01 s / 0,01 %/s / 0..1→0..100
const pct = (v) => Math.round(v) || 0; // % 0..100
const num = (v) => (Number.isFinite(v) ? h(v) : null);
const unnum = (v) => (v === null ? Infinity : v / 100);
const v3 = (v) => [cm(v.x), cm(v.y), cm(v.z)];
const v2u = (v) => [un(v.x), un(v.z)];
const v2c = (v) => [cm(v.x), cm(v.z)];
const set3 = (o, a) => {
  o.x = a[0] / 100;
  o.y = a[1] / 100;
  o.z = a[2] / 100;
};
const set2u = (o, a) => {
  o.x = a[0] / 1000;
  o.z = a[1] / 1000;
};
const set2c = (o, a) => {
  o.x = a[0] / 100;
  o.z = a[1] / 100;
};

// ------------------------------------------------------------------ light

export function lightDuoState(game) {
  const b = game.box;
  return {
    state: game.state,
    lives: game.lives,
    checkpoint: game.checkpointIndex,
    respawnTimer: h(game.respawnTimer),
    runTime: h(game.runTime),
    time: h(game.time),
    failReason: game.failReason,
    result: game.result,
    players: game.players.map((p) => ({
      pos: v3(p.pos),
      vel: v3(p.vel),
      actualVel: v3(p.actualVel),
      grounded: p.grounded,
      knockTimer: h(p.knockTimer),
    })),
    box: {
      center: v3(b.center),
      axis: v2u(b.axis),
      forward: v2u(b.forward),
      tilt: [dg(b.tilt.roll), dg(b.tilt.pitch), dg(b.tilt.mag)],
      state: b.state,
      sync: h(b.sync),
      integrity: pct(b.integrity),
      wetness: pct(b.wetness),
      leakRate: h(b.leakRate),
      dropped: b.dropped,
      criticalTime: h(b.criticalTime),
      invuln: h(b.invuln),
    },
    cat: {
      phase: game.cat.phase,
      rage: pct(game.cat.rage),
      swipeLeft: h(game.cat.swipeLeft),
      anim: h(game.cat.anim),
      side: game.cat.side,
      victim: game.cat.victim,
    },
    bomb: {
      health: pct(game.bomb.health),
      exploded: game.bomb.exploded,
      sinceBeep: num(game.bomb.sinceBeep),
      sinceDrain: num(game.bomb.sinceDrain),
      desync: h(game.bomb.desync),
    },
  };
}

export function applyLightDuoState(game, s) {
  game.state = s.state;
  game.lives = s.lives;
  game.checkpointIndex = s.checkpoint;
  game.respawnTimer = s.respawnTimer / 100;
  game.runTime = s.runTime / 100;
  game.time = s.time / 100;
  game.failReason = s.failReason;
  game.result = s.result;
  s.players.forEach((ps, i) => {
    const p = game.players[i];
    set3(p.pos, ps.pos);
    set3(p.vel, ps.vel);
    set3(p.actualVel, ps.actualVel);
    p.grounded = ps.grounded;
    p.knockTimer = ps.knockTimer / 100;
  });
  const b = game.box;
  const sb = s.box;
  set3(b.center, sb.center);
  set2u(b.axis, sb.axis);
  set2u(b.forward, sb.forward);
  b.tilt.roll = sb.tilt[0] / 10;
  b.tilt.pitch = sb.tilt[1] / 10;
  b.tilt.mag = sb.tilt[2] / 10;
  b.state = sb.state;
  b.sync = sb.sync / 100;
  b.integrity = sb.integrity;
  b.wetness = sb.wetness;
  b.leakRate = sb.leakRate / 100;
  b.dropped = sb.dropped;
  b.criticalTime = sb.criticalTime / 100;
  b.invuln = sb.invuln / 100;
  game.cat.phase = s.cat.phase;
  game.cat.rage = s.cat.rage;
  game.cat.swipeLeft = s.cat.swipeLeft / 100;
  game.cat.anim = s.cat.anim / 100;
  game.cat.side = s.cat.side;
  game.cat.victim = s.cat.victim;
  const bomb = game.bomb;
  bomb.health = s.bomb.health;
  bomb.exploded = s.bomb.exploded;
  bomb.sinceBeep = unnum(s.bomb.sinceBeep);
  bomb.sinceDrain = unnum(s.bomb.sinceDrain);
  bomb.desync = s.bomb.desync / 100;
  return game;
}

// ------------------------------------------------------------------ world (solo para el propio dúo)

const shelterList = (z) => z.shelters ?? z.breakwaters ?? [];

export function worldDuoState(game) {
  const npcs = game.npcs.list;
  const zones = game.weather.zones;
  return {
    npcs: npcs.map((n) => ({
      pos: v3(n.pos),
      vel: v2c(n.vel),
      state: n.state,
      facing: dg(n.facing),
      windup: h(n.windup),
      phase: n.phase ?? null,
    })),
    projectiles: game.npcs.projectiles.map((s) => ({
      npc: npcs.indexOf(s.npc),
      pos: v3(s.pos),
      vel: v3(s.vel),
      life: h(s.life),
    })),
    weather: {
      current: game.weather.current ? zones.indexOf(game.weather.current) : -1,
      sheltered: game.weather.sheltered,
      zones: zones.map((z) => ({
        phase: z.phase,
        timer: h(z.timer),
        phaseLen: h(z._phaseLen),
        intensity: h(z.intensity),
        dir: z.dir ? v2u(z.dir) : null,
        boxShelter: z.boxShelter ? shelterList(z).indexOf(z.boxShelter) : -1,
      })),
    },
    glassBroken: game.world.statics.filter((s) => s.def?.kind === 'glass' && s.broken).map((s) => s.def.id),
    recovery: game.world.recovery.map((st) => st.active),
    cacti: { near: game.cacti.near, lunge: game.cacti.plants.map((p) => h(p.lunge)) },
  };
}

/** @returns {string[]} ids de vidrios que se rompieron con este volcado (la vista los hace añicos). */
export function applyWorldDuoState(game, s) {
  const npcs = game.npcs.list;
  s.npcs.forEach((ns, i) => {
    const n = npcs[i];
    if (!n) return;
    set3(n.pos, ns.pos);
    set2c(n.vel, ns.vel);
    n.state = ns.state;
    n.facing = ns.facing / 10;
    n.windup = ns.windup / 100;
    if (ns.phase !== null || 'phase' in n) n.phase = ns.phase;
  });
  game.npcs.projectiles = s.projectiles.map((p) => ({
    npc: npcs[p.npc],
    pos: { x: p.pos[0] / 100, y: p.pos[1] / 100, z: p.pos[2] / 100 },
    vel: { x: p.vel[0] / 100, y: p.vel[1] / 100, z: p.vel[2] / 100 },
    life: p.life / 100,
  }));
  const zones = game.weather.zones;
  s.weather.zones.forEach((zs, i) => {
    const z = zones[i];
    if (!z) return;
    z.phase = zs.phase;
    z.timer = zs.timer / 100;
    z._phaseLen = zs.phaseLen / 100;
    z.intensity = zs.intensity / 100;
    if (zs.dir && z.dir) set2u(z.dir, zs.dir);
    if ('boxShelter' in z) z.boxShelter = zs.boxShelter >= 0 ? shelterList(z)[zs.boxShelter] : null;
  });
  game.weather.current = s.weather.current >= 0 ? zones[s.weather.current] : null;
  game.weather.sheltered = s.weather.sheltered;
  const broken = new Set(s.glassBroken);
  const newlyBroken = [];
  for (const st of game.world.statics) {
    if (st.def?.kind !== 'glass') continue;
    const should = broken.has(st.def.id);
    if (should === !!st.broken) continue;
    if (should) newlyBroken.push(st.def.id);
    st.broken = should;
    // Igual que World.breakGlass / restoreGlass: el panel roto deja de ser suelo.
    const i = game.world.colliders.indexOf(st);
    if (should && i >= 0) game.world.colliders.splice(i, 1);
    if (!should && i < 0) game.world.colliders.push(st);
  }
  s.recovery.forEach((a, i) => {
    if (game.world.recovery[i]) game.world.recovery[i].active = a;
  });
  game.cacti.near = s.cacti.near;
  s.cacti.lunge.forEach((l, i) => {
    if (game.cacti.plants[i]) game.cacti.plants[i].lunge = l / 100;
  });
  return newlyBroken;
}

// ------------------------------------------------------------------ eventos

/**
 * Eventos que solo le importan al propio dúo (HUD, audio y avisos de SU caja / SU clima). Los demás dúos no los reciben.
 * El resto de eventos reenviados (ver backend/src/match/events.js) van a todos.
 */
export const PRIVATE_EVENTS = [
  'box:wet',
  'bomb:beep',
  'bomb:warn',
  'bomb:desync',
  'cat:warn',
  'cat:shred',
  'cat:goal',
  'recovery:enter',
  'recovery:tick',
  'recovery:exit',
  'weather:enter',
  'weather:exit',
  'weather:warn',
  'weather:start',
  'weather:end',
  'weather:shelter',
];

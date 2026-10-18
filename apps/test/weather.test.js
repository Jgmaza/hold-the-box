// Clima: zonas desde `platform.weather`, lluvia (mojado progresivo, techitos, piso resbaloso),
// viento (empuje, inclinación, se lleva contenido), ritmo con semilla y el nivel 1 (sin navegador).
import { afterEach, describe, expect, it } from 'vitest';
import { rainIsland, windHoles, windIsland } from '../src/levels/sections.js';
import { WEATHER_TYPES } from '../src/sim/weather/weatherService.js';
import { CONFIG, Game, IDLE, LEFT, RIGHT, jump, level1, run } from './helpers.js';

const W = CONFIG.weather;

afterEach(() => {
  W.enabled = true;
});

/** Isla con clima (z -6..6) + isla seca separada (z 14..26). La pareja arranca en la isla con clima. */
const island = (weather, { seed = 1, on = 'isla' } = {}) => {
  const z = on === 'isla' ? 0 : 20;
  const g = new Game(
    {
      id: 'test-clima',
      waterLevel: 0,
      spawn: { p1: { x: -0.8, y: 1, z }, p2: { x: 0.8, y: 1, z } },
      platforms: [
        { id: 'isla', x: 0, z: 0, w: 12, d: 12, top: 1, weather },
        { id: 'seco', x: 0, z: 20, w: 12, d: 12, top: 1 },
      ],
    },
    { seed },
  );
  g.setInputs(jump(), jump());
  return { g, zone: g.weather.zones[0] };
};

/** Fija la fase de una zona (y su intensidad) por mucho tiempo. */
const hold = (zone, phase) => {
  zone.phase = phase;
  zone.timer = zone._phaseLen = 999;
  const C = zone.C;
  zone.intensity = phase === 'active' ? 1 : phase === 'warn' ? C.warnLevel : (C[zone.calmKey] ?? 0);
};

describe('zonas de clima', () => {
  it('se crean desde platform.weather (texto u objeto con ajustes)', () => {
    const a = island('rain').zone;
    expect(a.type).toBe('rain');
    expect(a.platformId).toBe('isla');
    const b = island({ type: 'wind', dir: 90, strength: 0.5 }).zone;
    expect(b.type).toBe('wind');
    expect(b.strength).toBe(0.5);
    expect(b.dir.z).toBeCloseTo(1);
  });

  it('un clima desconocido avisa con un error claro', () => {
    expect(() => island('nieve')).toThrow(/clima "nieve"/);
    expect(Object.keys(WEATHER_TYPES)).toEqual(['rain', 'wind', 'waves']);
  });

  it('el nivel 1 tiene isla de lluvia y luego isla de viento, después de la isla hard y antes del muelle', () => {
    const g = new Game(level1);
    expect(g.weather.zones.map((z) => [z.type, z.platformId])).toEqual([
      ['rain', 'isla-lluvia'],
      ['wind', 'isla-viento'],
    ]);
    const hard = g.npcs.list.find((n) => n.difficulty === 'hard');
    const [rain, wind] = g.weather.zones;
    expect(rain.area.max.z).toBeLessThanOrEqual(hard.platform.min.z);
    expect(wind.area.max.z).toBeLessThanOrEqual(rain.area.min.z);
    expect(wind.area.min.z).toBeGreaterThan(0); // la salida del muelle (z 6 .. -6) no se movió
  });
});

describe('lluvia', () => {
  it('el aguacero moja la caja mucho más que la llovizna', () => {
    const heavy = island('rain');
    hold(heavy.zone, 'active');
    run(heavy.g, 2, IDLE, IDLE);
    const light = island('rain');
    hold(light.zone, 'calm');
    run(light.g, 2, IDLE, IDLE);
    expect(heavy.g.box.wetness).toBeGreaterThan(W.rain.wetRate * 2 * 0.8);
    expect(light.g.box.wetness).toBeGreaterThan(0);
    expect(light.g.box.wetness).toBeLessThan(heavy.g.box.wetness / 2);
  });

  it('fuera de la isla no moja', () => {
    const { g, zone } = island('rain', { on: 'seco' });
    hold(zone, 'active');
    run(g, 2, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
  });

  it('un aguacero entero al descubierto empapa la caja (para eso están las carpas)', () => {
    const { g, zone } = island('rain');
    hold(zone, 'active');
    run(g, W.rain.activeTime, IDLE, IDLE);
    expect(g.box.wetness).toBeGreaterThan(50);
  });

  it('quedarse al descubierto bajo el aguacero termina en derrota "soaked"', () => {
    const { g, zone } = island('rain');
    hold(zone, 'active');
    run(g, 7, IDLE, IDLE);
    expect(g.state).toBe('failed');
    expect(g.failReason).toBe('soaked');
  });

  it('bajo una carpa no se moja', () => {
    const { g, zone } = island({ type: 'rain', shelters: [{ x: 0, z: 0, w: 3.6, d: 3 }] });
    hold(zone, 'active');
    run(g, 3, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
    expect(zone.boxShelter).not.toBe(null);
  });

  it('cubre aunque la caja asome un poco (centro hasta shelterMargin fuera del borde)', () => {
    const edge = 1.8; // borde de una carpa de 3.6 m centrada en x = 0
    const out = edge + W.rain.shelterMargin * 0.7;
    const { g, zone } = island({ type: 'rain', shelters: [{ x: 0, z: 0, w: 3.6, d: 3 }] });
    g.teleport({ p1: { x: out - 0.8, y: 1, z: 0 }, p2: { x: out + 0.8, y: 1, z: 0 } });
    hold(zone, 'active');
    run(g, 2, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
    // Más afuera ya no cubre.
    const far = edge + W.rain.shelterMargin + 0.5;
    g.teleport({ p1: { x: far - 0.8, y: 1, z: 0 }, p2: { x: far + 0.8, y: 1, z: 0 } });
    hold(zone, 'active');
    run(g, 1, IDLE, IDLE);
    expect(g.box.wetness).toBeGreaterThan(10);
  });

  it('avisa al entrar y salir de una carpa (weather:shelter)', () => {
    const { g } = island({ type: 'rain', shelters: [{ x: 0, z: 0, w: 3.6, d: 3 }] });
    const log = [];
    g.events.on('weather:shelter', (e) => log.push(e.inside));
    run(g, 0.2, IDLE, IDLE);
    run(g, 0.8, RIGHT, RIGHT); // salen caminando
    expect(log).toEqual([true, false]);
  });

  it('el piso mojado resbala, pero bajo la carpa no', () => {
    const open = island('rain');
    run(open.g, 0.1, IDLE, IDLE);
    expect(open.g.weather.fx.gripMul[1]).toBeCloseTo(W.rain.slip);
    const covered = island({ type: 'rain', shelters: [{ x: 0, z: 0, w: 3.6, d: 3 }] });
    run(covered.g, 0.1, IDLE, IDLE);
    expect(covered.g.weather.fx.gripMul[1]).toBe(1);
  });

  it('en el nivel 1 hay carpas donde entra la pareja con la caja', () => {
    const rain = new Game(level1).weather.zones.find((z) => z.type === 'rain');
    expect(rain.shelters.length).toBeGreaterThanOrEqual(3);
    for (const s of rain.shelters) {
      expect(s.w).toBeGreaterThanOrEqual(CONFIG.carry.restDistance + 1.5);
      expect(rain.contains({ x: s.x, y: rain.floorY + 1, z: s.z })).toBe(true);
    }
  });
});

describe('viento', () => {
  it('quietos, la ráfaga los saca de la isla y caen al agua (hay que caminar en contra)', () => {
    const { g, zone } = island({ type: 'wind', dir: 0 });
    hold(zone, 'active');
    let splash = 0;
    g.events.on('game:splash', () => splash++);
    run(g, 3.5, IDLE, IDLE);
    expect(splash).toBeGreaterThanOrEqual(1);
  });

  it('la ráfaga empuja a la pareja, inclina la caja y se lleva contenido', () => {
    const { g, zone } = island({ type: 'wind', dir: 0 }); // sopla hacia +X
    hold(zone, 'active');
    let maxTilt = 0;
    run(g, 1.5, IDLE, IDLE, (s) => (maxTilt = Math.max(maxTilt, s.mag)));
    expect(g.p1.pos.x).toBeGreaterThan(-0.8 + 1);
    expect(g.p2.pos.x).toBeGreaterThan(0.8 + 1);
    expect(maxTilt).toBeGreaterThan(5);
    expect(g.box.integrity).toBeLessThan(100 - W.wind.drainRate);
    expect(g.box.wetness).toBe(0);
  });

  it('el viento seca la caja mojada; sin viento seca más lento', () => {
    const windy = island({ type: 'wind', dir: 0 });
    hold(windy.zone, 'active');
    windy.g.box.wetness = 60;
    run(windy.g, 1, IDLE, IDLE);
    const calm = island({ type: 'wind', dir: 0 });
    hold(calm.zone, 'calm');
    calm.g.box.wetness = 60;
    run(calm.g, 1, IDLE, IDLE);
    const dry = island(undefined, { on: 'seco' });
    dry.g.box.wetness = 60;
    run(dry.g, 1, IDLE, IDLE);
    expect(windy.g.box.wetness).toBeLessThan(calm.g.box.wetness - 3);
    expect(calm.g.box.wetness).toBeLessThan(dry.g.box.wetness);
  });

  it('el viento no seca mientras algo moja: la lluvia o un chorro siguen ganando', () => {
    const { g, zone } = island({ type: 'wind', dir: 0 });
    hold(zone, 'active');
    g.box.wetness = 30;
    g.box.wetRate = 0;
    zone.update(0);
    const fx = g.weather._clear();
    zone.apply(0, g, fx);
    expect(fx.dry).toBeCloseTo(W.wind.dryRate);
    g.box.wetRate = 10;
    g.box.update(1, g.p1, g.p2);
    expect(g.box.wetness).toBeGreaterThan(30);
  });

  it('el hueco no tiene piso: quien lo pisa cae al agua, y un cuerpo al lado se sostiene', () => {
    const hole = { x: 0, z: 0, r: 1.5 };
    const { g, zone } = island({ type: 'wind', dir: 0, holes: [hole] });
    hold(zone, 'calm');
    expect(g.world.floorBelow(0, 0, 5)).toBe(-Infinity);
    expect(g.world.floorBelow(3, 0, 5)).toBe(1);
    expect(zone.holeAt({ x: 1, z: 0 })).toBe(hole);
    expect(zone.holeAt({ x: 3, z: 0 })).toBeNull();
    let splash = 0;
    g.events.on('game:splash', () => splash++);
    g.teleport({ p1: { x: -0.4, y: 1, z: 0 }, p2: { x: 0.4, y: 1, z: 0 } });
    run(g, 2, IDLE, IDLE);
    expect(splash).toBeGreaterThanOrEqual(1);
  });

  it('el pozo tiene paredes: quien cae no puede salir de costado ni atravesar el borde', () => {
    const hole = { x: 0, z: 0, r: 1.5 };
    for (const inputs of [[LEFT, RIGHT], [RIGHT, LEFT], [LEFT, LEFT], [RIGHT, RIGHT]]) {
      const { g, zone } = island({ type: 'wind', dir: 0, holes: [hole] });
      hold(zone, 'calm');
      g.teleport({ p1: { x: -0.4, y: 1, z: 0 }, p2: { x: 0.4, y: 1, z: 0 } });
      let fell = 0;
      let worst = 0;
      g.events.on('game:splash', () => fell++);
      for (let i = 0; i < 150 && !fell; i++) {
        g.setInputs(i === 0 ? inputs[0] : { ...inputs[0], jumpPressed: false }, i === 0 ? inputs[1] : { ...inputs[1], jumpPressed: false });
        g.update(1 / 60);
        for (const p of g.players) {
          if (p.pos.y < 1 - 0.12) worst = Math.max(worst, Math.hypot(p.pos.x - hole.x, p.pos.z - hole.z));
        }
      }
      expect(fell).toBeGreaterThan(0);
      expect(worst).toBeLessThanOrEqual(hole.r + 1e-6);
    }
  });

  it('en cambio, fuera del hueco la isla sostiene a la pareja', () => {
    const { g, zone } = island({ type: 'wind', dir: 0, holes: [{ x: 4.5, z: 4.5, r: 1 }] });
    hold(zone, 'calm');
    let splash = 0;
    g.events.on('game:splash', () => splash++);
    run(g, 2, IDLE, IDLE);
    expect(splash).toBe(0);
  });

  it('en calma casi no hace nada', () => {
    const { g, zone } = island({ type: 'wind', dir: 0 });
    hold(zone, 'calm');
    run(g, 1.5, IDLE, IDLE);
    expect(g.box.integrity).toBeGreaterThan(98.5);
  });

  it('caminar contra la ráfaga compensa el empuje', () => {
    const idle = island({ type: 'wind', dir: 0 });
    hold(idle.zone, 'active');
    run(idle.g, 1, IDLE, IDLE);
    const against = island({ type: 'wind', dir: 0 });
    hold(against.zone, 'active');
    run(against.g, 1, LEFT, LEFT);
    expect(against.g.box.center.x).toBeLessThan(idle.g.box.center.x - 1);
  });

  it('sincronizados pierden menos contenido que desincronizados', () => {
    const { g, zone } = island({ type: 'wind', dir: 0 });
    hold(zone, 'active');
    zone.update(0);
    const drainWith = (sync) => {
      g.box.sync = sync;
      const fx = g.weather._clear();
      zone.apply(0, g, fx);
      return fx.drain;
    };
    expect(drainWith(1)).toBeCloseTo(W.wind.drainRate);
    expect(drainWith(0)).toBeCloseTo(W.wind.drainRate * (1 + W.wind.syncRelief));
  });

  it('alternate cambia de lado en cada ráfaga', () => {
    const { zone } = island({ type: 'wind', dir: 'alternate' });
    const sides = [];
    for (let i = 0; i < 4; i++) {
      zone.onPhase('warn');
      sides.push(Math.sign(zone.dir.x));
    }
    expect(sides[0]).toBe(-sides[1]);
    expect(sides[1]).toBe(-sides[2]);
  });
});

describe('ritmo y control', () => {
  const timeline = (seed) => {
    // Suave para que no los tire al agua (al reaparecer el ciclo se reinicia): aquí solo se mide el ritmo.
    const { g } = island({ type: 'wind', strength: 0.3 }, { seed });
    const log = [];
    for (const ev of ['weather:warn', 'weather:start', 'weather:end']) g.events.on(ev, () => log.push(`${ev}@${g.runTime.toFixed(2)}`));
    run(g, 20, IDLE, IDLE);
    return log;
  };

  it('misma semilla = mismas ráfagas; el aviso llega antes que lo fuerte', () => {
    const a = timeline(5);
    expect(a).toEqual(timeline(5));
    expect(a.length).toBeGreaterThanOrEqual(6);
    expect(a[0].startsWith('weather:warn')).toBe(true);
    expect(a[1].startsWith('weather:start')).toBe(true);
    expect(a[2].startsWith('weather:end')).toBe(true);
  });

  it('avisa al entrar y salir de una zona', () => {
    const { g } = island('rain');
    const log = [];
    g.events.on('weather:enter', (e) => log.push(`enter:${e.type}`));
    g.events.on('weather:exit', (e) => log.push(`exit:${e.type}`));
    run(g, 0.1, IDLE, IDLE);
    g.teleport({ p1: { x: -0.8, y: 1, z: 20 }, p2: { x: 0.8, y: 1, z: 20 } });
    run(g, 0.1, IDLE, IDLE);
    expect(log).toEqual(['enter:rain']);
    expect(g.weather.current).toBe(null);
  });

  it('con CONFIG.weather.enabled = false no hace nada', () => {
    W.enabled = false;
    const { g, zone } = island('rain');
    hold(zone, 'active');
    run(g, 2, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
  });

  it('el empuje del jugador y las fuerzas externas de la caja se limpian al reaparecer', () => {
    const { g, zone } = island({ type: 'wind', dir: 0 });
    hold(zone, 'active');
    run(g, 0.5, IDLE, IDLE);
    expect(g.p1.push.x).toBeGreaterThan(0);
    expect(g.box.external.drain).toBeGreaterThan(0);
    g.teleport(-1);
    expect(g.p1.push).toEqual({ x: 0, z: 0 });
    expect(g.box.external).toEqual({ roll: 0, pitch: 0, drain: 0, dry: 0 });
  });
});

describe('secciones: rainIsland / windIsland', () => {
  it('reparte las carpas parejo a lo largo y siempre alternadas izquierda / derecha', () => {
    const p = rainIsland({ id: 'lluvia', from: 40, length: 30, shelters: 6 });
    expect(p).toMatchObject({ id: 'lluvia', z: 25, d: 30, w: 10, top: 1, weather: { type: 'rain' } });
    const sh = p.weather.shelters;
    expect(sh).toHaveLength(6);
    sh.forEach((s, i) => {
      expect(Math.sign(s.x)).toBe(i % 2 === 0 ? -1 : 1); // empieza a la izquierda
      if (i) expect(sh[i - 1].z - s.z).toBeCloseTo(5); // 30 m / 6
      expect(s.z).toBeLessThan(40);
      expect(s.z).toBeGreaterThan(10);
    });
    expect(rainIsland({ id: 'r', from: 0, length: 9, shelters: 2, firstSide: 'right' }).weather.shelters[0].x).toBeGreaterThan(0);
  });

  it('sin `shelters` pone una carpa cada ~4.5 m', () => {
    expect(rainIsland({ id: 'a', from: 0, length: 14 }).weather.shelters).toHaveLength(3);
    expect(rainIsland({ id: 'b', from: 0, length: 45 }).weather.shelters).toHaveLength(10);
    expect(rainIsland({ id: 'c', from: 0, length: 3 }).weather.shelters).toHaveLength(1);
    expect(() => rainIsland({ id: 'd', from: 0, length: 2 })).toThrow(/no entran/); // ni una carpa de 3 m
  });

  it('las carpas quedan dentro de la isla, no se pisan y dejan pasillo en el centro', () => {
    const p = rainIsland({ id: 'x', from: 10, length: 20, shelters: 5, x: 3 });
    for (const s of p.weather.shelters) {
      expect(Math.abs(s.x - p.x) + s.w / 2).toBeLessThanOrEqual(p.w / 2);
      expect(Math.abs(s.x - p.x) - s.w / 2).toBeGreaterThan(0.3);
      expect(Math.abs(s.z - p.z) + s.d / 2).toBeLessThanOrEqual(p.d / 2);
    }
  });

  it('avisa si las carpas no entran o faltan datos', () => {
    expect(() => rainIsland({ id: 'x', from: 0, length: 8, shelters: 4 })).toThrow(/no entran/);
    expect(() => rainIsland({ id: 'x', from: 0, length: 8, width: 6 })).toThrow(/angosta/);
    expect(() => rainIsland({ from: 0, length: 8 })).toThrow(/id/);
    expect(() => rainIsland({ id: 'x', length: 8 })).toThrow(/from/);
  });

  it('una sección hecha con rainIsland funciona en el juego (moja afuera, no bajo las carpas)', () => {
    const plat = rainIsland({ id: 'isla', from: 6, length: 12, shelters: 2 });
    const s0 = plat.weather.shelters[0];
    const g = new Game({ id: 't', waterLevel: 0, spawn: { p1: { x: s0.x - 0.8, y: 1, z: s0.z }, p2: { x: s0.x + 0.8, y: 1, z: s0.z } }, platforms: [plat] });
    g.setInputs(jump(), jump());
    hold(g.weather.zones[0], 'active');
    run(g, 2, IDLE, IDLE);
    expect(g.box.wetness).toBe(0);
    g.teleport({ p1: { x: -0.8, y: 1, z: 0 }, p2: { x: 0.8, y: 1, z: 0 } });
    hold(g.weather.zones[0], 'active');
    run(g, 0.5, IDLE, IDLE);
    expect(g.box.wetness).toBeGreaterThan(W.rain.wetRate * 0.5 * 0.7);
  });

  it('windIsland arma una isla de viento', () => {
    expect(windIsland({ id: 'v', from: 23, length: 14 })).toMatchObject({ z: 16, d: 14, weather: { type: 'wind', dir: 'alternate' } });
    expect(windIsland({ id: 'v', from: 0, length: 5, dir: 90, strength: 2 }).weather).toEqual({ type: 'wind', dir: 90, strength: 2 });
  });

  it('windHoles reparte huecos según el largo, siempre iguales para el mismo id', () => {
    const a = windHoles({ id: 'v', from: 23, length: 24 });
    const { margin, spacing } = W.wind.holeLayout;
    expect(a.length).toBe(Math.floor((24 - 2 * margin) / spacing));
    expect(windHoles({ id: 'v', from: 23, length: 24 })).toEqual(a);
    expect(windHoles({ id: 'otra', from: 23, length: 24 })).not.toEqual(a);
    expect(windHoles({ id: 'v', from: 23, length: 40 }).length).toBeGreaterThan(a.length);
    expect(windHoles({ id: 'v', from: 23, length: 4 })).toEqual([]);
  });

  it('los huecos van cerca del centro, alternando izquierda / derecha (slalom)', () => {
    const { center } = W.wind.holeLayout;
    for (const length of [12, 16, 22, 30, 45]) {
      const holes = windHoles({ id: `isla-${length}`, from: 10, length, width: 10 });
      for (const [i, h] of holes.entries()) {
        expect(Math.abs(h.x)).toBeGreaterThanOrEqual(center.min - 1e-6);
        expect(Math.abs(h.x)).toBeLessThanOrEqual(center.max + 1e-6);
        expect(Math.abs(h.x) - h.r).toBeLessThanOrEqual(0.8 + 1e-6); // pisa la huella de la pareja que va por el centro: hay que esquivarlo
        if (i > 0) expect(Math.sign(h.x)).toBe(-Math.sign(holes[i - 1].x));
      }
    }
  });

  it('siempre hay por dónde pasar: pasillo del otro lado y respiro entre huecos', () => {
    const { margin, zGap } = W.wind.holeLayout;
    for (const length of [12, 16, 22, 30, 45]) {
      const from = 10;
      const holes = windHoles({ id: `isla-${length}`, from, length, width: 10 });
      for (const [i, h] of holes.entries()) {
        expect(Math.abs(h.x) + h.r).toBeLessThanOrEqual(5);
        expect(5 + Math.abs(h.x) - h.r).toBeGreaterThanOrEqual(3); // lado contrario libre para la pareja
        expect(h.z + h.r).toBeLessThanOrEqual(from - margin + 1e-6);
        expect(h.z - h.r).toBeGreaterThanOrEqual(from - length + margin - 1e-6);
        if (i > 0) {
          const prev = holes[i - 1];
          expect(prev.z - prev.r - (h.z + h.r)).toBeGreaterThanOrEqual(zGap - 0.02);
        }
      }
    }
  });

  it('windIsland lleva los huecos en weather.holes (holes: false los quita)', () => {
    const w = windIsland({ id: 'v', from: 23, length: 24 });
    expect(w.weather.holes).toEqual(windHoles({ id: 'v', from: 23, length: 24 }));
    expect(windIsland({ id: 'v', from: 23, length: 24, holes: false }).weather.holes).toBeUndefined();
    expect(windIsland({ id: 'v', from: 23, length: 24, holes: 1 }).weather.holes).toHaveLength(1);
  });

  it('la lluvia moja el doble: llovizna 8 %/s y aguacero 40 %/s', () => {
    expect(W.rain.wetRate * W.rain.drizzle).toBeCloseTo(8);
    expect(W.rain.wetRate).toBe(40);
  });
});

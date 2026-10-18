// Mapas de mar (Muelle, Bahía): cargan, se pueden ganar, la dificultad sube y la escenografía no estorba.
import { describe, expect, it } from 'vitest';
import { LEVELS, MAPS } from '../src/levels/index.js';
import { dressIsland, SCENERY_SETS } from '../src/levels/sections.js';
import { BACK, FWD, Game, IDLE, RIGHT, jump, run } from './helpers.js';

const SEA = ['muelle', 'bahia'];

const start = (level) => {
  const g = new Game(level, { seed: 1 });
  g.setInputs(jump(), jump());
  return g;
};

const length = (L) => {
  const zs = L.platforms.flatMap((p) => [p.z + p.d / 2, p.z - p.d / 2]);
  return Math.max(...zs) - Math.min(...zs);
};
const hazards = (L) =>
  L.platforms.filter((p) => p.kind === 'rock' || p.kind === 'bump').length +
  (L.geysers?.length ?? 0) +
  (L.sweepers?.length ?? 0) * 2 +
  (L.npcs ?? []).reduce((n, npc) => n + { easy: 1, medium: 2, hard: 3 }[npc.difficulty], 0) +
  (L.moving?.length ?? 0);
const onPlatform = (L, x, z) => L.platforms.some((p) => Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.d / 2);

describe('tope de inicio', () => {
  for (const [key, L] of Object.entries(LEVELS)) {
    it(`${key}: desde el inicio solo se avanza hacia la meta`, () => {
      const g = start(L);
      const z0 = Math.max(g.p1.pos.z, g.p2.pos.z);
      run(g, 2, BACK, BACK);
      expect(g.state).toBe('playing');
      expect(g.p1.pos.z).toBeLessThan(z0 + 2.5);
      expect(g.p2.pos.z).toBeLessThan(z0 + 2.5);

      const forward = start(L);
      run(forward, 0.45, FWD, FWD);
      expect(Math.max(forward.p1.pos.z, forward.p2.pos.z)).toBeLessThan(z0 - 0.35);
    });
  }
});

describe('mapas de mar', () => {
  it('el selector los muestra primero, con 1 y 2 estrellas', () => {
    expect(MAPS.slice(0, 2).map((m) => m.key)).toEqual(SEA);
    expect(MAPS.slice(0, 2).map((m) => m.difficulty)).toEqual([1, 2]);
  });

  for (const key of SEA) {
    describe(key, () => {
      const L = LEVELS[key];

      it('carga y queda quieto en el spawn', () => {
        const g = start(L);
        run(g, 1, IDLE, IDLE);
        expect(g.state).toBe('playing');
        expect(g.box.state).not.toBe('dropped');
      });

      it('checkpoints en orden hacia −Z, cada uno sobre piso', () => {
        const zs = L.checkpoints.map((c) => c.z);
        expect([...zs].sort((a, b) => b - a)).toEqual(zs);
        for (const c of L.checkpoints) expect(onPlatform(L, c.spawn.p1.x, c.spawn.p1.z)).toBe(true);
      });

      it('se gana desde la meta', () => {
        const g = start(L);
        g.teleport('goal');
        run(g, 2, FWD, FWD);
        expect(g.state).toBe('won');
      });

      it('teletransportar a cada checkpoint no tira a nadie al agua', () => {
        for (let i = 0; i < L.checkpoints.length; i++) {
          const g = start(L);
          g.teleport(i);
          run(g, 0.8, IDLE, IDLE);
          expect(g.state).toBe('playing');
          expect(g.p1.pos.y).toBeGreaterThan(0.5);
        }
      });

      it('escenografía Kenney fuera del pasillo central y del spawn', () => {
        const props = L.scenery.filter((s) => !s.float);
        expect(props.length).toBeGreaterThan(10);
        for (const s of props) expect(Math.abs(s.x)).toBeGreaterThan(2);
        for (const s of L.scenery.filter((s) => s.float)) expect(onPlatform(L, s.x, s.z)).toBe(false);
      });
    });
  }
});

const JUNGLE = ['aldea'];
const DESERT = ['campamento'];

describe('selva', () => {
  it('la aldea va después del mar, con 1 estrella', () => {
    expect(MAPS.map((m) => m.key)).toEqual([...SEA, ...JUNGLE, ...DESERT]);
    expect(MAPS[2].difficulty).toBe(1);
    expect(LEVELS.aldea.theme).toBe('jungle');
    expect(LEVELS.aldea.biome).toBe('village');
  });

  for (const key of JUNGLE) {
    it(`${key} carga, checkpoints hacia −Z y se gana`, () => {
      const L = LEVELS[key];
      const g = start(L);
      run(g, 1, IDLE, IDLE);
      expect(g.state).toBe('playing');
      const zs = L.checkpoints.map((c) => c.z);
      expect([...zs].sort((a, b) => b - a)).toEqual(zs);
      for (const c of L.checkpoints) expect(onPlatform(L, c.spawn.p1.x, c.spawn.p1.z)).toBe(true);
      g.teleport('goal');
      run(g, 2, FWD, FWD);
      expect(g.state).toBe('won');
    });
  }

  it('la aldea es tierra firme: camino de tierra, sin chorros ni rodillos', () => {
    const a = LEVELS.aldea;
    expect(a.platforms.some((p) => p.skin === 'dirt')).toBe(true);
    expect(a.platforms.some((p) => p.kind === 'ground')).toBe(true);
    expect(a.geysers ?? []).toHaveLength(0);
    expect(a.sweepers ?? []).toHaveLength(0);
  });
});

describe('desierto', () => {
  it('el campamento va al final, con 1 estrella', () => {
    expect(MAPS.at(-1).key).toBe('campamento');
    expect(MAPS.at(-1).difficulty).toBe(1);
    expect(LEVELS.campamento.theme).toBe('desert');
    expect(LEVELS.campamento.biome).toBe('camp');
  });

  for (const key of DESERT) {
    it(`${key} carga, checkpoints hacia −Z y se gana`, () => {
      const L = LEVELS[key];
      const g = start(L);
      run(g, 1, IDLE, IDLE);
      expect(g.state).toBe('playing');
      const zs = L.checkpoints.map((c) => c.z);
      expect([...zs].sort((a, b) => b - a)).toEqual(zs);
      for (const c of L.checkpoints) expect(onPlatform(L, c.spawn.p1.x, c.spawn.p1.z)).toBe(true);
      g.teleport('goal');
      run(g, 2, FWD, FWD);
      expect(g.state).toBe('won');
    });
  }

  it('el campamento es un laberinto de arena con cactus hostiles', () => {
    const a = LEVELS.campamento;
    expect(a.platforms.some((p) => p.skin === 'sand')).toBe(true);
    expect(a.cacti.filter((c) => c.hostile).length).toBeGreaterThan(3);
    expect(a.platforms.some((p) => p.id === 'carril-izq')).toBe(true);
    expect(a.platforms.some((p) => p.id === 'carril-der')).toBe(true);
    expect(a.sweepers ?? []).toHaveLength(0);
  });

  it('el cactus hostil pincha y baja Contenido', () => {
    const g = start({
      id: 'pinche',
      waterLevel: 0,
      spawn: { p1: { x: -0.8, y: 1, z: 0 }, p2: { x: 0.8, y: 1, z: 0 } },
      platforms: [{ id: 'piso', x: 0, z: 0, w: 8, d: 8, top: 1 }],
      cacti: [{ x: 0, z: 0, hostile: true }],
    });
    run(g, 0.5, IDLE, IDLE);
    expect(g.cacti.near).toBe(true);
    expect(g.box.integrity).toBeLessThan(100);
  });

  it('en el campamento el centro del carril bueno no pincha y la trampa sí', () => {
    const hostile = LEVELS.campamento.cacti.filter((c) => c.hostile);
    const safe = { x: -3.1, z: 21 };
    for (const c of hostile) {
      expect(Math.hypot(c.x - safe.x, c.z - safe.z)).toBeGreaterThan(1.2);
    }
    const trap = LEVELS.campamento.platforms.find((p) => p.id === 'trampa-der');
    const next = LEVELS.campamento.platforms.find((p) => p.id === 'cruce');
    expect(trap.z - trap.d / 2).toBeGreaterThan(next.z + next.d / 2);
    expect(hostile.some((c) => Math.hypot(c.x - 3.2, c.z - 23.2) < 0.2)).toBe(true);
  });

  it('la raja entre carriles es más ancha que la pareja y cruzarla tira al vacío', () => {
    const plats = LEVELS.campamento.platforms;
    const gap = (a, b) => {
      const left = plats.find((p) => p.id === a);
      const right = plats.find((p) => p.id === b);
      return right.x - right.w / 2 - (left.x + left.w / 2);
    };
    expect(gap('carril-izq', 'trampa-der')).toBeGreaterThan(2.2);
    expect(gap('trampa-izq', 'carril-der')).toBeGreaterThan(2.2);

    const g = start(LEVELS.campamento);
    g.teleport({
      p1: { x: -2.2, y: 1, z: 24 },
      p2: { x: -2.2, y: 1, z: 22 },
    });
    let low = 1;
    run(g, 1.4, RIGHT, RIGHT, (_, game) => {
      low = Math.min(low, game.p1.pos.y, game.p2.pos.y);
    });
    expect(low).toBeLessThan(0);
  });

  it('la tinaja del campamento frena a los muñecos', () => {
    const g = start(LEVELS.campamento);
    g.teleport({
      p1: { x: 0.2, y: 1, z: 41.2 },
      p2: { x: 1.6, y: 1, z: 41.2 },
    });
    run(g, 1.2, RIGHT, RIGHT);
    const pot = g.world.solids.find((s) => s.def.art === 'pot' && s.aabb.min.z < 41.2 && s.aabb.max.z > 41.2);
    expect(pot).toBeTruthy();
    expect(g.p2.pos.x).toBeLessThan(pot.aabb.min.x);
    expect(g.p1.pos.y).toBeGreaterThan(0.5);
  });
});

describe('puentes de vidrio', () => {
  it('en cada fila de la aldea hay un templado y un normal, y no queda lluvia', () => {
    const glass = LEVELS.aldea.platforms.filter((p) => p.kind === 'glass');
    const rows = new Map();
    for (const p of glass) {
      const row = rows.get(p.z) ?? [];
      row.push(p);
      rows.set(p.z, row);
    }
    expect(rows.size).toBe(5);
    for (const row of rows.values()) {
      expect(row).toHaveLength(2);
      expect(row.filter((p) => p.tempered)).toHaveLength(1);
    }
    expect(LEVELS.aldea.platforms.some((p) => p.weather)).toBe(false);
  });

  it('el vidrio normal se rompe al pisarlo y el templado aguanta', () => {
    const arena = (tempered) => ({
      id: 'vidrio',
      waterLevel: 0,
      spawn: { p1: { x: -0.75, y: 1, z: 0 }, p2: { x: 0.75, y: 1, z: 0 } },
      platforms: [{ id: 'panel', x: 0, z: 0, w: 3.2, d: 2.4, top: 1, h: 0.2, kind: 'glass', tempered }],
    });
    const broken = start(arena(false));
    let minY = 1;
    run(broken, 0.8, IDLE, IDLE, () => {
      minY = Math.min(minY, broken.p1.pos.y);
    });
    expect(broken.world.statics[0].broken).toBe(true);
    expect(broken.world.colliders.includes(broken.world.statics[0])).toBe(false);
    expect(minY).toBeLessThan(0);

    const safe = start(arena(true));
    run(safe, 1.2, IDLE, IDLE);
    expect(safe.world.statics[0].broken).toBeFalsy();
    expect(safe.state).toBe('playing');
    expect(safe.p1.pos.y).toBeGreaterThan(0.9);
  });

  it('bajo el vidrio de la aldea no hay piso', () => {
    const g = new Game(LEVELS.aldea, { seed: 1 });
    const panel = g.world.statics.find((s) => s.def.kind === 'glass' && !s.def.tempered);
    expect(g.world.breakGlass(panel)).toBe(true);
    expect(g.world.floorBelow(panel.def.x, panel.def.z, panel.def.top - 0.02)).toBe(-Infinity);
  });
});

describe('mapas de mar — ritmo', () => {
  it('la dificultad crece del Muelle a la Bahía: más largo, más peligros, checkpoints más separados', () => {
    const [a, b] = SEA.map((k) => LEVELS[k]);
    expect(length(a)).toBeLessThan(length(b));
    expect(hazards(a)).toBeLessThan(hazards(b));
    const spacing = (L) => length(L) / L.checkpoints.length;
    expect(spacing(a)).toBeLessThan(spacing(b));
  });
});

describe('piezas del Muelle en todos los mapas', () => {
  const KINDS = ['bomb', 'cat', 'dry', 'refill'];

  for (const [key, L] of Object.entries(LEVELS)) {
    it(`${key}: las cuatro estaciones, sobre piso y fuera del pasillo`, () => {
      const rec = L.recovery ?? [];
      expect(rec.map((r) => r.kind).sort()).toEqual(KINDS);
      for (const r of rec) {
        expect(onPlatform(L, r.x, r.z), r.id).toBe(true);
        expect(Math.abs(r.x) - r.w / 2, `${r.id} tapa el pasillo`).toBeGreaterThan(1.9);
      }
    });
  }

  for (const key of ['muelle', 'bahia', 'campamento']) {
    it(`${key}: las estaciones se ven al arrancar (al lado del spawn)`, () => {
      const L = LEVELS[key];
      for (const r of L.recovery) expect(Math.abs(r.z - L.spawn.p1.z), r.id).toBeLessThan(5);
    });
  }

  it('cada estación se alcanza desde el spawn y hace su trabajo', () => {
    const g = new Game(LEVELS.campamento, { seed: 1 });
    g.setInputs(jump(), jump());
    g.box.wetness = 60;
    const fans = LEVELS.campamento.recovery.find((r) => r.kind === 'dry');
    g.teleport({ p1: { x: fans.x - 0.8, y: 1, z: fans.z }, p2: { x: fans.x + 0.8, y: 1, z: fans.z } });
    run(g, 1, IDLE, IDLE);
    expect(g.box.wetness).toBeLessThan(60);
  });

  it('el campamento sube como el Muelle: minero → minero con agua → coyote, cada uno en su tramo', () => {
    const L = LEVELS.campamento;
    expect(L.npcs.map((n) => n.difficulty)).toEqual(['easy', 'medium', 'hard']);
    const ids = new Set(L.platforms.map((p) => p.id));
    for (const n of L.npcs) expect(ids.has(n.platform), n.platform).toBe(true);
    const zs = L.npcs.map((n) => n.z);
    expect([...zs].sort((a, b) => b - a)).toEqual(zs);
    // Ningún checkpoint reaparece en la plaza del coyote.
    const plaza = L.platforms.find((p) => p.id === 'plaza-meta');
    for (const c of L.checkpoints) expect(Math.abs(c.spawn.p1.z - plaza.z) > plaza.d / 2, c.id).toBe(true);
  });
});

describe('dressIsland', () => {
  const isla = { id: 'i', x: 0, z: 0, w: 10, d: 14, top: 1 };

  it('misma semilla → mismos props; otra semilla → otros', () => {
    expect(dressIsland(isla, { seed: 4 })).toEqual(dressIsland(isla, { seed: 4 }));
    expect(dressIsland(isla, { seed: 4 })).not.toEqual(dressIsland(isla, { seed: 5 }));
  });

  it('usa solo modelos del set pedido y respeta keepOut y carpas', () => {
    const shelters = [{ x: -2.4, z: 3, w: 3.6, d: 3 }];
    const props = dressIsland({ ...isla, weather: { type: 'rain', shelters } }, { set: 'fort', keepOut: [{ x: 3, z: -3, r: 2 }] });
    expect(props.every((p) => SCENERY_SETS.fort.includes(p.art))).toBe(true);
    expect(props.some((p) => (p.x - 3) ** 2 + (p.z + 3) ** 2 < 4)).toBe(false);
    expect(props.some((p) => Math.abs(p.x + 2.4) < 2.2 && Math.abs(p.z - 3) < 1.9)).toBe(false);
  });

  it('rieles y plataformas angostas quedan vacías', () => {
    expect(dressIsland({ ...isla, w: 4 })).toEqual([]);
    expect(dressIsland({ ...isla, w: 0.7, kind: 'plank' })).toEqual([]);
  });
});

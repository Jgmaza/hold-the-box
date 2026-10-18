// Mapas 1-3 (Muelle, Bahía, Tormenta): cargan, se pueden ganar, la dificultad sube y la escenografía no estorba.
import { describe, expect, it } from 'vitest';
import { LEVELS, MAPS } from '../src/levels/index.js';
import { dressIsland, SCENERY_SETS } from '../src/levels/sections.js';
import { BACK, FWD, Game, IDLE, jump, run } from './helpers.js';

const CAMPAIGN = ['muelle', 'bahia', 'tormenta'];

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

describe('mapas 1-3', () => {
  it('el selector los muestra en orden con 1, 2 y 3 estrellas', () => {
    expect(MAPS.slice(0, 3).map((m) => m.key)).toEqual(CAMPAIGN);
    expect(MAPS.slice(0, 3).map((m) => m.difficulty)).toEqual([1, 2, 3]);
  });

  for (const key of CAMPAIGN) {
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

const JUNGLE = ['aldea', 'templo', 'puente'];

describe('selva', () => {
  it('tres mapas después de la campaña, 1-2-3 estrellas, sin romper el orden pirata', () => {
    expect(MAPS.map((m) => m.key)).toEqual([...CAMPAIGN, ...JUNGLE]);
    expect(MAPS.slice(3).map((m) => m.difficulty)).toEqual([1, 2, 3]);
    expect(JUNGLE.map((k) => LEVELS[k].theme)).toEqual(['jungle', 'jungle', 'jungle']);
    expect(JUNGLE.map((k) => LEVELS[k].biome)).toEqual(['village', 'temple', 'canyon']);
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

  it('cada mapa se ve y se juega distinto', () => {
    const a = LEVELS.aldea;
    const b = LEVELS.templo;
    const c = LEVELS.puente;
    expect(a.platforms.some((p) => p.skin === 'dirt')).toBe(true);
    expect(a.platforms.some((p) => p.kind === 'ground')).toBe(true);
    expect(a.geysers ?? []).toHaveLength(0);
    expect(a.sweepers ?? []).toHaveLength(0);
    expect(b.platforms.some((p) => p.skin === 'stone')).toBe(true);
    expect(b.platforms.some((p) => p.kind === 'ground')).toBe(true);
    expect(b.sweepers.length).toBeGreaterThan(0);
    expect(b.geysers ?? []).toHaveLength(0);
    expect(c.platforms.some((p) => p.kind === 'glass')).toBe(true);
    expect(c.platforms.some((p) => p.weather?.type === 'wind')).toBe(true);
    expect(c.spawn.p1.y).toBeGreaterThan(2);
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

  it('el puente de cuerdas ahora es el mismo vidrio, sobre el vacío', () => {
    const glass = LEVELS.puente.platforms.filter((p) => p.kind === 'glass');
    const rows = new Map();
    for (const p of glass) {
      const row = rows.get(p.z) ?? [];
      row.push(p);
      rows.set(p.z, row);
    }
    expect(rows.size).toBe(8);
    for (const row of rows.values()) {
      expect(row).toHaveLength(2);
      expect(row.filter((p) => p.tempered)).toHaveLength(1);
      expect(row[0].top).toBeGreaterThan(2);
    }
    const g = new Game(LEVELS.puente, { seed: 1 });
    const panel = g.world.statics.find((s) => s.def.kind === 'glass' && !s.def.tempered);
    expect(g.world.breakGlass(panel)).toBe(true);
    expect(g.world.floorBelow(panel.def.x, panel.def.z, panel.def.top - 0.02)).toBeLessThan(1);
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

describe('mapas 1-3 — ritmo', () => {
  it('la dificultad crece del 1 al 3: más largo, más peligros, checkpoints más separados', () => {
    const [a, b, c] = CAMPAIGN.map((k) => LEVELS[k]);
    expect(length(a)).toBeLessThan(length(b));
    expect(length(b)).toBeLessThan(length(c));
    expect(hazards(a)).toBeLessThan(hazards(b));
    expect(hazards(b)).toBeLessThan(hazards(c));
    const spacing = (L) => length(L) / L.checkpoints.length;
    expect(spacing(a)).toBeLessThan(spacing(b));
    expect(spacing(b)).toBeLessThan(spacing(c));
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

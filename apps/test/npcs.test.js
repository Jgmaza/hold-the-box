// NPCs: paseo aleatorio, visión, los 3 ataques y la arena de prueba (sin navegador).
import { afterEach, describe, expect, it } from 'vitest';
import npcArena from '../src/levels/npcArena.js';
import { NPC_TYPES } from '../src/sim/npcs/npcService.js';
import { CONFIG, Game, IDLE, RIGHT, jump, level1, run } from './helpers.js';

const N = CONFIG.npcs;

afterEach(() => {
  N.enabled = true;
});

/** Juego ya en 'playing'. */
const start = (level, seed = 1) => {
  const g = new Game(level, { seed });
  g.setInputs(jump(), jump());
  return g;
};

/** Piso grande con un solo NPC en (0, -5) y la pareja en z = 0: prueba cada tipo aislado. */
const solo = (difficulty, seed = 1) => {
  const g = start(
    {
      id: 'test-npc',
      waterLevel: 0,
      spawn: { p1: { x: -0.8, y: 1, z: 0 }, p2: { x: 0.8, y: 1, z: 0 } },
      platforms: [{ id: 'piso', x: 0, z: 0, w: 30, d: 30, top: 1 }],
      npcs: [{ difficulty, platform: 'piso', x: 0, z: -5 }],
    },
    seed,
  );
  const n = g.npcs.list[0];
  n.facing = 0; // mirando a la pareja (+Z)
  return { g, n };
};

const inside = (n) => {
  const a = n.platform;
  return n.pos.x >= a.min.x && n.pos.x <= a.max.x && n.pos.z >= a.min.z && n.pos.z <= a.max.z;
};

/** Junta los eventos `npc:hit` y las causas de `box:impact` / `box:wet`. */
const listen = (g) => {
  const log = { hits: [], impacts: [], wets: [], shots: 0, splashes: 0, windups: 0 };
  g.events.on('npc:hit', (e) => log.hits.push(e));
  g.events.on('box:impact', (e) => log.impacts.push(e.cause));
  g.events.on('box:wet', (e) => log.wets.push(e.cause));
  g.events.on('npc:shoot', () => log.shots++);
  g.events.on('npc:splash', () => log.splashes++);
  g.events.on('npc:windup', () => log.windups++);
  return log;
};

describe('servicio de NPCs', () => {
  it('el nivel 1 tiene una isla por NPC (easy → medium → hard) antes del muelle', () => {
    const g = new Game(level1);
    const list = g.npcs.list;
    expect(list.map((n) => n.difficulty)).toEqual(['easy', 'medium', 'hard']);
    expect(list.map((n) => n.def.platform)).toEqual(['isla-easy', 'isla-medium', 'isla-hard']);
    for (const n of list) expect(inside(n)).toBe(true);
    // En orden de recorrido (-Z) y todas antes de la salida del muelle.
    const zs = list.map((n) => n.pos.z);
    expect(zs[0]).toBeGreaterThan(zs[1]);
    expect(zs[1]).toBeGreaterThan(zs[2]);
    expect(zs[2]).toBeGreaterThan(6);
  });

  it('en el nivel 1 la salida es tranquila: nadie pega; el perro ya los persigue hasta el borde de su isla', () => {
    const g = start(level1);
    const log = listen(g);
    const dog = g.npcs.list.find((n) => n.difficulty === 'hard');
    run(g, 3, IDLE, IDLE);
    expect(log.hits).toHaveLength(0);
    for (const n of g.npcs.list) if (n !== dog) expect(['idle', 'wander']).toContain(n.state);
    expect(dog.state).toBe('attack');
    // Pegado al borde de su isla más cercano a la pareja (no se sale).
    expect(dog.pos.z).toBeGreaterThan(dog.def.z + 4);
    expect(inside(dog)).toBe(true);
  });

  for (const [difficulty, ahead] of [['easy', 2], ['medium', 4], ['hard', 4]]) {
    it(`en el nivel 1 el NPC ${difficulty} ataca la caja en su isla`, () => {
      const g = start(level1);
      const n = g.npcs.list.find((x) => x.difficulty === difficulty);
      const z = n.def.z + ahead;
      g.teleport({ p1: { x: n.def.x - 0.8, y: 1, z }, p2: { x: n.def.x + 0.8, y: 1, z } });
      n.facing = 0; // mirando a la pareja
      const log = listen(g);
      run(g, 3, IDLE, IDLE);
      expect(log.hits.map((h) => h.difficulty)).toContain(difficulty);
    });
  }

  it('los puentes entre islas son zona segura: el perro espera en el borde y no embiste al vacío', () => {
    const g = start(level1);
    const cp = level1.checkpoints.findIndex((c) => c.id === 'cp-hard');
    g.teleport(cp);
    const log = listen(g);
    const dog = g.npcs.list.find((n) => n.difficulty === 'hard');
    run(g, 5, IDLE, IDLE);
    expect(log.hits).toHaveLength(0);
    expect(log.windups).toBe(0);
    expect(dog.phase).toBe('chase');
  });

  it('hay un tipo por dificultad', () => {
    expect(Object.keys(NPC_TYPES)).toEqual(['easy', 'medium', 'hard']);
    for (const [k, Type] of Object.entries(NPC_TYPES)) expect(Type.difficulty).toBe(k);
  });

  it('avisa si el nivel pide una dificultad o una plataforma que no existe', () => {
    const base = { spawn: level1.spawn, platforms: [{ id: 'piso', x: 0, z: 0, w: 10, d: 10, top: 1 }] };
    expect(() => new Game({ ...base, npcs: [{ difficulty: 'boss', platform: 'piso', x: 0, z: 0 }] })).toThrow(/dificultad/);
    expect(() => new Game({ ...base, npcs: [{ difficulty: 'easy', platform: 'nada', x: 0, z: 0 }] })).toThrow(/plataforma/);
  });

  it('cada dificultad es más rápida, ve más lejos y más ancho y reacciona antes', () => {
    for (const k of ['wanderSpeed', 'visionRange', 'visionFov']) {
      expect(N.easy[k]).toBeLessThan(N.medium[k]);
      expect(N.medium[k]).toBeLessThan(N.hard[k]);
    }
    expect(N.easy.reaction).toBeGreaterThan(N.medium.reaction);
    expect(N.medium.reaction).toBeGreaterThan(N.hard.reaction);
  });
});

describe('paseo aleatorio', () => {
  it('pasean sin salirse de su plataforma (y sin atacar si no ven la caja)', () => {
    const g = start(npcArena);
    const list = g.npcs.list;
    const prev = list.map((n) => ({ ...n.pos }));
    const walked = list.map(() => 0);
    run(g, 20, IDLE, IDLE, () => {
      list.forEach((n, i) => {
        expect(inside(n)).toBe(true);
        walked[i] += Math.hypot(n.pos.x - prev[i].x, n.pos.z - prev[i].z);
        prev[i] = { ...n.pos };
      });
    });
    for (const w of walked) expect(w).toBeGreaterThan(3);
    expect(g.box.integrity).toBe(100);
  });

  it('misma semilla = mismo paseo; otra semilla = otro', () => {
    const positions = (seed) => {
      const g = start(npcArena, seed);
      run(g, 6, IDLE, IDLE);
      return g.npcs.list.map((n) => [n.pos.x, n.pos.z]);
    };
    expect(positions(7)).toEqual(positions(7));
    const a = positions(7).flat();
    const b = positions(8).flat();
    expect(a.some((v, i) => Math.abs(v - b[i]) > 0.1)).toBe(true);
  });

  it('con CONFIG.npcs.enabled = false se quedan quietos', () => {
    N.enabled = false;
    const g = start(npcArena);
    const before = g.npcs.list.map((n) => ({ ...n.pos }));
    run(g, 3, IDLE, IDLE);
    g.npcs.list.forEach((n, i) => expect(n.pos).toEqual(before[i]));
  });
});

describe('visión', () => {
  const at = (n, dz, dy = 0) => ({ x: n.pos.x, y: n.pos.y + CONFIG.carry.handHeight + dy, z: n.pos.z + dz });

  it('easy: ve poco y solo de frente', () => {
    const { n } = solo('easy');
    expect(n.canSee(at(n, 2))).toBe(true);
    expect(n.canSee(at(n, N.easy.visionRange + 0.5))).toBe(false); // lejos
    expect(n.canSee(at(n, -2))).toBe(false); // a la espalda
    expect(n.canSee(at(n, 2, 3))).toBe(false); // mucho más arriba
  });

  it('hard: ve en 360° y más lejos', () => {
    const { n } = solo('hard');
    expect(n.canSee(at(n, -2))).toBe(true);
    expect(n.canSee(at(n, N.easy.visionRange + 2))).toBe(true);
  });

  it('si los pies del jugador pasan por encima del NPC, no lo toca (lo saltaron)', () => {
    const { g, n } = solo('easy');
    g.p1.pos.x = n.pos.x;
    g.p1.pos.z = n.pos.z;
    expect(n.touching(g.players)).toBe(g.p1);
    g.p1.pos.y = n.pos.y + n.height + 0.05;
    expect(n.touching(g.players)).toBe(null);
  });
});

describe('ataques a la caja', () => {
  it('easy: si alcanza a alguien, bota contenido (no moja)', () => {
    const { g, n } = solo('easy');
    n.pos.z = -1.5;
    const log = listen(g);
    run(g, 3, IDLE, IDLE);
    expect(log.hits.length).toBeGreaterThanOrEqual(1);
    expect(log.hits[0].difficulty).toBe('easy');
    expect(log.impacts).toContain('npc-easy');
    expect(g.box.integrity).toBeLessThan(100);
    expect(log.wets).not.toContain('npc-easy');
    expect(g.state).toBe('playing');
  });

  it('medium: avisa, dispara y el chorro moja la caja quieta', () => {
    const { g } = solo('medium');
    const log = listen(g);
    run(g, 3, IDLE, IDLE);
    expect(log.windups).toBeGreaterThanOrEqual(1);
    expect(log.shots).toBeGreaterThanOrEqual(1);
    expect(log.wets).toContain('npc-medium');
    expect(g.box.wetness).toBeGreaterThan(N.medium.wet * 0.8);
  });

  it('medium: si se mueven juntos apenas dispara, el chorro falla', () => {
    const { g } = solo('medium');
    const log = listen(g);
    const dodge = () => (log.shots > 0 ? RIGHT : IDLE);
    run(g, 2.5, dodge, dodge);
    expect(log.shots).toBe(1);
    expect(log.wets).not.toContain('npc-medium');
    expect(log.splashes).toBe(1);
  });

  it('hard: embiste desde lejos, bota contenido y moja', () => {
    const { g } = solo('hard');
    const log = listen(g);
    run(g, 2, IDLE, IDLE);
    expect(log.hits.map((h) => h.difficulty)).toContain('hard');
    expect(log.impacts).toContain('npc-hard');
    expect(log.wets).toContain('npc-hard');
    expect(g.box.integrity).toBeLessThan(100);
    expect(g.box.wetness).toBeGreaterThan(N.hard.wet * 0.8);
  });

  it('hard: si lo esquivan durante el aviso, falla y queda aturdido', () => {
    const { g, n } = solo('hard');
    const log = listen(g);
    let stunned = false;
    const dodge = () => (log.windups > 0 ? RIGHT : IDLE);
    run(g, 1.8, dodge, dodge, () => (stunned ||= n.state === 'stunned'));
    expect(log.windups).toBe(1);
    expect(log.hits).toHaveLength(0);
    expect(stunned).toBe(true);
  });

  it('hard persigue SIEMPRE: de lejos y de espaldas igual va por la caja y no se rinde', () => {
    const { g, n } = solo('hard');
    g.teleport({ p1: { x: -0.8, y: 1, z: 12 }, p2: { x: 0.8, y: 1, z: 12 } }); // 17 m: fuera de su visión
    n.facing = Math.PI; // de espaldas
    const log = listen(g);
    const states = new Set();
    run(g, 8, IDLE, IDLE, () => states.add(n.state));
    expect(states.has('idle')).toBe(false); // nunca se queda quieto paseando
    expect(log.hits.map((h) => h.difficulty)).toContain('hard');
  });

  it('hard: entre embestidas los sigue en vez de pasear', () => {
    const { g, n } = solo('hard');
    const log = listen(g);
    run(g, 2, IDLE, IDLE);
    expect(log.hits.length).toBeGreaterThanOrEqual(1);
    // La pareja se va caminando; durante el cooldown el perro va detrás.
    let maxGap = 0;
    run(g, 2, RIGHT, RIGHT, (s, gg) => {
      if (n.cooldown > 0 && n.state === 'wander') maxGap = Math.max(maxGap, Math.hypot(n.pos.x - gg.box.center.x, n.pos.z - gg.box.center.z));
    });
    expect(maxGap).toBeLessThan(9);
    expect(Math.abs(n.pos.x)).toBeGreaterThan(2); // se movió hacia donde fueron
  });

  it('con alwaysChase apagado, hard vuelve a necesitar verlos', () => {
    const prev = N.hard.alwaysChase;
    N.hard.alwaysChase = false;
    try {
      const { g, n } = solo('hard');
      g.teleport({ p1: { x: -0.8, y: 1, z: 12 }, p2: { x: 0.8, y: 1, z: 12 } });
      const log = listen(g);
      run(g, 3, IDLE, IDLE);
      expect(log.hits).toHaveLength(0);
      expect(n.state).not.toBe('attack');
    } finally {
      N.hard.alwaysChase = prev;
    }
  });

  it('no atacan mientras la caja es invulnerable (recién reaparecidos)', () => {
    const { g } = solo('hard');
    g.box.invuln = 10;
    const log = listen(g);
    run(g, 2, IDLE, IDLE);
    expect(log.hits).toHaveLength(0);
    expect(g.box.integrity).toBe(100);
  });
});

describe('arena NPC', () => {
  const floorAt = (g, p) => g.world.floorBelow(p.x, p.z, p.y + 0.01);

  it('spawns, checkpoints y meta sobre suelo', () => {
    const g = new Game(npcArena);
    for (const s of [npcArena.spawn, ...npcArena.checkpoints.map((c) => c.spawn)]) {
      expect(floorAt(g, s.p1)).toBeCloseTo(s.p1.y);
      expect(floorAt(g, s.p2)).toBeCloseTo(s.p2.y);
    }
    const goal = npcArena.goal;
    expect(floorAt(g, { x: goal.x, y: goal.top, z: goal.z })).toBeCloseTo(goal.top);
  });

  it('tiene NPCs de las tres dificultades, cada uno parado en su plataforma', () => {
    const g = new Game(npcArena);
    expect(new Set(g.npcs.list.map((n) => n.difficulty))).toEqual(new Set(['easy', 'medium', 'hard']));
    for (const n of g.npcs.list) {
      expect(inside(n)).toBe(true);
      expect(n.pos.x).toBeCloseTo(n.def.x);
      expect(n.pos.z).toBeCloseTo(n.def.z);
    }
  });
});

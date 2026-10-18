// Dibujo del nivel con primitivas (Capa A) + carteles/props con PNG de Matias si existen (Capa B).
import * as pc from 'playcanvas';
import { KENNEY_BOUNDS } from '../levels/kenneyBounds.js';
import { buildBackdrop } from './backdrop.js';
import { deckGeometry } from './deck.js';
import { imageUrl } from './deliveries.js';
import { buildCanyon } from './desert.js';
import { altar, bush, cactus, clayPot, cliff, crocodile, deadTree, hut, lampPost, mangrove, mineMouth, monkey, palm, pyramid, rock, seeded, stoneArch, stoneHead, totem, waterfall } from './nature.js';
import { Parts } from './parts.js';
import { checkerCanvas, dirtCanvas, grassCanvas, plankCanvas, sandCanvas, signCanvas, stoneCanvas } from './signs.js';
import { buildValley } from './valley.js';
import { Water } from './water.js';

export class LevelView {
  constructor(gfx, world) {
    this.gfx = gfx;
    this.world = world;
    this.root = gfx.group('level');
    this.billboards = []; // entidades que miran a la cámara
    this.flags = []; // banderas de checkpoint
    this.glass = new Map(); // id del panel → grupo (se apaga al romperse)
    this.shards = []; // trozos que caen cuando un vidrio se rompe
    this.floating = []; // barcos / botes Kenney (suben y bajan con el mar)
    this.bobbing = []; // caimanes u otra utilería sobre el agua
    this.swingers = []; // monos colgados
    this._assets = new Map();
    const L = world.level;
    this.theme = L.theme;
    this.land = L.biome === 'temple' || L.biome === 'canyon' || L.biome === 'village' || L.biome === 'camp' || L.biome === 'mine' || L.biome === 'chasm';

    this.waterY = world.waterLevel;
    for (const s of world.statics) this._platform(s.def, s.aabb);
    if (world.backWall) this._backWall(world.backWall);
    if (this.land) this._land(world);
    else this._sea(world);
    this.movers = world.movers.map((m) => ({ sim: m, e: this._mover(m) }));
    this.sweepers = world.sweepers.map((s) => ({ sim: s, ...this._sweeper(s) }));
    this.geysers = world.geysers.map((g) => ({ sim: g, ...this._geyser(g) }));
    for (const s of L.signs ?? []) this._sign(s);
    for (const p of L.props ?? []) this._prop(p);
    this._scenery(L.scenery);
    if (L.biome === 'village') this._villageDetail(L);
    this._mazeCacti(L.cacti);
    if (L.goal) this._goal(L.goal);
  }

  // ------------------------------------------------------------------ piezas

  /** Tierra firme. Aldea, templo y puente llevan el mismo valle a los dos lados. */
  _land(world) {
    const g = this.gfx;
    const P = (this.parts ??= new Parts(g));
    const plats = world.statics.filter((s) => s.def.kind !== 'ground').map((s) => s.aabb);
    const zs = plats.length ? plats.flatMap((a) => [a.min.z, a.max.z]) : [-20, 20];
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const seed = [...(world.level.id ?? 'nivel')].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0;
    const biome = world.level.biome;
    const desert = biome === 'camp' || biome === 'mine' || biome === 'chasm';
    const groundY = biome === 'canyon' || biome === 'chasm' ? 2.48 : 0.86;
    const valley = biome === 'village' || biome === 'temple' || biome === 'canyon';
    const { sky } = buildBackdrop(P, this.root, {
      minZ, maxZ, seaY: groundY, seed, clear: 14, theme: this.theme, biome, land: true, islands: !valley && !desert,
    });
    this.sky = sky;
    this.groundY = groundY;
    this.valley = null;
    this.desert = null;

    this._grassTex ??= g.textureFromCanvas(grassCanvas(), { repeat: true });
    const grass = g.textured(this._grassTex, { tint: g.color('#8fbf5a', 1.05) });
    grass.diffuseMapTiling = new pc.Vec2(40, 40);
    grass.update();
    if (desert) {
      const gap = world.level.pit ?? null;
      this.desert = buildCanyon(g, P, this.root, { minZ, maxZ, groundY, seed, gap, cart: biome !== 'camp', carpet: !world.level.maze });
    } else if (valley) {
      const gap = world.level.pit ?? (biome === 'canyon' ? { z0: -43, z1: -11 } : null);
      this.valley = buildValley(g, P, this.root, { minZ, maxZ, groundY, seed, gap });
      if (biome === 'temple') {
        P.ball(this.root, g.solid('leaf', { mul: 0.72 }), [11, 2.0, -50], [14, 3.8, 14], { name: 'loma-piramide' });
        P.ball(this.root, g.solid('leaf', { mul: 0.62 }), [-12, 1.5, -47], [10, 2.8, 11], { name: 'loma-piramide' });
      }
      if (biome === 'canyon') {
        const river = g.solid('#3d6a72', { gloss: 0.7 });
        g.prim('box', river, { parent: this.root, pos: [0, 0.04, -27], scale: [14, 0.08, 36], shadows: false, name: 'rio' });
        g.prim('box', g.solid('foam', { opacity: 0.45, unlit: true }), { parent: this.root, pos: [0, 0.08, -27], scale: [10, 0.04, 34], shadows: false, name: 'espuma-rio' });
      }
    } else {
      g.prim('box', grass, { parent: this.root, pos: [0, groundY - 0.05, (minZ + maxZ) / 2], scale: [160, 0.12, Math.max(80, maxZ - minZ + 40)], shadows: false, name: 'pasto' });
      const dirt = g.solid('#7a5a38', { mul: 0.9, gloss: 0.08 });
      const rand = seeded(seed + 3);
      for (let i = 0; i < 18; i++) {
        const x = (rand() - 0.5) * 50;
        const z = minZ + rand() * (maxZ - minZ);
        if (Math.abs(x) < 5) continue;
        P.ball(this.root, dirt, [x, groundY - 0.02, z], [2.4 + rand() * 2, 0.18, 1.8 + rand() * 1.4], { name: 'tierra' });
      }
    }
  }

  /** Cielo + islas lejanas + agua con olas y espuma alrededor de cada plataforma e isla. */
  _sea(world) {
    const plats = world.statics.map((s) => s.aabb);
    const zs = plats.flatMap((a) => [a.min.z, a.max.z]);
    const clear = Math.max(...plats.map((a) => Math.max(Math.abs(a.min.x), Math.abs(a.max.x)))) + 10;
    const P = (this.parts ??= new Parts(this.gfx));
    const seed = [...(world.level.id ?? 'nivel')].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0;
    const biome = world.level.biome;
    const { sky, shores } = buildBackdrop(P, this.root, { minZ: Math.min(...zs), maxZ: Math.max(...zs), seaY: this.waterY, seed, clear, theme: this.theme, biome });
    this.sky = sky;
    const docks = plats.map((a) => ({ x: (a.min.x + a.max.x) / 2, z: (a.min.z + a.max.z) / 2, w: a.max.x - a.min.x, d: a.max.z - a.min.z }));
    const tint = biome === 'mangrove' ? 'swamp' : biome === 'temple' ? 'pool' : biome === 'canyon' ? 'gorge' : undefined;
    this.water = new Water(this.gfx, { y: this.waterY, parent: this.root, shores: [...docks, ...shores], tint });
  }

  _platform(def, a) {
    const g = this.gfx;
    const w = a.max.x - a.min.x;
    const h = a.max.y - a.min.y;
    const d = a.max.z - a.min.z;
    const cx = (a.max.x + a.min.x) / 2;
    const cy = (a.max.y + a.min.y) / 2;
    const cz = (a.max.z + a.min.z) / 2;
    // Rompeolas (oleaje): rocas grandes apiladas que llenan su caja de colisión, con espuma al pie.
    if (def.kind === 'breakwater') {
      const P = (this.parts ??= new Parts(g));
      const rand = seeded(Math.abs(Math.round(cx * 13 + cz * 7)) + 3);
      const n = Math.max(2, Math.round(d / 1.1));
      const size = Math.min(w, h) * 1.15;
      for (let i = 0; i < n; i++) {
        const z = a.min.z + (d * (i + 0.5)) / n;
        rock(P, this.root, [cx + (rand() - 0.5) * 0.15, a.max.y - h * 0.95, z], size, rand);
      }
      P.ball(this.root, g.solid('foam', { opacity: 0.7, gloss: 0 }), [cx, a.max.y - h + 0.03, cz], [w * 1.6, 0.05, d * 1.15], { shadows: false, name: 'espuma-rompeolas' });
      return;
    }
    // Piedras / topes de los rieles: bloque compacto encima del tablón (sin postes).
    if (def.kind === 'rock' || def.kind === 'bump') {
      const mat = def.kind === 'rock' ? 'dark' : 'ui';
      g.prim('box', g.solid(mat, { mul: def.kind === 'rock' ? 0.95 : 1.1 }), {
        parent: this.root,
        pos: [cx, cy, cz],
        scale: [w, h, d],
        name: def.id,
      });
      return;
    }
    if (def.kind === 'glass') return this._glass(def, a);
    if (def.kind === 'ground') return;
    if (def.weather?.holes?.length) return this._deckWithHoles(def, a);
    const plank = def.kind === 'plank';
    const stone = def.skin === 'stone';
    const top = 0.14;
    if ((stone || def.skin === 'dirt' || def.skin === 'sand') && this.land) {
      if (def.skin === 'dirt' || def.skin === 'sand') {
        const sand = def.skin === 'sand';
        const tex = sand
          ? (this._sandTex ??= g.textureFromCanvas(sandCanvas(), { repeat: true }))
          : (this._dirtTex ??= g.textureFromCanvas(dirtCanvas(), { repeat: true }));
        const floor = g.textured(tex, { tint: g.color(sand ? '#f2b15c' : '#c4a06a', 1.08) });
        floor.diffuseMapTiling = new pc.Vec2(w / 2, d / 2);
        floor.update();
        g.prim('box', g.solid(sand ? '#c47a32' : '#6b4a28', { mul: 0.9 }), { parent: this.root, pos: [cx, a.max.y - 0.1, cz], scale: [w, 0.16, d], name: def.id });
        g.prim('box', floor, { parent: this.root, pos: [cx, a.max.y - 0.02, cz], scale: [w + 0.08, 0.05, d + 0.08], name: `${def.id}-piso` });
        return;
      }
      this._stoneTex ??= g.textureFromCanvas(stoneCanvas(), { repeat: true });
      const floor = g.textured(this._stoneTex, { tint: g.color('#c4b8a4', 1.05) });
      floor.diffuseMapTiling = new pc.Vec2(w / 2, d / 2);
      floor.update();
      g.prim('box', g.solid('#8d887c', { mul: 0.88 }), { parent: this.root, pos: [cx, a.max.y - 0.1, cz], scale: [w, 0.16, d], name: def.id });
      g.prim('box', floor, { parent: this.root, pos: [cx, a.max.y - 0.02, cz], scale: [w + 0.08, 0.05, d + 0.08], name: `${def.id}-piso` });
      return;
    }
    g.prim('box', g.solid(stone ? '#8d887c' : plank ? 'plank' : 'wood', { mul: stone ? 0.88 : 0.75 }), { parent: this.root, pos: [cx, a.min.y + (h - top) / 2, cz], scale: [w, h - top, d], name: def.id });
    // Piso: tablones o losa del templo, 2 m por repetición.
    if (stone) {
      this._stoneTex ??= g.textureFromCanvas(stoneCanvas(), { repeat: true });
      const floor = g.textured(this._stoneTex, { tint: g.color('#c4b8a4', 1.05) });
      floor.diffuseMapTiling = new pc.Vec2(w / 2, d / 2);
      floor.update();
      g.prim('box', floor, { parent: this.root, pos: [cx, a.max.y - top / 2, cz], scale: [w + 0.06, top, d + 0.06], name: `${def.id}-piso` });
    } else {
      this._plankTex ??= g.textureFromCanvas(plankCanvas(), { repeat: true });
      const floor = g.textured(this._plankTex, { tint: g.color(plank ? 'plank' : 'wood', 1.12) });
      floor.diffuseMapTiling = new pc.Vec2(w / 2, d / 2);
      floor.update();
      g.prim('box', floor, { parent: this.root, pos: [cx, a.max.y - top / 2, cz], scale: [w + 0.06, top, d + 0.06], name: `${def.id}-piso` });
    }
    if (!plank) {
      // Pilotes en las esquinas (se ven en el agua).
      for (const [px, pz] of [[a.min.x, a.min.z], [a.max.x, a.min.z], [a.min.x, a.max.z], [a.max.x, a.max.z]]) {
        if (stone) g.prim('box', g.solid('#8d887c', { mul: 0.8 }), { parent: this.root, pos: [px, a.max.y - 0.45, pz], scale: [0.38, 1.1, 0.38] });
        else g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), { parent: this.root, pos: [px, a.max.y - 0.3, pz], scale: [0.3, 0.9, 0.3] });
      }
    } else {
      // Postes que sostienen el tablón / riel.
      for (let z = a.min.z + 0.6; z < a.max.z; z += 3) {
        g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), { parent: this.root, pos: [cx, (a.min.y + this.waterY) / 2 - 0.2, z], scale: [0.18, a.min.y - this.waterY + 0.6, 0.18] });
      }
    }
  }

  /**
   * Isla con huecos circulares (viento): piso recortado de verdad, así que por los huecos se ve el agua.
   * Debajo del piso no hay bloque macizo: solo vigas en el perímetro y los pilotes de las esquinas.
   */
  _deckWithHoles(def, a) {
    const g = this.gfx;
    const top = 0.14;
    const cx = (a.max.x + a.min.x) / 2;
    const cz = (a.max.z + a.min.z) / 2;
    const geo = deckGeometry({ minX: a.min.x, maxX: a.max.x, minZ: a.min.z, maxZ: a.max.z, y: a.max.y }, def.weather.holes, {
      wallDepth: a.max.y - this.waterY + 0.3, // el pozo baja hasta el agua
    });
    const addMesh = (m, material, name) => {
      const mesh = new pc.Mesh(g.device);
      mesh.setPositions(m.positions);
      mesh.setNormals(m.normals);
      mesh.setUvs(0, m.uvs);
      mesh.setIndices(m.indices);
      mesh.update();
      const e = new pc.Entity(name);
      e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: true, receiveShadows: true });
      this.root.addChild(e);
    };
    // Piso con la piel de la isla: losa de piedra (selva) o tablones (muelle).
    const stone = def.skin === 'stone';
    const tex = stone
      ? (this._stoneTex ??= g.textureFromCanvas(stoneCanvas(), { repeat: true }))
      : (this._plankTex ??= g.textureFromCanvas(plankCanvas(), { repeat: true }));
    const body = stone ? '#8d887c' : 'wood';
    addMesh(geo.top, g.textured(tex, { tint: g.color(stone ? '#c4b8a4' : 'wood', stone ? 1.05 : 1.12), twoSided: true }), `${def.id}-piso`);
    addMesh(geo.walls, g.solid(body, { mul: 0.4 }), `${def.id}-pozos`);

    // Vigas bajo el borde (el piso se ve de canto) y pilotes.
    const wood = g.solid(body, { mul: stone ? 0.88 : 0.75 });
    const beam = 0.35;
    const h = a.max.y - a.min.y - top;
    const y = a.min.y + h / 2;
    const w = a.max.x - a.min.x;
    const d = a.max.z - a.min.z;
    g.prim('box', wood, { parent: this.root, pos: [a.min.x + beam / 2, y, cz], scale: [beam, h, d], name: `${def.id}-viga` });
    g.prim('box', wood, { parent: this.root, pos: [a.max.x - beam / 2, y, cz], scale: [beam, h, d], name: `${def.id}-viga` });
    g.prim('box', wood, { parent: this.root, pos: [cx, y, a.min.z + beam / 2], scale: [w, h, beam], name: `${def.id}-viga` });
    g.prim('box', wood, { parent: this.root, pos: [cx, y, a.max.z - beam / 2], scale: [w, h, beam], name: `${def.id}-viga` });
    for (const [px, pz] of [[a.min.x, a.min.z], [a.max.x, a.min.z], [a.min.x, a.max.z], [a.max.x, a.max.z]]) {
      g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), { parent: this.root, pos: [px, a.max.y - 0.3, pz], scale: [0.3, 0.9, 0.3] });
    }
  }

  _mover(m) {
    const g = this.gfx;
    const e = g.group(m.def.id ?? 'movil', this.root);
    g.prim('box', g.solid('plank', { mul: 0.9 }), { parent: e, pos: [0, -m.h / 2, 0], scale: [m.w, m.h, m.d] });
    // Borde amarillo: "esto se mueve". Un poco más grande que el tablón y sin piezas que se pisen en las esquinas:
    // si sus caras quedan en el mismo plano que las del tablón, parpadean (z-fighting) cuando la plataforma se mueve.
    const edge = g.solid('ui');
    const t = 0.12;
    const o = 0.02; // cuánto sobresale del tablón
    const W = m.w + 2 * o;
    const D = m.d + 2 * o;
    const y = -0.035; // tope a +0.015, por encima del piso del tablón
    g.prim('box', edge, { parent: e, pos: [0, y, D / 2 - t / 2], scale: [W, 0.1, t] });
    g.prim('box', edge, { parent: e, pos: [0, y, -D / 2 + t / 2], scale: [W, 0.1, t] });
    g.prim('box', edge, { parent: e, pos: [W / 2 - t / 2, y, 0], scale: [t, 0.1, D - 2 * t] });
    g.prim('box', edge, { parent: e, pos: [-W / 2 + t / 2, y, 0], scale: [t, 0.1, D - 2 * t] });
    this._applyArt(e, 'matias/prop-plataforma.png', [0, 0.01, 0], [m.w * 0.9, m.d * 0.9], true);
    return e;
  }

  _sweeper(s) {
    const g = this.gfx;
    const vine = this.theme === 'jungle';
    const desert = this.theme === 'desert';
    const danger = g.solid(desert ? '#c48a4a' : vine ? 'leaf' : 'danger', { gloss: vine ? 0.25 : 0.35, mul: vine || desert ? 0.85 : 1 });
    g.prim('cylinder', vine ? g.solid('trunk', { mul: 0.7 }) : danger, { parent: this.root, pos: [s.x, s.top + 0.55, s.z], scale: [0.6, 1.1, 0.6], name: 'pilar' });
    g.prim('sphere', g.solid(vine ? 'leaf' : 'ui', { mul: vine ? 0.85 : 1 }), { parent: this.root, pos: [s.x, s.top + 1.15, s.z], scale: [0.5, 0.5, 0.5] });
    const pivot = g.group('rodillo', this.root, [s.x, s.top + s.armHeight, s.z]);
    const bar = g.prim('cylinder', danger, { parent: pivot, rot: [0, 0, 90], scale: [s.armRadius * 2, s.length * 2, s.armRadius * 2], name: 'barra' });
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      if (vine) g.prim('sphere', g.solid('leaf', { mul: 0.9 }), { parent: pivot, pos: [i * s.length * 0.4, 0, 0], scale: [0.38, 0.28, 0.38] });
      else g.prim('cylinder', g.solid('#ffffff'), { parent: pivot, pos: [i * s.length * 0.4, 0, 0], rot: [0, 0, 90], scale: [s.armRadius * 2.1, 0.25, s.armRadius * 2.1] });
    }
    if (!vine) this._applyArtTexture(bar, 'matias/prop-rodillo.png');
    return { pivot };
  }

  _geyser(gs) {
    const g = this.gfx;
    g.prim('cylinder', g.solid('dark', { unlit: true }), { parent: this.root, pos: [gs.x, gs.baseY + 0.01, gs.z], scale: [gs.radius * 1.4, 0.02, gs.radius * 1.4], shadows: false, name: 'hoyo' });
    const column = g.prim('cylinder', g.solid(this.theme === 'jungle' ? '#e8efe8' : '#bfeaff', { opacity: 0.5, unlit: true }), { parent: this.root, pos: [gs.x, gs.baseY, gs.z], scale: [gs.radius * 1.3, 0.01, gs.radius * 1.3], shadows: false, name: 'chorro' });
    const bubbles = [];
    for (let i = 0; i < 5; i++) {
      const b = g.prim('sphere', g.solid('foam', { unlit: true }), { parent: this.root, scale: [0.18, 0.18, 0.18], shadows: false });
      b.enabled = false;
      bubbles.push(b);
    }
    return { column, bubbles };
  }

  /** Modelos Kenney (un asset por modelo, compartido). `art` puede ser `nature/tree_palm`: el GLB y su textura viven en esa carpeta. */
  _scenery(items) {
    this._assets = new Map();
    this.floating = [];
    this.swayers = [];
    this.smokers = [];
    this.glows = [];
    if (!items?.length) return;
    const base = import.meta.env.BASE_URL;
    const assets = this.gfx.app.assets;
    for (const s of items) {
      let asset = this._assets.get(s.art);
      if (!asset) {
        asset = new pc.Asset(`kenney-${s.art}`, 'container', { url: `${base}kenney/${s.art}.glb` });
        asset.on('error', () => console.warn('[nivel] no se pudo cargar', s.art));
        assets.add(asset);
        assets.load(asset);
        this._assets.set(s.art, asset);
      }
      asset.ready((loaded) => {
        if (this._dead) return;
        const ent = loaded.resource.instantiateRenderEntity();
        const scale = s.s ?? 0.36;
        const b = KENNEY_BOUNDS[s.art];
        // Los kits nuevos a veces tienen el origen en el centro. Se apoyan en el piso.
        const lift = s.art.includes('/') && b ? -b.min[1] * scale : 0;
        ent.name = s.art;
        ent.setLocalScale(scale, scale, scale);
        ent.setLocalEulerAngles(0, s.yaw ?? 0, 0);
        ent.setPosition(s.x, s.top + lift, s.z);
        this.root.addChild(ent);
        if (s.art.startsWith('nature/')) this._matte(ent);
        if (s.float) this.floating.push({ e: ent, s, phase: s.x * 0.37 + s.z * 0.11 });
        if (s.motion) this._life(ent, s, b);
      });
    }
  }

  /** El nature-kit trae metalness 1 y sin mapa. Sin esto la corteza se ve negra. */
  _matte(ent) {
    for (const r of ent.findComponents('render')) {
      for (const mi of r.meshInstances) {
        mi.material.useMetalness = true;
        mi.material.metalness = 0;
        mi.material.gloss = 0.12;
        mi.material.update();
      }
    }
  }

  /** Ventanas, escalón, piso de tierra y ropa tendida en cada choza. */
  _villageDetail(level) {
    const g = this.gfx;
    const P = (this.parts ??= new Parts(g));
    const doors = (level.scenery ?? []).filter((s) => s.art === 'town/wall-wood-door');
    const dirt = g.solid('#6a4b34', { mul: 0.78, gloss: 0.03 });
    const wood = g.solid('wood', { mul: 0.58 });
    const glass = g.solid('#1a333c', { gloss: 0.7 });
    for (const h of doors) {
      const yaw = h.yaw ?? 0;
      const a = (yaw * Math.PI) / 180;
      const dx = Math.cos(a);
      const dz = -Math.sin(a);
      const px = -dz;
      const pz = dx;
      const s = h.s ?? 2.4;
      P.ball(this.root, dirt, [h.x, h.top - 0.01, h.z], [s * 1.5, 0.07, s * 1.45], { shadows: false, name: 'tierra-choza' });
      g.prim('box', wood, {
        parent: this.root,
        pos: [h.x + dx * s * 0.58, h.top + 0.05, h.z + dz * s * 0.58],
        scale: [0.62, 0.1, 0.9],
        rot: [0, yaw, 0],
        name: 'escalon',
      });
      for (const k of [-1, 1]) {
        const ox = px * k * s * 0.5;
        const oz = pz * k * s * 0.5;
        const y = h.top + s * 0.55;
        g.prim('box', wood, { parent: this.root, pos: [h.x + ox * 0.94, y, h.z + oz * 0.94], scale: [0.56, 0.48, 0.06], rot: [0, yaw, 0], name: 'marco' });
        g.prim('box', glass, { parent: this.root, pos: [h.x + ox, y, h.z + oz], scale: [0.4, 0.32, 0.05], rot: [0, yaw, 0], name: 'ventana' });
      }
      for (const k of [-1, 1]) {
        g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), {
          parent: this.root,
          pos: [h.x + dx * s * 0.2 + px * k * 0.72, h.top + 0.75, h.z + dz * s * 0.2 + pz * k * 0.72],
          scale: [0.05, 1.55, 0.05],
          name: 'poste-ropa',
        });
      }
      const cloth = g.prim('box', g.dynamic('#b94a3e'), {
        parent: this.root,
        pos: [h.x + dx * s * 0.2, h.top + 1.42, h.z + dz * s * 0.2],
        scale: [1.15, 0.34, 0.035],
        name: 'ropa',
      });
      this.swayers.push({ e: cloth, yaw: yaw + 90, phase: h.z, amp: 12, pitch: 1.5 });
      const cloth2 = g.prim('box', g.dynamic('#efe6d4'), {
        parent: this.root,
        pos: [h.x + dx * s * 0.2 + px * 0.28, h.top + 1.28, h.z + dz * s * 0.2 + pz * 0.28],
        scale: [0.7, 0.28, 0.03],
        name: 'ropa',
      });
      this.swayers.push({ e: cloth2, yaw: yaw + 90, phase: h.z + 1.2, amp: 14, pitch: 2 });
    }
  }

  /** Faroles y pasto se mecen. La chimenea y la fogata sueltan humo o llama. */
  _life(ent, s, b) {
    if (s.motion === 'sway') this.swayers.push({ e: ent, yaw: s.yaw ?? 0, phase: s.x * 0.7 + s.z * 0.31 });
    if (s.art.includes('lantern') || s.motion === 'fire') this._glow(ent, s, b);
    if (s.motion !== 'smoke' && s.motion !== 'fire') return;
    const cx = b ? (b.min[0] + b.max[0]) / 2 : 0;
    const cz = b ? (b.min[2] + b.max[2]) / 2 : 0;
    const top = b ? b.max[1] : 1;
    const fire = s.motion === 'fire';
    const colors = fire ? ['#ffe08a', '#ff9a32', '#ffd27a', '#fff6d2'] : ['#eef1ea', '#d5dbd2', '#f7f8f5', '#c3c9c0'];
    const puffs = colors.map((c) => this.gfx.prim('sphere', this.gfx.solid(c, { unlit: true, opacity: fire ? 0.9 : 0.5 }), {
      parent: ent,
      pos: [cx, top, cz],
      scale: [0.08, 0.1, 0.08],
      shadows: false,
    }));
    this.smokers.push({ puffs, cx, cz, top, fire, phase: s.x * 0.2 + s.z * 0.17 });
  }

  /** Luz cálida de farol o fogata. No proyecta sombra. */
  _glow(ent, s, b) {
    const fire = s.motion === 'fire';
    const cx = b ? (b.min[0] + b.max[0]) / 2 : 0;
    const cz = b ? (b.min[2] + b.max[2]) / 2 : 0;
    const y = b ? b.max[1] * 0.85 : 1;
    const light = new pc.Entity(fire ? 'luz-fuego' : 'luz-farol');
    light.addComponent('light', {
      type: 'omni',
      color: fire ? new pc.Color(1, 0.55, 0.22) : new pc.Color(1, 0.78, 0.42),
      intensity: fire ? 1.35 : 0.42,
      range: fire ? 8 : 5.5,
      castShadows: false,
    });
    light.setLocalPosition(cx, y, cz);
    ent.addChild(light);
    this.glows.push({ light: light.light, base: fire ? 1.35 : 0.42, speed: fire ? 9 : 2.4, phase: s.x + s.z });
  }

  /** Libera los GLB (las entidades ya se borraron con la raíz de la partida). */
  destroy() {
    this._dead = true;
    for (const asset of this._assets.values()) {
      this.gfx.app.assets.remove(asset);
      asset.unload();
    }
    this._assets.clear();
    this.water?.destroy();
    this.desert?.destroy?.();
  }

  /** Baranda baja detrás del inicio. El choque sigue más arriba para que no la salten. */
  _backWall(wall) {
    const g = this.gfx;
    const a = wall.aabb;
    const z = (a.min.z + a.max.z) / 2;
    const y0 = wall.floor;
    const span = a.max.x - a.min.x;
    const mid = (a.min.x + a.max.x) / 2;
    const wood = g.solid('wood', { mul: 0.8 });
    const post = g.solid('trunk', { mul: 0.7 });
    g.prim('box', wood, { parent: this.root, pos: [mid, y0 + 0.72, z], scale: [span, 0.1, 0.08], name: 'tope-riel' });
    const n = Math.max(2, Math.round(span / 2.2));
    for (let i = 0; i <= n; i++) {
      const x = a.min.x + (span * i) / n;
      g.prim('box', post, { parent: this.root, pos: [x, y0 + 0.48, z], scale: [0.12, 0.96, 0.12], name: 'tope-poste' });
    }
  }

  _sign(s) {
    const g = this.gfx;
    const post = s.post ?? 1.6;
    const group = g.group('cartel', this.root, [s.x, s.top, s.z]);
    group.setLocalEulerAngles(0, s.x < -6 ? 25 : s.x < 0 ? 12 : -12, 0);
    for (const side of s.w > 4 ? [-1, 1] : [0]) {
      g.prim('box', g.solid('trunk'), { parent: group, pos: [side * s.w * 0.35, post / 2, -0.06], scale: [0.14, post, 0.14] });
    }
    const board = g.prim('box', g.solid('#ffffff'), { parent: group, pos: [0, post + s.h / 2, 0], scale: [s.w, s.h, 0.08], name: 'tablero' });
    const canvasTex = g.textureFromCanvas(signCanvas(s.text, { style: s.style, aspect: s.w / s.h, palette: g.palette }));
    board.render.material = g.textured(canvasTex);
    if (s.art) this._applyArtTexture(board, s.art);
  }

  _prop(p) {
    const g = this.gfx;
    if (p.type === 'palm') {
      const art = imageUrl('matias/prop-palmera.png');
      if (art) return this._billboard(art, [p.x, p.top, p.z], 3.6);
      // Se curva hacia afuera del camino; la semilla sale de la posición (siempre la misma palmera ahí).
      const rand = seeded(Math.abs(Math.round(p.x * 31 + p.z * 17)) + 1);
      const P = (this.parts ??= new Parts(g));
      palm(P, this.root, [p.x, p.top, p.z], { height: 3.4, lean: 0.22, yaw: p.x > 0 ? 0 : 180, rand });
      bush(P, this.root, [p.x + (p.x > 0 ? -0.5 : 0.5), p.top, p.z + 0.4], 0.6, rand);
    } else if (p.type === 'bar') {
      const bar = g.group('bar', this.root, [p.x, p.top, p.z]);
      g.prim('box', g.solid('wood', { mul: 0.6 }), { parent: bar, pos: [0, 0.55, 0], scale: [2.6, 1.1, 0.8] });
      g.prim('box', g.solid('ui'), { parent: bar, pos: [0, 1.12, 0], scale: [2.8, 0.08, 1] });
      for (const x of [-1.3, 1.3]) g.prim('cylinder', g.solid('trunk'), { parent: bar, pos: [x, 1.6, -0.6], scale: [0.12, 3.2, 0.12] });
      g.prim('box', g.solid('leaf', { mul: 0.8 }), { parent: bar, pos: [0, 3.2, -0.3], rot: [12, 0, 0], scale: [3.4, 0.12, 2] });
      const colors = ['goal', 'danger', 'ui', 'p2'];
      for (let i = 0; i < 4; i++) g.prim('cylinder', g.solid(colors[i], { gloss: 0.8 }), { parent: bar, pos: [-0.9 + i * 0.6, 1.3, 0.1], scale: [0.12, 0.3, 0.12] });
      for (const x of [-0.8, 0, 0.8]) g.prim('cylinder', g.solid('danger'), { parent: bar, pos: [x, 0.4, 0.75], scale: [0.35, 0.08, 0.35] });
    } else if (p.type === 'flag') {
      const flag = g.group('bandera-cp', this.root, [p.x, p.top, p.z]);
      g.prim('cylinder', g.solid('#eeeeee'), { parent: flag, pos: [0, 1.4, 0], scale: [0.1, 2.8, 0.1] });
      const cloth = g.prim('box', g.dynamic('danger'), { parent: flag, pos: [0.45, 2.5, 0], scale: [0.8, 0.5, 0.04] });
      this.flags[p.checkpoint] = cloth;
    } else {
      const P = (this.parts ??= new Parts(g));
      const rand = seeded(Math.abs(Math.round(p.x * 31 + p.z * 17)) + 1);
      if (p.type === 'mangrove') mangrove(P, this.root, [p.x, p.top, p.z], { height: p.height ?? 5.4, rand });
      else if (p.type === 'crocodile') {
        const e = crocodile(P, this.root, [p.x, p.top, p.z], { yaw: p.yaw ?? (p.x > 0 ? -90 : 90) });
        this.bobbing.push({ e, x: p.x, y: p.top, z: p.z, phase: p.x * 0.4 + p.z * 0.15 });
      }       else if (p.type === 'monkey') {
        const e = monkey(P, this.root, [p.x, p.top, p.z], { hang: p.hang ?? 1.15, yaw: p.yaw ?? 0 });
        this.swingers.push({ e, yaw: p.yaw ?? 0, phase: p.z * 0.2 });
      } else if (p.type === 'head') stoneHead(P, this.root, [p.x, p.top, p.z], { h: p.height ?? 3.4, yaw: p.yaw ?? (p.x > 0 ? -20 : 20) });
      else if (p.type === 'pyramid') pyramid(P, this.root, [p.x, p.top, p.z], { size: p.size ?? 9, h: p.height ?? 7 });
      else if (p.type === 'waterfall') waterfall(P, this.root, [p.x, p.top, p.z], { h: p.height ?? 4.2, w: p.w ?? 2.4 });
      else if (p.type === 'altar') altar(P, this.root, [p.x, p.top, p.z]);
      else if (p.type === 'hut') hut(P, this.root, [p.x, p.top, p.z]);
      else if (p.type === 'totem') totem(P, this.root, [p.x, p.top, p.z], { h: p.height ?? 2.6 });
      else if (p.type === 'bush') bush(P, this.root, [p.x, p.top, p.z], p.size ?? 0.8, rand);
      else if (p.type === 'cactus') cactus(P, this.root, [p.x, p.top, p.z], { h: p.h ?? 1.7, yaw: p.yaw ?? 0 });
      else if (p.type === 'pot') clayPot(P, this.root, [p.x, p.top, p.z], { h: p.h ?? 1.5 });
      else if (p.type === 'deadTree') deadTree(P, this.root, [p.x, p.top, p.z], { h: p.h ?? 3.2, yaw: p.yaw ?? 0 });
      else if (p.type === 'arch') stoneArch(P, this.root, [p.x, p.top, p.z], { w: p.w ?? 4.6, h: p.h ?? 3.6 });
      else if (p.type === 'lamp') lampPost(P, this.root, [p.x, p.top, p.z]);
      else if (p.type === 'rock' && this.theme === 'desert') {
        const s = p.size ?? 1.4;
        P.ball(this.root, g.solid('#c45a3a', { gloss: 0.08 }), [p.x, p.top + s * 0.35, p.z], [s * 1.4, s * 0.9, s], { name: 'roca' });
        P.ball(this.root, g.solid('#8d3d32'), [p.x + s * 0.4, p.top + s * 0.2, p.z + 0.2], [s * 0.8, s * 0.55, s * 0.7], { name: 'roca' });
      }
      else if (p.type === 'mine') mineMouth(P, this.root, [p.x, p.top, p.z], { yaw: p.yaw ?? 180 });
      else if (p.type === 'cliff') cliff(P, this.root, [p.x, p.top, p.z], { h: p.height ?? 3.2, w: p.w ?? 2.2, d: p.d ?? 8 });
    }
  }

  _goal(goal) {
    const g = this.gfx;
    const arch = g.group('meta', this.root, [goal.x, goal.top, goal.z + goal.d / 2]);
    const w = goal.w;
    for (const side of [-1, 1]) {
      g.prim('box', g.solid('#ffffff'), { parent: arch, pos: [side * w / 2, 1.8, 0], scale: [0.3, 3.6, 0.3] });
    }
    const banner = g.prim('box', g.solid('#ffffff'), { parent: arch, pos: [0, 3.5, 0], scale: [w + 0.6, 1.1, 0.12], name: 'banner' });
    banner.render.material = g.textured(g.textureFromCanvas(signCanvas('META', { style: 'goal', aspect: (w + 0.6) / 1.1, palette: g.palette })));
    this._applyArtTexture(banner, 'matias/banner-meta.png');
    // Piso a cuadros en la zona de meta.
    const checker = g.textured(g.textureFromCanvas(checkerCanvas(8)));
    g.prim('box', checker, { parent: this.root, pos: [goal.x, goal.top + 0.01, goal.z], scale: [goal.w, 0.02, goal.d], shadows: false, name: 'cuadros' });
    // Bandera a cuadros.
    const flag = g.group('bandera-meta', this.root, [goal.x + w / 2 + 0.8, goal.top, goal.z - 1]);
    g.prim('cylinder', g.solid('#eeeeee'), { parent: flag, pos: [0, 1.8, 0], scale: [0.12, 3.6, 0.12] });
    this.goalFlag = g.prim('box', checker, { parent: flag, pos: [0.6, 3.2, 0], scale: [1.1, 0.75, 0.04] });
  }

  // ------------------------------------------------------------------ arte opcional

  /** Reemplaza la textura del tablero por el PNG si existe. */
  async _applyArtTexture(entity, path) {
    const tex = await this.gfx.loadTexture(imageUrl(path));
    if (tex) entity.render.material = this.gfx.textured(tex, { cutout: true });
  }

  /** Calcomanía plana encima de algo (p. ej. plataforma móvil). */
  async _applyArt(parent, path, pos, size, flat) {
    const tex = await this.gfx.loadTexture(imageUrl(path));
    if (!tex) return;
    this.gfx.prim('box', this.gfx.textured(tex, { cutout: true }), {
      parent,
      pos,
      rot: flat ? [-90, 0, 0] : [0, 0, 0],
      scale: [size[0], size[1], 0.01],
      shadows: false,
    });
  }

  async _billboard(url, pos, height) {
    const tex = await this.gfx.loadTexture(url);
    if (!tex) return;
    const w = height * (tex.width / tex.height);
    const e = this.gfx.group('billboard', this.root, pos);
    this.gfx.prim('box', this.gfx.textured(tex, { cutout: true }), { parent: e, pos: [0, height / 2, 0], scale: [w, height, 0.02] });
    this.billboards.push(e);
  }

  /** Panel de vidrio. Templado y normal se ven igual: hay que pisarlo para saberlo. */
  _glass(def, a) {
    const g = this.gfx;
    const w = a.max.x - a.min.x;
    const d = a.max.z - a.min.z;
    const cx = (a.max.x + a.min.x) / 2;
    const y = a.max.y;
    const cz = (a.max.z + a.min.z) / 2;
    const root = g.group(def.id, this.root, [cx, y, cz]);
    const pane = g.solid('#c5ebe8', { opacity: 0.46, gloss: 0.92, mul: 1.2 });
    g.prim('box', pane, { parent: root, pos: [0, -0.035, 0], scale: [w * 0.9, 0.045, d * 0.9], name: 'vidrio' });
    const rim = g.solid('#6e5338', { mul: 0.85, gloss: 0.3 });
    const t = 0.07;
    g.prim('box', rim, { parent: root, pos: [0, -0.04, d / 2 - t / 2], scale: [w, 0.06, t] });
    g.prim('box', rim, { parent: root, pos: [0, -0.04, -d / 2 + t / 2], scale: [w, 0.06, t] });
    g.prim('box', rim, { parent: root, pos: [w / 2 - t / 2, -0.04, 0], scale: [t, 0.06, d] });
    g.prim('box', rim, { parent: root, pos: [-w / 2 + t / 2, -0.04, 0], scale: [t, 0.06, d] });
    const shards = [];
    for (let i = 0; i < 6; i++) {
      const e = g.prim('box', pane, {
        parent: this.root,
        pos: [cx, y, cz],
        scale: [0.22, 0.04, 0.28],
        shadows: false,
        name: 'trozo',
      });
      e.enabled = false;
      shards.push({
        e,
        x: cx + (i - 2.5) * 0.28,
        y,
        z: cz + ((i % 3) - 1) * 0.3,
        vx: (i - 2.5) * 1.1,
        vy: 1.4 + (i % 2) * 0.6,
        vz: (i % 2 ? 1 : -1) * 0.8,
        life: 0,
      });
    }
    this.glass.set(def.id, { root, shards });
  }

  shatter(id) {
    const pane = this.glass.get(id);
    if (!pane || pane.gone) return;
    pane.gone = true;
    pane.root.enabled = false;
    for (const s of pane.shards) {
      s.life = 0.7;
      s.e.enabled = true;
      this.shards.push(s);
    }
  }

  restoreGlass() {
    for (const pane of this.glass.values()) {
      pane.gone = false;
      pane.root.enabled = true;
    }
    for (const s of this.shards) s.e.enabled = false;
    this.shards.length = 0;
  }

  /** Cactus del laberinto. Los hostiles se estiran cuando pinchan (lo marca la sim). */
  _mazeCacti(list) {
    this.pokers = [];
    if (!list?.length) return;
    const P = (this.parts ??= new Parts(this.gfx));
    for (const c of list) {
      const e = cactus(P, this.root, [c.x, 0.88, c.z], {
        h: c.h ?? (c.kind === 'barrel' ? 0.7 : c.kind === 'pear' ? 1.05 : c.hostile ? 2.5 : 2.8),
        yaw: c.yaw ?? c.x * 12,
        hostile: !!c.hostile,
        kind: c.kind ?? 'saguaro',
      });
      this.pokers.push(e);
    }
  }

  // ------------------------------------------------------------------ frame

  update(dt, time, game, camPos) {
    this.water?.update(time, camPos);
    this.valley?.update(time);
    this.desert?.update(time);
    this.sky.setPosition(camPos.x, this.land ? (this.groundY ?? 0.8) : this.waterY, camPos.z);
    for (const f of this.floating) {
      f.e.setPosition(f.s.x, f.s.top + Math.sin(time * 1.1 + f.phase) * 0.06, f.s.z);
      f.e.setLocalEulerAngles(Math.sin(time * 0.9 + f.phase) * 2.5, f.s.yaw ?? 0, Math.sin(time * 0.7 + f.phase * 1.3) * 3.5);
    }
    for (const s of this.swayers) {
      s.e.setLocalEulerAngles(Math.sin(time * 1.5 + s.phase) * (s.pitch ?? 3.5), s.yaw + Math.sin(time * 2.1 + s.phase) * (s.amp ?? 7), 0);
    }
    for (const gl of this.glows) {
      const n = 0.86 + Math.sin(time * gl.speed + gl.phase) * 0.09 + Math.sin(time * gl.speed * 2.6 + gl.phase) * 0.05;
      gl.light.intensity = gl.base * n;
    }
    for (const sm of this.smokers) {
      sm.puffs.forEach((p, i) => {
        const speed = sm.fire ? 1.5 : 0.5;
        const t = (time * speed + sm.phase + i / sm.puffs.length) % 1;
        const rise = sm.fire ? 0.5 : 0.9;
        p.setLocalPosition(sm.cx + Math.sin(time * 3 + i) * 0.05, sm.top + t * rise, sm.cz + Math.cos(time * 2.3 + i) * 0.04);
        const k = (sm.fire ? 0.16 : 0.14) * (0.55 + t * 0.8);
        p.setLocalScale(k, k * 1.4, k);
      });
    }
    for (const f of this.bobbing) f.e.setLocalPosition(f.x, f.y + Math.sin(time * 1.2 + f.phase) * 0.05, f.z);
    for (const f of this.swingers) f.e.setLocalEulerAngles(Math.sin(time * 1.5 + f.phase) * 16, f.yaw, 0);
    const plants = game.cacti?.plants;
    if (plants && this.pokers) {
      for (let i = 0; i < this.pokers.length; i++) {
        const lung = plants[i]?.lunge ?? 0;
        const sway = Math.sin(time * 1.15 + i) * 1.6;
        const k = 1 + lung * 2.4;
        this.pokers[i].setLocalScale(k, 1 + lung * 0.2, k);
        this.pokers[i].setLocalEulerAngles(sway + Math.sin(time * 26) * lung * 16, 0, sway * 0.35);
      }
    }

    const grav = 24;
    for (const s of this.shards) {
      if (s.life <= 0) continue;
      s.life -= dt;
      s.vy -= grav * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      if (s.life <= 0) {
        s.e.enabled = false;
        continue;
      }
      s.e.setPosition(s.x, s.y, s.z);
      s.e.setLocalEulerAngles(s.life * 240, s.vx * 40, s.vz * 40);
    }

    for (const m of this.movers) m.e.setPosition(m.sim.pos.x, m.sim.pos.top, m.sim.pos.z);
    for (const s of this.sweepers) s.pivot.setLocalEulerAngles(0, -s.sim.angle, 0);

    for (const gv of this.geysers) {
      const gs = gv.sim;
      const h = Math.max(0.01, gs.level * gs.height);
      const wob = 1 + Math.sin(time * 30) * 0.05 * gs.level;
      gv.column.setLocalScale(gs.radius * 1.3 * wob, h, gs.radius * 1.3 * wob);
      gv.column.setLocalPosition(gs.x, gs.baseY + h / 2, gs.z);
      gv.column.enabled = gs.level > 0.02;
      gv.bubbles.forEach((b, i) => {
        b.enabled = gs.phase === 'warn';
        if (!b.enabled) return;
        const a = i * 1.3 + time * 2;
        b.setLocalPosition(gs.x + Math.cos(a) * gs.radius * 0.5, gs.baseY + 0.1 + Math.abs(Math.sin(time * 9 + i)) * 0.35, gs.z + Math.sin(a) * gs.radius * 0.5);
      });
    }

    this.flags.forEach((cloth, i) => {
      if (!cloth) return;
      const reached = game.checkpointIndex >= i;
      const want = reached ? 'goal' : 'danger';
      if (cloth._colorKey !== want) {
        cloth._colorKey = want;
        cloth.render.material.diffuse = this.gfx.color(want);
        cloth.render.material.update();
      }
      cloth.setLocalEulerAngles(0, Math.sin(time * 3 + i) * 12, 0);
    });
    if (this.goalFlag) this.goalFlag.setLocalEulerAngles(0, Math.sin(time * 3) * 15, 0);

    for (const b of this.billboards) {
      const p = b.getPosition();
      b.setEulerAngles(0, (Math.atan2(camPos.x - p.x, camPos.z - p.z) * 180) / Math.PI, 0);
    }
  }
}

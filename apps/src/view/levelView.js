// Dibujo del nivel con primitivas (Capa A) + carteles/props con PNG de Matias si existen (Capa B).
import * as pc from 'playcanvas';
import { buildBackdrop } from './backdrop.js';
import { imageUrl } from './deliveries.js';
import { bush, palm, rock, seeded } from './nature.js';
import { Parts } from './parts.js';
import { checkerCanvas, plankCanvas, signCanvas } from './signs.js';
import { Water } from './water.js';

export class LevelView {
  constructor(gfx, world) {
    this.gfx = gfx;
    this.world = world;
    this.root = gfx.group('level');
    this.billboards = []; // entidades que miran a la cámara
    this.flags = []; // banderas de checkpoint
    this.floating = []; // barcos / botes Kenney (suben y bajan con el mar)
    this._assets = new Map();
    const L = world.level;

    this.waterY = world.waterLevel;
    for (const s of world.statics) this._platform(s.def, s.aabb);
    this._sea(world);
    this.movers = world.movers.map((m) => ({ sim: m, e: this._mover(m) }));
    this.sweepers = world.sweepers.map((s) => ({ sim: s, ...this._sweeper(s) }));
    this.geysers = world.geysers.map((g) => ({ sim: g, ...this._geyser(g) }));
    for (const s of L.signs ?? []) this._sign(s);
    for (const p of L.props ?? []) this._prop(p);
    this._scenery(L.scenery);
    if (L.goal) this._goal(L.goal);
  }

  // ------------------------------------------------------------------ piezas

  /** Cielo + islas lejanas + agua con olas y espuma alrededor de cada plataforma e isla. */
  _sea(world) {
    const plats = world.statics.map((s) => s.aabb);
    const zs = plats.flatMap((a) => [a.min.z, a.max.z]);
    const clear = Math.max(...plats.map((a) => Math.max(Math.abs(a.min.x), Math.abs(a.max.x)))) + 10;
    const P = (this.parts ??= new Parts(this.gfx));
    const seed = [...(world.level.id ?? 'nivel')].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0;
    const { sky, shores } = buildBackdrop(P, this.root, { minZ: Math.min(...zs), maxZ: Math.max(...zs), seaY: this.waterY, seed, clear });
    this.sky = sky;
    const docks = plats.map((a) => ({ x: (a.min.x + a.max.x) / 2, z: (a.min.z + a.max.z) / 2, w: a.max.x - a.min.x, d: a.max.z - a.min.z }));
    this.water = new Water(this.gfx, { y: this.waterY, parent: this.root, shores: [...docks, ...shores] });
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
    const plank = def.kind === 'plank';
    const top = 0.14;
    g.prim('box', g.solid(plank ? 'plank' : 'wood', { mul: 0.75 }), { parent: this.root, pos: [cx, a.min.y + (h - top) / 2, cz], scale: [w, h - top, d], name: def.id });
    // Piso de tablones: textura clara teñida con el color de la madera, 2 m por repetición.
    this._plankTex ??= g.textureFromCanvas(plankCanvas(), { repeat: true });
    const floor = g.textured(this._plankTex, { tint: g.color(plank ? 'plank' : 'wood', 1.12) });
    floor.diffuseMapTiling = new pc.Vec2(w / 2, d / 2);
    floor.update();
    g.prim('box', floor, { parent: this.root, pos: [cx, a.max.y - top / 2, cz], scale: [w + 0.06, top, d + 0.06], name: `${def.id}-piso` });
    if (!plank) {
      // Pilotes en las esquinas (se ven en el agua).
      for (const [px, pz] of [[a.min.x, a.min.z], [a.max.x, a.min.z], [a.min.x, a.max.z], [a.max.x, a.max.z]]) {
        g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), { parent: this.root, pos: [px, a.max.y - 0.3, pz], scale: [0.3, 0.9, 0.3] });
      }
    } else {
      // Postes que sostienen el tablón / riel.
      for (let z = a.min.z + 0.6; z < a.max.z; z += 3) {
        g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), { parent: this.root, pos: [cx, (a.min.y + this.waterY) / 2 - 0.2, z], scale: [0.18, a.min.y - this.waterY + 0.6, 0.18] });
      }
    }
  }

  _mover(m) {
    const g = this.gfx;
    const e = g.group(m.def.id ?? 'movil', this.root);
    g.prim('box', g.solid('plank', { mul: 0.9 }), { parent: e, pos: [0, -m.h / 2, 0], scale: [m.w, m.h, m.d] });
    // Borde amarillo: "esto se mueve".
    const edge = g.solid('ui');
    const t = 0.12;
    g.prim('box', edge, { parent: e, pos: [0, -0.04, m.d / 2 - t / 2], scale: [m.w, 0.1, t] });
    g.prim('box', edge, { parent: e, pos: [0, -0.04, -m.d / 2 + t / 2], scale: [m.w, 0.1, t] });
    g.prim('box', edge, { parent: e, pos: [m.w / 2 - t / 2, -0.04, 0], scale: [t, 0.1, m.d] });
    g.prim('box', edge, { parent: e, pos: [-m.w / 2 + t / 2, -0.04, 0], scale: [t, 0.1, m.d] });
    this._applyArt(e, 'matias/prop-plataforma.png', [0, 0.01, 0], [m.w * 0.9, m.d * 0.9], true);
    return e;
  }

  _sweeper(s) {
    const g = this.gfx;
    const danger = g.solid('danger', { gloss: 0.5 });
    g.prim('cylinder', danger, { parent: this.root, pos: [s.x, s.top + 0.55, s.z], scale: [0.6, 1.1, 0.6], name: 'pilar' });
    g.prim('sphere', g.solid('ui'), { parent: this.root, pos: [s.x, s.top + 1.15, s.z], scale: [0.5, 0.5, 0.5] });
    const pivot = g.group('rodillo', this.root, [s.x, s.top + s.armHeight, s.z]);
    const bar = g.prim('cylinder', danger, { parent: pivot, rot: [0, 0, 90], scale: [s.armRadius * 2, s.length * 2, s.armRadius * 2], name: 'barra' });
    // Franjas blancas para que se lea el giro.
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      g.prim('cylinder', g.solid('#ffffff'), { parent: pivot, pos: [i * s.length * 0.4, 0, 0], rot: [0, 0, 90], scale: [s.armRadius * 2.1, 0.25, s.armRadius * 2.1] });
    }
    this._applyArtTexture(bar, 'matias/prop-rodillo.png');
    return { pivot };
  }

  _geyser(gs) {
    const g = this.gfx;
    g.prim('cylinder', g.solid('dark', { unlit: true }), { parent: this.root, pos: [gs.x, gs.baseY + 0.01, gs.z], scale: [gs.radius * 1.4, 0.02, gs.radius * 1.4], shadows: false, name: 'hoyo' });
    const column = g.prim('cylinder', g.solid('#bfeaff', { opacity: 0.55, unlit: true }), { parent: this.root, pos: [gs.x, gs.baseY, gs.z], scale: [gs.radius * 1.3, 0.01, gs.radius * 1.3], shadows: false, name: 'chorro' });
    const bubbles = [];
    for (let i = 0; i < 5; i++) {
      const b = g.prim('sphere', g.solid('foam', { unlit: true }), { parent: this.root, scale: [0.18, 0.18, 0.18], shadows: false });
      b.enabled = false;
      bubbles.push(b);
    }
    return { column, bubbles };
  }

  /** Modelos del kit pirata (un asset por modelo, compartido). El GLB busca Textures/colormap.png a su lado. */
  _scenery(items) {
    this._assets = new Map();
    this.floating = [];
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
        ent.name = s.art;
        ent.setLocalScale(scale, scale, scale);
        ent.setLocalEulerAngles(0, s.yaw ?? 0, 0);
        ent.setPosition(s.x, s.top, s.z);
        this.root.addChild(ent);
        if (s.float) this.floating.push({ e: ent, s, phase: s.x * 0.37 + s.z * 0.11 });
      });
    }
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

  // ------------------------------------------------------------------ frame

  update(dt, time, game, camPos) {
    this.water.update(time, camPos);
    this.sky.setPosition(camPos.x, this.waterY, camPos.z);
    for (const f of this.floating) {
      f.e.setPosition(f.s.x, f.s.top + Math.sin(time * 1.1 + f.phase) * 0.06, f.s.z);
      f.e.setLocalEulerAngles(Math.sin(time * 0.9 + f.phase) * 2.5, f.s.yaw ?? 0, Math.sin(time * 0.7 + f.phase * 1.3) * 3.5);
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

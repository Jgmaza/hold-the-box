// Dibujo del nivel con primitivas (Capa A) + carteles/props con PNG de Matias si existen (Capa B).
import * as pc from 'playcanvas';
import { imageUrl } from './deliveries.js';
import { checkerCanvas, signCanvas } from './signs.js';

export class LevelView {
  constructor(gfx, world) {
    this.gfx = gfx;
    this.world = world;
    this.root = gfx.group('level');
    this.billboards = []; // entidades que miran a la cámara
    this.flags = []; // banderas de checkpoint
    const L = world.level;

    this._water(world.waterLevel);
    for (const s of world.statics) this._platform(s.def, s.aabb);
    this.movers = world.movers.map((m) => ({ sim: m, e: this._mover(m) }));
    this.sweepers = world.sweepers.map((s) => ({ sim: s, ...this._sweeper(s) }));
    this.geysers = world.geysers.map((g) => ({ sim: g, ...this._geyser(g) }));
    for (const s of L.signs ?? []) this._sign(s);
    for (const p of L.props ?? []) this._prop(p);
    this._scenery(L.scenery);
    if (L.goal) this._goal(L.goal);
  }

  // ------------------------------------------------------------------ piezas

  _water(y) {
    const g = this.gfx;
    this.water = g.prim('plane', g.solid('water', { gloss: 0.7 }), { parent: this.root, pos: [0, y, -50], scale: [500, 1, 500], shadows: false, name: 'agua' });
    this.waterY = y;
  }

  _platform(def, a) {
    const g = this.gfx;
    const w = a.max.x - a.min.x;
    const h = a.max.y - a.min.y;
    const d = a.max.z - a.min.z;
    const cx = (a.max.x + a.min.x) / 2;
    const cz = (a.max.z + a.min.z) / 2;
    const plank = def.kind === 'plank';
    const top = 0.14;
    g.prim('box', g.solid(plank ? 'plank' : 'wood', { mul: 0.75 }), { parent: this.root, pos: [cx, a.min.y + (h - top) / 2, cz], scale: [w, h - top, d], name: def.id });
    g.prim('box', g.solid(plank ? 'plank' : 'wood', { mul: 1.08 }), { parent: this.root, pos: [cx, a.max.y - top / 2, cz], scale: [w + 0.06, top, d + 0.06], name: `${def.id}-piso` });
    if (!plank) {
      // Pilotes en las esquinas (se ven en el agua).
      for (const [px, pz] of [[a.min.x, a.min.z], [a.max.x, a.min.z], [a.min.x, a.max.z], [a.max.x, a.max.z]]) {
        g.prim('cylinder', g.solid('trunk', { mul: 0.8 }), { parent: this.root, pos: [px, a.max.y - 0.3, pz], scale: [0.3, 0.9, 0.3] });
      }
    } else {
      // Postes que sostienen el tablón.
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

  /** Modelos del kit pirata. El GLB busca Textures/colormap.png a su lado. */
  _scenery(items) {
    if (!items?.length) return;
    const base = import.meta.env.BASE_URL;
    for (const s of items) {
      const asset = new pc.Asset(s.art, 'container', { url: `${base}kenney/${s.art}.glb` });
      this.gfx.app.assets.add(asset);
      asset.on('error', () => console.warn('[nivel] no se pudo cargar', s.art));
      asset.ready((loaded) => {
        const ent = loaded.resource.instantiateRenderEntity();
        const scale = s.s ?? 0.36;
        ent.name = s.art;
        ent.setLocalScale(scale, scale, scale);
        ent.setLocalEulerAngles(0, s.yaw ?? 0, 0);
        ent.setPosition(s.x, s.top, s.z);
        this.root.addChild(ent);
      });
      this.gfx.app.assets.load(asset);
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
      const palm = g.group('palmera', this.root, [p.x, p.top, p.z]);
      const lean = (p.x > 0 ? -1 : 1) * 8;
      palm.setLocalEulerAngles(0, 0, lean);
      for (let i = 0; i < 5; i++) {
        g.prim('cylinder', g.solid('trunk', { mul: i % 2 ? 0.9 : 1 }), { parent: palm, pos: [0, 0.35 + i * 0.62, 0], scale: [0.3 - i * 0.025, 0.62, 0.3 - i * 0.025] });
      }
      for (let i = 0; i < 6; i++) {
        const leaf = g.group('hoja', palm, [0, 3.2, 0]);
        leaf.setLocalEulerAngles(0, i * 60, 0);
        g.prim('box', g.solid('leaf', { mul: i % 2 ? 0.85 : 1 }), { parent: leaf, pos: [0.8, -0.15, 0], rot: [0, 0, -22], scale: [1.7, 0.08, 0.5] });
      }
      g.prim('sphere', g.solid('trunk', { mul: 0.7 }), { parent: palm, pos: [0.15, 3.0, 0.1], scale: [0.22, 0.22, 0.22] });
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
    this.water.setLocalPosition(0, this.waterY + Math.sin(time * 0.8) * 0.04, -50);

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

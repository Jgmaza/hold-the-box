// Escenario del menú (solo decoración): cielo con degradado, sol, nubes que pasan, mar con espuma,
// islas con palmeras, faro, velero, gaviotas y un muelle de tablones con cajas, barril, cuerda y salvavidas.
// El muelle tiene el piso en y = DECK_TOP y va de z = -2.1 (fondo) a z = 2.9 (frente, hacia la cámara).
import * as pc from 'playcanvas';
import { island, rock, seeded } from './nature.js';
import { Parts } from './parts.js';
import { boxCanvas, plankCanvas } from './signs.js';
import { Water } from './water.js';

export const DECK_TOP = -0.1;
const SEA_Y = -0.7;
const DOCK = { w: 10, back: -2.1, front: 2.9 };
// Islas del menú (compartidas entre mar y escenario para alinear la espuma del agua).
const ISLANDS = [
  { x: -13, z: -9, w: 13, d: 7, h: 2.2, palms: 3, bushes: 4, rocks: 3, seed: 11 },
  { x: 14, z: -15, w: 11, d: 6, h: 2, palms: 2, bushes: 3, rocks: 2, seed: 23 },
  { x: -38, z: -55, w: 26, d: 14, h: 4, palms: 3, bushes: 4, rocks: 3, seed: 5 },
  { x: 34, z: -62, w: 30, d: 16, h: 5, palms: 2, bushes: 3, rocks: 3, seed: 9 },
];

export class MenuScenery {
  constructor(gfx) {
    this.gfx = gfx;
    this.P = new Parts(gfx);
    this.rand = seeded(7);
    this.clouds = [];
    this.gulls = [];
    this.foam = [];
    this._buildSky();
    this._buildSea();
    this._buildIslands();
    this._buildBoat();
    this._buildDock();
    this._buildProps();
    this._buildGulls();
  }

  /** Material sin luz ni niebla (cielo, sol). */
  _skyMat(hex, { opacity = 1, map = null } = {}) {
    const m = new pc.StandardMaterial();
    m.useLighting = false;
    m.useFog = false;
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = map ? new pc.Color(1, 1, 1) : this.gfx.color(hex);
    if (map) m.emissiveMap = map;
    if (opacity < 1) {
      m.opacity = opacity;
      m.blendType = pc.BLEND_NORMAL;
      m.depthWrite = false;
    }
    m.cull = pc.CULLFACE_NONE;
    m.update();
    this.gfx._owned.push(m);
    return m;
  }

  _buildSky() {
    // Domo con degradado: azul arriba → crema en el horizonte → azul mar abajo (tapa el borde del agua).
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#3f9fe0');
    grad.addColorStop(0.3, '#7cc6f2');
    grad.addColorStop(0.47, '#c9ecfb');
    grad.addColorStop(0.5, '#fff3d6');
    grad.addColorStop(0.505, '#4fb8d8');
    grad.addColorStop(1, '#147fa6');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 512);
    const tex = this.gfx.textureFromCanvas(c);
    this.P.ball(this.gfx.root, this._skyMat(null, { map: tex }), [0, 0, 0], [420, 420, 420], { shadows: false, name: 'cielo' });

    // Sol con halo, arriba a la izquierda (detrás del logo no: queda sobre el mar).
    const sun = this.gfx.group('sol-visual', null, [-70, 55, -170]);
    this.P.ball(sun, this._skyMat('#fff8dc'), [0, 0, 0], [16, 16, 16], { shadows: false });
    this.P.ball(sun, this._skyMat('#fff1b8', { opacity: 0.35 }), [0, 0, 0], [26, 26, 26], { shadows: false });
    this.P.ball(sun, this._skyMat('#ffe9a8', { opacity: 0.15 }), [0, 0, 0], [42, 42, 42], { shadows: false });

    // Nubes: racimos de bolas blancas que cruzan despacio.
    const white = this.gfx.solid('#ffffff', { gloss: 0, emissive: 0.85 });
    for (let i = 0; i < 8; i++) {
      const r = this.rand;
      const cloud = this.gfx.group('nube', null, [-140 + i * 38 + r() * 20, 26 + r() * 22, -95 - r() * 55]);
      const n = 4 + Math.floor(r() * 3);
      const size = 7 + r() * 6;
      for (let k = 0; k < n; k++) {
        const s = size * (0.55 + r() * 0.5);
        this.P.ball(cloud, white, [(k - n / 2) * size * 0.45, (r() - 0.3) * size * 0.25, r() * 2], [s * 1.3, s * 0.85, s], { shadows: false });
      }
      this.clouds.push({ e: cloud, speed: 0.8 + r() * 1.2 });
    }
  }

  _buildSea() {
    // Mismo agua que en los niveles: olas, agua clara y espuma alrededor del muelle y las islas.
    const shores = [{ x: 0, z: (DOCK.back + DOCK.front) / 2, w: DOCK.w, d: DOCK.front - DOCK.back }, { x: 6.8, z: 1.5, w: 1.6, d: 1.6, round: true }];
    for (const s of ISLANDS) shores.push({ x: s.x, z: s.z, w: s.w * 1.05, d: s.d * 1.05, round: true });
    this.water = new Water(this.gfx, { y: SEA_Y, shores, amp: 0.07, center: [0, -60] });
  }

  _buildIslands() {
    const P = this.P;
    const root = P.gfx.root;
    // Cerca (se ven en detalle detrás del muelle) y lejos (con el faro).
    for (const s of ISLANDS) island(P, root, { ...s, seaY: SEA_Y });
    this._lighthouse(42, SEA_Y + 2.6, -64);
    // Rocas sueltas en el agua cerca del muelle.
    rock(P, root, [6.8, SEA_Y - 0.1, 1.5], 0.9, seeded(31));
  }

  /** Faro de rayas rojas y blancas con lámpara que titila. */
  _lighthouse(x, y, z) {
    const P = this.P;
    const g = P.gfx.group('faro', null, [x, y, z]);
    const red = P.gfx.solid('danger');
    const white = P.gfx.solid('#ffffff');
    for (let i = 0; i < 5; i++) P.disc(g, i % 2 ? white : red, [0, 0.7 + i * 1.4, 0], 1.25 - i * 0.12, 1.4, { name: 'tramo' });
    P.disc(g, P.gfx.solid('#2b2b2b'), [0, 7.75, 0], 1.05, 0.25, { name: 'balcon' });
    this.lamp = P.ball(g, P.gfx.solid('ui', { emissive: 1 }), [0, 8.45, 0], [1.1, 1.1, 1.1], { shadows: false, name: 'lampara' });
    const roof = P.gfx.prim('cone', red, { parent: g, pos: [0, 9.5, 0], scale: [1.6, 1.2, 1.6], name: 'techo' });
    roof.render.castShadows = false;
  }

  _buildBoat() {
    const P = this.P;
    const boat = P.gfx.group('velero', null, [0, SEA_Y, -32]);
    P.ball(boat, P.gfx.solid('#ffffff'), [0, 0.1, 0], [4.2, 1.1, 1.4], { name: 'casco' });
    P.ball(boat, P.gfx.solid('danger'), [0, 0.0, 0], [4.25, 0.35, 1.45], { name: 'franja' });
    P.limb(boat, P.gfx.solid('trunk'), [0.2, 0.4, 0], [0.2, 4.6, 0], 0.07, { name: 'mastil' });
    const sail = P.gfx.prim('cone', P.gfx.solid('#fff8e8'), { parent: boat, pos: [-0.75, 2.5, 0], scale: [1.9, 3.8, 0.06], name: 'vela' });
    sail.render.castShadows = false;
    P.gfx.prim('cone', P.gfx.solid('ui'), { parent: boat, pos: [0.9, 2.2, 0], scale: [1.2, 2.9, 0.05], name: 'foque' });
    this.boat = boat;
  }

  _buildDock() {
    const P = this.P;
    const g = P.gfx;
    // Piso de tablones con la misma textura que el muelle del juego (2 m por repetición).
    const depth = DOCK.front - DOCK.back;
    const deck = g.textured(g.textureFromCanvas(plankCanvas(), { repeat: true }), { tint: g.color('wood', 1.12) });
    deck.diffuseMapTiling = new pc.Vec2(DOCK.w / 2, depth / 2);
    deck.update();
    g.prim('box', deck, { pos: [0, DECK_TOP - 0.06, (DOCK.back + DOCK.front) / 2], scale: [DOCK.w, 0.12, depth], name: 'tablones' });
    // Vigas y postes que bajan al agua.
    const beam = g.solid('plank');
    for (const z of [DOCK.back + 0.15, DOCK.front - 0.15]) g.prim('box', beam, { pos: [0, DECK_TOP - 0.3, z], scale: [DOCK.w + 0.2, 0.36, 0.26], name: 'viga' });
    const post = g.solid('trunk');
    const rope = g.solid('sand', { mul: 0.9 });
    for (const x of [-DOCK.w / 2, -DOCK.w / 6, DOCK.w / 6, DOCK.w / 2]) {
      for (const z of [DOCK.back + 0.1, DOCK.front - 0.1]) {
        const tall = Math.abs(x) > 4 && z > 0;
        const top = tall ? DECK_TOP + 0.6 : DECK_TOP - 0.05;
        P.limb(P.gfx.root, post, [x, SEA_Y - 1, z], [x, top, z], 0.17, { name: 'poste' });
        if (tall) P.ring(P.gfx.root, rope, [x, DECK_TOP + 0.35, z], 0.18, 0.04, { name: 'amarre' });
        // Espuma alrededor del poste.
        const ring = P.ring(P.gfx.root, g.solid('foam', { opacity: 0.75, gloss: 0 }), [x, SEA_Y + 0.03, z], 0.32, 0.05, { shadows: false, name: 'espuma-poste' });
        this.foam.push({ e: ring, phase: x + z, base: 1, ring: true });
      }
    }
  }

  _buildProps() {
    const P = this.P;
    const g = P.gfx;
    const root = g.root;

    // Cajas de cartón apiladas (atrás a la izquierda), con la misma textura de la caja del juego.
    const cardboard = g.textured(g.textureFromCanvas(boxCanvas(g.palette.box)));
    for (const [x, y, z, s, yaw] of [
      [-4.0, 0, -1.3, 0.8, 12],
      [-3.15, 0, -1.5, 0.7, -8],
      [-3.65, 0.75, -1.4, 0.65, 25],
    ]) {
      g.prim('box', cardboard, { pos: [x, DECK_TOP + y + s / 2, z], scale: [s, s, s], rot: [0, yaw, 0], name: 'caja-pila' });
    }

    // Barril con aros y una cuerda enrollada al lado (atrás a la derecha).
    const barrel = g.group('barril', null, [3.9, DECK_TOP, -1.2]);
    P.limb(barrel, g.solid('trunk', { mul: 1.15 }), [0, 0.35, 0], [0, 0.65, 0], 0.36, { name: 'duela' });
    for (const y of [0.25, 0.75]) P.ring(barrel, g.solid('#3a3a3a', { gloss: 0.6 }), [0, y, 0], 0.37, 0.025, { name: 'aro' });
    P.disc(barrel, g.solid('trunk', { mul: 0.8 }), [0, 0.99, 0], 0.32, 0.02, { name: 'tapa' });
    const rope = g.solid('sand', { mul: 0.9 });
    for (let k = 0; k < 4; k++) P.ring(root, rope, [3.0, DECK_TOP + 0.04 + k * 0.06, -1.55], 0.3 - k * 0.04, 0.035, { name: 'cuerda' });

    // Salvavidas apoyado en el poste alto de la derecha.
    const buoy = g.group('salvavidas', null, [4.62, DECK_TOP + 0.35, DOCK.front + 0.12]);
    buoy.setLocalEulerAngles(90, 0, 0);
    P.ring(buoy, g.solid('danger'), [0, 0, 0], 0.32, 0.1, { name: 'aro' });
    const white = g.solid('#ffffff');
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      P.ball(buoy, white, [Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], [0.17, 0.21, 0.17], { name: 'franja' });
    }

    // Banderines entre los postes del fondo.
    const colors = ['ui', 'danger', 'goal', 'water', 'p2'];
    const line = g.solid('#3a3a3a');
    P.limb(root, line, [-DOCK.w / 2, DECK_TOP + 2.6, DOCK.back - 0.2], [DOCK.w / 2, DECK_TOP + 2.6, DOCK.back - 0.2], 0.015, { shadows: false, name: 'cordel' });
    for (const x of [-DOCK.w / 2, DOCK.w / 2]) P.limb(root, g.solid('trunk'), [x, DECK_TOP, DOCK.back - 0.2], [x, DECK_TOP + 2.7, DOCK.back - 0.2], 0.07, { name: 'asta' });
    for (let k = 0; k < 13; k++) {
      const x = -DOCK.w / 2 + 0.45 + k * 0.75;
      const sag = Math.sin((k / 12) * Math.PI) * 0.35;
      const flag = g.prim('cone', g.solid(colors[k % colors.length]), { pos: [x, DECK_TOP + 2.4 - sag, DOCK.back - 0.2], scale: [0.36, 0.42, 0.03], rot: [180, 0, 0], shadows: false, name: 'banderin' });
      this.foam.push({ e: flag, phase: k, flag: true });
    }
  }

  _buildGulls() {
    const P = this.P;
    const white = P.gfx.solid('#ffffff');
    const grey = P.gfx.solid('#c9d2d8');
    const beak = P.gfx.solid('ui');
    for (let i = 0; i < 3; i++) {
      const g = P.gfx.group('gaviota');
      const body = P.gfx.group('cuerpo', g);
      P.ball(body, white, [0, 0, 0], [0.28, 0.22, 0.6], { shadows: false });
      P.ball(body, white, [0, 0.08, -0.3], [0.2, 0.2, 0.2], { shadows: false });
      P.ball(body, beak, [0, 0.06, -0.43], [0.06, 0.05, 0.12], { shadows: false });
      const wings = [-1, 1].map((s) => {
        const w = P.gfx.group('ala', body, [s * 0.1, 0.05, 0]);
        P.ball(w, grey, [s * 0.45, 0, 0], [0.9, 0.04, 0.32], { shadows: false });
        return { w, s };
      });
      this.gulls.push({ g, body, wings, r: 9 + i * 4, h: 9 + i * 2.5, speed: 0.25 + i * 0.07, phase: i * 2.1 });
    }
  }

  update(dt, t) {
    this.water?.update(t);
    for (const c of this.clouds) {
      const p = c.e.getLocalPosition();
      let x = p.x + c.speed * dt;
      if (x > 160) x = -160;
      c.e.setLocalPosition(x, p.y, p.z);
    }
    for (const f of this.foam) {
      if (f.flag) {
        f.e.setLocalEulerAngles(180 + Math.sin(t * 3 + f.phase) * 12, Math.sin(t * 2 + f.phase) * 15, 0);
      } else if (f.ring) {
        const s = 1 + 0.15 * Math.sin(t * 1.6 + f.phase);
        f.e.setLocalScale(s, 1, s);
      }
    }
    for (const gl of this.gulls) {
      const a = t * gl.speed + gl.phase;
      gl.g.setLocalPosition(Math.cos(a) * gl.r - 2, gl.h + Math.sin(t * 0.7 + gl.phase) * 0.6, Math.sin(a) * gl.r * 0.6 - 12);
      gl.g.setLocalEulerAngles(0, (-a * 180) / Math.PI, Math.sin(a) * 10);
      const flap = Math.sin(t * 5 + gl.phase) * 28;
      for (const { w, s } of gl.wings) w.setLocalEulerAngles(0, 0, s * flap);
    }
    if (this.boat) {
      this.boat.setLocalPosition(-60 + ((t * 1.1 + 40) % 120), SEA_Y + Math.sin(t * 1.3) * 0.12, -32);
      this.boat.setLocalEulerAngles(Math.sin(t * 1.1) * 3, 0, Math.sin(t * 0.9) * 4);
    }
    if (this.lamp) {
      const k = 0.85 + 0.15 * Math.sin(t * 4);
      this.lamp.setLocalScale(1.1 * k, 1.1 * k, 1.1 * k);
    }
  }
}

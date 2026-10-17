// Dibujo del clima de las islas. Solo LEE game.weather (zonas con phase / intensity / dir).
//   Lluvia: nube de tormenta alta, gotas que caen dentro del área, salpicaduras, charcos, carpas de lona,
//           relámpagos en el aguacero y el cielo se pone gris mientras la caja está bajo la lluvia.
//   Viento: rachas que cruzan la isla, hojas dando vueltas, pasto que se dobla, arena en la ráfaga,
//           manga de viento que apunta hacia donde sopla y chevrones en el piso durante el aviso.
// Piezas suaves de view/parts.js (las mismas de los NPCs).
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { makeRng } from '../sim/math.js';
import { Parts } from './parts.js';

const DEG = 180 / Math.PI;
const STORM = { fog: [0.49, 0.54, 0.59], light: 0.55, ambient: 0.65 }; // cielo bajo la lluvia (multiplicadores)

export class WeatherViews {
  /**
   * @param {Gfx} gfx
   * @param {WeatherService} service
   * @param {{particles, scene, sun}} env  partículas + escena y sol para oscurecer / relámpagos
   */
  constructor(gfx, service, { particles, scene, sun }) {
    this.gfx = gfx;
    this.service = service;
    this.scene = scene;
    this.sun = sun;
    this.parts = new Parts(gfx);
    this.root = gfx.group('clima');
    this.views = service.zones.map((z) => new (z.type === 'rain' ? RainView : WindView)(this.parts, z, particles, this.root));
    this.storm = 0; // 0..1 qué tan "bajo la tormenta" se ve la escena
    this.flash = 0; // relámpago
    this._base = {
      fog: scene.fog.color.clone(),
      fogStart: scene.fog.start,
      fogEnd: scene.fog.end,
      ambient: scene.ambientLight.clone(),
      sun: sun?.light?.intensity ?? 1,
    };
  }

  update(dt, time, game, camPos) {
    const on = CONFIG.weather.enabled;
    this.root.enabled = on;
    let storm = 0;
    let flash = 0;
    if (on) {
      const c = game.box.center;
      for (const v of this.views) {
        v.update(dt, time, camPos);
        if (v.zone.type !== 'rain') continue;
        // Oscurece si la caja está en la isla (o muy cerca); relámpagos visibles desde cerca.
        const near = nearArea(v.zone.area, c, 6);
        storm = Math.max(storm, near * (0.55 + 0.45 * v.zone.intensity));
        flash = Math.max(flash, v.flash * (0.4 + 0.6 * near));
      }
    }
    this.storm += (storm - this.storm) * Math.min(1, dt * 1.5);
    this.flash = flash;
    this._applySky();
  }

  _applySky() {
    const b = this._base;
    const s = this.storm;
    const f = this.flash;
    const fog = this.scene.fog;
    fog.color.set(
      lerp(b.fog.r, STORM.fog[0], s) + f * 0.5,
      lerp(b.fog.g, STORM.fog[1], s) + f * 0.5,
      lerp(b.fog.b, STORM.fog[2], s) + f * 0.55,
    );
    fog.start = lerp(b.fogStart, 22, s);
    fog.end = lerp(b.fogEnd, 85, s);
    const amb = lerp(1, STORM.ambient, s) + f * 1.2;
    this.scene.ambientLight.set(b.ambient.r * amb, b.ambient.g * amb, b.ambient.b * amb);
    if (this.sun?.light) this.sun.light.intensity = b.sun * lerp(1, STORM.light, s) + f * 1.5;
  }
}

// -------------------------------------------------------------------- lluvia

class RainView {
  constructor(P, zone, particles, parent) {
    this.P = P;
    this.zone = zone;
    this.particles = particles;
    this.flash = 0;
    this._wasPhase = zone.phase;
    const a = zone.area;
    this.cx = (a.min.x + a.max.x) / 2;
    this.cz = (a.min.z + a.max.z) / 2;
    this.w = a.max.x - a.min.x;
    this.d = a.max.z - a.min.z;
    this.floor = zone.floorY;
    const rng = makeRng(hash(zone.id));
    this.root = P.group(`lluvia-${zone.id}`, parent);

    // Nube de tormenta: racimo de esferas, alta (no tapa a los jugadores; se ve al acercarse).
    this.cloudMat = P.gfx.dynamic('#9aa5b1', { gloss: 0 });
    this.cloud = P.group('nube', this.root, [this.cx, this.floor + 12, this.cz]);
    const puffs = 14;
    for (let i = 0; i < puffs; i++) {
      const s = rng.range(2.6, 4.2);
      P.ball(this.cloud, this.cloudMat, [rng.range(-this.w / 2, this.w / 2), rng.range(-0.5, 0.8), rng.range(-this.d / 2, this.d / 2)], [s * 1.3, s * 0.75, s], { shadows: false });
    }

    // Charcos que crecen con la lluvia.
    const puddleMat = P.mat('#3d7aa0', { opacity: 0.35, gloss: 0.95 });
    this.puddles = [];
    for (let i = 0; i < 6; i++) {
      const p = [this.cx + rng.range(-this.w * 0.4, this.w * 0.4), this.floor + 0.012, this.cz + rng.range(-this.d * 0.42, this.d * 0.42)];
      if (zone.sheltered({ x: p[0], z: p[2] })) continue;
      const r = rng.range(0.5, 1.1);
      this.puddles.push({ e: P.disc(this.root, puddleMat, p, r, 0.01, { shadows: false, name: 'charco' }), r, k: rng.range(0.7, 1.3) });
    }

    // Techitos de lona a rayas.
    this.shelterViews = [];
    for (const s of zone.shelters) this._shelter(s);

    // Gotas: cápsulas finas que caen; salpicaduras: anillos que se abren.
    const dropMat = P.mat('#d6ecff', { opacity: 0.55, unlit: true });
    this.drops = [];
    for (let i = 0; i < 220; i++) {
      const e = P.limb(this.root, dropMat, [0, -0.22, 0], [0, 0.22, 0], 0.016, { shadows: false, name: 'gota' });
      const drop = { e, x: 0, y: 0, z: 0, v: rng.range(13, 17), rng };
      this._respawn(drop, rng.range(0, 9));
      this.drops.push(drop);
    }
    const ringMat = P.mat('#e6f5ff', { opacity: 0.6, unlit: true });
    this.rings = [];
    for (let i = 0; i < 28; i++) {
      const e = P.ring(this.root, ringMat, [0, 0, 0], 0.5, 0.06, { shadows: false, name: 'salpicadura' });
      e.enabled = false;
      this.rings.push({ e, t: 1 });
    }
    this._ring = 0;
    this._rng = rng;
  }

  /** Carpa de lona a rayas sobre 4 postes + piso seco debajo. Se vuelve transparente si cubre la caja. */
  _shelter(s) {
    const P = this.P;
    const g = P.group('carpa', this.root, [s.x, this.floor, s.z]);
    const post = P.mat('#8b5a2b', { gloss: 0.2 });
    const h = 2.3;
    // Piso seco (más claro) para que se lea dónde cubre.
    P.gfx.prim('box', P.gfx.solid('wood', { mul: 1.18 }), { parent: g, pos: [0, 0.008, 0], scale: [s.w, 0.012, s.d], shadows: false, name: 'piso-seco' });
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      P.limb(g, post, [(px * s.w) / 2 * 0.95, 0, (pz * s.d) / 2 * 0.95], [(px * s.w) / 2 * 0.95, h, (pz * s.d) / 2 * 0.95], 0.05);
    }
    // Lona a dos aguas, a rayas rojas y blancas, con borde festoneado.
    const solid = { red: P.mat('#e8453c', { gloss: 0.3 }), white: P.mat('#fff6e8', { gloss: 0.3 }) };
    const ghost = { red: P.mat('#e8453c', { gloss: 0.3, opacity: 0.28 }), white: P.mat('#fff6e8', { gloss: 0.3, opacity: 0.28 }) };
    const cloth = []; // { e, key } para cambiar a transparente
    const stripes = 7;
    const sw = (s.w + 0.4) / stripes;
    for (const side of [-1, 1]) {
      const half = P.group('lona', g, [0, h + 0.18, (side * s.d) / 4], [side * -14, 0, 0]);
      for (let i = 0; i < stripes; i++) {
        const key = i % 2 ? 'white' : 'red';
        const x = -(s.w + 0.4) / 2 + sw * (i + 0.5);
        cloth.push({ key, e: P.gfx.prim('box', solid[key], { parent: half, pos: [x, 0, 0], scale: [sw, 0.05, s.d / 2 + 0.25] }) });
        cloth.push({ key, e: P.ball(half, solid[key], [x, -0.06, side * (s.d / 4 + 0.13)], [sw * 0.95, 0.16, 0.08]) });
      }
    }
    P.limb(g, post, [-(s.w + 0.4) / 2, h + 0.36, 0], [(s.w + 0.4) / 2, h + 0.36, 0], 0.045);
    this.shelterViews.push({ s, cloth, solid, ghost, see: false });
  }

  _respawn(drop, y = 8 + this._rng?.range(0, 2)) {
    const rng = drop.rng;
    drop.x = this.cx + rng.range(-this.w / 2, this.w / 2);
    drop.z = this.cz + rng.range(-this.d / 2, this.d / 2);
    drop.y = this.floor + y;
    const s = this.zone.shelters.find((sh) => Math.abs(drop.x - sh.x) <= sh.w / 2 + 0.2 && Math.abs(drop.z - sh.z) <= sh.d / 2 + 0.2);
    drop.stop = this.floor + (s ? 2.55 : 0); // cae sobre el techito
  }

  _splash(x, y, z) {
    const r = this.rings[this._ring];
    this._ring = (this._ring + 1) % this.rings.length;
    r.t = 0;
    r.e.enabled = true;
    r.e.setLocalPosition(x, y + 0.02, z);
  }

  update(dt, time, camPos) {
    const z = this.zone;
    const k = z.intensity * z.strength;

    // Relámpago al empezar el aviso (trueno) y de vez en cuando en el aguacero.
    if (z.phase !== this._wasPhase && z.phase === 'warn') this.flash = 1;
    if (z.phase === 'active' && Math.random() < dt * 0.35) this.flash = 1;
    this._wasPhase = z.phase;
    this.flash = Math.max(0, this.flash - dt * 4);

    // Nube: más oscura con la intensidad; se ilumina con el relámpago.
    const dark = 1 - 0.55 * Math.min(1, k + (z.phase === 'warn' ? 0.3 : 0));
    const c = this.cloudMat.diffuse;
    const want = 0.62 * dark + this.flash * 0.5;
    if (Math.abs(c.r - want) > 0.01) {
      this.cloudMat.diffuse = new pc.Color(want * 0.95, want, want * 1.06);
      this.cloudMat.update();
    }
    this.cloud.setLocalPosition(this.cx + Math.sin(time * 0.2) * 0.4, this.floor + 12 + Math.sin(time * 0.5) * 0.15, this.cz);

    // La carpa que cubre la caja se vuelve transparente: se ve a la pareja a salvo debajo.
    for (const sv of this.shelterViews) {
      const see = z.boxShelter === sv.s;
      if (see === sv.see) continue;
      sv.see = see;
      const mats = see ? sv.ghost : sv.solid;
      for (const { e, key } of sv.cloth) for (const mi of e.render.meshInstances) mi.material = mats[key];
    }

    for (const p of this.puddles) {
      const s = p.r * 2 * (0.75 + 0.35 * Math.min(1, k * p.k));
      p.e.setLocalScale(s, 0.01, s);
    }

    // Gotas: cuántas se ven depende de la intensidad.
    const visible = Math.round(this.drops.length * Math.min(1, 0.12 + Math.pow(k, 0.8) * 0.88));
    this.drops.forEach((d, i) => {
      const on = i < visible;
      d.e.enabled = on;
      if (!on) return;
      d.y -= d.v * dt;
      if (d.y <= d.stop) {
        if (Math.random() < 0.35) this._splash(d.x, d.stop, d.z);
        this._respawn(d);
      }
      d.e.setLocalPosition(d.x, d.y, d.z);
      // Pegadas a la cámara se verían gigantes: esconderlas.
      if (camPos) d.e.enabled = Math.hypot(d.x - camPos.x, d.y - camPos.y, d.z - camPos.z) > 4;
    });

    for (const r of this.rings) {
      if (!r.e.enabled) continue;
      r.t += dt * 3;
      if (r.t >= 1) {
        r.e.enabled = false;
        continue;
      }
      const s = 0.15 + r.t * 0.55;
      r.e.setLocalScale(s, 1 - r.t * 0.8, s);
    }
  }
}

// -------------------------------------------------------------------- viento

class WindView {
  constructor(P, zone, particles, parent) {
    this.P = P;
    this.zone = zone;
    this.particles = particles;
    this.flash = 0;
    const a = zone.area;
    this.cx = (a.min.x + a.max.x) / 2;
    this.cz = (a.min.z + a.max.z) / 2;
    this.w = a.max.x - a.min.x;
    this.d = a.max.z - a.min.z;
    this.floor = zone.floorY;
    this.R = Math.max(this.w, this.d) / 2 + 2; // radio en el que circulan rachas y hojas
    const rng = makeRng(hash(zone.id));
    this._rng = rng;
    this.root = P.group(`viento-${zone.id}`, parent);

    // Rachas: trazos blancos largos y translúcidos.
    const streakMat = P.mat('#ffffff', { opacity: 0.32, unlit: true });
    this.streaks = [];
    for (let i = 0; i < 44; i++) {
      const g = P.group('racha', this.root);
      const len = rng.range(0.9, 2.2);
      P.limb(g, streakMat, [-len / 2, 0, 0], [len / 2, 0, 0], rng.range(0.018, 0.035), { shadows: false });
      this.streaks.push({ g, u: rng.range(-this.R, this.R), v: rng.range(-this.R, this.R), y: rng.range(0.3, 3.2), sp: rng.range(0.8, 1.3), ph: rng.range(0, 6) });
    }

    // Hojas que vuelan dando vueltas.
    const leafA = P.mat('#4caf50', { gloss: 0.4 });
    const leafB = P.mat('#8bc34a', { gloss: 0.4 });
    this.leaves = [];
    for (let i = 0; i < 16; i++) {
      const g = P.group('hoja', this.root);
      P.ball(g, i % 2 ? leafA : leafB, [0, 0, 0], [0.22, 0.03, 0.12]);
      P.limb(g, P.mat('#5d4037'), [0.08, 0, 0], [0.16, 0, 0], 0.008, { shadows: false });
      this.leaves.push({ g, u: rng.range(-this.R, this.R), v: rng.range(-this.R, this.R), y: rng.range(0.2, 2.4), sp: rng.range(0.5, 0.9), ph: rng.range(0, 6), spin: rng.range(200, 520) });
    }

    // Pasto que se dobla con el viento.
    const grassA = P.mat('#6dbb4a', { gloss: 0.2 });
    const grassB = P.mat('#4f9a35', { gloss: 0.2 });
    this.tufts = [];
    for (let i = 0; i < 12; i++) {
      const x = this.cx + rng.range(-this.w * 0.44, this.w * 0.44);
      const z = this.cz + rng.range(-this.d * 0.44, this.d * 0.44);
      if (Math.abs(x - this.cx) < 1.6) continue; // el centro libre para caminar
      const g = P.group('pasto', this.root, [x, this.floor, z]);
      for (let j = 0; j < 5; j++) {
        const ang = (j / 5) * Math.PI * 2;
        const h = rng.range(0.3, 0.55);
        P.limb(g, j % 2 ? grassA : grassB, [Math.cos(ang) * 0.06, 0, Math.sin(ang) * 0.06], [Math.cos(ang) * 0.12, h, Math.sin(ang) * 0.12], 0.025);
      }
      this.tufts.push({ g, ph: rng.range(0, 6) });
    }

    // Manga de viento en un poste (borde izquierdo, a mitad de la isla): apunta hacia donde sopla y se infla.
    const pole = P.group('manga-de-viento', this.root, [a.min.x + 0.9, this.floor, this.cz + 1]);
    const white = P.mat('#f5f5f5', { gloss: 0.4 });
    const red = P.mat('#e8453c', { gloss: 0.4 });
    P.limb(pole, white, [0, 0, 0], [0, 3.1, 0], 0.06);
    P.ball(pole, red, [0, 3.18, 0], [0.16, 0.16, 0.16]);
    this.sockYaw = P.group('giro', pole, [0, 3.0, 0]);
    this.sockDroop = P.group('caida', this.sockYaw);
    P.ring(this.sockDroop, P.mat('#9e9e9e', { gloss: 0.8 }), [0.02, 0, 0], 0.17, 0.02, { rot: [0, 0, 90] });
    this.sockSegs = [];
    for (let i = 0; i < 5; i++) {
      const seg = P.group('tramo', i === 0 ? this.sockDroop : this.sockSegs[i - 1].g, [i === 0 ? 0.02 : 0.3, 0, 0]);
      const r = 0.16 - i * 0.022;
      P.limb(seg, i % 2 ? white : red, [0, 0, 0], [0.3, 0, 0], r, { shadows: true });
      this.sockSegs.push({ g: seg });
    }

    // Chevrones en el piso que marcan la dirección durante el aviso.
    const chevMat = P.mat('#ffffff', { opacity: 0.45, unlit: true });
    this.arrow = P.group('flecha', this.root, [this.cx, this.floor + 0.03, this.cz]);
    this.chevrons = [];
    for (let i = 0; i < 3; i++) {
      const c = P.group('chevron', this.arrow, [0, 0, 0]);
      P.limb(c, chevMat, [-0.45, 0, -0.5], [0.2, 0, 0], 0.07, { shadows: false });
      P.limb(c, chevMat, [-0.45, 0, 0.5], [0.2, 0, 0], 0.07, { shadows: false });
      this.chevrons.push(c);
    }
    this.yaw = 0;
  }

  update(dt, time) {
    const z = this.zone;
    const k = z.intensity * z.strength;
    const { x: dx, z: dz } = z.dir;
    // Giro suave hacia la dirección actual (yaw que lleva +X local hacia `dir`).
    const want = Math.atan2(-dz, dx) * DEG;
    this.yaw += angleDeltaDeg(this.yaw, want) * Math.min(1, dt * 4);

    // Rachas: viajan en la dirección del viento dentro del círculo de la isla.
    const showing = Math.round(this.streaks.length * Math.min(1, 0.12 + k * 0.95));
    const speed = 4 + 16 * k;
    const a = (this.yaw * Math.PI) / 180;
    const ux = Math.cos(a);
    const uz = -Math.sin(a);
    this.streaks.forEach((s, i) => {
      const on = i < showing;
      s.g.enabled = on;
      if (!on) return;
      s.u += speed * s.sp * dt;
      if (s.u > this.R) {
        s.u = -this.R;
        s.v = this._rng.range(-this.R, this.R);
      }
      const x = this.cx + ux * s.u - uz * s.v;
      const zz = this.cz + uz * s.u + ux * s.v;
      s.g.setLocalPosition(x, this.floor + s.y + Math.sin(time * 3 + s.ph) * 0.15, zz);
      s.g.setLocalEulerAngles(0, this.yaw, 0);
      s.g.setLocalScale(0.6 + k, 1, 1);
    });

    this.leaves.forEach((l) => {
      l.u += (1.2 + 9 * k) * l.sp * dt;
      if (l.u > this.R) {
        l.u = -this.R;
        l.v = this._rng.range(-this.R, this.R);
      }
      const x = this.cx + ux * l.u - uz * l.v;
      const zz = this.cz + uz * l.u + ux * l.v;
      l.g.setLocalPosition(x, this.floor + l.y + Math.sin(time * 2.2 + l.ph) * (0.3 + 0.5 * k), zz);
      l.g.setLocalEulerAngles(time * l.spin, time * l.spin * 0.6 + l.ph * 50, time * l.spin * 0.3);
    });

    // Pasto: se dobla hacia donde sopla, con temblor.
    for (const t of this.tufts) {
      const bend = (8 + 38 * k) * (0.85 + 0.15 * Math.sin(time * (6 + 10 * k) + t.ph));
      // Doblar alrededor del eje perpendicular al viento.
      t.g.setLocalEulerAngles(bend * dz, 0, -bend * dx);
    }

    // Manga de viento: cuelga en calma, horizontal en la ráfaga, flamea.
    this.sockYaw.setLocalEulerAngles(0, this.yaw, 0);
    const droop = 75 * (1 - Math.min(1, k * 1.15));
    this.sockDroop.setLocalEulerAngles(0, 0, -droop);
    this.sockSegs.forEach((s, i) => s.g.setLocalEulerAngles(0, Math.sin(time * (8 + 10 * k) + i) * (4 + 8 * k), -(i ? droop * 0.08 : 0)));

    // Chevrones: aparecen en el aviso (y en la ráfaga), avanzando en la dirección del viento.
    const showArrow = z.phase === 'warn' || z.phase === 'active';
    this.arrow.enabled = showArrow;
    if (showArrow) {
      this.arrow.setLocalEulerAngles(0, this.yaw, 0);
      const pulse = z.phase === 'warn' ? 0.6 + 0.4 * Math.sin(time * 10) : 1;
      this.chevrons.forEach((c, i) => {
        const u = (((time * 2.5 + i / 3) % 1) - 0.5) * 3;
        c.setLocalPosition(u, 0, 0);
        c.setLocalScale(pulse, 1, pulse);
      });
    }

    // Arena levantada en la ráfaga.
    if (z.phase === 'active' && Math.random() < dt * 14 * k) {
      const x = this.cx + this._rng.range(-this.w / 2, this.w / 2);
      const zz = this.cz + this._rng.range(-this.d / 2, this.d / 2);
      this.particles.emit(x, this.floor + 0.1, zz, dx * 6 * k, 0.8, dz * 6 * k, { color: 'sand', life: 0.8, size: 0.07, gravity: 0.15 });
    }
  }
}

// -------------------------------------------------------------------- utilidades

const lerp = (a, b, t) => a + (b - a) * t;

/** 1 dentro del área (XZ), baja a 0 a `fade` metros del borde. */
function nearArea(a, p, fade) {
  const dx = Math.max(a.min.x - p.x, 0, p.x - a.max.x);
  const dz = Math.max(a.min.z - p.z, 0, p.z - a.max.z);
  return Math.max(0, 1 - Math.hypot(dx, dz) / fade);
}

function angleDeltaDeg(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/** Semilla estable a partir del id de la zona (mismo dibujo en cada partida). */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

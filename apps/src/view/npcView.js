// Dibujo de los NPCs + chorros de agua de medium. Solo LEE game.npcs.
// Modelos hechos con piezas SUAVES de alta resolución (elipsoides, cápsulas, toroides), no con las primitivas
// facetadas: easy = cangrejo · medium = niño con pistola de agua · hard = perro mojado.
// Colores naturales para el cuerpo; el color de dificultad (paleta npcEasy / npcMedium / npcHard) va en el
// cono de visión del piso y, en medium y hard, en un detalle del modelo (camiseta, collar).
// En el piso se ve su cono de visión (rojo cuando vio la caja); encima, un "!" mientras va a atacar.
import * as pc from 'playcanvas';
import { CONFIG } from '../config.js';
import { EYE, Parts } from './parts.js';
import { signCanvas } from './signs.js';

const DEG = 180 / Math.PI;
const ACCENT = { easy: 'npcEasy', medium: 'npcMedium', hard: 'npcHard' };

// Colores del cuerpo (naturales). Se pueden cambiar aquí sin tocar la paleta del juego.
const CRAB = { shell: '#f0643c', shellDark: '#c8432a', belly: '#ffe0b8' };
const KID = { skin: '#f6c79a', cheek: '#ff9c8f', cap: '#2f80ed', shorts: '#3559b8', shoe: '#e84a4a', sole: '#ffffff', hair: '#5a3a22', gun: '#36c26a', nozzle: '#ff8a1f' };
const DOG = { fur: '#c98a4b', furDark: '#8a5a2e', light: '#f3d6aa', nose: '#2b2018', tongue: '#ff7a8a', tag: '#ffd54a' };

export class NpcViews {
  constructor(gfx, service, particles, { theme, biome } = {}) {
    this.gfx = gfx;
    this.service = service;
    this.particles = particles;
    this.theme = theme;
    this.biome = biome;
    this.parts = new Parts(gfx);
    this.root = gfx.group('npcs');
    this._sectors = new Map(); // fov (grados) → malla del cono de visión
    this._markMat = gfx.textured(gfx.textureFromCanvas(signCanvas('!', { style: 'warn', aspect: 0.75 })), { unlit: true });
    this._alertMat = gfx.solid('danger', { opacity: 0.22, unlit: true });
    this.views = service.list.map((npc) => this._build(npc));

    // Pool de gotas para los chorros en el aire.
    const water = gfx.solid('water', { gloss: 0.9, opacity: 0.85 });
    this.shots = [];
    for (let i = 0; i < 16; i++) {
      const e = this.parts.ball(this.root, water, [0, 0, 0], [1, 1, 1], { shadows: false, name: 'chorro' });
      e.enabled = false;
      this.shots.push(e);
    }
  }

  // ------------------------------------------------------------------ piezas

  _build(npc) {
    const g = this.gfx;
    const root = g.group(`npc-${npc.id}`, this.root);
    const body = g.group('body', root);
    const v = { npc, root, body, bob: 0, walk: 0, fov: null, legs: [], markY: npc.T.height + 0.5, particles: this.particles };
    const pack = this.biome === 'village' ? VILLAGE : this.theme === 'desert' ? DESERT : this.theme === 'jungle' ? JUNGLE : BUILDERS;
    pack[npc.difficulty](this.parts, body, g.solid(ACCENT[npc.difficulty], { gloss: 0.5 }), v);

    v.calmMat = g.solid(ACCENT[npc.difficulty], { opacity: 0.16, unlit: true });
    v.visionMi = new pc.MeshInstance(this._sector(npc.T.visionFov), v.calmMat);
    v.vision = new pc.Entity('vision');
    v.vision.addComponent('render', { meshInstances: [v.visionMi], castShadows: false, receiveShadows: false });
    v.vision.setLocalPosition(0, 0.03, 0);
    root.addChild(v.vision);

    v.mark = g.prim('box', this._markMat, { parent: root, scale: [0.3, 0.4, 0.02], shadows: false, name: 'alerta' });
    v.mark.enabled = false;
    return v;
  }

  /** Abanico plano de radio 1 y `fov` grados, abierto hacia +Z (hacia donde mira el NPC). */
  _sector(fov) {
    const key = Math.round(Math.min(360, Math.max(5, fov)));
    if (this._sectors.has(key)) return this._sectors.get(key);
    const seg = Math.max(6, Math.ceil(key / 7.5));
    const half = (key * Math.PI) / 360;
    const positions = [0, 0, 0];
    const normals = [0, 1, 0];
    const indices = [];
    for (let i = 0; i <= seg; i++) {
      const a = -half + (2 * half * i) / seg;
      positions.push(Math.sin(a), 0, Math.cos(a));
      normals.push(0, 1, 0);
      if (i > 0) indices.push(0, i, i + 1); // ángulo creciente = cara hacia arriba
    }
    const mesh = new pc.Mesh(this.gfx.device);
    mesh.setPositions(positions);
    mesh.setNormals(normals);
    mesh.setIndices(indices);
    mesh.update();
    this._sectors.set(key, mesh);
    return mesh;
  }

  // ------------------------------------------------------------------ frame

  update(dt, time, camPos) {
    const on = CONFIG.npcs.enabled;
    for (const v of this.views) {
      v.root.enabled = on;
      if (on) this._updateOne(v, dt, time, camPos);
    }

    const shots = this.service.projectiles;
    this.shots.forEach((e, i) => {
      const s = on ? shots[i] : null;
      e.enabled = !!s;
      if (!s) return;
      // Gota estirada en la dirección del vuelo.
      const r = s.npc.T.shotRadius * 2;
      const sp = Math.hypot(s.vel.x, s.vel.y, s.vel.z) || 1;
      e.setPosition(s.pos.x, s.pos.y, s.pos.z);
      e.lookAt(s.pos.x + s.vel.x / sp, s.pos.y + s.vel.y / sp, s.pos.z + s.vel.z / sp);
      e.setLocalScale(r * 0.85, r * 0.85, r * 1.5);
    });
  }

  _updateOne(v, dt, time, camPos) {
    const n = v.npc;
    const T = n.T;
    v.root.setPosition(n.pos.x, n.pos.y, n.pos.z);
    v.root.setEulerAngles(0, n.facing * DEG, 0);

    // Paso: rebote y ciclo de patas según la velocidad real.
    const speed = Math.hypot(n.vel.x, n.vel.z);
    const moving = Math.min(1, speed / 2.5);
    if (speed > 0.2) v.walk += dt * (5 + speed * 3.2);
    const bobY = Math.abs(Math.sin(v.walk)) * moving * 0.05;
    for (const leg of v.legs) {
      const swing = Math.sin(v.walk + leg.phase) * leg.amp * moving;
      leg.g.setLocalEulerAngles(leg.axis === 'x' ? swing : 0, leg.axis === 'y' ? swing : 0, leg.axis === 'z' ? swing : 0);
    }

    // Aviso: se agacha y tiembla. Embestida: se estira. Aturdido: se tambalea.
    let sx = 1;
    let sy = 1;
    let sz = 1;
    let roll = 0;
    if (n.windup > 0) {
      sy = 1 - 0.18 * n.windup;
      sx = sz = 1 + 0.08 * n.windup;
      roll = Math.sin(time * 40) * 5 * n.windup;
    }
    if (n.phase === 'dash') {
      sz = 1.25;
      sy = 0.9;
    }
    if (n.state === 'stunned') roll = Math.sin(time * 14) * 18;
    v.body.setLocalPosition(0, bobY, 0);
    v.body.setLocalEulerAngles(0, 0, roll);
    v.body.setLocalScale(sx, sy, sz);
    v.animate?.(v, dt, time, speed);

    // Cono de visión (sigue los valores del panel de debug).
    if (v.fov !== Math.round(T.visionFov)) {
      v.fov = Math.round(T.visionFov);
      v.visionMi.mesh = this._sector(T.visionFov);
    }
    v.vision.setLocalScale(T.visionRange, 1, T.visionRange);
    const angry = n.state === 'alert' || n.state === 'attack';
    const mat = angry ? this._alertMat : v.calmMat;
    if (v.visionMi.material !== mat) v.visionMi.material = mat;

    v.mark.enabled = angry;
    if (angry) {
      const pulse = 1 + 0.25 * n.windup + 0.08 * Math.sin(time * 12);
      v.mark.setLocalPosition(0, v.markY + Math.sin(time * 6) * 0.04, 0);
      v.mark.setEulerAngles(0, Math.atan2(camPos.x - n.pos.x, camPos.z - n.pos.z) * DEG, 0);
      v.mark.setLocalScale(0.3 * pulse, 0.4 * pulse, 0.02);
    }
  }
}

// -------------------------------------------------------------------- modelos (frente = +Z local, pies en y = 0)

const BUILDERS = {
  /** Cangrejo: caparazón coral, panza crema, ojos en palitos, pinzas que se abren, 6 patas articuladas. */
  easy(P, body, _accent, v) { // el color de dificultad del cangrejo va solo en su cono
    const shell = P.mat(CRAB.shell, { gloss: 0.55 });
    const dark = P.mat(CRAB.shellDark, { gloss: 0.5 });
    const belly = P.mat(CRAB.belly, { gloss: 0.3 });
    const pupil = P.mat(EYE.pupil);

    P.ball(body, belly, [0, 0.2, 0.02], [0.8, 0.22, 0.6], { name: 'panza' });
    P.ball(body, shell, [0, 0.29, 0], [0.88, 0.36, 0.66], { name: 'caparazon' });
    P.ball(body, shell, [0, 0.37, -0.04], [0.62, 0.18, 0.46]);
    for (const [x, z, s] of [[-0.18, -0.06, 0.12], [0.16, -0.1, 0.1], [0.02, -0.2, 0.08], [0.22, 0.08, 0.07]]) {
      P.ball(body, dark, [x, 0.455, z], [s, 0.03, s], { shadows: false });
    }
    P.smile(body, pupil, [0, 0.27, 0.33], 0.12, 0.012);

    // Ojos en palitos (se mueven un poco al caminar).
    v.eyes = [];
    for (const s of [-1, 1]) {
      const stalk = P.group('palito', body, [s * 0.12, 0.4, 0.2]);
      P.limb(stalk, shell, [0, 0, 0], [s * 0.02, 0.16, 0.02], 0.028);
      P.eye(stalk, [s * 0.02, 0.21, 0.04], 0.12, 0.45);
      v.eyes.push(stalk);
    }

    // Brazos + pinzas. La mitad de arriba de la pinza se abre y cierra.
    v.claws = [];
    for (const s of [-1, 1]) {
      const arm = P.group('brazo', body, [s * 0.34, 0.27, 0.16]);
      P.limb(arm, shell, [0, 0, 0], [s * 0.14, 0.04, 0.12], 0.05);
      P.limb(arm, shell, [s * 0.14, 0.04, 0.12], [s * 0.2, 0.06, 0.26], 0.045);
      const claw = P.group('pinza', arm, [s * 0.22, 0.07, 0.34]);
      P.ball(claw, shell, [0, -0.02, 0.02], [0.2, 0.13, 0.26], { name: 'pinza-baja' });
      const top = P.group('pinza-alta', claw, [0, 0.03, -0.08]);
      P.ball(top, shell, [0, 0.03, 0.1], [0.15, 0.08, 0.22]);
      v.claws.push(top);
    }

    // 6 patas de dos segmentos (cadera → rodilla arriba → pie en el suelo).
    for (const s of [-1, 1]) {
      [-0.17, 0, 0.15].forEach((z, i) => {
        const hip = P.group('pata', body, [s * 0.36, 0.22, z]);
        P.limb(hip, shell, [0, 0, 0], [s * 0.16, 0.09, 0], 0.035);
        P.limb(hip, dark, [s * 0.16, 0.09, 0], [s * 0.27, -0.2, z * 0.3], 0.03);
        v.legs.push({ g: hip, axis: 'y', amp: 22, phase: i * 2.1 + (s > 0 ? Math.PI : 0) });
      });
    }
    v.markY = 0.95;

    v.animate = (vv, dt, time) => {
      const attacking = vv.npc.state === 'attack';
      const speed = attacking ? 22 : 4;
      vv.claws.forEach((c, i) => c.setLocalEulerAngles(-(attacking ? 30 : 12) * (0.5 + 0.5 * Math.sin(time * speed + i * Math.PI)), 0, 0));
      vv.eyes.forEach((e, i) => e.setLocalEulerAngles(Math.sin(time * 3 + i) * 6, 0, Math.sin(time * 2.3 + i * 2) * 8));
    };
  },

  /** Niño chibi con gorra y pistola de agua de juguete (tanque transparente que se bombea en el aviso). */
  medium(P, body, shirt, v) {
    const skin = P.mat(KID.skin, { gloss: 0.3 });
    const cap = P.mat(KID.cap, { gloss: 0.4 });
    const pupil = P.mat(EYE.pupil);

    // Piernas (giran desde la cadera) + zapatillas.
    [-1, 1].forEach((s) => {
      const hip = P.group('pierna', body, [s * 0.085, 0.33, 0]);
      P.limb(hip, skin, [0, 0, 0], [0, -0.24, 0], 0.052);
      P.ball(hip, P.mat(KID.shoe, { gloss: 0.5 }), [0, -0.27, 0.035], [0.13, 0.09, 0.21], { name: 'zapatilla' });
      P.ball(hip, P.mat(KID.sole), [0, -0.305, 0.035], [0.135, 0.03, 0.215], { shadows: false });
      v.legs.push({ g: hip, axis: 'x', amp: 32, phase: s > 0 ? Math.PI : 0 });
    });

    P.ball(body, P.mat(KID.shorts, { gloss: 0.3 }), [0, 0.36, 0], [0.3, 0.18, 0.24], { name: 'short' });
    P.ball(body, shirt, [0, 0.54, 0], [0.33, 0.38, 0.27], { name: 'camiseta' });
    P.ball(body, P.mat('#ffffff', { gloss: 0.3 }), [0, 0.6, 0.12], [0.12, 0.1, 0.05], { shadows: false, name: 'estrella' });

    // Cabeza grande (chibi).
    const head = P.group('cabeza', body, [0, 0.93, 0]);
    v.head = head;
    P.ball(head, skin, [0, 0, 0], [0.44, 0.42, 0.42]);
    for (const s of [-1, 1]) P.ball(head, skin, [s * 0.215, -0.01, 0], [0.08, 0.1, 0.06]);
    P.ball(head, P.mat(KID.hair, { gloss: 0.3 }), [0, 0.01, -0.07], [0.45, 0.36, 0.34]);
    P.eye(head, [-0.08, 0.02, 0.18], 0.095, 0.5);
    P.eye(head, [0.08, 0.02, 0.18], 0.095, 0.5);
    for (const s of [-1, 1]) P.ball(head, P.mat(KID.cheek, { gloss: 0.2 }), [s * 0.13, -0.06, 0.17], [0.07, 0.04, 0.02], { shadows: false });
    P.smile(head, pupil, [0, -0.08, 0.2], 0.08, 0.011);
    // Gorra: domo + visera.
    P.ball(head, cap, [0, 0.11, -0.01], [0.47, 0.3, 0.46], { name: 'gorra' });
    P.ball(head, cap, [0, 0.07, 0.2], [0.3, 0.035, 0.22], { rot: [-8, 0, 0], name: 'visera' });
    P.ball(head, shirt, [0, 0.255, -0.01], [0.06, 0.04, 0.06], { shadows: false });

    // Pistola de agua: cuerpo, tanque transparente, boquilla, manija y bomba.
    const gun = P.group('pistola', body, [0.03, 0.56, 0.27]);
    const green = P.mat(KID.gun, { gloss: 0.6 });
    P.limb(gun, green, [0, 0, -0.1], [0, 0, 0.16], 0.05);
    P.ball(gun, P.mat('#7fd6ff', { opacity: 0.7, gloss: 0.95 }), [0, 0.08, -0.03], [0.15, 0.13, 0.17], { shadows: false, name: 'tanque' });
    P.limb(gun, P.mat(KID.nozzle, { gloss: 0.5 }), [0, 0, 0.16], [0, 0, 0.23], 0.025);
    P.limb(gun, green, [0, 0, -0.06], [0, -0.1, -0.09], 0.03);
    v.pump = P.group('bomba', gun, [0, -0.045, 0.06]);
    P.limb(v.pump, P.mat(KID.nozzle, { gloss: 0.5 }), [0, 0, -0.04], [0, 0, 0.05], 0.03);

    // Brazos sosteniendo la pistola.
    for (const s of [-1, 1]) {
      P.limb(body, skin, [s * 0.16, 0.66, 0], [s * 0.07 + 0.03, 0.56, 0.2], 0.042);
      P.ball(body, skin, [s * 0.06 + 0.03, 0.55, 0.22], [0.075, 0.075, 0.075]);
    }
    v.markY = 1.55;

    v.animate = (vv, dt, time) => {
      const n = vv.npc;
      vv.pump.setLocalPosition(0, -0.045, 0.06 - Math.abs(Math.sin(time * 18)) * 0.06 * n.windup);
      vv.head.setLocalEulerAngles(n.windup > 0 ? -6 : Math.sin(time * 1.7) * 5, n.state === 'idle' ? Math.sin(time * 1.3) * 20 : 0, 0);
    };
  },

  /** Perro mojado: pelo dorado brillante, orejas caídas, lengua afuera, collar del color de dificultad, cola. */
  hard(P, body, collar, v) {
    const fur = P.mat(DOG.fur, { gloss: 0.6 }); // mojado = brilla
    const furDark = P.mat(DOG.furDark, { gloss: 0.55 });
    const light = P.mat(DOG.light, { gloss: 0.45 });
    const nose = P.mat(DOG.nose, { gloss: 0.95 });

    // Patas (cadera → pata) con patitas claras. Trote en diagonal.
    for (const [x, z, phase] of [[-0.13, 0.2, 0], [0.13, 0.2, Math.PI], [-0.13, -0.3, Math.PI], [0.13, -0.3, 0]]) {
      const hip = P.group('pata', body, [x, 0.42, z]);
      P.limb(hip, fur, [0, 0, 0], [0, -0.32, 0.02], 0.068);
      P.ball(hip, light, [0, -0.36, 0.05], [0.14, 0.08, 0.18], { name: 'patita' });
      v.legs.push({ g: hip, axis: 'x', amp: 30, phase });
    }

    // Cuerpo: cápsula larga + pecho y panza claros.
    P.limb(body, fur, [0, 0.52, -0.32], [0, 0.52, 0.2], 0.22, { name: 'cuerpo' });
    P.ball(body, light, [0, 0.46, 0.2], [0.36, 0.38, 0.3], { name: 'pecho' });
    P.ball(body, light, [0, 0.38, -0.06], [0.3, 0.16, 0.52], { name: 'panza' });
    P.limb(body, fur, [0, 0.58, 0.24], [0, 0.74, 0.38], 0.13, { name: 'cuello' });

    // Collar (color de dificultad) + placa dorada.
    P.ring(body, collar, [0, 0.66, 0.31], 0.14, 0.03, { rot: [41, 0, 0], name: 'collar' }); // perpendicular al cuello
    P.disc(body, P.mat(DOG.tag, { gloss: 0.95 }), [0, 0.57, 0.44], 0.045, 0.015, { rot: [70, 0, 0], name: 'placa' });

    // Cabeza.
    const head = P.group('cabeza', body, [0, 0.82, 0.44]);
    v.head = head;
    P.ball(head, fur, [0, 0, 0], [0.4, 0.36, 0.38]);
    P.ball(head, light, [0, -0.07, 0.18], [0.22, 0.16, 0.26], { name: 'hocico' });
    P.ball(head, nose, [0, -0.02, 0.31], [0.09, 0.065, 0.06], { name: 'nariz' });
    v.tongue = P.ball(head, P.mat(DOG.tongue, { gloss: 0.7 }), [0.02, -0.15, 0.24], [0.08, 0.025, 0.12], { name: 'lengua' });
    P.eye(head, [-0.085, 0.06, 0.15], 0.085, 0.55);
    P.eye(head, [0.085, 0.06, 0.15], 0.085, 0.55);
    // Cejas: se fruncen cuando los ve.
    v.brows = [-1, 1].map((s) => {
      const g = P.group('ceja', head, [s * 0.09, 0.125, 0.165]);
      P.limb(g, furDark, [-0.035, 0, 0], [0.035, 0, 0], 0.012);
      return { g, s };
    });
    // Mechones mojados en la cabeza.
    for (const [x, z, s] of [[0, -0.02, 0.09], [-0.06, -0.06, 0.07], [0.06, -0.05, 0.075]]) P.ball(head, fur, [x, 0.17, z], [s, s * 1.3, s]);
    // Orejas caídas.
    v.ears = [-1, 1].map((s) => {
      const g = P.group('oreja', head, [s * 0.16, 0.1, -0.02]);
      P.ball(g, furDark, [s * 0.04, -0.12, 0], [0.09, 0.24, 0.13], { rot: [0, 0, s * 15] });
      return { g, s };
    });

    // Cola (se mueve sola, más rápido cuando ataca).
    v.tail = P.group('cola', body, [0, 0.6, -0.5]);
    P.limb(v.tail, fur, [0, 0, 0], [0, 0.17, -0.15], 0.045);
    P.ball(v.tail, light, [0, 0.19, -0.17], [0.09, 0.09, 0.09]);
    v.markY = 1.45;

    v.animate = (vv, dt, time, speed) => {
      const n = vv.npc;
      const angry = n.state === 'alert' || n.state === 'attack';
      vv.tail.setLocalEulerAngles(0, Math.sin(time * (angry ? 22 : 9)) * 35, 0);
      const flap = Math.sin(vv.walk * 2) * Math.min(1, speed / 3) * 18;
      vv.ears.forEach(({ g, s }) => g.setLocalEulerAngles(flap, 0, s * (angry ? -10 : 0)));
      vv.brows.forEach(({ g, s }) => g.setLocalEulerAngles(0, 0, angry ? s * -22 : 0));
      vv.tongue.enabled = speed > 1 || n.phase === 'dash';
      vv.head.setLocalEulerAngles(n.windup > 0 ? 12 * n.windup : Math.sin(time * 2) * 3, 0, 0);
      // Gotea (está mojado): más cuando corre.
      if (Math.random() < dt * (3 + speed * 2)) {
        vv.particles?.emit(n.pos.x + (Math.random() - 0.5) * 0.4, n.pos.y + 0.35, n.pos.z + (Math.random() - 0.5) * 0.5, 0, -0.5, 0, {
          color: 'water',
          life: 0.5,
          size: 0.06,
        });
      }
    };
  },
};

const IGUANA = { hide: '#4a7a3a', dark: '#2f4a28', belly: '#c4d48a', dew: '#c8453c' };
const APE = { fur: '#6b3f24', face: '#d4a574', fruit: '#6aa84f' };
const CAT = { fur: '#d4a034', dark: '#3a2a18', belly: '#f0d8a0', spot: '#2a2018' };

/** Misma conducta, otra pinta: iguana / mono / jaguar. */
const JUNGLE = {
  easy(P, body, _accent, v) {
    const hide = P.mat(IGUANA.hide, { gloss: 0.4 });
    const dark = P.mat(IGUANA.dark, { gloss: 0.35 });
    P.limb(body, hide, [0, 0.16, -0.28], [0, 0.2, 0.28], 0.11, { name: 'cuerpo' });
    P.ball(body, P.mat(IGUANA.belly), [0, 0.12, 0.02], [0.22, 0.1, 0.42], { name: 'panza' });
    P.ball(body, hide, [0, 0.24, 0.34], [0.2, 0.16, 0.22], { name: 'cabeza' });
    P.ball(body, P.mat(IGUANA.dew), [0, 0.12, 0.4], [0.04, 0.12, 0.08], { name: 'papada' });
    P.eye(body, [-0.06, 0.3, 0.42], 0.055, 0.5);
    P.eye(body, [0.06, 0.3, 0.42], 0.055, 0.5);
    P.limb(body, dark, [0, 0.16, -0.3], [0, 0.1, -0.7], 0.04, { name: 'cola' });
    for (const [x, z, phase] of [[-0.1, 0.18, 0], [0.1, 0.18, Math.PI], [-0.1, -0.16, Math.PI], [0.1, -0.16, 0]]) {
      const hip = P.group('pata', body, [x, 0.16, z]);
      P.limb(hip, hide, [0, 0, 0], [x * 0.8, -0.14, 0], 0.03);
      v.legs.push({ g: hip, axis: 'x', amp: 24, phase });
    }
    v.markY = 0.7;
    v.animate = (vv, _dt, time) => {
      const wiggle = Math.sin(time * (vv.npc.state === 'attack' ? 18 : 4)) * 8;
      vv.body.setLocalEulerAngles(0, wiggle, 0);
    };
  },

  medium(P, body, shirt, v) {
    const fur = P.mat(APE.fur, { gloss: 0.3 });
    const face = P.mat(APE.face, { gloss: 0.25 });
    [-1, 1].forEach((s) => {
      const hip = P.group('pierna', body, [s * 0.1, 0.38, 0]);
      P.limb(hip, fur, [0, 0, 0], [0, -0.3, 0.04], 0.055);
      P.ball(hip, fur, [0, -0.32, 0.06], [0.1, 0.07, 0.12]);
      v.legs.push({ g: hip, axis: 'x', amp: 28, phase: s > 0 ? Math.PI : 0 });
    });
    P.ball(body, fur, [0, 0.55, 0], [0.34, 0.4, 0.26], { name: 'torso' });
    P.ball(body, shirt, [0, 0.58, 0.1], [0.16, 0.12, 0.06], { shadows: false, name: 'pecho' });
    const head = P.group('cabeza', body, [0, 0.88, 0.02]);
    v.head = head;
    P.ball(head, fur, [0, 0.04, -0.02], [0.34, 0.32, 0.3]);
    P.ball(head, face, [0, -0.02, 0.12], [0.2, 0.18, 0.14], { name: 'cara' });
    P.eye(head, [-0.06, 0.04, 0.16], 0.07, 0.5);
    P.eye(head, [0.06, 0.04, 0.16], 0.07, 0.5);
    P.limb(body, fur, [0, 0.48, -0.12], [0.22, 0.7, -0.28], 0.03, { name: 'cola' });
    const fruit = P.group('coco', body, [0.12, 0.52, 0.22]);
    P.ball(fruit, P.mat(APE.fruit, { gloss: 0.5 }), [0, 0, 0], [0.14, 0.14, 0.14], { name: 'fruta' });
    v.pump = fruit;
    for (const s of [-1, 1]) P.limb(body, fur, [s * 0.16, 0.68, 0], [0.1, 0.52, 0.18], 0.04);
    v.markY = 1.4;
    v.animate = (vv, _dt, time) => {
      const n = vv.npc;
      vv.pump.setLocalPosition(0.12, 0.52 + Math.abs(Math.sin(time * 16)) * 0.08 * n.windup, 0.22);
      vv.head.setLocalEulerAngles(n.windup > 0 ? -8 : Math.sin(time * 2) * 6, n.state === 'idle' ? Math.sin(time * 1.2) * 18 : 0, 0);
    };
  },

  hard(P, body, collar, v) {
    const fur = P.mat(CAT.fur, { gloss: 0.45 });
    const dark = P.mat(CAT.dark, { gloss: 0.35 });
    const belly = P.mat(CAT.belly, { gloss: 0.3 });
    for (const [x, z, phase] of [[-0.12, 0.22, 0], [0.12, 0.22, Math.PI], [-0.12, -0.28, Math.PI], [0.12, -0.28, 0]]) {
      const hip = P.group('pata', body, [x, 0.4, z]);
      P.limb(hip, fur, [0, 0, 0], [0, -0.3, 0.02], 0.06);
      P.ball(hip, dark, [0, -0.34, 0.04], [0.12, 0.07, 0.14]);
      v.legs.push({ g: hip, axis: 'x', amp: 30, phase });
    }
    P.limb(body, fur, [0, 0.48, -0.3], [0, 0.5, 0.22], 0.2, { name: 'cuerpo' });
    P.ball(body, belly, [0, 0.4, 0], [0.28, 0.16, 0.5], { name: 'panza' });
    for (const [x, z] of [[-0.08, 0.1], [0.1, -0.05], [-0.05, -0.2], [0.08, 0.22]]) {
      P.ball(body, P.mat(CAT.spot), [x, 0.62, z], [0.08, 0.04, 0.08], { shadows: false, name: 'pinta' });
    }
    P.ring(body, collar, [0, 0.62, 0.28], 0.13, 0.025, { rot: [40, 0, 0], name: 'collar' });
    const head = P.group('cabeza', body, [0, 0.72, 0.4]);
    v.head = head;
    P.ball(head, fur, [0, 0, 0], [0.32, 0.28, 0.3]);
    P.ball(head, belly, [0, -0.04, 0.14], [0.16, 0.12, 0.16], { name: 'hocico' });
    P.ball(head, dark, [0, -0.01, 0.24], [0.07, 0.05, 0.05], { name: 'nariz' });
    P.eye(head, [-0.07, 0.05, 0.12], 0.07, 0.55);
    P.eye(head, [0.07, 0.05, 0.12], 0.07, 0.55);
    v.ears = [-1, 1].map((s) => {
      const e = P.group('oreja', head, [s * 0.12, 0.14, -0.02]);
      P.ball(e, dark, [0, 0.06, 0], [0.07, 0.12, 0.05]);
      return { g: e, s };
    });
    v.tail = P.group('cola', body, [0, 0.52, -0.48]);
    P.limb(v.tail, fur, [0, 0, 0], [0, 0.12, -0.28], 0.04);
    v.markY = 1.25;
    v.animate = (vv, _dt, time) => {
      const n = vv.npc;
      const angry = n.state === 'alert' || n.state === 'attack';
      vv.tail.setLocalEulerAngles(0, Math.sin(time * (angry ? 20 : 8)) * 28, 0);
      vv.ears.forEach(({ g, s }) => g.setLocalEulerAngles(angry ? -12 : 0, 0, s * (angry ? 8 : 0)));
      vv.head.setLocalEulerAngles(n.windup > 0 ? 10 * n.windup : Math.sin(time * 2) * 3, 0, 0);
    };
  },
};

const VILL = { skin: '#e0a070', cloth: '#c45c2a', hat: '#c9a24a', hair: '#3a2418' };

/** Gente del pueblo: niño bajo (se salta) y aldeano con calabaza de agua. */
const VILLAGE = {
  easy(P, body, shirt, v) {
    const skin = P.mat(VILL.skin, { gloss: 0.25 });
    [-1, 1].forEach((s) => {
      const hip = P.group('pierna', body, [s * 0.07, 0.2, 0]);
      P.limb(hip, skin, [0, 0, 0], [0, -0.16, 0], 0.04);
      P.ball(hip, P.mat(VILL.cloth), [0, -0.18, 0.03], [0.09, 0.06, 0.12]);
      v.legs.push({ g: hip, axis: 'x', amp: 26, phase: s > 0 ? Math.PI : 0 });
    });
    P.ball(body, P.mat(VILL.cloth, { gloss: 0.3 }), [0, 0.28, 0], [0.26, 0.22, 0.2], { name: 'tunic' });
    P.ball(body, shirt, [0, 0.3, 0.08], [0.1, 0.08, 0.04], { shadows: false });
    const head = P.group('cabeza', body, [0, 0.48, 0]);
    v.head = head;
    P.ball(head, skin, [0, 0, 0], [0.28, 0.26, 0.26]);
    P.ball(head, P.mat(VILL.hair), [0, 0.06, -0.04], [0.28, 0.14, 0.22]);
    P.eye(head, [-0.06, 0.02, 0.11], 0.06, 0.5);
    P.eye(head, [0.06, 0.02, 0.11], 0.06, 0.5);
    P.ball(head, P.mat(VILL.hat, { gloss: 0.2 }), [0, 0.12, 0], [0.34, 0.08, 0.34], { name: 'sombrero' });
    v.markY = 0.75;
    v.animate = (vv, _dt, time) => {
      vv.head.setLocalEulerAngles(Math.sin(time * 2) * 6, vv.npc.state === 'idle' ? Math.sin(time * 1.4) * 16 : 0, 0);
    };
  },

  medium(P, body, shirt, v) {
    const skin = P.mat(VILL.skin, { gloss: 0.25 });
    [-1, 1].forEach((s) => {
      const hip = P.group('pierna', body, [s * 0.09, 0.36, 0]);
      P.limb(hip, skin, [0, 0, 0], [0, -0.28, 0], 0.05);
      P.ball(hip, P.mat('#5a3a18'), [0, -0.3, 0.04], [0.11, 0.07, 0.14]);
      v.legs.push({ g: hip, axis: 'x', amp: 30, phase: s > 0 ? Math.PI : 0 });
    });
    P.ball(body, P.mat(VILL.cloth, { gloss: 0.3 }), [0, 0.52, 0], [0.32, 0.36, 0.24], { name: 'tunic' });
    P.ball(body, shirt, [0, 0.58, 0.1], [0.12, 0.1, 0.05], { shadows: false });
    const head = P.group('cabeza', body, [0, 0.86, 0]);
    v.head = head;
    P.ball(head, skin, [0, 0, 0], [0.34, 0.32, 0.32]);
    P.ball(head, P.mat(VILL.hair), [0, 0.04, -0.06], [0.34, 0.16, 0.26]);
    P.eye(head, [-0.07, 0.02, 0.14], 0.07, 0.5);
    P.eye(head, [0.07, 0.02, 0.14], 0.07, 0.5);
    P.ball(head, P.mat(VILL.hat), [0, 0.14, 0], [0.4, 0.08, 0.4]);
    const gourd = P.group('calabaza', body, [0.14, 0.5, 0.22]);
    P.ball(gourd, P.mat('#6aa84f', { gloss: 0.45 }), [0, 0, 0], [0.16, 0.16, 0.16]);
    v.pump = gourd;
    for (const s of [-1, 1]) P.limb(body, skin, [s * 0.16, 0.66, 0], [0.1, 0.5, 0.18], 0.04);
    v.markY = 1.35;
    v.animate = (vv, _dt, time) => {
      const n = vv.npc;
      vv.pump.setLocalPosition(0.14, 0.5 + Math.abs(Math.sin(time * 16)) * 0.08 * n.windup, 0.22);
      vv.head.setLocalEulerAngles(n.windup > 0 ? -8 : Math.sin(time * 1.8) * 5, n.state === 'idle' ? Math.sin(time * 1.2) * 18 : 0, 0);
    };
  },

  hard: JUNGLE.hard,
};

const MINER = { skin: '#e0a070', cloth: '#c47a3a', hat: '#6b3a22', hair: '#3a2418', canteen: '#3a7ca5' };
const COYOTE = { fur: '#c4a574', dark: '#5a4030', belly: '#efe0c4', ear: '#8a6848' };

/** Mineros del desierto y el coyote. Misma conducta, otra pinta, animada en PlayCanvas. */
const DESERT = {
  easy(P, body, shirt, v) {
    const skin = P.mat(MINER.skin, { gloss: 0.25 });
    [-1, 1].forEach((s) => {
      const hip = P.group('pierna', body, [s * 0.07, 0.2, 0]);
      P.limb(hip, skin, [0, 0, 0], [0, -0.16, 0], 0.04);
      P.ball(hip, P.mat('#5a3a18'), [0, -0.18, 0.03], [0.09, 0.06, 0.12]);
      v.legs.push({ g: hip, axis: 'x', amp: 26, phase: s > 0 ? Math.PI : 0 });
    });
    P.ball(body, P.mat(MINER.cloth, { gloss: 0.3 }), [0, 0.28, 0], [0.26, 0.22, 0.2], { name: 'camisa' });
    P.ball(body, shirt, [0, 0.3, 0.08], [0.1, 0.08, 0.04], { shadows: false });
    const head = P.group('cabeza', body, [0, 0.48, 0]);
    v.head = head;
    P.ball(head, skin, [0, 0, 0], [0.28, 0.26, 0.26]);
    P.ball(head, P.mat(MINER.hair), [0, 0.04, -0.04], [0.26, 0.12, 0.2]);
    P.eye(head, [-0.06, 0.02, 0.11], 0.06, 0.5);
    P.eye(head, [0.06, 0.02, 0.11], 0.06, 0.5);
    P.ball(head, P.mat(MINER.hat, { gloss: 0.2 }), [0, 0.16, 0.02], [0.36, 0.06, 0.36], { name: 'ala' });
    P.ball(head, P.mat(MINER.hat), [0, 0.22, 0], [0.2, 0.12, 0.2], { name: 'copa' });
    v.markY = 0.85;
    v.animate = (vv, _dt, time) => {
      vv.head.setLocalEulerAngles(Math.sin(time * 2) * 6, vv.npc.state === 'idle' ? Math.sin(time * 1.4) * 16 : 0, 0);
    };
  },

  medium(P, body, shirt, v) {
    const skin = P.mat(MINER.skin, { gloss: 0.25 });
    [-1, 1].forEach((s) => {
      const hip = P.group('pierna', body, [s * 0.09, 0.36, 0]);
      P.limb(hip, skin, [0, 0, 0], [0, -0.28, 0], 0.05);
      P.ball(hip, P.mat('#5a3a18'), [0, -0.3, 0.04], [0.11, 0.07, 0.14]);
      v.legs.push({ g: hip, axis: 'x', amp: 30, phase: s > 0 ? Math.PI : 0 });
    });
    P.ball(body, P.mat(MINER.cloth, { gloss: 0.3 }), [0, 0.52, 0], [0.32, 0.36, 0.24], { name: 'camisa' });
    P.ball(body, shirt, [0, 0.58, 0.1], [0.12, 0.1, 0.05], { shadows: false });
    const head = P.group('cabeza', body, [0, 0.86, 0]);
    v.head = head;
    P.ball(head, skin, [0, 0, 0], [0.34, 0.32, 0.32]);
    P.ball(head, P.mat(MINER.hair), [0, 0.02, -0.06], [0.32, 0.12, 0.22]);
    P.eye(head, [-0.07, 0.02, 0.14], 0.07, 0.5);
    P.eye(head, [0.07, 0.02, 0.14], 0.07, 0.5);
    P.ball(head, P.mat(MINER.hat), [0, 0.18, 0.02], [0.46, 0.06, 0.46], { name: 'ala' });
    P.ball(head, P.mat(MINER.hat), [0, 0.26, 0], [0.24, 0.14, 0.24], { name: 'copa' });
    const canteen = P.group('cantimplora', body, [0.16, 0.5, 0.2]);
    P.ball(canteen, P.mat(MINER.canteen, { gloss: 0.55 }), [0, 0, 0], [0.12, 0.18, 0.1]);
    v.pump = canteen;
    for (const s of [-1, 1]) P.limb(body, skin, [s * 0.16, 0.66, 0], [0.1, 0.5, 0.18], 0.04);
    v.markY = 1.4;
    v.animate = (vv, _dt, time) => {
      const n = vv.npc;
      vv.pump.setLocalPosition(0.16, 0.5 + Math.abs(Math.sin(time * 16)) * 0.08 * n.windup, 0.2);
      vv.head.setLocalEulerAngles(n.windup > 0 ? -8 : Math.sin(time * 1.8) * 5, n.state === 'idle' ? Math.sin(time * 1.2) * 18 : 0, 0);
    };
  },

  hard(P, body, collar, v) {
    const fur = P.mat(COYOTE.fur, { gloss: 0.4 });
    const dark = P.mat(COYOTE.dark, { gloss: 0.3 });
    const belly = P.mat(COYOTE.belly, { gloss: 0.25 });
    for (const [x, z, phase] of [[-0.12, 0.22, 0], [0.12, 0.22, Math.PI], [-0.12, -0.28, Math.PI], [0.12, -0.28, 0]]) {
      const hip = P.group('pata', body, [x, 0.4, z]);
      P.limb(hip, fur, [0, 0, 0], [0, -0.3, 0.02], 0.055);
      P.ball(hip, dark, [0, -0.34, 0.04], [0.11, 0.06, 0.13]);
      v.legs.push({ g: hip, axis: 'x', amp: 30, phase });
    }
    P.limb(body, fur, [0, 0.48, -0.3], [0, 0.5, 0.22], 0.18, { name: 'cuerpo' });
    P.ball(body, belly, [0, 0.4, 0], [0.26, 0.14, 0.48], { name: 'panza' });
    P.ring(body, collar, [0, 0.6, 0.26], 0.12, 0.02, { rot: [40, 0, 0], name: 'collar' });
    const head = P.group('cabeza', body, [0, 0.7, 0.42]);
    v.head = head;
    P.ball(head, fur, [0, 0, 0], [0.28, 0.24, 0.34]);
    P.ball(head, belly, [0, -0.04, 0.16], [0.14, 0.1, 0.18], { name: 'hocico' });
    P.ball(head, dark, [0, -0.02, 0.26], [0.06, 0.04, 0.05], { name: 'nariz' });
    P.eye(head, [-0.07, 0.04, 0.12], 0.06, 0.55);
    P.eye(head, [0.07, 0.04, 0.12], 0.06, 0.55);
    v.ears = [-1, 1].map((s) => {
      const e = P.group('oreja', head, [s * 0.1, 0.12, -0.02]);
      P.ball(e, P.mat(COYOTE.ear), [0, 0.08, 0], [0.06, 0.14, 0.04]);
      return { g: e, s };
    });
    v.tail = P.group('cola', body, [0, 0.5, -0.46]);
    P.limb(v.tail, fur, [0, 0, 0], [0, 0.08, -0.32], 0.035);
    v.markY = 1.2;
    v.animate = (vv, _dt, time) => {
      const n = vv.npc;
      const angry = n.state === 'alert' || n.state === 'attack';
      vv.tail.setLocalEulerAngles(0, Math.sin(time * (angry ? 18 : 7)) * 26, 0);
      vv.ears.forEach(({ g, s }) => g.setLocalEulerAngles(angry ? -16 : 0, 0, s * (angry ? 10 : 0)));
      vv.head.setLocalEulerAngles(n.windup > 0 ? 12 * n.windup : Math.sin(time * 2) * 3, 0, 0);
    };
  },
};

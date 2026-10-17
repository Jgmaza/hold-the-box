// Piezas suaves para modelos hechos en código (NPCs, clima): mallas de alta resolución cacheadas
// (elipsoides, cápsulas, discos, anillos, sonrisas, ojos) en vez de las primitivas facetadas.
import * as pc from 'playcanvas';

const DEG = 180 / Math.PI;

export const EYE = { white: '#ffffff', pupil: '#1d1d1d' };

/** Piezas suaves: mallas de alta resolución cacheadas + helpers para armar los modelos. */
export class Parts {
  constructor(gfx) {
    this.gfx = gfx;
    this.device = gfx.device;
    this._meshes = new Map();
  }

  _mesh(key, make) {
    if (!this._meshes.has(key)) this._meshes.set(key, pc.Mesh.fromGeometry(this.device, make()));
    return this._meshes.get(key);
  }

  _entity(mesh, material, parent, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], name = 'pieza', shadows = true } = {}) {
    const e = new pc.Entity(name);
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: shadows, receiveShadows: true });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
    e.setLocalScale(scale[0], scale[1], scale[2]);
    parent.addChild(e);
    return e;
  }

  mat(hex, opts) {
    return this.gfx.solid(hex, opts);
  }

  group(name, parent, pos = [0, 0, 0], rot = [0, 0, 0]) {
    const e = this.gfx.group(name, parent, pos);
    e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
    return e;
  }

  /** Elipsoide: `size` = diámetros [x, y, z]. */
  ball(parent, material, pos, size, opts = {}) {
    const mesh = this._mesh('sphere', () => new pc.SphereGeometry({ radius: 0.5, latitudeBands: 28, longitudeBands: 36 }));
    return this._entity(mesh, material, parent, { ...opts, pos, scale: size });
  }

  /** Cápsula (extremos redondos) de `a` a `b` con radio `r`: brazos, patas, cuerpos. */
  limb(parent, material, a, b, r, opts = {}) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz) || 1e-4;
    const h = Math.round((len + 2 * r) * 100) / 100;
    const rr = Math.round(r * 1000) / 1000;
    const mesh = this._mesh(`capsule|${rr}|${h}`, () => new pc.CapsuleGeometry({ radius: rr, height: h, sides: 28, heightSegments: 1 }));
    const e = this._entity(mesh, material, parent, { ...opts, pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] });
    // Rotar el eje Y de la cápsula hacia la dirección a→b.
    const ax = dz / len;
    const az = -dx / len;
    const s = Math.hypot(ax, az);
    const q = new pc.Quat();
    if (s > 1e-6) q.setFromAxisAngle(new pc.Vec3(ax / s, 0, az / s), Math.acos(Math.max(-1, Math.min(1, dy / len))) * DEG);
    else if (dy < 0) q.setFromAxisAngle(pc.Vec3.RIGHT, 180);
    e.setLocalRotation(q);
    return e;
  }

  /** Disco / cilindro suave (gorras, placas). */
  disc(parent, material, pos, radius, height, opts = {}) {
    const mesh = this._mesh('cylinder', () => new pc.CylinderGeometry({ radius: 0.5, height: 1, capSegments: 36, heightSegments: 1 }));
    return this._entity(mesh, material, parent, { ...opts, pos, scale: [radius * 2, height, radius * 2] });
  }

  /** Anillo (collar). Acostado en XZ; `rot` lo orienta. */
  ring(parent, material, pos, ringRadius, tube, opts = {}) {
    const mesh = this._mesh(`torus|${tube}|${ringRadius}`, () => new pc.TorusGeometry({ tubeRadius: tube, ringRadius, segments: 40, sides: 16 }));
    return this._entity(mesh, material, parent, { ...opts, pos });
  }

  /** Sonrisa: arco de toroide en el plano de la cara (mirando a +Z), abierto hacia arriba. */
  smile(parent, material, pos, width, thickness = 0.012, sector = 130) {
    const ringRadius = width / 2 / Math.sin((sector * Math.PI) / 360);
    const holder = this.group('boca', parent, pos, [90, 0, 0]);
    const mesh = this._mesh(`smile|${thickness}|${ringRadius.toFixed(3)}|${sector}`, () => new pc.TorusGeometry({ tubeRadius: thickness, ringRadius, sectorAngle: sector, segments: 24, sides: 10 }));
    // Centrar el arco en la parte de abajo y subirlo para que quede en `pos`.
    this._entity(mesh, material, holder, { pos: [0, 0, -ringRadius * Math.cos((sector * Math.PI) / 360)], rot: [0, sector / 2 - 90, 0], shadows: false, name: 'sonrisa' });
    return holder;
  }

  /** Ojo caricatura: blanco + pupila + brillo, mirando a +Z. */
  eye(parent, pos, size = 0.1, pupil = 0.5) {
    const e = this.group('ojo', parent, pos);
    this.ball(e, this.mat(EYE.white, { gloss: 0.9 }), [0, 0, 0], [size, size * 1.15, size * 0.7], { shadows: false });
    this.ball(e, this.mat(EYE.pupil, { gloss: 0.9 }), [0, -size * 0.05, size * 0.3], [size * pupil, size * pupil * 1.15, size * 0.25], { shadows: false });
    this.ball(e, this.mat(EYE.white, { unlit: true }), [size * 0.12, size * 0.12, size * 0.4], [size * 0.18, size * 0.18, size * 0.1], { shadows: false });
    return e;
  }
}

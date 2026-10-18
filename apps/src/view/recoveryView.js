// Aparatos sueltos de recuperación: fuente de cine, galletas, mesa de taller, abanicos de piso.
export class RecoveryView {
  constructor(gfx, stations, particles) {
    this.gfx = gfx;
    this.particles = particles;
    this._fans = [];
    this._gusts = [];
    this._windAcc = 0;
    this.groups = stations.map((st) => this._build(st));
  }

  _build(st) {
    const g = this.gfx;
    const y = (st.top ?? 1) + 0.02;
    const zone = g.group(`recovery-${st.id}`, null, [st.x, y, st.z]);
    const { fill, border } = this._zone(zone, st);

    const prop = g.group('aparato', zone);
    if (Math.abs(st.x) > 0.4) prop.setLocalEulerAngles(0, st.x < 0 ? 90 : -90, 0);

    if (st.kind === 'refill') this._fountain(prop);
    else if (st.kind === 'cat') this._cookies(prop);
    else if (st.kind === 'bomb') this._craft(prop);
    else this._floorFans(prop);

    return { sim: st, root: zone, fill, border };
  }

  /** Piso de la zona + borde verde siempre visible: “acérquense aquí”. */
  _zone(parent, st) {
    const g = this.gfx;
    const w = st.w;
    const d = st.d;
    const fill = g.prim('box', g.solid('goal', { opacity: 0.22, unlit: true }), {
      parent,
      pos: [0, 0.012, 0],
      scale: [w * 0.92, 0.02, d * 0.92],
      shadows: false,
      name: 'fill',
    });
    const t = 0.1;
    const green = g.solid('goal', { unlit: true });
    const border = g.group('borde', parent);
    g.prim('box', green, { parent: border, pos: [0, 0.03, d / 2 - t / 2], scale: [w, 0.05, t], shadows: false });
    g.prim('box', green, { parent: border, pos: [0, 0.03, -d / 2 + t / 2], scale: [w, 0.05, t], shadows: false });
    g.prim('box', green, { parent: border, pos: [w / 2 - t / 2, 0.03, 0], scale: [t, 0.05, d], shadows: false });
    g.prim('box', green, { parent: border, pos: [-w / 2 + t / 2, 0.03, 0], scale: [t, 0.05, d], shadows: false });
    return { fill, border };
  }

  /** Fuente de cerveza estilo gaseosa de cine, a un costado. */
  _fountain(parent) {
    const g = this.gfx;
    const steel = g.solid('#c4c0b8', { mul: 1.12 });
    const body = g.solid('#3f2a22', { mul: 1.05 });
    const amber = g.solid('#d97706', { mul: 1.15 });
    g.prim('box', body, { parent, pos: [0, 0.85, 0], scale: [1.15, 1.55, 0.58], name: 'cabinet' });
    g.prim('box', steel, { parent, pos: [0, 1.22, 0.26], scale: [1.02, 0.62, 0.08], name: 'front' });
    g.prim('box', steel, { parent, pos: [0, 1.68, 0], scale: [1.05, 0.18, 0.5], name: 'ice' });
    g.prim('box', amber, { parent, pos: [0, 1.42, 0.3], scale: [0.62, 0.16, 0.05], name: 'badge' });
    g.prim('box', g.solid('#44403c', { mul: 1 }), { parent, pos: [0, 0.32, 0.38], scale: [1.05, 0.07, 0.32], name: 'tray' });
    g.prim('box', g.solid('#292524', { mul: 1 }), { parent, pos: [0, 0.22, 0.42], scale: [1.12, 0.06, 0.38], name: 'shelf' });
    for (let i = -1; i <= 1; i++) {
      g.prim('cylinder', steel, { parent, pos: [i * 0.28, 0.92, 0.34], scale: [0.08, 0.22, 0.08], name: `tap-${i}` });
      g.prim('cylinder', amber, { parent, pos: [i * 0.28, 0.78, 0.4], scale: [0.05, 0.12, 0.05], rot: [55, 0, 0], name: `spout-${i}` });
      g.prim('cylinder', g.solid('#f5f5f4', { mul: 1.1 }), { parent, pos: [i * 0.28, 0.38, 0.48], scale: [0.1, 0.16, 0.1], shadows: false, name: `cup-${i}` });
    }
    g.prim('box', g.solid('#b45309', { mul: 1.1 }), { parent, pos: [-0.42, 0.55, 0.32], scale: [0.1, 0.18, 0.1], name: 'lever' });
  }

  _cookies(parent) {
    const g = this.gfx;
    g.prim('box', g.solid('#a16207', { mul: 1.05 }), { parent, pos: [0, 0.32, 0], scale: [0.95, 0.12, 0.95], name: 'table' });
    for (const [x, z] of [
      [-0.38, -0.38],
      [0.38, -0.38],
      [-0.38, 0.38],
      [0.38, 0.38],
    ]) {
      g.prim('box', g.solid('#7c4a12', { mul: 0.95 }), { parent, pos: [x, 0.16, z], scale: [0.1, 0.32, 0.1], name: 'leg' });
    }
    g.prim('cylinder', g.solid('#e7e5e4', { mul: 1.05 }), { parent, pos: [0, 0.42, 0], scale: [0.72, 0.08, 0.72], name: 'bowl' });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.prim('cylinder', g.solid('#d97706', { mul: 1.15 }), {
        parent,
        pos: [Math.cos(a) * 0.18, 0.5, Math.sin(a) * 0.18],
        scale: [0.16, 0.06, 0.16],
        shadows: false,
        name: `cookie-${i}`,
      });
    }
  }

  /** Mesa de taller / crafteo para reparar la bomba. */
  _craft(parent) {
    const g = this.gfx;
    const oak = g.solid('#8b5a2b', { mul: 1.05 });
    const dark = g.solid('#44403c', { mul: 1 });
    g.prim('box', oak, { parent, pos: [0, 0.38, 0], scale: [1.15, 0.55, 1.15], name: 'bench' });
    g.prim('box', g.solid('#a16207', { mul: 1.1 }), { parent, pos: [0, 0.68, 0], scale: [1.2, 0.08, 1.2], name: 'top' });
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        g.prim('box', dark, {
          parent,
          pos: [c * 0.22, 0.73, r * 0.22],
          scale: [0.18, 0.03, 0.18],
          shadows: false,
          name: `grid-${r}-${c}`,
        });
      }
    }
    g.prim('box', g.solid('#78716c', { mul: 1.1 }), { parent, pos: [-0.38, 0.82, 0.28], scale: [0.55, 0.07, 0.1], rot: [0, 25, -18], name: 'wrench' });
    g.prim('box', g.solid('#a8a29e', { mul: 1 }), { parent, pos: [0.32, 0.84, -0.22], scale: [0.12, 0.08, 0.42], rot: [0, -30, 0], name: 'hammer' });
    g.prim('cylinder', g.solid('#57534e', { mul: 1 }), { parent, pos: [0.28, 0.9, 0.32], scale: [0.16, 0.12, 0.16], name: 'tape' });
  }

  /** Abanicos de piso: reja circular baja que sopla hacia arriba. */
  _floorFans(parent) {
    this._floorFan(parent, -0.48, 0, 1);
    this._floorFan(parent, 0.48, 0, -1);
  }

  _floorFan(parent, x, z, spin) {
    const g = this.gfx;
    const unit = g.group('floor-fan', parent, [x, 0, z]);
    g.prim('cylinder', g.solid('#3f3f46', { mul: 1 }), { parent: unit, pos: [0, 0.06, 0], scale: [0.88, 0.1, 0.88], name: 'housing' });
    g.prim('cylinder', g.solid('#71717a', { mul: 1.05 }), { parent: unit, pos: [0, 0.12, 0], scale: [0.78, 0.06, 0.78], name: 'well' });
    g.prim('cylinder', g.solid('#a1a1aa', { mul: 1.1 }), { parent: unit, pos: [0, 0.16, 0], scale: [0.82, 0.04, 0.82], name: 'rim' });
    g.prim('sphere', g.solid('#d4d4d8', { mul: 1.1 }), { parent: unit, pos: [0, 0.2, 0], scale: [0.16, 0.1, 0.16], name: 'hub' });
    const blades = g.group('blades', unit, [0, 0.2, 0]);
    for (let i = 0; i < 4; i++) {
      const a = (i * 90 * Math.PI) / 180;
      g.prim('box', g.solid('#e4e4e7', { mul: 1.15 }), {
        parent: blades,
        pos: [Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22],
        scale: [0.16, 0.03, 0.42],
        rot: [0, i * 90, 8],
        shadows: false,
      });
    }
    // Reja: aros para que se lea como ventilador de piso.
    g.prim('cylinder', g.solid('#d4d4d8', { mul: 1.2, opacity: 0.45, unlit: true }), {
      parent: unit,
      pos: [0, 0.24, 0],
      scale: [0.72, 0.02, 0.72],
      shadows: false,
      name: 'grill',
    });
    const draft = g.prim('cylinder', g.solid('#e0f2fe', { opacity: 0.16, unlit: true }), {
      parent: unit,
      pos: [0, 1.15, 0],
      scale: [0.28, 1.9, 0.28],
      shadows: false,
      name: 'draft',
    });
    const rings = [];
    for (let i = 0; i < 4; i++) {
      const ring = g.prim('cylinder', g.solid('#f8fafc', { opacity: 0.35, unlit: true }), {
        parent: unit,
        pos: [0, 0.4, 0],
        scale: [0.42, 0.04, 0.42],
        shadows: false,
        name: `gust-${i}`,
      });
      rings.push(ring);
    }
    unit._blades = blades;
    unit._spin = spin;
    unit._draft = draft;
    this._gusts.push({ unit, rings });
    this._fans.push(unit);
  }

  onTick(e, boxCenter) {
    if (!e.heart || !this.particles) return;
    const x = boxCenter.x + (Math.random() - 0.5) * 0.6;
    const y = boxCenter.y + 0.8;
    const z = boxCenter.z + (Math.random() - 0.5) * 0.4;
    this.particles.emit(x, y, z, (Math.random() - 0.5) * 0.4, 1.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4, {
      color: 'danger',
      life: 0.9,
      size: 0.14,
      gravity: 0.15,
    });
  }

  update(dt, time) {
    for (const gv of this.groups) {
      const pulse = gv.sim.active ? 1.06 + Math.sin(time * 7) * 0.08 : 1;
      gv.border.setLocalScale(pulse, 1, pulse);
      const fill = gv.sim.active ? 0.4 : 0.22;
      const mat = gv.fill.render.material;
      if (mat.opacity !== fill) {
        mat.opacity = fill;
        mat.update();
      }
    }
    const blowing = this.groups.some((g) => g.sim.kind === 'dry');
    const on = this.groups.some((g) => g.sim.kind === 'dry' && g.sim.active);
    for (const fan of this._fans) {
      const deg = time * (on ? 560 : 220) * (fan._spin ?? 1);
      fan._blades?.setLocalEulerAngles(0, deg, 0);
      if (fan._draft) {
        const h = on ? 2.4 : 1.7;
        const w = 0.26 + Math.sin(time * 10) * 0.04 + (on ? 0.08 : 0);
        fan._draft.setLocalScale(w, h, w);
        fan._draft.setLocalPosition(0, 0.25 + h / 2, 0);
        const mat = fan._draft.render.material;
        mat.opacity = on ? 0.28 : 0.14;
        mat.update();
      }
    }
    for (const gust of this._gusts) {
      gust.rings.forEach((ring, i) => {
        const t = (time * (on ? 1.35 : 0.75) + i / gust.rings.length) % 1;
        const y = 0.28 + t * (on ? 2.4 : 1.8);
        const s = 0.32 + t * 0.55;
        ring.setLocalPosition(0, y, 0);
        ring.setLocalScale(s, 0.035, s);
        const mat = ring.render.material;
        mat.opacity = (1 - t) * (on ? 0.5 : 0.32);
        mat.update();
      });
    }
    if (blowing && this.particles) {
      this._windAcc += dt;
      const rate = on ? 36 : 16;
      while (this._windAcc > 1 / rate) {
        this._windAcc -= 1 / rate;
        const fan = this._fans[Math.floor(Math.random() * this._fans.length)];
        if (!fan) break;
        const p = fan.getPosition();
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.22;
        this.particles.emit(p.x + Math.cos(a) * r, p.y + 0.25, p.z + Math.sin(a) * r, (Math.random() - 0.5) * 0.25, on ? 3.6 + Math.random() * 1.4 : 2.2 + Math.random(), (Math.random() - 0.5) * 0.25, {
          color: 'foam',
          life: on ? 0.85 : 0.65,
          size: 0.07 + Math.random() * 0.06,
          gravity: 0,
        });
      }
    }
  }
}

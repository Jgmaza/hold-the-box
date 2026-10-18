// Cactus hostiles del laberinto. No se mueven de sitio: si la caja o un jugador
// entra en su zona, pinchan y le bajan contenido a la caja.
import { CONFIG } from '../config.js';

export class CactusPatch {
  constructor(list, events) {
    this.events = events;
    this.plants = (list ?? []).map((c) => ({
      x: c.x,
      z: c.z,
      hostile: !!c.hostile,
      cd: 0,
      lunge: 0,
    }));
    this.near = false;
  }

  reset() {
    this.near = false;
    for (const p of this.plants) {
      p.cd = 0;
      p.lunge = 0;
    }
  }

  update(dt, game) {
    const C = CONFIG.hazards.cactus;
    this.near = false;
    const targets = [game.box.center, game.p1.pos, game.p2.pos];
    for (const p of this.plants) {
      p.cd = Math.max(0, p.cd - dt);
      p.lunge = Math.max(0, p.lunge - dt);
      if (!p.hostile) continue;
      let close = false;
      let hit = false;
      for (const t of targets) {
        const d = Math.hypot(t.x - p.x, t.z - p.z);
        if (d < C.warn) close = true;
        if (d < C.reach) hit = true;
      }
      if (close) this.near = true;
      if (!hit || p.cd > 0 || game.box.invuln > 0) continue;
      p.cd = C.cooldown;
      p.lunge = C.lunge;
      game.box.damage(C.damage, 'cactus');
      this.events.emit('cactus:poke', { x: p.x, z: p.z });
    }
  }
}

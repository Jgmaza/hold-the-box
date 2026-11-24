// NPC easy: "cangrejo". Lento, ve poco y solo de frente (CONFIG.npcs.easy).
// Ataque: persigue al jugador más cercano un rato y, si lo toca, lo pellizca:
// empujoncito + sacudida de la caja + se bota contenido. Se evita SALTÁNDOLO JUNTOS.
import { len2 } from '../math.js';
import { Npc } from './npc.js';

export class EasyNpc extends Npc {
  static difficulty = 'easy';

  startAttack(game, service) {
    super.startAttack(game, service);
    this.timer = this.T.chaseTime;
  }

  updateAttack(dt, game, service) {
    const T = this.T;
    const target = this.nearestPlayer(game.players);
    this.moveToward(target.pos.x, target.pos.z, T.chaseSpeed, dt);

    const hit = this.touching(game.players, 0.05);
    if (hit) {
      const dx = hit.pos.x - this.pos.x;
      const dz = hit.pos.z - this.pos.z;
      const d = len2(dx, dz) || 1;
      service.hitPlayer(this, hit, { knock: T.knock, lift: T.lift, dirX: dx / d, dirZ: dz / d });
      service.hitBox(this, { damage: T.damage, wet: T.wet, kick: T.kickDeg, player: hit });
      return this.finishAttack();
    }
    if (this.timer <= 0) this.finishAttack(); // se cansó de perseguir
  }
}

// Servicio de NPCs: el ÚNICO punto de entrada de game.js a los NPCs.
// Crea los NPCs del nivel, los actualiza, mueve los chorros y aplica TODO el daño de NPCs a la caja.
//
// En el nivel (solo los niveles que lo declaren tienen NPCs):
//   npcs: [{ difficulty: 'easy' | 'medium' | 'hard', platform: '<id de una plataforma>', x, z, id? }]
//
// Eventos (en game.events):
//   npc:alert  { id, difficulty }                       vio la caja
//   npc:windup { id, difficulty }                       aviso: va a atacar (medium dispara / hard embiste)
//   npc:shoot  { id, x, y, z }                          medium lanzó un chorro
//   npc:hit    { id, difficulty, player, x, y, z }      el ataque conectó (player = 1 | 2 | null)
//   npc:splash { x, y, z }                              un chorro cayó al piso o al agua
//   + box:impact / box:wet con cause 'npc-easy' | 'npc-medium' | 'npc-hard'
import { CONFIG } from '../../config.js';
import { makeRng } from '../math.js';
import { EasyNpc } from './npcEasy.js';
import { HardNpc } from './npcHard.js';
import { MediumNpc } from './npcMedium.js';

export const NPC_TYPES = { easy: EasyNpc, medium: MediumNpc, hard: HardNpc };

export class NpcService {
  /**
   * @param {object} level  datos del nivel (usa level.npcs)
   * @param {{world, box, events, seed?}} deps
   */
  constructor(level, { world, box, events, seed = 1 }) {
    this.world = world;
    this.box = box;
    this.events = events;
    this.rng = makeRng(seed);
    this.projectiles = []; // { npc, pos, vel, life }
    this.npcs = (level.npcs ?? []).map((def, i) => {
      const Type = NPC_TYPES[def.difficulty];
      if (!Type) {
        throw new Error(`[npcs] NPC ${i}: dificultad "${def.difficulty}" no existe (usa ${Object.keys(NPC_TYPES).join(' | ')})`);
      }
      const platform = world.statics.find((s) => s.def.id === def.platform);
      if (!platform) throw new Error(`[npcs] NPC ${i}: la plataforma "${def.platform}" no existe en el nivel`);
      return new Type(def.id ?? `${def.difficulty}-${i}`, def, platform.aabb, this.rng);
    });
  }

  get list() {
    return this.npcs;
  }

  /** NPCs a su spawn y sin chorros en el aire (respawn, reintento, reinicio, teleport). */
  reset() {
    this.projectiles.length = 0;
    for (const n of this.npcs) n.reset();
  }

  update(dt, game) {
    if (!CONFIG.npcs.enabled) return;
    for (const n of this.npcs) n.update(dt, game, this);
    this._updateProjectiles(dt);
  }

  emit(name, data) {
    this.events.emit(name, data);
  }

  /**
   * ÚNICO lugar donde un NPC daña la caja. `kick` en grados/s: baja el lado de `player`
   * (o `side`: -1 lado de P1, 1 lado de P2). No aplica con la caja invulnerable o ya soltada.
   */
  hitBox(npc, { damage = 0, wet = 0, kick = 0, side = 1, player = null } = {}) {
    const box = this.box;
    if (box.invuln > 0 || box.dropped) return false;
    const s = player ? (player.id === 1 ? -1 : 1) : side;
    const cause = `npc-${npc.difficulty}`;
    if (kick) box.kick(s * kick, kick * 0.5);
    if (damage) box.damage(damage, cause);
    if (wet) box.addWet(wet, cause);
    const c = box.center;
    this.events.emit('npc:hit', { id: npc.id, difficulty: npc.difficulty, player: player?.id ?? null, x: c.x, y: c.y, z: c.z });
    return true;
  }

  /** Empujón a un jugador (como el rodillo: pierde control un momento). */
  hitPlayer(npc, player, { knock = 0, lift = 0, dirX = 0, dirZ = 0 } = {}) {
    if (this.box.invuln > 0) return;
    player.knock(dirX * knock, lift, dirZ * knock);
  }

  spawnProjectile(npc, from, vel) {
    this.projectiles.push({ npc, pos: { ...from }, vel: { ...vel }, life: npc.T.shotLife });
    this.events.emit('npc:shoot', { id: npc.id, x: from.x, y: from.y, z: from.z });
  }

  /** Chorros de medium: caen en arco; mojan la caja si la tocan, si no salpican el piso o el agua. */
  _updateProjectiles(dt) {
    const box = this.box;
    const S = CONFIG.box.size;
    const boxR = Math.max(S.w, S.h, S.d) / 2;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const s = this.projectiles[i];
      const T = s.npc.T;
      s.life -= dt;
      s.vel.y -= T.shotGravity * dt;
      s.pos.x += s.vel.x * dt;
      s.pos.y += s.vel.y * dt;
      s.pos.z += s.vel.z * dt;

      const c = box.center;
      const dx = s.pos.x - c.x;
      const dy = s.pos.y - c.y;
      const dz = s.pos.z - c.z;
      if (!box.dropped && Math.hypot(dx, dy, dz) < boxR + T.shotRadius) {
        // Sacude hacia el lado donde pegó (eje P1 → P2).
        const side = dx * box.axis.x + dz * box.axis.z < 0 ? -1 : 1;
        this.hitBox(s.npc, { damage: T.damage, wet: T.wet, kick: T.kickDeg, side });
        this.projectiles.splice(i, 1);
        continue;
      }

      const floor = Math.max(this.world.floorBelow(s.pos.x, s.pos.z, s.pos.y + 0.5), this.world.waterLevel);
      if (s.pos.y <= floor || s.life <= 0) {
        this.events.emit('npc:splash', { x: s.pos.x, y: Math.max(s.pos.y, floor), z: s.pos.z });
        this.projectiles.splice(i, 1);
      }
    }
  }
}

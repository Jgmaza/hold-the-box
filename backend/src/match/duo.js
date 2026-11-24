// Un dúo = dos slots (P1/P2) que cargan una caja. Envuelve un `Game` de la sim original sin modificarlo.
// status: 'waiting' (cuenta atrás) → 'racing' → 'finished' (llegó a la meta) | 'eliminated' (sin vidas)
import { Game, PRIVATE_EVENTS } from '../game/index.js';
import { FORWARDED_EVENTS } from './events.js';

const blankInput = () => ({ x: 0, z: 0, jumpHeld: false, jumpPending: false, seq: -1 });

export class Duo {
  /**
   * @param {{ teamId: number, players: Record<1|2, {userId: string, name: string, char: string, alt: boolean}>,
   *           level: object, seed: number, ghostSec: number,
   *           emit: (teamId: number, e: string, d: object, isPrivate?: boolean) => void, world?: object }} opts
   */
  constructor({ teamId, players, level, seed, ghostSec, emit, world }) {
    this.teamId = teamId;
    this.players = players;
    this.game = new Game(level, { seed });
    if (world) this.game.world = world; // mundo compartido de la partida (vidrio, colisiones)
    this.ghostSec = ghostSec;
    this.ghost = 0; // segundos sin colisión con otros dúos (tras aparecer / reaparecer)
    this.inputs = { 1: blankInput(), 2: blankInput() };
    this.online = { 1: true, 2: true };
    this.abandoned = new Set(); // userIds que se fueron y no volvieron a tiempo
    this.status = 'waiting';
    this.finishTime = null;
    this.result = null;
    for (const name of FORWARDED_EVENTS) this.game.events.on(name, (d) => emit(teamId, name, d ?? {}));
    for (const name of PRIVATE_EVENTS) this.game.events.on(name, (d) => emit(teamId, name, d ?? {}, true));
    this.game.events.on('game:respawn', () => {
      this.ghost = this.ghostSec;
    });
  }

  /** userIds (sin repetir) de este dúo. */
  get userIds() {
    return [...new Set([this.players[1].userId, this.players[2].userId])];
  }

  slotOf(userId) {
    const s = [];
    if (this.players[1]?.userId === userId) s.push(1);
    if (this.players[2]?.userId === userId) s.push(2);
    return s;
  }

  begin() {
    this.game.start();
    this.status = 'racing';
    this.ghost = this.ghostSec;
  }

  setInput(slot, { seq, x, z, jump, jumpHeld }) {
    const inp = this.inputs[slot];
    if (seq <= inp.seq) return; // fuera de orden / repetido
    inp.seq = seq;
    inp.x = x;
    inp.z = z;
    inp.jumpHeld = jumpHeld;
    if (jump) inp.jumpPending = true; // se consume en el siguiente paso de sim
  }

  setOnline(slot, online) {
    this.online[slot] = online;
    if (!online) this.inputs[slot] = { ...blankInput(), seq: this.inputs[slot].seq };
  }

  _in(slot) {
    const i = this.inputs[slot];
    if (!this.online[slot]) return { x: 0, z: 0, jumpPressed: false, jumpHeld: false };
    const out = { x: i.x, z: i.z, jumpPressed: i.jumpPending, jumpHeld: i.jumpHeld };
    i.jumpPending = false;
    return out;
  }

  /** Un paso fijo de sim. Devuelve 'finished' | 'eliminated' si cambió de estado en este paso. */
  step(dt, matchTime) {
    if (this.status !== 'racing') return null;
    // OJO: no llamar setInputs en 'won'/'failed' (con salto, la sim reinicia el nivel).
    this.game.setInputs(this._in(1), this._in(2));
    this.game.step(dt);
    this.ghost = Math.max(0, this.ghost - dt);
    const s = this.game.state;
    if (s === 'won') {
      this.status = 'finished';
      this.finishTime = matchTime;
      this.result = { ...this.game.result };
      return 'finished';
    }
    if (s === 'failed') {
      this.status = 'eliminated';
      return 'eliminated';
    }
    return null;
  }

  /** Distancia XZ de la caja a la meta (para desempatar a los que no llegaron). */
  distanceToGoal() {
    const g = this.game.level.goal;
    const c = this.game.box.center;
    if (!g) return 0;
    return Math.hypot(c.x - g.x, c.z - g.z);
  }
}

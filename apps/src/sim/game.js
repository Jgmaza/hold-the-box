// GameState: orquesta jugadores + caja + mundo y decide victoria / derrota / respawn.
//
// Estados: 'title' → 'playing' ⇄ 'paused' → 'failing' → 'failed' | 'won'
//
// Eventos (game.events.on(nombre, fn)):
//   game:ready      { p1, p2 }               quién pulsó salto en la pantalla de título
//   game:start      {}
//   game:pause      { paused }
//   game:checkpoint { index }
//   game:splash     { player, x, y, z }      alguien cayó al agua (la caja se moja)
//   game:life       { lives, cause }         se perdió una vida (caída o caja perdida); lives = las que quedan
//   game:respawn    { checkpoint, retry? }
//   game:teleport   {}                       (debug) se movió a los jugadores
//   game:fail       { reason, label, inWater, lives, gameOver }   reason: 'dropped' | 'empty' | 'soaked' | 'exploded' | 'fell'
//                   Solo sale sin vidas (gameOver): con vidas, la pérdida reaparece sola en el checkpoint.
//   game:win        { time, integrity, wetness, bombHealth, rating, ratingLabel }   bombHealth: null sin bomba
//   player:jump     { player }
//   player:land     { player, speed }
//   hazard:hit      { player }               el rodillo golpeó a alguien
//   geyser:hit      {}                       un chorro empezó a mojar la caja
//   box:state / box:impact / box:wet / box:drop  (ver sim/box.js)
//   npc:alert / npc:windup / npc:shoot / npc:hit / npc:splash  (ver sim/npcs/npcService.js)
//   cat:warn        { player }               la pata asoma hacia ese jugador
//   cat:scratch     { player }               arañazo; el tropiezo lo hace sim/cat.js
//   cat:shred       {}                       la rabia ya resta contenido
//   cat:goal        {}                       se quedaron en la meta y el gato vacía la caja
//   bomb:beep       { health }              tic de la bomba (más rápido cuanto más dañada)
//   bomb:warn       { health }              bajó de warnHealth
//   bomb:explode    {}                      llegó a 0 %
//   bomb:hit        { amount, cause, health }   un golpe o agua le bajó el %
//   bomb:desync     {}                      empezaron a ir desincronizados (la bomba se daña)
//   weather:enter / weather:exit / weather:warn / weather:start / weather:end  (ver sim/weather/weatherService.js)
//   glass:break     { id, x, y, z }          un vidrio normal se rompió bajo un jugador
//   glass:restore   {}                       los paneles vuelven (reinicio del nivel)
//   cactus:poke     { x, z }                 un cactus hostil pinchó y bajó Contenido
import { CONFIG } from '../config.js';
import { Bomb } from './bomb.js';
import { Box } from './box.js';
import { Cat } from './cat.js';
import { CactusPatch } from './cactus.js';
import { solveCarry } from './carry.js';
import { depenetrate, makeAABB } from './collision.js';
import { Emitter } from './events.js';
import { NpcService } from './npcs/npcService.js';
import { Player } from './player.js';
import { WeatherService } from './weather/weatherService.js';
import { World } from './world.js';

export const FAIL_LABELS = {
  dropped: '¡Soltaron la caja!',
  empty: '¡Se vació la caja por el huequito!',
  soaked: '¡La caja se deshizo de lo mojada!',
  exploded: '¡Explotó la bomba!',
  fell: '¡Se cayeron!',
};

export const RATING_LABELS = {
  perfect: '¡Entrega perfecta!',
  ok: 'Entrega aceptable',
  damaged: 'Entrega dañada (pero llegó)',
};

export class Game {
  /** @param {{seed?: number}} opts  semilla del aleatorio (NPCs y clima): misma semilla = misma partida */
  constructor(level, { seed = 1 } = {}) {
    this.level = level;
    this.events = new Emitter();
    this.world = new World(level);
    this.p1 = new Player(1, level.spawn.p1);
    this.p2 = new Player(2, level.spawn.p2);
    this.players = [this.p1, this.p2];
    this.box = new Box(this.events);
    this.npcs = new NpcService(level, { world: this.world, box: this.box, events: this.events, seed });
    this.cat = new Cat();
    this.bomb = new Bomb();
    this.box.bomb = this.bomb;
    this.weather = new WeatherService(level, { world: this.world, events: this.events, seed });
    this.cacti = new CactusPatch(level.cacti, this.events);
    this._scratch = makeAABB(0, 0, 0, 0, 0, 0);
    this.state = 'title';
    this.time = 0; // reloj del mundo (obstáculos)
    this._acc = 0;
    this._resetRun();
    this._placeAtSpawn(level.spawn);
  }

  _resetRun() {
    this.runTime = 0;
    this.lives = CONFIG.respawn.lives; // vidas que quedan en esta partida
    this._restoreSnapshot = false; // al reaparecer, la caja vuelve a como estaba en el checkpoint (se perdió)
    this._lifeSpent = false; // la vida de esta derrota ya se restó (la última, al caer al agua)
    this.checkpointIndex = -1;
    this.checkpointSnapshot = { integrity: 100, wetness: 0, bomb: 100 };
    this.cacti?.reset();
    this.ready = { p1: false, p2: false };
    this.respawnTimer = 0;
    this._teleported = true;
    this.failTimer = 0;
    this.failReason = null;
    this.result = null;
    this._wasWetting = false;
    this.box.reset();
    this.cat.reset();
    this.bomb.reset();
  }

  get currentSpawn() {
    return this.checkpointIndex >= 0 ? this.world.checkpoints[this.checkpointIndex].spawn : this.level.spawn;
  }

  _placeAtSpawn(spawn) {
    this.p1.reset(spawn.p1);
    this.p2.reset(spawn.p2);
    this.world.syncMovers(this.time);
    this.box.snapTo(this.p1, this.p2);
    this.npcs.reset();
    this.cat.reset();
    this.weather.reset();
  }

  // ---------------------------------------------------------------- acciones (UI / teclado)

  start() {
    if (this.state !== 'title') return;
    this.state = 'playing';
    this.events.emit('game:start', {});
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
    else return;
    this.events.emit('game:pause', { paused: this.state === 'paused' });
  }

  /** ¿Se acabaron las vidas? Entonces reintentar = empezar de cero desde la salida. */
  get gameOver() {
    return this.lives <= 0;
  }

  /**
   * Tras una derrota: reaparecer en el último checkpoint con la caja como estaba ahí.
   * Sin vidas no hay checkpoint que valga: se reinicia el nivel desde la salida con todas las vidas.
   */
  retry() {
    if (this.state !== 'failed') return;
    if (this.gameOver) return this.restart();
    this._restoreSnapshot = this._lifeSpent = false;
    this.box.reset(this.checkpointSnapshot);
    this.cacti.reset();
    this.cat.reset();
    this.bomb.reset(this.checkpointSnapshot.bomb);
    this.box.invuln = CONFIG.respawn.invulnTime;
    this.failReason = null;
    this._placeAtSpawn(this.currentSpawn);
    this.state = 'playing';
    this.events.emit('game:respawn', { checkpoint: this.checkpointIndex, retry: true });
  }

  /** Reinicia el nivel desde cero (sin pasar por el título). */
  restart() {
    this.world.restoreGlass();
    this.events.emit('glass:restore', {});
    this._resetRun();
    this._placeAtSpawn(this.level.spawn);
    this.state = 'playing';
    this.events.emit('game:start', { restart: true });
  }

  /** Debug: teletransporta al checkpoint `index` (-1 = salida, 'goal' = frente a la meta) o a `{p1, p2}`. */
  teleport(index) {
    if (index === 'goal') {
      const g = this.level.goal;
      this._placeAtSpawn({ p1: { x: g.x - 0.8, y: g.top, z: g.z + 4 }, p2: { x: g.x + 0.8, y: g.top, z: g.z + 4 } });
    } else if (typeof index === 'object') {
      this._placeAtSpawn(index);
    } else {
      this.checkpointIndex = Math.min(index, this.world.checkpoints.length - 1);
      this._placeAtSpawn(this.currentSpawn);
    }
    this.events.emit('game:teleport', {});
  }

  // ---------------------------------------------------------------- input

  /** in = { x, z, jumpPressed, jumpHeld } por jugador. W = z negativo. */
  setInputs(in1, in2) {
    if (this.state === 'title') {
      let changed = false;
      if (in1.jumpPressed && !this.ready.p1) changed = this.ready.p1 = true;
      if (in2.jumpPressed && !this.ready.p2) changed = this.ready.p2 = true;
      if (changed) this.events.emit('game:ready', { ...this.ready });
      if (this.ready.p1 && this.ready.p2) this.start();
      return;
    }
    if (this.state === 'won' && (in1.jumpPressed || in2.jumpPressed)) return this.restart();
    if (this.state === 'failed' && (in1.jumpPressed || in2.jumpPressed)) return this.retry();

    const frozen = this.state !== 'playing' || this.respawnTimer > 0;
    this.p1.setInput(frozen ? 0 : in1.x, frozen ? 0 : in1.z, !frozen && in1.jumpPressed, in1.jumpHeld);
    this.p2.setInput(frozen ? 0 : in2.x, frozen ? 0 : in2.z, !frozen && in2.jumpPressed, in2.jumpHeld);
  }

  // ---------------------------------------------------------------- loop

  /** Avanza la simulación con paso fijo. */
  update(frameDt) {
    const step = CONFIG.physics.fixedStep;
    this._acc += Math.min(frameDt, CONFIG.physics.maxFrameDt);
    while (this._acc >= step) {
      this.step(step);
      this._acc -= step;
    }
  }

  step(dt) {
    if (this.state === 'paused') return;
    this.time += dt;
    this.world.update(this.time);

    if (this.state === 'failing') return this._stepFailing(dt);
    if (this.state !== 'playing') return;

    this.runTime += dt;
    this.bomb.update(dt, this);
    if (this.bomb.exploded && this._checkFail()) return;
    if (this.respawnTimer > 0) return this._stepRespawn(dt);

    const cols = this.world.colliders;
    const [p1, p2] = this.players;

    for (const p of this.players) {
      for (const m of this.world.movers) depenetrate(p, m, this._scratch);
      p.beginStep(cols);
    }

    // Clima de las islas: empuje (viento) y piso resbaloso (lluvia) para cada jugador; la caja, más abajo.
    const fx = this.weather.update(dt, this);
    const mods = this.box.modifiers();
    for (const p of this.players) {
      p.push.x = fx.push[p.id].x;
      p.push.z = fx.push[p.id].z;
      const grip = fx.gripMul[p.id];
      p.integrate(dt, grip === 1 ? mods : { ...mods, grip: mods.grip * grip });
      p.applyVelocity(dt, cols);
    }
    solveCarry(p1, p2, dt, cols);

    for (const s of this.world.sweepers) {
      for (const p of this.players) {
        if (!s.hit(p, dt)) continue;
        const side = p.id === 1 ? -1 : 1;
        this.box.kick(side * CONFIG.hazards.sweeperKickDeg, CONFIG.hazards.sweeperKickDeg * 0.5);
        this.box.damage(CONFIG.box.leak.sweeperDamage, 'sweeper');
        this.events.emit('hazard:hit', { player: p.id });
      }
    }

    // NPCs: pasean, ven la caja y la atacan (empujones como el rodillo; daño vía box.damage / box.addWet).
    this.npcs.update(dt, this);

    for (const p of this.players) {
      p.endStep(dt);
      this._stepGlass(p);
      if (p.justJumped) this.events.emit('player:jump', { player: p.id });
      if (p.justLanded) this.events.emit('player:land', { player: p.id, speed: p.landSpeed });
    }

    // Chorros: mojan la caja mientras esté encima.
    const c = this.box.center;
    let wetting = 0;
    for (const g of this.world.geysers) if (g.covers(c)) wetting++;
    this.box.wetRate = wetting * CONFIG.box.wet.geyserRate + fx.wetRate;
    // Viento: inclina la caja, se lleva contenido y la seca.
    this.box.external.roll = fx.tilt.roll;
    this.box.external.pitch = fx.tilt.pitch;
    this.box.external.drain = fx.drain;
    this.box.external.dry = fx.dry;
    if (wetting && !this._wasWetting) this.events.emit('geyser:hit', {});
    this._wasWetting = wetting > 0;

    this.box.update(dt, p1, p2);
    this.cat.update(dt, this);
    this.cacti.update(dt, this);

    if (CONFIG.debug.godMode) {
      this.box.criticalTime = 0;
      this.box.integrity = Math.max(this.box.integrity, 1);
      this.box.wetness = Math.min(this.box.wetness, 99);
    }

    // Agua / vacío.
    const killY = this.world.waterLevel - CONFIG.water.killDepth;
    const fallen = this.players.find((p) => p.pos.y < killY || p.pos.y < CONFIG.water.voidY);
    if (fallen) this._splash(fallen);

    // Checkpoints (al pasar la caja).
    const cp = this.world.checkpointAt(c);
    if (cp > this.checkpointIndex) {
      this.checkpointIndex = cp;
      this.checkpointSnapshot = { ...this.box.snapshot(), bomb: this.bomb.health };
      this.events.emit('game:checkpoint', { index: cp });
    }

    if (this._checkFail()) return;

    if (this.world.inGoal(c)) this._win();
  }

  /** Si está parado en vidrio normal, el panel se va y al siguiente paso cae. */
  _stepGlass(p) {
    const g = p.ground;
    if (!g?.def || g.def.kind !== 'glass' || g.def.tempered || g.broken) return;
    if (!this.world.breakGlass(g)) return;
    p.grounded = false;
    p.ground = null;
    this.events.emit('glass:break', { id: g.def.id, x: p.pos.x, y: g.def.top, z: p.pos.z });
  }

  /** Alguien cayó al agua / al vacío: la caja se moja y se pierde una vida. Con vidas, reaparecen en el checkpoint. */
  _splash(player) {
    this.events.emit('game:splash', { player: player.id, x: player.pos.x, y: this.world.waterLevel, z: player.pos.z });
    this.box.addWet(CONFIG.box.wet.fallPenalty, 'fall');
    for (const p of this.players) p.setInput(0, 0, false);
    if (this._loseLife('fell') === 0) {
      // Era la última: a la pantalla de derrota (sin restar otra vida al terminar de caer).
      this._lifeSpent = true;
      this._fail(this._lossReason() ?? 'fell');
      return;
    }
    // Si la caída además deshizo / vació / explotó la caja, es la misma pérdida: vuelve como estaba en el checkpoint.
    if (this._lossReason()) this._restoreSnapshot = true;
    this._fadeToCheckpoint();
  }

  /** Resta una vida y avisa. Devuelve las que quedan. */
  _loseLife(cause) {
    this.lives = Math.max(0, this.lives - 1);
    this.events.emit('game:life', { lives: this.lives, cause });
    return this.lives;
  }

  /** Fundido y reaparición en el checkpoint (ver _stepRespawn). */
  _fadeToCheckpoint() {
    this.respawnTimer = CONFIG.respawn.fadeTime;
    this._teleported = false;
  }

  _stepRespawn(dt) {
    this.respawnTimer -= dt;
    if (!this._teleported && this.respawnTimer <= CONFIG.respawn.fadeTime / 2) {
      this._teleported = true;
      this._placeAtSpawn(this.currentSpawn);
      if (this._restoreSnapshot) {
        this._restoreSnapshot = false;
        this.box.reset(this.checkpointSnapshot);
        this.bomb.reset(this.checkpointSnapshot.bomb);
      }
      this.box.invuln = CONFIG.respawn.invulnTime;
      this.events.emit('game:respawn', { checkpoint: this.checkpointIndex });
    }
    if (this.respawnTimer <= 0) this.respawnTimer = 0;
    this._checkFail();
  }

  /** Por qué se perdió la caja ahora mismo, o null si sigue entera. */
  _lossReason() {
    const b = this.box;
    if (this.bomb.exploded) return 'exploded';
    if (b.dropped) return 'dropped';
    if (b.integrity <= 0) return 'empty';
    if (b.wetness >= 100) return 'soaked';
    return null;
  }

  _checkFail() {
    // Con la caja ya marcada para volver al checkpoint (se perdió en una caída), no se cuenta otra vez.
    if (CONFIG.debug.godMode || this._restoreSnapshot) return false;
    const reason = this._lossReason();
    if (!reason) return false;
    this._fail(reason);
    return true;
  }

  /** La caja se perdió: se la ve caer `failDelay` segundos y luego se decide (ver _stepFailing). */
  _fail(reason) {
    this.failReason = reason;
    this.failTimer = CONFIG.respawn.failDelay;
    this.state = 'failing';
    for (const p of this.players) p.setInput(0, 0, false);
  }

  _stepFailing(dt) {
    const b = this.box;
    if (b.dropped) {
      b.update(dt, this.p1, this.p2);
      const half = CONFIG.box.size.h / 2;
      const floor = this.world.floorBelow(b.center.x, b.center.z, b.center.y + 0.3);
      if (b.center.y - half < floor) {
        b.center.y = floor + half;
        b.dropVel.x = b.dropVel.y = b.dropVel.z = 0;
        b.spin.x = b.spin.z = 0;
      }
      b.center.y = Math.max(b.center.y, this.world.waterLevel - 1.2);
    }
    this.failTimer -= dt;
    if (this.failTimer > 0) return;
    // Se gasta la vida (si no se gastó ya al caer). Con vidas, reaparecen solos con la caja del checkpoint.
    if (!this._lifeSpent) this._loseLife(this.failReason);
    this._lifeSpent = false;
    if (!this.gameOver) {
      this.state = 'playing';
      this.failReason = null;
      this._restoreSnapshot = true;
      this._fadeToCheckpoint();
      return;
    }
    this.state = 'failed';
    const inWater = b.center.y < this.world.waterLevel + 0.2;
    const label = this.failReason === 'dropped' && inWater ? '¡La caja cayó al agua!' : FAIL_LABELS[this.failReason];
    this.events.emit('game:fail', { reason: this.failReason, label, inWater, lives: this.lives, gameOver: this.gameOver });
  }

  _win() {
    const b = this.box;
    const R = CONFIG.rating;
    let rating = 'damaged';
    const B = CONFIG.box.bomb;
    const bombHealth = B.enabled ? this.bomb.health : null;
    if (B.enabled) {
      rating = bombHealth >= B.rating.perfect ? 'perfect' : bombHealth >= B.rating.ok ? 'ok' : 'damaged';
    } else if (b.integrity >= R.perfect.integrity && b.wetness <= R.perfect.wetness) rating = 'perfect';
    else if (b.integrity >= R.ok.integrity && b.wetness <= R.ok.wetness) rating = 'ok';
    this.result = {
      time: this.runTime,
      integrity: b.integrity,
      wetness: b.wetness,
      bombHealth,
      rating,
      ratingLabel: RATING_LABELS[rating],
    };
    this.state = 'won';
    this.events.emit('game:win', { ...this.result });
  }
}

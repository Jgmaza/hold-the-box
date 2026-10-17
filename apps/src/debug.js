// Panel de ajuste en vivo (lil-gui). Abrir con ?debug en la URL o con F2.
// Edita CONFIG directamente: lo que funcione, se copia a src/config.js.
import GUI from 'lil-gui';
import { CONFIG } from './config.js';

export class DebugPanel {
  constructor(game) {
    this.game = game;
    const gui = (this.gui = new GUI({ title: 'No Sueltes La Caja · debug (F2)' }));

    const live = (this.live = { estado: '', caja: '', inclinación: 0, sincronía: 0, contenido: 0, mojado: 0, npcs: '', clima: '', fps: 0 });
    const f0 = gui.addFolder('En vivo');
    for (const k of Object.keys(live)) f0.add(live, k).listen().disable();

    const acts = { 'Salida': () => game.teleport(-1) };
    game.world.checkpoints.forEach((c, i) => (acts[`Checkpoint ${i + 1} (${c.def.id ?? i + 1})`] = () => game.teleport(i)));
    Object.assign(acts, {
      'Frente a la meta': () => game.teleport('goal'),
      'Llenar caja': () => game.box.reset(),
      'Mojar +30%': () => game.box.addWet(30, 'debug'),
      'Copiar CONFIG': () => {
        navigator.clipboard?.writeText(JSON.stringify(CONFIG, null, 2));
        console.log(CONFIG);
      },
    });
    const f1 = gui.addFolder('Acciones');
    f1.add(CONFIG.debug, 'godMode').name('modo dios (sin derrota)');
    for (const k of Object.keys(acts)) f1.add(acts, k);

    const P = CONFIG.player;
    const f2 = gui.addFolder('Jugador').close();
    f2.add(P, 'walkSpeed', 2, 10, 0.1);
    f2.add(P, 'jumpSpeed', 4, 14, 0.1);
    f2.add(CONFIG.physics, 'gravity', 10, 40, 0.5);
    f2.add(P, 'groundAccel', 5, 80, 1);
    f2.add(P, 'airAccel', 0, 40, 1);

    const C = CONFIG.carry;
    const f3 = gui.addFolder('Unión').close();
    f3.add(C, 'restDistance', 1, 3, 0.05);
    f3.add(C, 'maxDistance', 1.5, 4, 0.05);
    f3.add(C, 'stiffness', 2, 40, 0.5);

    const T = CONFIG.box.tilt;
    const f4 = gui.addFolder('Caja · inclinación');
    f4.add(T, 'tiltingDeg', 4, 30, 0.5);
    f4.add(T, 'criticalDeg', 10, 50, 0.5);
    f4.add(T, 'dropGrace', 0.2, 3, 0.05).name('dropGrace (s)');
    f4.add(T, 'heightGain', 0, 2, 0.05);
    f4.add(T, 'dragLeanDeg', 0, 40, 0.5);
    f4.add(T, 'twistDeg', 0, 60, 0.5);
    f4.add(T, 'tensionDeg', 0, 60, 0.5);
    f4.add(T, 'inertiaGain', 0, 1, 0.01);
    f4.add(T, 'stiffnessLow', 2, 80, 1);
    f4.add(T, 'stiffnessHigh', 2, 120, 1);
    f4.add(CONFIG.box.sync, 'speedMin', 0.2, 1.2, 0.05).name('velocidad sync 0');
    f4.add(CONFIG.box.sync, 'speedMax', 0.5, 1.6, 0.05).name('velocidad sync 1');

    const L = CONFIG.box.leak;
    const f5 = gui.addFolder('Huequito').close();
    f5.add(L, 'thresholdDeg', 0, 40, 0.5);
    f5.add(L, 'ratePerSec', 0, 30, 0.5);
    f5.add(L, 'sweeperDamage', 0, 40, 1);

    const Cat = CONFIG.box.cat;
    const fCat = gui.addFolder('Gato');
    fCat.add(Cat, 'enabled').name('gato activo');
    fCat.add(Cat, 'ragePerSec', 0, 8, 0.1).name('rabia / s');
    fCat.add(Cat, 'calmMul', 0.2, 1.5, 0.05).name('freno si van juntos');
    fCat.add(Cat, 'desyncMul', 1, 4, 0.1).name('prisa si se separan');
    fCat.add(Cat, 'warnRage', 1, 80, 1).name('pata (rabia)');
    fCat.add(Cat, 'scratchRage', 1, 90, 1).name('arañazo (rabia)');
    fCat.add(Cat, 'damageRage', 1, 100, 1).name('romper (rabia)');
    fCat.add(Cat, 'chipPerSec', 0, 20, 0.5).name('daño lento %/s');
    fCat.add(Cat, 'cooldown', 0.5, 12, 0.1).name('pausa arañazo (s)');
    fCat.add(Cat, 'goalDrainPerSec', 0, 40, 1).name('meta quietos %/s');
    fCat.add(Cat, 'hurrySpeed', 0, 4, 0.1).name('prisa para salvarse');
    fCat.add(Cat, 'knock', 0, 8, 0.1).name('empujón');
    fCat.add(Cat, 'kick', 0, 500, 10).name('sacudida');

    const BombCfg = CONFIG.box.bomb;
    const fBomb = gui.addFolder('Bomba');
    fBomb.add(BombCfg, 'enabled').name('bomba activa');
    fBomb.add(BombCfg, 'fuseTime', 10, 180, 1).name('mecha (s)');
    fBomb.add(BombCfg, 'warnTime', 3, 40, 1).name('aviso (s)');

    const W = CONFIG.box.wet;
    const f6 = gui.addFolder('Mojado').close();
    f6.add(W, 'fallPenalty', 0, 100, 1);
    f6.add(W, 'geyserRate', 0, 100, 1);
    f6.add(W, 'dryRate', 0, 10, 0.1);
    f6.add(W, 'speedPenalty', 0, 1, 0.05);
    f6.add(W, 'stabilityPenalty', 0, 3, 0.05);

    const f7 = gui.addFolder('Cámara').close();
    f7.add(CONFIG.camera.offset, 'y', 2, 20, 0.5).name('altura');
    f7.add(CONFIG.camera.offset, 'z', 2, 25, 0.5).name('distancia');
    f7.add(CONFIG.camera, 'fov', 25, 90, 1);

    const NP = CONFIG.npcs;
    const f8 = gui.addFolder('NPCs').close();
    f8.add(NP, 'enabled').name('activos');
    for (const k of ['easy', 'medium', 'hard']) {
      const t = NP[k];
      const f = f8.addFolder(k).close();
      if ('alwaysChase' in t) f.add(t, 'alwaysChase').name('persigue siempre');
      f.add(t, 'wanderSpeed', 0, 8, 0.1);
      if ('chaseSpeed' in t) f.add(t, 'chaseSpeed', 0, 10, 0.1);
      f.add(t, 'visionRange', 0, 15, 0.5);
      f.add(t, 'visionFov', 10, 360, 5);
      f.add(t, 'reaction', 0, 2, 0.05).name('reaction (s)');
      f.add(t, 'cooldown', 0, 6, 0.1).name('cooldown (s)');
      f.add(t, 'damage', 0, 30, 1).name('contenido −');
      f.add(t, 'wet', 0, 40, 1).name('mojado +');
    }

    const WC = CONFIG.weather;
    const f9 = gui.addFolder('Clima').close();
    f9.add(WC, 'enabled').name('activo');
    const fr = f9.addFolder('lluvia').close();
    fr.add(WC.rain, 'wetRate', 0, 30, 0.5).name('mojado %/s (aguacero)');
    fr.add(WC.rain, 'drizzle', 0, 1, 0.05).name('llovizna');
    fr.add(WC.rain, 'slip', 0.2, 1, 0.05).name('agarre (resbala)');
    fr.add(WC.rain, 'period', 2, 15, 0.5).name('ciclo (s)');
    fr.add(WC.rain, 'activeTime', 0.5, 8, 0.1).name('aguacero (s)');
    const fw = f9.addFolder('viento').close();
    fw.add(WC.wind, 'pushSpeed', 0, 8, 0.1).name('empuje m/s');
    fw.add(WC.wind, 'leanDeg', 0, 40, 0.5).name('inclina caja °');
    fw.add(WC.wind, 'drainRate', 0, 20, 0.5).name('contenido %/s');
    fw.add(WC.wind, 'syncRelief', 0, 3, 0.1).name('castigo desincronía');
    fw.add(WC.wind, 'period', 2, 15, 0.5).name('ciclo (s)');
    fw.add(WC.wind, 'activeTime', 0.5, 8, 0.1).name('ráfaga (s)');
    const fo = f9.addFolder('oleaje').close();
    fo.add(WC.waves, 'pushSpeed', 0, 10, 0.1).name('empuje m/s');
    fo.add(WC.waves, 'wetRate', 0, 150, 1).name('mojado %/s (cresta)');
    fo.add(WC.waves, 'leanDeg', 0, 40, 0.5).name('inclina caja °');
    fo.add(WC.waves, 'crestWidth', 0.4, 4, 0.1).name('ancho cresta m');
    fo.add(WC.waves, 'period', 3, 15, 0.5).name('ciclo (s)');
    fo.add(WC.waves, 'warnTime', 0.5, 4, 0.1).name('aviso (s)');
    fo.add(WC.waves, 'activeTime', 0.8, 6, 0.1).name('cruce (s)');

    this._frames = 0;
    this._t0 = performance.now();
  }

  destroy() {
    this.gui.destroy();
  }

  toggle() {
    this.visible = !(this.visible ?? true);
    this.gui.show(this.visible);
  }

  update() {
    const g = this.game;
    const b = g.box;
    const l = this.live;
    l.estado = g.state;
    l.caja = b.state;
    l['inclinación'] = +b.tilt.mag.toFixed(1);
    l['sincronía'] = +b.sync.toFixed(2);
    l.contenido = +b.integrity.toFixed(1);
    l.mojado = +b.wetness.toFixed(1);
    const npcs = g.npcs.list;
    l.npcs = npcs.length ? `${npcs.filter((n) => n.state === 'alert' || n.state === 'attack').length}/${npcs.length} atacando` : '—';
    const z = g.weather.current;
    l.clima = z ? `${z.type}:${z.phase} ${z.intensity.toFixed(2)}` : '—';
    this._frames++;
    const now = performance.now();
    if (now - this._t0 > 500) {
      l.fps = Math.round((this._frames * 1000) / (now - this._t0));
      this._frames = 0;
      this._t0 = now;
    }
  }
}

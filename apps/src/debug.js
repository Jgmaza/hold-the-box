// Panel de ajuste en vivo (lil-gui). Abrir con ?debug en la URL o con F2.
// Edita CONFIG directamente: lo que funcione, se copia a src/config.js.
import GUI from 'lil-gui';
import { CONFIG } from './config.js';

export class DebugPanel {
  constructor(game) {
    this.game = game;
    const gui = (this.gui = new GUI({ title: 'No Sueltes La Caja · debug (F2)' }));

    const live = (this.live = { estado: '', caja: '', inclinación: 0, sincronía: 0, contenido: 0, mojado: 0, fps: 0 });
    const f0 = gui.addFolder('En vivo');
    for (const k of Object.keys(live)) f0.add(live, k).listen().disable();

    const acts = {
      'Salida': () => game.teleport(-1),
      'Checkpoint 1': () => game.teleport(0),
      'Checkpoint 2': () => game.teleport(1),
      'Frente a la meta': () => game.teleport('goal'),
      'Llenar caja': () => game.box.reset(),
      'Mojar +30%': () => game.box.addWet(30, 'debug'),
      'Copiar CONFIG': () => {
        navigator.clipboard?.writeText(JSON.stringify(CONFIG, null, 2));
        console.log(CONFIG);
      },
    };
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

    this._frames = 0;
    this._t0 = performance.now();
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
    this._frames++;
    const now = performance.now();
    if (now - this._t0 > 500) {
      l.fps = Math.round((this._frames * 1000) / (now - this._t0));
      this._frames = 0;
      this._t0 = now;
    }
  }
}

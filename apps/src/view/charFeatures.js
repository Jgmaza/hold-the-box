// Frijol base de los personajes + cara + rasgos (pelo, barba, bigote, gafas, gorros, bufanda, chaleco, pantalón).
// Cuerpo y ropa con piezas suaves de Parts (parts.js). La cabeza es low-poly como en las referencias (lowpolyHead.js):
// forma, nariz, pelo y barba en una malla de caras planas; ojos, cejas y boca van encima con face(), pegados a la
// superficie, y finish() arma la cabeza al final. Base: torso cápsula (radio 0.3, y 0..1.2), cabeza en y 1.36.
// Miran hacia -Z.
import * as pc from 'playcanvas';
import { HEAD, headGeometry, headSurface } from './lowpolyHead.js';

/** Hombros a la altura del torso: el brazo sale hacia -Z y el puño va en la punta. */
export const SHOULDER = { x: 0.34, y: 1.02, z: -0.06 };

const EYE_Y = 1.355; // altura de los ojos y las gafas
const BROW_Y = 1.4;
const MOUTH_Y = 1.245;
// Gorra y gorros de lana un poco arriba para que se vean las cejas.
const HAT_LIFT = { cap: 0.018, beanie: 0.035 };

const DEG = Math.PI / 180;

/** Base + rasgos para armar un personaje dentro de `parent`. */
export function features(gfx, P, parent) {
  const m = (hex, opts) => P.mat(hex, opts);
  // Lo que define la cabeza: lo llenan face(), hair() y beard(); finish() la arma.
  const spec = { nose: 1, chin: 1, hair: null, beard: null };
  const shade = (hex, mul) => m(hex, { mul, gloss: 0.2 });
  const sides = (fn) => [-1, 1].forEach(fn);
  /** Línea suave (cadena de cápsulas) por una lista de puntos. */
  const line = (mat, pts, r, name = 'linea', at = parent) => {
    for (let i = 1; i < pts.length; i++) P.limb(at, mat, pts[i - 1], pts[i], r, { shadows: false, name });
  };
  /** Punto sobre la cabeza (frente a -Z) en (x, y), `out` metros hacia afuera de la piel. */
  const surf = (x, y, out = 0) => headSurface(spec, x, y, out);
  /** Giro para que una pieza en (x, y) quede tangente a la cabeza (su -Z hacia afuera). */
  const tilt = (x, y, roll = 0) => [Math.asin((y - HEAD.y) / HEAD.ry) / DEG, -Math.asin(x / HEAD.rx) / DEG, roll];
  /** Puntos de un arco vertical sobre una cúpula elíptica (radios `rx`, `ry`) girado `yaw` grados. */
  const dome = (c, rx, ry, yaw, from = 12, to = 168, n = 9, lift = 1.01) => {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = (from + ((to - from) * i) / (n - 1)) * DEG;
      const h = Math.cos(t) * rx * lift;
      pts.push([c[0] + Math.sin(yaw * DEG) * h, c[1] + Math.sin(t) * ry * lift, c[2] - Math.cos(yaw * DEG) * h]);
    }
    return pts;
  };
  /** `n` piezas alrededor de un eje vertical a radio `r` y altura `y`. */
  const around = (n, r, y, fn, z0 = 0) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      fn([Math.sin(a) * r, y, z0 + Math.cos(a) * r], a, i);
    }
  };

  /** Bigote low-poly bajo la nariz; `curly`: manubrio con las puntas enroscadas. */
  const stache = (color, curly = false) => {
    const mat = m(color, { gloss: 0.12 });
    sides((s) => {
      P.facet(parent, mat, surf(s * 0.05, 1.272, 0.012), [0.1, 0.05, 0.05], { rot: [0, -s * 12, s * 10], name: 'bigote' });
      // Manubrio: las puntas suben; en la barba bajan por las comisuras hasta unirse con ella.
      P.facet(parent, mat, surf(s * 0.105, curly ? 1.282 : 1.26, 0.008), [0.07, 0.038, 0.045], { rot: [0, -s * 25, curly ? s * 28 : -s * 35], name: 'bigote' });
      if (curly) P.ring(parent, mat, surf(s * 0.146, 1.308, 0.006), 0.02, 0.01, { rot: [90, s * 25, 0], name: 'rizo' });
    });
  };

  return {
    /**
     * Cuerpo: torso, cabeza, orejas y brazos. Mangas 'short' (brazo de piel) o 'long' (del color de la camisa).
     * Devuelve los brazos para que la vista los mueva: [{ side, shoulder, joint, arm, fist }]
     * (`arm` mide 1 en Z y se estira con su escala; `fist` mide 1 y se escala).
     */
    body(c, { sleeves = 'short' } = {}) {
      const shirt = m(c.shirt);
      const skin = m('skin', { gloss: 0.3 });
      P.limb(parent, shirt, [0, 0.3, 0], [0, 0.9, 0], 0.3, { name: 'torso' });
      P.ring(parent, shade(c.shirt, 0.85), [0, 1.135, 0], 0.18, 0.026, { name: 'cuello' });
      sides((s) => {
        P.facet(parent, skin, [s * 0.248, 1.35, 0.01], [0.06, 0.11, 0.08], { segs: [6, 5], name: 'oreja' });
        P.facet(parent, m('skin', { mul: 0.85 }), [s * 0.27, 1.35, 0.005], [0.02, 0.06, 0.04], { segs: [6, 4], shadows: false, name: 'oreja-dentro' });
      });

      const armRigs = [];
      const hem = shade(c.shirt, 0.85);
      for (const side of [-1, 1]) {
        const shoulder = gfx.group(side < 0 ? 'shoulder-L' : 'shoulder-R', parent);
        shoulder.setLocalPosition(side * SHOULDER.x, SHOULDER.y, SHOULDER.z);
        const joint = P.ball(shoulder, shirt, [0, 0, 0], [0.22, 0.22, 0.22], { name: 'joint' });
        if (sleeves === 'short') {
          P.limb(shoulder, shirt, [0, 0, 0], [0, 0, -0.13], 0.085, { name: 'manga' });
          P.ring(shoulder, hem, [0, 0, -0.19], 0.076, 0.016, { rot: [90, 0, 0], shadows: false, name: 'manga-borde' });
        }
        const arm = gfx.group('arm', shoulder);
        arm.setLocalPosition(0, 0, -0.25);
        arm.setLocalScale(0.12, 0.12, 0.5);
        P.disc(arm, sleeves === 'short' ? skin : shirt, [0, 0, 0], 0.5, 1, { rot: [90, 0, 0], name: 'brazo' });
        const fist = P.ball(shoulder, skin, [0, 0, -0.52], [0.15, 0.15, 0.15], { name: 'fist' });
        P.ball(fist, skin, [-side * 0.34, 0.26, -0.12], [0.42, 0.36, 0.55], { name: 'pulgar' });
        if (sleeves === 'long') P.ring(fist, hem, [0, 0, 0.5], 0.42, 0.11, { rot: [90, 0, 0], name: 'puño-manga' });
        armRigs.push({ side, shoulder, joint, arm, fist });
      }
      return armRigs;
    },

    /**
     * Cara como en las fotos: ojos pequeños con párpado, cejas y boca fina sobre la cabeza low-poly (la nariz, el mentón y
     * los pómulos ya vienen en la malla).
     * `mood`: 'serio' (ceño fruncido) | 'tranquilo' | 'cansado' (párpados caídos) | 'amable' (sonrisa leve) | 'picaro' (una ceja arriba).
     * `browY`: altura de las cejas (más arriba si hay gafas de marco grueso). `nose`: tamaño (1 = normal).
     * `mouth: false` cuando la tapa la barba (queda solo el labio de abajo). `wrinkles`: frente y patas de gallo.
     * `lashes` / `blush`: pestañas y mejillas.
     */
    face({ brow, mood = 'tranquilo', browY = BROW_Y, browR = 0.009, nose = 1, mouth = true, wrinkles = false, lashes = false, blush = false }) {
      spec.nose = nose;
      const crease = m('skin', { mul: 0.78, gloss: 0.2 });
      const lid = m('skin', { mul: 0.92, gloss: 0.25 });
      const white = m('#f3eee6', { gloss: 0.5 });
      const iris = m('#2a221d', { gloss: 0.7 });
      const browMat = m(brow, { gloss: 0.1 });
      const drop = { serio: 0.42, tranquilo: 0.3, cansado: 0.5, amable: 0.2, picaro: 0.32 }[mood];

      sides((s) => {
        const x = s * 0.085;
        const y = EYE_Y;
        // Ojo: blanco almendrado, iris oscuro y el párpado de arriba que da la mirada.
        P.facet(parent, white, surf(x, y, -0.003), [0.054, 0.028, 0.024], { rot: tilt(x, y), segs: [8, 5], shadows: false, name: 'ojo' });
        P.facet(parent, iris, surf(x, y - 0.002, 0.003), [0.026, 0.028, 0.018], { rot: tilt(x, y), segs: [6, 5], shadows: false, name: 'iris' });
        const roll = mood === 'serio' ? s * 14 : mood === 'cansado' ? -s * 10 : 0;
        const ly = y + 0.014 - drop * 0.028 + 0.013;
        P.facet(parent, lid, surf(x, ly, -0.001), [0.066, 0.026, 0.03], { rot: tilt(x, ly, roll), segs: [8, 5], shadows: false, name: 'parpado' });
        line(crease, [surf(x - 0.027, y + 0.004, 0.003), surf(x, y - 0.016, 0.003), surf(x + 0.027, y + 0.003, 0.003)], 0.003, 'ojo-abajo');
        if (mood === 'cansado') line(crease, [surf(x - 0.024, y - 0.028, 0.002), surf(x, y - 0.034, 0.002), surf(x + 0.024, y - 0.028, 0.002)], 0.003, 'ojera');
        if (lashes) {
          for (let i = 0; i < 3; i++) {
            const a = surf(x + s * (0.014 + i * 0.009), y + 0.013 - i * 0.003, 0.012);
            line(iris, [a, [a[0] + s * 0.01, a[1] + 0.01, a[2] - 0.004]], 0.0028, 'pestaña');
          }
        }

        // Ceja: interior, medio y exterior según la expresión.
        const shape = { serio: [-0.02, -0.004, 0.006], tranquilo: [0, 0.006, 0], cansado: [0.006, 0.004, -0.01], amable: [-0.002, 0.012, 0], picaro: [0, 0.008, 0] }[mood];
        const up = mood === 'picaro' && s > 0 ? 0.014 : 0;
        const bx = [0.035, 0.085, 0.135];
        line(browMat, bx.map((b, i) => surf(s * b, browY + shape[i] + up, 0.007)), browR, 'ceja');

        if (wrinkles) {
          // Patas de gallo.
          line(crease, [surf(s * 0.128, y + 0.004, 0.002), surf(s * 0.152, y + 0.014, 0.002)], 0.003, 'arruga');
          line(crease, [surf(s * 0.128, y - 0.006, 0.002), surf(s * 0.152, y - 0.014, 0.002)], 0.003, 'arruga');
        }
        if (blush) P.facet(parent, m('#ef9f92', { gloss: 0.2 }), surf(s * 0.13, 1.3, -0.004), [0.07, 0.04, 0.02], { rot: tilt(s * 0.13, 1.3), segs: [8, 5], shadows: false, name: 'mejilla' });
      });

      if (wrinkles) for (const fy of [1.445, 1.468]) line(crease, [-0.065, 0, 0.065].map((x) => surf(x, fy + (x === 0 ? 0.004 : 0), 0.002)), 0.0032, 'arruga-frente');

      // Boca: línea fina con las comisuras según la expresión, y el labio de abajo.
      const corner = { serio: -0.005, tranquilo: 0, cansado: -0.004, amable: 0.009, picaro: 0.004 }[mood];
      if (mouth) {
        const lip = m('skin', { mul: 0.62, gloss: 0.3 });
        const pts = [[-0.044, corner], [-0.021, 0], [0, -0.002], [0.021, 0], [0.044, corner + (mood === 'picaro' ? 0.008 : 0)]];
        line(lip, pts.map(([x, d]) => surf(x, MOUTH_Y + d, 0.004)), 0.0055, 'boca');
        P.facet(parent, m('skin', { mul: 0.88, gloss: 0.3 }), surf(0, MOUTH_Y - 0.013, -0.002), [0.046, 0.015, 0.02], { rot: tilt(0, MOUTH_Y - 0.013), segs: [8, 4], shadows: false, name: 'labio' });
      } else {
        P.facet(parent, m('skin', { mul: 0.75, gloss: 0.3 }), surf(0, MOUTH_Y - 0.006, 0.02), [0.05, 0.016, 0.02], { segs: [8, 4], shadows: false, name: 'labio' });
      }
    },

    /** Arma la cabeza low-poly con lo que dejaron face(), hair() y beard(). Se llama después de `look`. */
    finish() {
      const rgb = (hex) => {
        const c = gfx.color(hex);
        return [c.r, c.g, c.b];
      };
      const hair = rgb(spec.hair?.color ?? 'skin');
      const geo = headGeometry(spec, { skin: rgb('skin'), hair, beard: spec.beard ? rgb(spec.beard) : hair });
      const mat = gfx.dynamic('#ffffff', { gloss: 0.22 });
      mat.diffuseVertexColor = true;
      mat.vertexColorGamma = true;
      mat.update();
      P._entity(pc.Mesh.fromGeometry(gfx.device, geo), mat, parent, { pos: [0, HEAD.y, 0], name: 'head' });
      // Bigote de la barba: dos alas bajo la nariz que llegan a la barba por las comisuras.
      if (spec.beard) stache(spec.beard);
    },

    /** Pelo pintado en la cabeza low-poly: 'short' (corto), 'side' (de lado, con raya), 'back' (bajo un gorro), 'bob' (melena). */
    hair(color, style = 'short') {
      spec.hair = { color, style };
    },

    /** Barba cerrada con bigote, pintada y con volumen en la cabeza low-poly. */
    beard(color) {
      spec.beard = color;
    },

    /** Bigote; `curly`: manubrio con las puntas enroscadas. */
    mustache(color, { curly = false } = {}) {
      stache(color, curly);
    },

    /** Gafas 'round' (aros finos) o 'rect' (marco grueso), con patillas hasta las orejas. */
    glasses(color, shape = 'round') {
      const mat = m(color, { gloss: 0.8 });
      const lens = m('#dff3ff', { opacity: 0.28, gloss: 0.95 });
      const lx = 0.088;
      // Apoyadas en la nariz: un poco delante del puente y de los ojos.
      const fz = Math.min(surf(0, EYE_Y)[2], surf(lx, EYE_Y)[2]) - 0.016;
      const t = shape === 'rect' ? 0.009 : 0.006;
      let edge = lx + 0.05;
      sides((s) => {
        const x = s * lx;
        if (shape === 'round') {
          P.ring(parent, mat, [x, EYE_Y, fz], 0.05, t, { rot: [90, 0, 0], shadows: false, name: 'aro' });
          P.disc(parent, lens, [x, EYE_Y, fz], 0.048, 0.004, { rot: [90, 0, 0], shadows: false, name: 'lente' });
        } else {
          const w = 0.07;
          const h = 0.043;
          const [l, r, top, bot] = [x - w, x + w, EYE_Y + h, EYE_Y - h];
          line(mat, [[l, top, fz], [r, top, fz], [r, bot + 0.01, fz], [r - 0.012, bot, fz], [l + 0.012, bot, fz], [l, bot + 0.01, fz], [l, top, fz]], t, 'marco');
          gfx.prim('box', lens, { parent, pos: [x, EYE_Y, fz], scale: [w * 2, h * 2, 0.004], shadows: false, name: 'lente' });
          edge = lx + w;
        }
        // Bisagra hasta el costado de la cabeza y patilla hacia la oreja.
        line(mat, [[s * edge, EYE_Y + 0.01, fz], [s * 0.24, EYE_Y + 0.01, fz + 0.03], [s * 0.268, EYE_Y, -0.1], [s * 0.272, EYE_Y + 0.005, 0.0]], t, 'patilla');
      });
      line(mat, [[-lx + (shape === 'rect' ? 0.07 : 0.05), EYE_Y + 0.008, fz], [0, EYE_Y + 0.016, fz - 0.005], [lx - (shape === 'rect' ? 0.07 : 0.05), EYE_Y + 0.008, fz]], t, 'puente');
      sides((s) => P.ball(parent, m('#d8dde2', { opacity: 0.8 }), surf(s * 0.03, EYE_Y - 0.03, 0.006), [0.018, 0.012, 0.018], { shadows: false, name: 'almohadilla' }));
    },

    /** Gorra de béisbol: cúpula con costuras, botón, banda y visera curva. */
    cap(color) {
      const hat = P.group('sombrero', parent, [0, HAT_LIFT.cap, 0]);
      const mat = m(color, { gloss: 0.3 });
      const seam = shade(color, 0.72);
      const c = [0, 1.45, 0.01];
      P.ball(hat, mat, c, [0.545, 0.42, 0.545], { name: 'gorra' });
      P.disc(hat, mat, [0, 1.43, 0.01], 0.272, 0.06, { name: 'gorra-banda' });
      for (const yaw of [0, 60, 120]) line(seam, dome(c, 0.2725, 0.21, yaw), 0.005, 'costura', hat);
      P.ball(hat, mat, [0, 1.662, 0.01], [0.055, 0.03, 0.055], { name: 'boton' });
      // Ojales de ventilación.
      for (const yaw of [-50, 50, 130, -130]) {
        const a = yaw * DEG;
        P.ball(hat, seam, [Math.sin(a) * 0.2, 1.6, 0.01 - Math.cos(a) * 0.2], [0.022, 0.022, 0.022], { shadows: false, name: 'ojal' });
      }
      // Visera curva: centro + alas que bajan un poco a los lados; por debajo más oscura.
      P.ball(hat, mat, [0, 1.44, -0.3], [0.32, 0.035, 0.26], { rot: [-6, 0, 0], name: 'visera' });
      sides((s) => P.ball(hat, mat, [s * 0.1, 1.432, -0.285], [0.17, 0.034, 0.22], { rot: [-6, s * 18, -s * 9], name: 'visera' }));
      P.ball(hat, seam, [0, 1.425, -0.29], [0.3, 0.02, 0.24], { rot: [-6, 0, 0], shadows: false, name: 'visera-abajo' });
      P.limb(hat, seam, [-0.08, 1.44, 0.27], [0.08, 1.44, 0.27], 0.012, { name: 'ajuste' });
    },

    /** Gorro de lana: cúpula, borde enrollado y acanalado; con rayas, puntos y pompón si se piden. */
    beanie(color, { brim = color, stripes = [], dots = null, pompom = null } = {}) {
      const hat = P.group('sombrero', parent, [0, HAT_LIFT.beanie, 0]);
      const knit = m(color, { gloss: 0.06 });
      P.ball(hat, knit, [0, 1.47, 0.01], [0.55, 0.44, 0.55], { name: 'gorro' });
      // Rayas: aros pegados a la cúpula (radio de la elipse a esa altura).
      const domeR = (y) => 0.275 * Math.sqrt(Math.max(0, 1 - ((y - 1.47) / 0.22) ** 2));
      stripes.forEach((hex, i) => {
        const y = 1.52 + i * 0.05;
        P.ring(hat, m(hex, { gloss: 0.06 }), [0, y, 0.01], domeR(y), 0.017, { name: 'raya' });
      });
      // Puntos tejidos entre las rayas (patrón nórdico).
      if (dots) around(18, domeR(1.545) + 0.008, 1.545, (p, a, i) => P.ball(hat, m(dots[i % dots.length], { gloss: 0.06 }), p, [0.03, 0.03, 0.03], { shadows: false, name: 'punto' }), 0.01);
      // Arrugas del tejido en la cúpula (gorro liso).
      if (!stripes.length) for (let yaw = 0; yaw < 360; yaw += 30) line(shade(color, 0.85), dome([0, 1.47, 0.01], 0.275, 0.22, yaw, 25, 80, 5), 0.008, 'tejido', hat);
      const cuff = m(brim, { gloss: 0.06 });
      P.ring(hat, cuff, [0, 1.43, 0.01], 0.262, 0.055, { name: 'gorro-borde' });
      around(28, 0.312, 1.43, (p, a) => P.ball(hat, shade(brim, 0.86), p, [0.025, 0.1, 0.025], { rot: [0, (a * 180) / Math.PI, 0], shadows: false, name: 'acanalado' }), 0.01);
      if (pompom) {
        const pm = m(pompom, { gloss: 0.04 });
        P.ball(hat, pm, [0, 1.715, 0.01], [0.13, 0.12, 0.13], { name: 'pompon' });
        around(10, 0.05, 1.72, (p, a, i) => P.ball(hat, pm, [p[0], p[1] + (i % 2 ? 0.03 : -0.01), p[2]], [0.06, 0.06, 0.06], { name: 'pompon' }), 0.01);
        P.ball(hat, pm, [0, 1.78, 0.01], [0.06, 0.05, 0.06], { name: 'pompon' });
      }
    },

    /** Casco de obra: cúpula con tres crestas, ala alrededor (más ancha adelante) y sujeción por dentro. */
    hardHat(color) {
      const mat = m(color, { gloss: 0.65 });
      const c = [0, 1.48, 0.01];
      P.ball(parent, mat, c, [0.56, 0.44, 0.56], { name: 'casco' });
      line(mat, dome(c, 0.28, 0.22, 0, 20, 160, 9, 1.04), 0.022, 'cresta');
      sides((s) => line(mat, dome([s * 0.1, 1.475, 0.01], 0.26, 0.2, 0, 30, 150, 7, 1.0), 0.012, 'cresta'));
      P.disc(parent, mat, [0, 1.43, 0.01], 0.31, 0.025, { name: 'ala' });
      P.ring(parent, mat, [0, 1.43, 0.01], 0.31, 0.014, { name: 'ala-borde' });
      P.ball(parent, mat, [0, 1.435, -0.25], [0.42, 0.03, 0.22], { name: 'ala-frente' });
      P.ring(parent, shade('#3a3c40', 1), [0, 1.415, 0.01], 0.245, 0.012, { name: 'sujecion' });
      // Escudo en la frente.
      P.disc(parent, shade(color, 0.85), [0, 1.53, -0.25], 0.035, 0.012, { rot: [70, 0, 0], shadows: false, name: 'escudo' });
    },

    /** Bufanda tejida: dos vueltas al cuello en bolitas de colores + caída al frente a rayas con flecos. */
    scarf(colors) {
      const knit = (i) => m(colors[i % colors.length], { gloss: 0.04 });
      around(18, 0.205, 1.12, (p, a, i) => P.ball(parent, knit(i), p, [0.13, 0.12, 0.13], { name: 'bufanda' }));
      around(16, 0.19, 1.2, (p, a, i) => P.ball(parent, knit(i + 1), p, [0.11, 0.1, 0.11], { name: 'bufanda' }));
      // Caída: tira aplanada (grupo con Z encogida) con rayas un poco más anchas encima.
      const tail = P.group('bufanda-cola', parent, [-0.11, 1.04, -0.3], [8, 0, -4]);
      tail.setLocalScale(1, 1, 0.32);
      P.limb(tail, knit(0), [0, 0, 0], [0, -0.46, 0], 0.062, { name: 'bufanda-cola' });
      for (let i = 0; i < 5; i++) P.limb(tail, knit(1 + (i % 2)), [0, -0.06 - i * 0.085, 0], [0, -0.09 - i * 0.085, 0], 0.065, { name: 'bufanda-raya' });
      for (let i = 0; i < 5; i++) {
        const x = -0.048 + i * 0.024;
        P.limb(tail, knit(0), [x, -0.5, 0], [x, -0.58, 0], 0.009, { shadows: false, name: 'fleco' });
      }
    },

    /** Chaleco reflectivo: abierto adelante con cierre, tirantes, bolsillos y franjas grises. */
    vest(color, shirt, stripe = '#c3c8cf') {
      const mat = m(color, { gloss: 0.35 });
      const refl = m(stripe, { gloss: 0.95 });
      P.disc(parent, mat, [0, 0.66, 0], 0.316, 0.66, { name: 'chaleco' });
      for (const y of [0.33, 0.99]) P.ring(parent, mat, [0, y, 0], 0.316, 0.018, { name: 'chaleco-borde' });
      for (const y of [0.5, 0.74]) P.disc(parent, refl, [0, y, 0], 0.32, 0.05, { name: 'franja' });
      // Tirantes por encima de los hombros, con franja.
      sides((s) => {
        const pts = [[s * 0.16, 0.98, -0.25], [s * 0.18, 1.1, -0.18], [s * 0.18, 1.15, 0], [s * 0.18, 1.1, 0.18], [s * 0.16, 0.98, 0.25]];
        line(mat, pts, 0.045, 'tirante');
        line(refl, pts.map(([x, y, z]) => [x, y + 0.015, z + Math.sign(z) * 0.035]), 0.012, 'tirante-franja');
        P.ball(parent, shade(color, 0.88), [s * 0.17, 0.45, -0.3], [0.14, 0.1, 0.05], { name: 'bolsillo' });
      });
      // Abertura del frente (se ve la camisa) con el cierre.
      const front = P.group('abertura', parent, [0, 0, -0.312]);
      front.setLocalScale(1, 1, 0.3);
      P.limb(front, m(shirt), [0, 0.37, 0], [0, 0.96, 0], 0.035, { name: 'abertura' });
      sides((s) => P.limb(front, shade(color, 0.8), [s * 0.04, 0.36, 0.01], [s * 0.04, 0.97, 0.01], 0.008, { shadows: false, name: 'cierre' }));
    },

    /** Pantalón: la parte de abajo del frijol de otro color, con costura al centro. */
    pants(color) {
      P.ball(parent, m(color), [0, 0.28, 0], [0.62, 0.56, 0.62], { name: 'pantalon' });
      line(shade(color, 0.75), [[0, 0.33, -0.308], [0, 0.18, -0.29], [0, 0.06, -0.24]], 0.007, 'costura');
    },
  };
}

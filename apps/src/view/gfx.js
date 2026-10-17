// Helpers gráficos: materiales con la paleta, texturas desde canvas o PNG, entidades primitivas.
import * as pc from 'playcanvas';
import { hexToRgb } from '../palette.js';

export class Gfx {
  constructor(app, palette) {
    this.app = app;
    this.device = app.graphicsDevice;
    this.palette = palette;
    this._mats = new Map();
  }

  color(keyOrHex, mul = 1) {
    const hex = keyOrHex.startsWith('#') ? keyOrHex : this.palette[keyOrHex];
    const [r, g, b] = hexToRgb(hex ?? '#ff00ff');
    return new pc.Color(r * mul, g * mul, b * mul);
  }

  /** Material de color sólido (cacheado). */
  solid(keyOrHex, { gloss = 0.25, emissive = 0, opacity = 1, unlit = false, mul = 1 } = {}) {
    const id = `${keyOrHex}|${gloss}|${emissive}|${opacity}|${unlit}|${mul}`;
    if (this._mats.has(id)) return this._mats.get(id);
    const m = new pc.StandardMaterial();
    const c = this.color(keyOrHex, mul);
    if (unlit) {
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = c;
    } else {
      m.diffuse = c;
      m.gloss = gloss;
      m.metalness = 0;
      m.useMetalness = true;
      if (emissive) m.emissive = this.color(keyOrHex, emissive);
    }
    if (opacity < 1) {
      m.opacity = opacity;
      m.blendType = pc.BLEND_NORMAL;
      m.depthWrite = false;
    }
    m.update();
    this._mats.set(id, m);
    return m;
  }

  /** Material nuevo (no cacheado) para cosas que cambian de color en vivo. */
  dynamic(keyOrHex, opts = {}) {
    const m = new pc.StandardMaterial();
    m.diffuse = this.color(keyOrHex);
    m.gloss = opts.gloss ?? 0.25;
    m.useMetalness = true;
    m.metalness = 0;
    m.update();
    return m;
  }

  /** Material con textura. `cutout`: recorte por alfa (PNG transparentes). */
  textured(texture, { unlit = false, cutout = false, twoSided = false, tint = null } = {}) {
    const m = new pc.StandardMaterial();
    if (unlit) {
      m.useLighting = false;
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissiveMap = texture;
      m.emissive = tint ?? new pc.Color(1, 1, 1);
    } else {
      m.diffuseMap = texture;
      m.diffuse = tint ?? new pc.Color(1, 1, 1);
      m.gloss = 0.2;
      m.useMetalness = true;
      m.metalness = 0;
    }
    if (cutout) {
      m.opacityMap = texture;
      m.opacityMapChannel = 'a';
      m.alphaTest = 0.4;
    }
    if (twoSided) {
      m.cull = pc.CULLFACE_NONE;
      m.twoSidedLighting = true;
    }
    m.update();
    return m;
  }

  textureFromCanvas(canvas) {
    const t = new pc.Texture(this.device, {
      width: canvas.width,
      height: canvas.height,
      format: pc.PIXELFORMAT_SRGBA8,
      mipmaps: true,
      minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      anisotropy: 4,
    });
    t.setSource(canvas);
    return t;
  }

  /** Carga un PNG/JPG. Devuelve Promise<pc.Texture|null> (null si falla: se sigue con placeholder). */
  loadTexture(url) {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(this.textureFromCanvas(img));
      img.onerror = () => {
        console.warn('[gfx] no se pudo cargar', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  /**
   * Entidad primitiva: type 'box' | 'capsule' | 'cylinder' | 'sphere' | 'cone' | 'plane'.
   * `scale` es el tamaño (las primitivas miden 1).
   */
  prim(type, material, { parent = null, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], shadows = true, name = type } = {}) {
    const e = new pc.Entity(name);
    e.addComponent('render', { type, material, castShadows: shadows, receiveShadows: true });
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    e.setLocalScale(scale[0], scale[1], scale[2]);
    e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
    (parent ?? this.app.root).addChild(e);
    return e;
  }

  group(name, parent = null, pos = [0, 0, 0]) {
    const e = new pc.Entity(name);
    e.setLocalPosition(pos[0], pos[1], pos[2]);
    (parent ?? this.app.root).addChild(e);
    return e;
  }
}

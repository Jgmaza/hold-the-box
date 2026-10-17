// Agua 3D: malla de 200 × 200 m con olas en el vertex shader (suma de ondas en coordenadas de mundo),
// color hondo → bajo cerca de las orillas, espuma que late alrededor de muelles/islas y en las crestas.
// Solo es visual: la física sigue usando el plano `waterLevel` (las olas miden ±amp, por defecto 0.08 m).
//
//   const water = new Water(gfx, { y: 0, shores: [{ x, z, w, d }, { x, z, w, d, round: true }] });
//   water.update(time, camPos);   // cada frame (camPos opcional: la malla sigue a la cámara)
//
// Se arma sobre StandardMaterial (luz, sombras y niebla de la escena) cambiando tres chunks GLSL.
// En WebGPU se dibuja plana con el mismo color (sin olas).
import * as pc from 'playcanvas';

const SIZE = 200; // m de lado de la malla con olas
const CELLS = 200; // 1 m por celda: la malla se mueve de a 1 m y no "nada"
const PPM = 2; // píxeles por metro del mapa de orillas
const SHORE_REACH = 2.2; // m de agua clara / espuma alrededor de cada orilla

const WAVES = /* glsl */ `
uniform float uWaterTime;
uniform sampler2D uShoreMap;
uniform vec4 uShoreRect;
float waterShore(vec2 p) {
  vec2 uv = (p - uShoreRect.xy) * uShoreRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return texture2DLod(uShoreMap, uv, 0.0).r;
}
// x = altura normalizada (-1..1), yz = derivadas en x / z.
vec3 waveSum(vec2 p, float t) {
  vec3 r = vec3(0.0);
  vec2 d[4]; d[0] = normalize(vec2(1.0, 0.3)); d[1] = normalize(vec2(-0.4, 1.0)); d[2] = normalize(vec2(0.7, -0.7)); d[3] = normalize(vec2(0.2, 0.9));
  float l[4]; l[0] = 7.0; l[1] = 4.3; l[2] = 2.6; l[3] = 11.0;
  float a[4]; a[0] = 0.38; a[1] = 0.22; a[2] = 0.12; a[3] = 0.28;
  for (int i = 0; i < 4; i++) {
    float k = 6.2831853 / l[i];
    float w = sqrt(9.8 * k) * 0.55;
    float ph = k * dot(d[i], p) + w * t;
    r.x += a[i] * sin(ph);
    r.yz += a[i] * k * d[i] * cos(ph);
  }
  return r;
}
`;

const VS_HEAD = /* glsl */ `
${WAVES}
uniform float uWaterAmp;
uniform vec3 uWaterCenter;
vec3 dWaterN = vec3(0.0, 1.0, 0.0);
vec3 waterDisplace(vec3 p) {
  float shore = waterShore(p.xz);
  float far = 1.0 - smoothstep(uWaterCenter.z * 0.55, uWaterCenter.z, distance(p.xz, uWaterCenter.xy));
  float k = uWaterAmp * far * (1.0 - 0.8 * shore);
  vec3 w = waveSum(p.xz, uWaterTime) * k;
  dWaterN = normalize(vec3(-w.y * 3.0, 1.0, -w.z * 3.0));
  p.y += w.x;
  return p;
}
`;

const PS_HEAD = /* glsl */ `
${WAVES}
uniform vec3 uWaterDeep;
uniform vec3 uWaterShallow;
uniform vec3 uWaterFoam;
float waterHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float waterNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(waterHash(i), waterHash(i + vec2(1, 0)), f.x), mix(waterHash(i + vec2(0, 1)), waterHash(i + vec2(1, 1)), f.x), f.y);
}
vec3 waterAlbedo() {
  vec2 p = vPositionW.xz;
  float s = waterShore(p);
  vec3 c = mix(uWaterDeep, uWaterShallow, smoothstep(0.05, 0.75, s));
  float n = waterNoise(p * 1.3 + vec2(uWaterTime * 0.35, -uWaterTime * 0.25));
  float crest = smoothstep(0.6, 0.95, waveSum(p, uWaterTime).x) * n * 0.55;
  float band = smoothstep(0.3, 0.55, s) * (1.0 - smoothstep(0.88, 1.0, s));
  float pulse = 0.5 + 0.5 * sin(uWaterTime * 1.8 - s * 14.0 + n * 3.0);
  float foam = clamp(band * (0.35 + 0.65 * pulse) * (0.5 + 0.7 * n) + crest, 0.0, 1.0);
  return mix(c, uWaterFoam, foam);
}
`;

/** sRGB → lineal (los uniforms van directo al shader, que trabaja en lineal). */
const linear = (c) => [c.r, c.g, c.b].map((v) => Math.pow(v, 2.2));

export class Water {
  /**
   * @param {import('./gfx.js').Gfx} gfx
   * @param {object} o
   * @param {number} o.y                  nivel del agua
   * @param {pc.Entity} [o.parent]
   * @param {Array<{x:number,z:number,w:number,d:number,round?:boolean}>} [o.shores]  muelles / islas (vista desde arriba)
   * @param {number} [o.amp=0.08]         altura de las olas (m)
   * @param {[number, number]} [o.center] centro fijo (sin cámara que seguir, p. ej. el menú)
   */
  constructor(gfx, { y, parent = null, shores = [], amp = 0.08, center = [0, -50] } = {}) {
    this.gfx = gfx;
    this.y = y;
    this.amp = amp;
    this.center = center;
    const device = gfx.device;

    this.material = this._material(device);
    this._shoreMap(device, shores);

    const mesh = pc.Mesh.fromGeometry(device, new pc.PlaneGeometry({ halfExtents: new pc.Vec2(SIZE / 2, SIZE / 2), widthSegments: CELLS, lengthSegments: CELLS }));
    const mi = new pc.MeshInstance(mesh, this.material);
    mi.cull = false; // la malla sigue a la cámara y las olas cambian su caja
    this.entity = new pc.Entity('agua');
    this.entity.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: true });
    (parent ?? gfx.root).addChild(this.entity);
    this.mesh = mesh;

    // Más allá de la malla: plano hondo y quieto (debajo del valle más bajo de las olas).
    this.far = gfx.prim('plane', gfx.solid('water', { gloss: 0.6, mul: 0.82 }), { parent, pos: [0, y - amp - 0.05, 0], scale: [1600, 1, 1600], shadows: false, name: 'agua-lejos' });
    this._place(center[0], center[1]);
  }

  _material(device) {
    const m = new pc.StandardMaterial();
    m.diffuse = this.gfx.color('water');
    m.gloss = 0.82;
    m.useMetalness = true;
    m.metalness = 0;
    if (!device.isWebGPU) {
      const base = pc.ShaderChunks.get(device, pc.SHADERLANGUAGE_GLSL);
      const patch = (name, find, replace, head) => {
        const src = base.get(name);
        if (!src?.includes(find)) return console.warn(`[agua] chunk ${name} cambió: agua sin olas`), false;
        m.getShaderChunks(pc.SHADERLANGUAGE_GLSL).set(name, head + src.replace(find, replace));
        return true;
      };
      const posLine = 'vec4 posW = modelMatrix * vec4(localPos, 1.0);';
      this.waves =
        patch('transformVS', posLine, `${posLine}\n\tposW.xyz = waterDisplace(posW.xyz);`, VS_HEAD) &&
        patch('normalVS', 'return normalize(dNormalMatrix * localNormal);', 'return dWaterN;', '') &&
        patch('diffusePS', 'dAlbedo = material_diffuse.rgb;', 'dAlbedo = waterAlbedo();', PS_HEAD);
      m.shaderChunksVersion = pc.CHUNKAPI_2_8;
    }
    const g = this.gfx;
    m.setParameter('uWaterDeep', linear(g.color('water', 0.78)));
    m.setParameter('uWaterShallow', linear(g.color('#5fd0e6')));
    m.setParameter('uWaterFoam', linear(g.color('foam')));
    m.setParameter('uWaterAmp', this.amp);
    m.update();
    this.gfx._owned.push(m);
    return m;
  }

  /** Mapa de orillas visto desde arriba: 1 sobre el muelle, se desvanece en SHORE_REACH metros. */
  _shoreMap(device, shores) {
    const pad = SHORE_REACH * 3;
    let [minX, maxX, minZ, maxZ] = [-10, 10, -10, 10];
    if (shores.length) {
      minX = Math.min(...shores.map((s) => s.x - s.w / 2)) - pad;
      maxX = Math.max(...shores.map((s) => s.x + s.w / 2)) + pad;
      minZ = Math.min(...shores.map((s) => s.z - s.d / 2)) - pad;
      maxZ = Math.max(...shores.map((s) => s.z + s.d / 2)) + pad;
    }
    const ppm = Math.min(PPM, 2048 / Math.max(maxX - minX, maxZ - minZ));
    const c = document.createElement('canvas');
    c.width = Math.max(4, Math.ceil((maxX - minX) * ppm));
    c.height = Math.max(4, Math.ceil((maxZ - minZ) * ppm));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    const draw = (grow) => {
      ctx.beginPath();
      for (const s of shores) {
        const cx = (s.x - minX) * ppm;
        const cz = (s.z - minZ) * ppm;
        const hw = (s.w / 2 + grow) * ppm;
        const hd = (s.d / 2 + grow) * ppm;
        if (s.round) {
          ctx.moveTo(cx + hw, cz);
          ctx.ellipse(cx, cz, hw, hd, 0, 0, Math.PI * 2);
        } else ctx.rect(cx - hw, cz - hd, hw * 2, hd * 2);
      }
      ctx.fill();
    };
    ctx.fillStyle = '#fff';
    ctx.filter = `blur(${SHORE_REACH * ppm * 0.6}px)`;
    draw(SHORE_REACH * 0.45);
    ctx.filter = 'none';
    draw(0);

    const tex = new pc.Texture(device, {
      width: c.width,
      height: c.height,
      format: pc.PIXELFORMAT_RGBA8,
      mipmaps: false,
      minFilter: pc.FILTER_LINEAR,
      magFilter: pc.FILTER_LINEAR,
      addressU: pc.ADDRESS_CLAMP_TO_EDGE,
      addressV: pc.ADDRESS_CLAMP_TO_EDGE,
      flipY: false,
    });
    tex.setSource(c);
    this.gfx._owned.push(tex);
    this.material.setParameter('uShoreMap', tex);
    this.material.setParameter('uShoreRect', [minX, minZ, 1 / (maxX - minX), 1 / (maxZ - minZ)]);
  }

  _place(x, z) {
    // Pasos de 1 celda: los vértices siempre caen en la misma grilla de mundo.
    const cell = SIZE / CELLS;
    this.entity.setLocalPosition(Math.round(x / cell) * cell, this.y, Math.round(z / cell) * cell);
    this.far.setLocalPosition(x, this.y - this.amp - 0.05, z);
  }

  /** Altura visual aproximada (sin orillas) para cosas que flotan. */
  heightAt(x, z, t) {
    return this.y + this.amp * 0.6 * Math.sin(0.9 * x + 1.4 * t) * Math.cos(0.7 * z + 1.1 * t);
  }

  update(t, camPos) {
    const [cx, cz] = camPos ? [camPos.x, camPos.z - 40] : this.center;
    this._place(cx, cz);
    const view = camPos ?? { x: cx, z: cz };
    this.material.setParameter('uWaterTime', t);
    this.material.setParameter('uWaterCenter', [view.x, view.z, 85]);
  }

  destroy() {
    this.mesh?.destroy();
    this.mesh = null;
  }
}

// Lee lo que el equipo subió a deliveries/ (en tiempo de build con import.meta.glob).
// Solo aparecen los archivos que existen: si falta uno, el juego usa su placeholder y avisa en consola.

const images = import.meta.glob('../../../deliveries/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const audio = import.meta.glob('../../../deliveries/luis/audio/**/*.{ogg,mp3,wav,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
});
const palette = import.meta.glob('../../../deliveries/luis/PALETTE.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const PREFIX = '../../../deliveries/';
const strip = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k.slice(PREFIX.length), v]));

/** 'juanes/caja-normal.png' → url */
export const IMAGES = strip(images);
/** 'sfx-salto' → url (sin extensión; da igual .ogg/.mp3/.wav) */
export const AUDIO = Object.fromEntries(
  Object.entries(strip(audio)).map(([k, v]) => [k.split('/').pop().replace(/\.[^.]+$/, ''), v]),
);
export const PALETTE_MD = Object.values(palette)[0] ?? '';

// Lo que esperamos de cada quien (ver docs/visual/pipeline-papel.md).
export const EXPECTED = {
  juanes: ['caja-normal.png', 'caja-inclinada.png', 'caja-huequito.png', 'caja-mojada.png', 'p1-frente.png', 'p1-cargar.png', 'p2-frente.png', 'p2-cargar.png'],
  matias: ['banner-meta.png', 'senal-cuidado-caja.png', 'senal-trabajo-equipo.png', 'cartel-ron.png', 'prop-rodillo.png', 'prop-plataforma.png', 'prop-palmera.png'],
  luis: ['musica-loop', 'sfx-salto', 'sfx-inclinacion', 'sfx-mojado', 'sfx-splash', 'sfx-golpe', 'sfx-meta', 'musica-victoria', 'musica-derrota'],
};

/** URL de una imagen o null (el resumen de lo que falta lo imprime reportDeliveries()). */
export function imageUrl(path) {
  return IMAGES[path] ?? null;
}

export function reportDeliveries() {
  const haveImg = Object.keys(IMAGES);
  const haveAudio = Object.keys(AUDIO);
  const missing = [
    ...EXPECTED.juanes.map((f) => `juanes/${f}`).filter((f) => !IMAGES[f]),
    ...EXPECTED.matias.map((f) => `matias/${f}`).filter((f) => !IMAGES[f]),
    ...EXPECTED.luis.map((f) => `luis/audio/${f}.(ogg|mp3|wav)`).filter((f) => !AUDIO[f.split('/').pop().split('.')[0]]),
  ];
  console.groupCollapsed(`[deliveries] ${haveImg.length} imágenes, ${haveAudio.length} audios · faltan ${missing.length} (placeholders)`);
  if (haveImg.length) console.log('imágenes:', haveImg);
  if (haveAudio.length) console.log('audio:', haveAudio);
  if (missing.length) console.log('faltan:', missing);
  console.groupEnd();
}

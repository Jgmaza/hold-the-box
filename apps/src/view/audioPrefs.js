// Volumen de música y de sonidos (0..1). Se guarda en el navegador para la próxima visita.
import { CONFIG } from '../config.js';

const KEY = 'nslc-audio';
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const VOLUME_SLIDERS_HTML = /* html */ `
  <div class="vol">
    <label class="vol-row"><span>Música</span><input type="range" min="0" max="100" step="1" data-vol="music" /></label>
    <label class="vol-row"><span>Sonidos</span><input type="range" min="0" max="100" step="1" data-vol="sfx" /></label>
  </div>`;

export const SPEAKER_HTML = /* html */ `
  <div class="spk">
    <button type="button" class="btn icon light spk-btn" data-act="audio" aria-label="Audio" title="Música y sonidos">🔊</button>
    <div class="spk-pop">
      <b>Audio</b>
      ${VOLUME_SLIDERS_HTML}
    </div>
  </div>`;

export function speakerIcon(audio = CONFIG.audio) {
  if (audio.music <= 0 && audio.sfx <= 0) return '🔇';
  if (audio.music <= 0) return '🔈';
  return '🔊';
}

export function paintSpeakerButtons(root) {
  const icon = speakerIcon();
  for (const btn of root.querySelectorAll('.spk-btn')) btn.textContent = icon;
}

export function slotKind(name) {
  return String(name).startsWith('musica-') ? 'music' : 'sfx';
}

export function mixVolume(base, kind, audio = CONFIG.audio) {
  const mix = kind === 'music' ? audio.music : audio.sfx;
  return Math.max(0, base) * clamp01(Number(mix) || 0);
}

export function loadAudioPrefs(audio = CONFIG.audio) {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p) return;
    if (Number.isFinite(p.music)) audio.music = clamp01(p.music);
    if (Number.isFinite(p.sfx)) audio.sfx = clamp01(p.sfx);
  } catch {
    /* ignore */
  }
}

export function saveAudioPrefs(audio = CONFIG.audio) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ music: audio.music, sfx: audio.sfx }));
  } catch {
    /* ignore */
  }
}

/** Rellena los sliders `data-vol` y, al moverlos, guarda y avisa. */
export function bindVolumeSliders(root, onChange) {
  const paint = () => {
    for (const el of root.querySelectorAll('[data-vol]')) {
      const key = el.dataset.vol;
      if (key !== 'music' && key !== 'sfx') continue;
      el.value = String(Math.round(clamp01(CONFIG.audio[key]) * 100));
    }
    paintSpeakerButtons(root);
  };
  paint();
  root.addEventListener('click', (e) => {
    const btn = e.target.closest?.('[data-act="audio"]');
    if (!btn) return;
    btn.closest('.spk')?.classList.toggle('open');
  });
  root.addEventListener('pointerdown', (e) => {
    for (const wrap of root.querySelectorAll('.spk.open')) {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    }
  }, true);
  root.addEventListener('input', (e) => {
    const el = e.target.closest?.('[data-vol]');
    if (!el) return;
    const key = el.dataset.vol;
    if (key !== 'music' && key !== 'sfx') return;
    CONFIG.audio[key] = clamp01(Number(el.value) / 100);
    saveAudioPrefs();
    onChange?.(CONFIG.audio);
  });
  return paint;
}

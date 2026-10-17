// Texturas dibujadas con canvas 2D: carteles con texto, la caja de cartón, bandera a cuadros.
// Son placeholders hasta que Matias / Juanes entreguen sus PNG.

const STYLES = {
  default: { bg: '#fff3d6', fg: '#3a2414', border: '#7a4a24' },
  warn: { bg: '#ffd84a', fg: '#2a1a00', border: '#2a1a00' },
  info: { bg: '#e8f6ff', fg: '#123a52', border: '#1f6f99' },
  bar: { bg: '#3b1f0f', fg: '#ffd27a', border: '#ffd27a' },
  billboard: { bg: '#ffffff', fg: '#d6332a', border: '#1d1d1d' },
  goal: { bg: '#3ccf6e', fg: '#ffffff', border: '#1d6b3a' },
};

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Cartel con texto multilínea centrado. Proporción w:h del cartel en metros. */
export function signCanvas(text, { style = 'default', aspect = 2, palette } = {}) {
  const s = { ...STYLES[style] };
  if (style === 'goal' && palette) s.bg = palette.goal;
  const H = 256;
  const W = Math.round(H * aspect);
  const c = canvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = s.bg;
  g.fillRect(0, 0, W, H);
  // Vetas de madera / papel
  g.globalAlpha = 0.07;
  g.fillStyle = s.fg;
  for (let y = 12; y < H; y += 22) g.fillRect(0, y, W, 3);
  g.globalAlpha = 1;
  g.lineWidth = 14;
  g.strokeStyle = s.border;
  g.strokeRect(7, 7, W - 14, H - 14);

  const lines = text.split('\n');
  let size = Math.floor((H * 0.72) / lines.length);
  g.font = `900 ${size}px system-ui, "Arial Black", sans-serif`;
  const widest = Math.max(...lines.map((l) => g.measureText(l).width));
  if (widest > W * 0.88) size = Math.floor((size * W * 0.88) / widest);
  g.font = `900 ${size}px system-ui, "Arial Black", sans-serif`;
  g.fillStyle = s.fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const lh = size * 1.08;
  const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
  return c;
}

/** Cartón de la caja: FRÁGIL + flechas "este lado arriba" + cinta. */
export function boxCanvas(baseHex) {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 512, 512);
  // Cinta
  g.fillStyle = 'rgba(255, 240, 200, 0.55)';
  g.fillRect(0, 216, 512, 80);
  // Bordes
  g.strokeStyle = 'rgba(60, 30, 10, 0.55)';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 502);
  // Flechas ↑↑
  g.fillStyle = '#3a2414';
  for (const x of [150, 362]) {
    g.beginPath();
    g.moveTo(x, 40);
    g.lineTo(x + 46, 110);
    g.lineTo(x + 18, 110);
    g.lineTo(x + 18, 180);
    g.lineTo(x - 18, 180);
    g.lineTo(x - 18, 110);
    g.lineTo(x - 46, 110);
    g.closePath();
    g.fill();
  }
  // FRÁGIL
  g.fillStyle = '#c0281f';
  g.font = '900 92px system-ui, "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('FRÁGIL', 256, 380);
  g.font = '700 38px system-ui, sans-serif';
  g.fillStyle = '#3a2414';
  g.fillText('NO SOLTAR', 256, 455);
  return c;
}

/** Globo de rabia (estilo cómic) para desync de salto. */
export function angerMarkCanvas() {
  const c = canvas(128, 128);
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  // Globo
  g.fillStyle = '#ff3b3b';
  g.beginPath();
  g.arc(64, 58, 42, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 6;
  g.stroke();
  // Colita
  g.beginPath();
  g.moveTo(48, 92);
  g.lineTo(40, 118);
  g.lineTo(68, 96);
  g.closePath();
  g.fill();
  g.stroke();
  // Ceño / venas ">_<" simplificado
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(40, 48);
  g.lineTo(52, 58);
  g.lineTo(40, 68);
  g.moveTo(88, 48);
  g.lineTo(76, 58);
  g.lineTo(88, 68);
  g.stroke();
  g.beginPath();
  g.moveTo(50, 78);
  g.quadraticCurveTo(64, 70, 78, 78);
  g.stroke();
  return c;
}

/**
 * Tablones del piso en tonos claros (se tiñen con el color de la madera): 4 tablas atravesadas con juntas,
 * vetas y clavos. Pensada para repetirse (2 m por repetición).
 */
export function plankCanvas() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const H = 64;
  for (let b = 0; b < 4; b++) {
    const y = b * H;
    const tone = 205 + Math.floor(rand() * 40);
    g.fillStyle = `rgb(${tone}, ${tone - 8}, ${tone - 18})`;
    g.fillRect(0, y, 256, H);
    // Vetas onduladas.
    g.strokeStyle = 'rgba(90, 55, 25, 0.16)';
    g.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const gy = y + 8 + rand() * (H - 16);
      g.beginPath();
      g.moveTo(0, gy);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, gy + Math.sin(x * 0.05 + k) * 2.5);
      g.stroke();
    }
    // Nudo de la madera.
    if (rand() < 0.6) {
      g.fillStyle = 'rgba(90, 55, 25, 0.22)';
      g.beginPath();
      g.ellipse(30 + rand() * 196, y + H / 2, 7, 4, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Junta entre tablas + borde claro arriba (da relieve).
    g.fillStyle = 'rgba(40, 22, 8, 0.65)';
    g.fillRect(0, y + H - 4, 256, 4);
    g.fillStyle = 'rgba(255, 255, 255, 0.18)';
    g.fillRect(0, y, 256, 3);
    // Unión a lo largo (cada tabla en un lugar distinto) con clavos.
    const jx = 40 + Math.floor(rand() * 176);
    g.fillStyle = 'rgba(40, 22, 8, 0.6)';
    g.fillRect(jx, y, 3, H - 4);
    g.fillStyle = 'rgba(30, 30, 30, 0.75)';
    for (const nx of [jx - 8, jx + 10]) {
      for (const ny of [y + 14, y + H - 18]) {
        g.beginPath();
        g.arc(nx, ny, 2.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  return c;
}

export function checkerCanvas(cells = 8) {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  const s = 256 / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      g.fillStyle = (x + y) % 2 ? '#111111' : '#ffffff';
      g.fillRect(x * s, y * s, s, s);
    }
  }
  return c;
}

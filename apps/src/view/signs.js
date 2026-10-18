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

/** Cartón de la caja bomba: etiqueta de envío, franja de peligro y los iconos de embalaje. */
export function bombBoxCanvas(baseHex) {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 512, 512);
  // Ondas del cartón corrugado.
  g.fillStyle = 'rgba(60, 30, 10, 0.06)';
  for (let x = 0; x < 512; x += 12) g.fillRect(x, 0, 4, 512);
  g.strokeStyle = 'rgba(60, 30, 10, 0.55)';
  g.lineWidth = 10;
  g.strokeRect(5, 5, 502, 502);

  // Etiqueta de envío con código de barras.
  g.save();
  g.translate(256, 112);
  g.rotate(-0.02);
  g.fillStyle = 'rgba(40, 20, 5, 0.25)';
  g.fillRect(-196, -60, 400, 128);
  g.fillStyle = '#fbfaf5';
  g.fillRect(-200, -66, 400, 128);
  g.strokeStyle = '#3a2414';
  g.lineWidth = 4;
  g.strokeRect(-200, -66, 400, 128);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#1d1d1d';
  for (let x = -184; x < -30; ) {
    const w = 2 + Math.floor(rand() * 3) * 2;
    g.fillRect(x, -48, w, 74);
    x += w + 2 + Math.floor(rand() * 3) * 2;
  }
  g.font = '600 15px ui-monospace, Consolas, monospace';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('0 451207 990123 3', -184, 44);
  g.textAlign = 'center';
  g.font = '900 40px system-ui, "Arial Black", sans-serif';
  g.fillText('ENTREGA', 88, -18);
  g.font = '700 20px system-ui, sans-serif';
  g.fillStyle = '#c0281f';
  g.fillText('URGENTE', 88, 26);
  g.restore();

  // Franja amarilla y negra con ¡PELIGRO!
  g.save();
  g.beginPath();
  g.rect(0, 206, 512, 96);
  g.clip();
  g.fillStyle = '#ffcc33';
  g.fillRect(0, 206, 512, 96);
  g.fillStyle = '#1d1d1d';
  for (let x = -120; x < 600; x += 56) {
    g.beginPath();
    g.moveTo(x, 302);
    g.lineTo(x + 28, 302);
    g.lineTo(x + 124, 206);
    g.lineTo(x + 96, 206);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#ffcc33';
  g.fillRect(118, 222, 276, 64);
  g.strokeStyle = '#1d1d1d';
  g.lineWidth = 5;
  g.strokeRect(118, 222, 276, 64);
  g.fillStyle = '#c0281f';
  g.font = '900 50px system-ui, "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('¡PELIGRO!', 256, 256);
  g.restore();

  g.fillStyle = '#3a2414';
  g.font = '900 42px system-ui, "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('NO SOLTAR', 256, 344);

  // Iconos: no mojar, frágil, este lado arriba.
  g.strokeStyle = '#3a2414';
  g.fillStyle = '#3a2414';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const icons = [116, 256, 396];
  for (const x of icons) g.strokeRect(x - 52, 392, 104, 96);
  // Paraguas con gotas.
  {
    const x = icons[0];
    g.beginPath();
    g.moveTo(x - 32, 446);
    g.quadraticCurveTo(x, 396, x + 32, 446);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(x, 446);
    g.lineTo(x, 472);
    g.quadraticCurveTo(x, 480, x - 8, 476);
    g.stroke();
    for (const [dx, dy] of [[-30, 410], [-12, 404], [26, 408]]) {
      g.beginPath();
      g.ellipse(x + dx, dy, 2.5, 5, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Copa frágil.
  {
    const x = icons[1];
    g.beginPath();
    g.moveTo(x - 20, 404);
    g.lineTo(x + 20, 404);
    g.quadraticCurveTo(x + 22, 440, x, 444);
    g.quadraticCurveTo(x - 22, 440, x - 20, 404);
    g.fill();
    g.beginPath();
    g.moveTo(x, 444);
    g.lineTo(x, 472);
    g.moveTo(x - 16, 474);
    g.lineTo(x + 16, 474);
    g.stroke();
    g.strokeStyle = baseHex;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 4, 406);
    g.lineTo(x - 4, 418);
    g.lineTo(x + 5, 426);
    g.lineTo(x - 2, 436);
    g.stroke();
    g.strokeStyle = '#3a2414';
    g.lineWidth = 5;
  }
  // Dos flechas arriba con su raya.
  {
    const x = icons[2];
    for (const dx of [-16, 16]) {
      g.beginPath();
      g.moveTo(x + dx, 402);
      g.lineTo(x + dx + 13, 420);
      g.lineTo(x + dx + 5, 420);
      g.lineTo(x + dx + 5, 462);
      g.lineTo(x + dx - 5, 462);
      g.lineTo(x + dx - 5, 420);
      g.lineTo(x + dx - 13, 420);
      g.closePath();
      g.fill();
    }
    g.beginPath();
    g.moveTo(x - 34, 474);
    g.lineTo(x + 34, 474);
    g.stroke();
  }
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
/** Tierra del pueblo: tierra pisada para repetir (2 m). */
export function dirtCanvas() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  let seed = 23;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#8a6238';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 80; i++) {
    const t = 90 + Math.floor(rand() * 50);
    g.fillStyle = `rgb(${t + 20}, ${t - 10}, ${t - 40})`;
    g.beginPath();
    g.ellipse(rand() * 256, rand() * 256, 10 + rand() * 22, 6 + rand() * 12, rand() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** Pasto para el suelo del templo / risco. */
export function grassCanvas() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  let seed = 19;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#5a8f3e';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    const t = 70 + Math.floor(rand() * 50);
    g.fillStyle = `rgb(${t - 10}, ${t + 40}, ${t - 20})`;
    g.fillRect(rand() * 256, rand() * 256, 6 + rand() * 14, 4 + rand() * 8);
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(90, 70, 40, ${0.15 + rand() * 0.2})`;
    g.beginPath();
    g.ellipse(rand() * 256, rand() * 256, 8 + rand() * 16, 5 + rand() * 8, 0, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

/** Losa del templo: teselas grises para repetir (2 m). */
export function stoneCanvas() {
  const c = canvas(256, 256);
  const g = c.getContext('2d');
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#8d887c';
  g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const t = 145 + Math.floor(rand() * 38);
      g.fillStyle = `rgb(${t}, ${t - 6}, ${t - 16})`;
      g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(x * 32 + 2, y * 32 + 2, 12, 3);
    }
  }
  return c;
}

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
